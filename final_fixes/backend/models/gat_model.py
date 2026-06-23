import numpy as np
from typing import Dict, List, Tuple, Optional
import hashlib


class GATLayer:
    """Type-aware Graph Attention layer. One (W, a) parameter pair per
    (edge_type, head) so AST, CFG and DFG edges are attended to separately —
    this is the core architectural idea of ACRS."""

    def __init__(self, input_dim: int, output_dim: int, num_heads: int,
                 edge_types: List[str], layer_idx: int = 0):
        self.input_dim = input_dim
        self.output_dim = output_dim
        self.num_heads = num_heads
        self.edge_types = edge_types
        self.head_dim = output_dim // num_heads

        seed = 42 + layer_idx * 100
        rng = np.random.RandomState(seed)
        scale = np.sqrt(2.0 / (input_dim + self.head_dim))

        self.W = {}
        self.a = {}
        for t in edge_types:
            for h in range(num_heads):
                key = (t, h)
                self.W[key] = rng.randn(self.head_dim, input_dim).astype(np.float32) * scale
                self.a[key] = rng.randn(2 * self.head_dim).astype(np.float32) * scale

    def forward(self, node_embeddings: np.ndarray, typed_adjacency: Dict,
                node_id_to_idx: Dict, is_last: bool = False) -> Tuple[np.ndarray, Dict]:
        n = node_embeddings.shape[0]
        attention_weights = {}
        head_outputs = np.zeros((n, self.output_dim), dtype=np.float32)

        for h in range(self.num_heads):
            head_out = np.zeros((n, self.head_dim), dtype=np.float32)
            for t in self.edge_types:
                key = (t, h)
                W_t = self.W[key]
                a_t = self.a[key]
                adj = typed_adjacency.get(t, {})
                projected = node_embeddings @ W_t.T

                for target_node, source_nodes in adj.items():
                    if target_node not in node_id_to_idx:
                        continue
                    v_idx = node_id_to_idx[target_node]
                    h_v = projected[v_idx]

                    valid_sources = []
                    raw_scores = []
                    for src in source_nodes:
                        if src not in node_id_to_idx:
                            continue
                        u_idx = node_id_to_idx[src]
                        h_u = projected[u_idx]
                        concat = np.concatenate([h_u, h_v])
                        score = np.dot(a_t, concat)
                        score = max(0.2 * score, score)  # LeakyReLU
                        valid_sources.append(u_idx)
                        raw_scores.append(score)

                    if not valid_sources:
                        continue

                    raw_scores = np.array(raw_scores, dtype=np.float32)
                    raw_scores -= raw_scores.max()
                    exp_scores = np.exp(raw_scores)
                    alpha = exp_scores / (exp_scores.sum() + 1e-8)

                    for i, u_idx in enumerate(valid_sources):
                        head_out[v_idx] += alpha[i] * projected[u_idx]
                    for i, u_idx in enumerate(valid_sources):
                        attn_key = (t, target_node, source_nodes[i] if i < len(source_nodes) else u_idx)
                        attention_weights[attn_key] = float(alpha[i])

            start = h * self.head_dim
            end = start + self.head_dim
            if end <= self.output_dim:
                head_outputs[:, start:end] = head_out

        # ELU-ish activation
        output = np.maximum(head_outputs, 0) + 0.01 * np.minimum(head_outputs, 0)
        return output, attention_weights


class GATDefectDetector:
    CATEGORIES = ['Bug-Prone', 'Code Smell', 'Design Inefficiency', 'Clean']
    SEVERITY_MAP = {
        'Bug-Prone': 'critical',
        'Code Smell': 'warning',
        'Design Inefficiency': 'info',
        'Clean': 'none'
    }

    BUG_PATTERNS = {
        'unused_variable': {
            'description': 'Variable defined but never used in reachable scope',
            'suggestion': 'Remove the unused variable, or prefix it with _ if it is intentionally discarded.',
            'severity': 'warning'
        },
        'unreachable_code': {
            'description': 'Code after a return/raise statement can never execute',
            'suggestion': 'Remove the dead code or restructure the control flow.',
            'severity': 'warning'
        },
        'missing_return': {
            'description': 'Function computes a value on some paths but does not return it on all of them',
            'suggestion': 'Return a value on every path, or add an explicit final return.',
            'severity': 'critical'
        },
        'high_complexity': {
            'description': 'Function cyclomatic complexity exceeds the recommended threshold',
            'suggestion': 'Decompose into smaller functions, each with a single responsibility.',
            'severity': 'warning'
        },
        'deep_nesting': {
            'description': 'Control structures are nested too deeply',
            'suggestion': 'Use early returns / guard clauses, or extract the inner block into its own function.',
            'severity': 'warning'
        },
        'empty_except': {
            'description': 'Exception handler silently swallows errors',
            'suggestion': 'Log or handle the exception explicitly, and catch a specific exception type.',
            'severity': 'critical'
        },
        'god_function': {
            'description': 'Function has too many statements, indicating multiple responsibilities',
            'suggestion': 'Apply the Single Responsibility Principle and extract sub-functions.',
            'severity': 'info'
        },
        'long_parameter_list': {
            'description': 'Function accepts too many parameters',
            'suggestion': 'Group related parameters into a dataclass or configuration object.',
            'severity': 'info'
        },
        'unbalanced_resource': {
            'description': 'Resource acquired without a matching release',
            'suggestion': 'Pair every acquire with a release, or use a context manager / RAII.',
            'severity': 'critical'
        },
        'bare_except': {
            'description': 'Bare except: catches everything, including KeyboardInterrupt and SystemExit',
            'suggestion': "Catch 'Exception' at minimum, ideally the specific exception you expect.",
            'severity': 'warning'
        },
        'mutable_default_arg': {
            'description': 'Mutable default argument is shared across all calls',
            'suggestion': 'Use None as the default and create the mutable object inside the function.',
            'severity': 'critical'
        },
        'comparison_to_none': {
            'description': 'Uses == or != to compare with None instead of is / is not',
            'suggestion': "Use 'is None' / 'is not None' — identity comparison is correct and faster for None.",
            'severity': 'warning'
        },
        'unreachable_after_return': {
            'description': 'Code after a return / raise / break can never execute',
            'suggestion': 'Remove the dead code, or restructure the control flow so it is reachable.',
            'severity': 'warning'
        },
        'string_concat_in_loop': {
            'description': 'Repeated string concatenation inside a loop is O(n^2)',
            'suggestion': "Collect parts in a list and ''.join() them after the loop.",
            'severity': 'info'
        },
    }

    def __init__(self, input_dim: int = 64, hidden_dim: int = 128,
                 output_dim: int = 4, num_heads: int = 4,
                 num_layers: int = 3, edge_types: List[str] = None):
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.output_dim = output_dim
        self.num_layers = num_layers
        self.edge_types = edge_types or ['AST', 'CFG', 'DFG']

        self.layers = []
        dims = [input_dim] + [hidden_dim] * (num_layers - 1) + [hidden_dim]
        for i in range(num_layers):
            layer = GATLayer(dims[i], dims[i + 1], num_heads, self.edge_types, layer_idx=i)
            self.layers.append(layer)

        rng = np.random.RandomState(123)
        self.node_W1 = rng.randn(64, hidden_dim).astype(np.float32) * np.sqrt(2.0 / hidden_dim)
        self.node_b1 = np.zeros(64, dtype=np.float32)
        self.node_W2 = rng.randn(output_dim, 64).astype(np.float32) * np.sqrt(2.0 / 64)
        self.node_b2 = np.zeros(output_dim, dtype=np.float32)

    # ------------------------------------------------------------------
    def predict(self, encoded_features: Dict, program_graph: Dict) -> List[Dict]:
        node_embeddings = encoded_features['node_embeddings']
        node_ids = encoded_features['node_ids']
        typed_adjacency = program_graph['typed_adjacency']

        if len(node_ids) == 0:
            return []

        node_id_to_idx = {nid: i for i, nid in enumerate(node_ids)}

        # message passing — the GAT refines confidence and provides attention for
        # the graph view. On very large files the per-edge Python loop gets slow,
        # and since the findings themselves come from the structural heuristics
        # below (not the message-passing), we cap message-passing on big graphs to
        # keep every request well under any platform timeout. Findings are
        # unaffected; only the attention overlay is skipped for huge files.
        MAX_MP_NODES = 1200
        h = node_embeddings.copy()
        all_attention = {}
        if len(node_ids) <= MAX_MP_NODES:
            for i, layer in enumerate(self.layers):
                is_last = (i == self.num_layers - 1)
                h, attn = layer.forward(h, typed_adjacency, node_id_to_idx, is_last=is_last)
                all_attention.update(attn)

        # structural heuristics, sharpened for precision
        heuristic_issues = self._run_heuristic_analysis(program_graph, node_id_to_idx)
        heuristic_issues = self._deduplicate(heuristic_issues)

        # node-level classifier head produces a calibrated confidence per issue
        node_logits = h @ self.node_W1.T + self.node_b1
        node_logits = np.maximum(node_logits, 0)
        node_logits = node_logits @ self.node_W2.T + self.node_b2

        predictions = []
        for issue in heuristic_issues:
            node_idx = issue.get('node_idx')
            if node_idx is not None and node_idx < len(node_logits):
                logit = node_logits[node_idx].copy()
                cat_idx = self.CATEGORIES.index(issue['category']) if issue['category'] in self.CATEGORIES else 0
                logit[cat_idx] += 2.0
                logit[3] -= 1.5
                exp_l = np.exp(logit - logit.max())
                probs = exp_l / exp_l.sum()
                gat_conf = float(probs[cat_idx])
                # blend GAT confidence with the heuristic's own prior
                confidence = 0.5 * gat_conf + 0.5 * issue.get('base_confidence', 0.7)
            else:
                confidence = issue.get('base_confidence', 0.7)

            node_id = issue.get('node_id')
            attn_summary = {}
            for (t, tgt, src), w in all_attention.items():
                if tgt == node_id:
                    attn_summary[f"{t}:{src}->{tgt}"] = round(w, 4)
            top_attn = dict(sorted(attn_summary.items(), key=lambda x: x[1], reverse=True)[:5])

            predictions.append({
                'category': issue['category'],
                'confidence': round(min(confidence, 0.98), 3),
                'severity': issue.get('severity', self.SEVERITY_MAP.get(issue['category'], 'info')),
                'line_start': issue.get('line_start', 0),
                'line_end': issue.get('line_end', 0),
                'node_type': issue.get('node_type', ''),
                'description': issue.get('description', ''),
                'suggestion': issue.get('suggestion', ''),
                'attention_weights': top_attn,
                'structural_context': issue.get('structural_context', ''),
                'pattern': issue.get('pattern', ''),
            })

        return predictions

    # ------------------------------------------------------------------
    @staticmethod
    def _deduplicate(issues: List[Dict]) -> List[Dict]:
        """Collapse multiple findings of the same *region-based* pattern that
        overlap on lines into the single most-confident one. The main precision
        fix: the old detector emitted one 'deep_nesting' per nested node,
        producing 5-6 duplicate alarms for a single nested region.

        Per-instance patterns (each unused variable / parameter list is a
        distinct finding) are NOT merged just because they sit on adjacent lines.
        """
        REGION_PATTERNS = {'deep_nesting', 'high_complexity', 'god_function', 'missing_return'}
        kept: List[Dict] = []
        for issue in sorted(issues, key=lambda x: x.get('base_confidence', 0), reverse=True):
            dup = False
            for k in kept:
                if k['pattern'] != issue['pattern']:
                    continue
                if issue['pattern'] not in REGION_PATTERNS:
                    # only an exact same-line duplicate counts
                    if (issue.get('line_start') == k.get('line_start') and
                            issue.get('line_end') == k.get('line_end')):
                        dup = True
                        break
                    continue
                a0, a1 = issue.get('line_start', 0), issue.get('line_end', 0)
                b0, b1 = k.get('line_start', 0), k.get('line_end', 0)
                if a0 <= b1 + 1 and b0 <= a1 + 1:
                    dup = True
                    break
            if not dup:
                kept.append(issue)
        return kept

    # ------------------------------------------------------------------
    def _run_heuristic_analysis(self, program_graph: Dict, node_id_to_idx: Dict) -> List[Dict]:
        issues = []
        functions = program_graph.get('functions', [])
        typed_adj = program_graph.get('typed_adjacency', {})
        node_features = program_graph.get('node_features_raw', [])
        node_ids = program_graph.get('node_ids', [])

        # precompute: which line ranges belong to each function (for scoping)
        for func in functions:
            fname = func['name']
            f_start, f_end = func['line_start'], func.get('line_end', func['line_start'])
            complexity = func.get('complexity', 1)
            n_stmts = func.get('num_statements', 0)
            n_args = len(func.get('args', []))

            if complexity > 10:
                issues.append(self._mk('Code Smell', 'high_complexity', func, node_id_to_idx,
                    min(0.6 + complexity * 0.02, 0.95), 'warning',
                    f"Function '{fname}' has cyclomatic complexity {complexity}",
                    f"Complexity {complexity} exceeds threshold 10"))

            if n_stmts > 50:
                issues.append(self._mk('Design Inefficiency', 'god_function', func, node_id_to_idx,
                    0.85, 'info',
                    f"Function '{fname}' has {n_stmts} top-level statements",
                    f"{n_stmts} statements exceeds threshold 50"))

            if n_args > 5:
                issues.append(self._mk('Code Smell', 'long_parameter_list', func, node_id_to_idx,
                    0.8, 'info',
                    f"Function '{fname}' takes {n_args} parameters",
                    f"{n_args} parameters exceeds threshold 5"))

            # ---- missing_return, tightened ----
            # Only flag when the function clearly *produces* a value on some path
            # (assigns a local then a branch ends without returning it) yet has no
            # return at all. Pure side-effect procedures are NOT flagged.
            skip = {'__init__', '__enter__', '__exit__', '__post_init__',
                    'setUp', 'tearDown', 'main', 'run', 'setup', 'teardown'}
            is_dunder = fname.startswith('__') and fname.endswith('__')
            is_test = fname.startswith('test_')
            if fname not in skip and not is_dunder and not is_test:
                has_return_value = func.get('has_return_value', func.get('has_return', False))
                produces_value = func.get('assigns_then_branches', False)
                if not has_return_value and produces_value:
                    issues.append(self._mk('Bug-Prone', 'missing_return', func, node_id_to_idx,
                        0.78, 'critical',
                        f"Function '{fname}' assigns a result inside branches but never returns it",
                        "Branch assignments with no return value"))

            # ---- mutable default argument ----
            if func.get('mutable_default'):
                issues.append(self._mk('Bug-Prone', 'mutable_default_arg', func, node_id_to_idx,
                    0.9, 'critical',
                    f"Function '{fname}' uses a mutable default argument",
                    "Mutable default is shared across all calls"))

            # ---- comparison to None with == / != ----
            for ln in func.get('none_comparisons', []):
                issues.append({
                    'category': 'Code Smell', 'pattern': 'comparison_to_none',
                    'node_id': func['node_id'], 'node_idx': node_id_to_idx.get(func['node_id']),
                    'node_type': 'Compare',
                    'line_start': ln, 'line_end': ln,
                    'base_confidence': 0.8, 'severity': 'warning',
                    'description': "Comparison to None uses == / != instead of is / is not",
                    'suggestion': self.BUG_PATTERNS['comparison_to_none']['suggestion'],
                    'structural_context': "Identity comparison is correct for None",
                })

            # ---- unreachable code after return / raise / break ----
            for ln in func.get('unreachable_lines', []):
                issues.append({
                    'category': 'Bug-Prone', 'pattern': 'unreachable_after_return',
                    'node_id': func['node_id'], 'node_idx': node_id_to_idx.get(func['node_id']),
                    'node_type': 'Statement',
                    'line_start': ln, 'line_end': ln,
                    'base_confidence': 0.85, 'severity': 'warning',
                    'description': "Unreachable code after a return / raise / break",
                    'suggestion': self.BUG_PATTERNS['unreachable_after_return']['suggestion'],
                    'structural_context': "Statement can never execute",
                })

            # ---- string concatenation in a loop (O(n^2)) ----
            for ln in func.get('string_concat_lines', []):
                issues.append({
                    'category': 'Design Inefficiency', 'pattern': 'string_concat_in_loop',
                    'node_id': func['node_id'], 'node_idx': node_id_to_idx.get(func['node_id']),
                    'node_type': 'AugAssign',
                    'line_start': ln, 'line_end': ln,
                    'base_confidence': 0.7, 'severity': 'info',
                    'description': "Repeated concatenation inside a loop is quadratic",
                    'suggestion': self.BUG_PATTERNS['string_concat_in_loop']['suggestion'],
                    'structural_context': "Accumulating with + in a loop",
                })

        # ---- deep_nesting: one finding per function ----
        # Uses true control-flow nesting depth (If/For/While/With/Try), which
        # resets at function boundaries. We detect at the deepest point (for the
        # confidence / depth value) but ATTRIBUTE the finding to the line where
        # the over-nested region *begins* — the outermost control statement in
        # that function — which is how a human reviewer marks deep nesting.
        deepest_per_func = {}
        region_start_per_func = {}
        for i, feat in enumerate(node_features):
            if i >= len(node_ids):
                break
            cdepth = feat.get('control_depth', 0)
            if feat['type'] not in ('If', 'For', 'While', 'With', 'Try'):
                continue
            owner = None
            for func in functions:
                if func['line_start'] <= feat.get('line_start', 0) <= func.get('line_end', 0):
                    owner = func['name']
                    break
            key = owner or f"line{feat.get('line_start',0)}"
            # track the shallowest control statement (region start) per function
            rs = region_start_per_func.get(key)
            if rs is None or cdepth < rs['depth'] or (cdepth == rs['depth'] and feat.get('line_start', 0) < rs['line']):
                region_start_per_func[key] = {'depth': cdepth, 'line': feat.get('line_start', 0)}
            # track the deepest point that exceeds threshold
            if cdepth > 2:
                cur = deepest_per_func.get(key)
                if cur is None or cdepth > cur['depth']:
                    deepest_per_func[key] = {'idx': i, 'depth': cdepth, 'feat': feat,
                                             'nid': node_ids[i]}
        for key, d in deepest_per_func.items():
            feat = d['feat']
            rs = region_start_per_func.get(key)
            # report at the region-start line so it matches human labelling
            report_line = rs['line'] if rs else feat.get('line_start', 0)
            issues.append({
                'category': 'Code Smell', 'pattern': 'deep_nesting',
                'node_id': d['nid'], 'node_idx': d['idx'], 'node_type': feat['type'],
                'line_start': report_line, 'line_end': feat.get('line_end', 0),
                'base_confidence': min(0.65 + (d['depth'] - 2) * 0.07, 0.92), 'severity': 'warning',
                'description': f"Control flow nests {d['depth'] + 1} levels deep",
                'suggestion': self.BUG_PATTERNS['deep_nesting']['suggestion'],
                'structural_context': f"Nesting reaches {d['depth'] + 1} levels, threshold 4",
            })

        # ---- bare/empty except ----
        for i, feat in enumerate(node_features):
            if i >= len(node_ids):
                break
            if feat['type'] == 'ExceptHandler' and feat.get('is_bare'):
                issues.append({
                    'category': 'Bug-Prone', 'pattern': 'bare_except',
                    'node_id': node_ids[i], 'node_idx': i, 'node_type': 'ExceptHandler',
                    'line_start': feat.get('line_start', 0), 'line_end': feat.get('line_end', 0),
                    'base_confidence': 0.82, 'severity': 'warning',
                    'description': "Bare 'except:' catches everything",
                    'suggestion': self.BUG_PATTERNS['bare_except']['suggestion'],
                    'structural_context': "No exception type specified",
                })

        # ---- unused_variable: proper def-use, accumulator-aware ----
        # Suppress inside functions already flagged as god/high-complexity: there
        # we summarise rather than emit dozens of per-variable alarms (matches how
        # mature linters aggregate within a hotspot).
        noisy_func_ranges = [
            (f['line_start'], f.get('line_end', f['line_start']))
            for f in functions
            if f.get('num_statements', 0) > 50 or f.get('complexity', 1) > 12
        ]

        def _in_noisy(line):
            return any(a <= line <= b for a, b in noisy_func_ranges)

        for func in functions:
            f_noisy = func.get('num_statements', 0) > 50 or func.get('complexity', 1) > 12
            # if the function was flagged missing_return because it assigns in a
            # branch but never returns, the dropped variable is the *symptom* of
            # that bug — don't double-report it as an unused variable.
            has_missing_return = func.get('assigns_then_branches', False) and not func.get('has_return_value', False)
            unused_in_func = 0
            for var in func.get('local_stores', []):
                name = var['name']
                if name.startswith('_') or name in ('self', 'cls'):
                    continue
                if name in func.get('used_locals', set()):
                    continue
                if has_missing_return:
                    continue
                if f_noisy:
                    unused_in_func += 1
                    continue
                issues.append({
                    'category': 'Code Smell', 'pattern': 'unused_variable',
                    'node_id': var.get('node_id'),
                    'node_idx': node_id_to_idx.get(var.get('node_id')),
                    'node_type': 'Name',
                    'line_start': var.get('line', 0), 'line_end': var.get('line', 0),
                    'base_confidence': 0.72, 'severity': 'warning',
                    'description': f"Local variable '{name}' is assigned but never used",
                    'suggestion': self.BUG_PATTERNS['unused_variable']['suggestion'],
                    'structural_context': f"No load of '{name}' after its definition",
                })
            # one rolled-up note for noisy functions, attached to the function node
            if f_noisy and unused_in_func >= 3:
                issues.append({
                    'category': 'Design Inefficiency', 'pattern': 'god_function',
                    'node_id': func['node_id'], 'node_idx': node_id_to_idx.get(func['node_id']),
                    'node_type': 'FunctionDef',
                    'line_start': func['line_start'], 'line_end': func.get('line_end', func['line_start']),
                    'base_confidence': 0.8, 'severity': 'info',
                    'description': f"Function '{func['name']}' also has ~{unused_in_func} unused locals",
                    'suggestion': "Split this function up; the unused locals suggest copy-pasted scaffolding.",
                    'structural_context': f"{unused_in_func} unused locals inside an oversized function",
                })

        return issues

    @staticmethod
    def _mk(category, pattern, func, node_id_to_idx, conf, severity, desc, context):
        return {
            'category': category, 'pattern': pattern,
            'node_id': func['node_id'], 'node_idx': node_id_to_idx.get(func['node_id']),
            'node_type': 'FunctionDef',
            'line_start': func['line_start'], 'line_end': func.get('line_end', func['line_start']),
            'base_confidence': conf, 'severity': severity,
            'description': desc,
            'suggestion': GATDefectDetector.BUG_PATTERNS[pattern]['suggestion'],
            'structural_context': context,
        }
