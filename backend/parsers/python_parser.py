import ast
import sys
from typing import Dict, List, Optional, Any, Tuple


class PythonASTParser:
    NODE_TYPE_MAP = {
        ast.Module: 'Module',
        ast.FunctionDef: 'FunctionDef',
        ast.AsyncFunctionDef: 'AsyncFunctionDef',
        ast.ClassDef: 'ClassDef',
        ast.Return: 'Return',
        ast.Delete: 'Delete',
        ast.Assign: 'Assign',
        ast.AugAssign: 'AugAssign',
        ast.AnnAssign: 'AnnAssign',
        ast.For: 'For',
        ast.AsyncFor: 'AsyncFor',
        ast.While: 'While',
        ast.If: 'If',
        ast.With: 'With',
        ast.AsyncWith: 'AsyncWith',
        ast.Raise: 'Raise',
        ast.Try: 'Try',
        ast.Assert: 'Assert',
        ast.Import: 'Import',
        ast.ImportFrom: 'ImportFrom',
        ast.ExceptHandler: 'ExceptHandler',
        ast.Global: 'Global',
        ast.Nonlocal: 'Nonlocal',
        ast.Expr: 'Expr',
        ast.Pass: 'Pass',
        ast.Break: 'Break',
        ast.Continue: 'Continue',
        ast.BoolOp: 'BoolOp',
        ast.NamedExpr: 'NamedExpr',
        ast.BinOp: 'BinOp',
        ast.UnaryOp: 'UnaryOp',
        ast.Lambda: 'Lambda',
        ast.IfExp: 'IfExp',
        ast.Dict: 'Dict',
        ast.Set: 'Set',
        ast.ListComp: 'ListComp',
        ast.SetComp: 'SetComp',
        ast.DictComp: 'DictComp',
        ast.GeneratorExp: 'GeneratorExp',
        ast.Await: 'Await',
        ast.Yield: 'Yield',
        ast.YieldFrom: 'YieldFrom',
        ast.Compare: 'Compare',
        ast.Call: 'Call',
        ast.FormattedValue: 'FormattedValue',
        ast.JoinedStr: 'JoinedStr',
        ast.Constant: 'Constant',
        ast.Attribute: 'Attribute',
        ast.Subscript: 'Subscript',
        ast.Starred: 'Starred',
        ast.Name: 'Name',
        ast.List: 'List',
        ast.Tuple: 'Tuple',
        ast.Slice: 'Slice',
    }

    def parse(self, source_code: str, file_path: str = '') -> Optional[Dict]:
        try:
            tree = ast.parse(source_code, filename=file_path)
        except SyntaxError:
            return None

        nodes = []
        edges = []
        node_counter = [0]
        node_map = {}

        def get_node_id():
            nid = node_counter[0]
            node_counter[0] += 1
            return nid

        def get_token(node):
            if isinstance(node, ast.Name):
                return node.id
            if isinstance(node, ast.Constant):
                return str(node.value)[:50]
            if isinstance(node, ast.Attribute):
                return node.attr
            if isinstance(node, ast.FunctionDef) or isinstance(node, ast.AsyncFunctionDef):
                return node.name
            if isinstance(node, ast.ClassDef):
                return node.name
            if isinstance(node, ast.Import):
                return ','.join(a.name for a in node.names)
            if isinstance(node, ast.ImportFrom):
                return node.module or ''
            return ''

        def get_context(node):
            if isinstance(node, ast.Name):
                if isinstance(node.ctx, ast.Store):
                    return 'Store'
                elif isinstance(node.ctx, ast.Load):
                    return 'Load'
                elif isinstance(node.ctx, ast.Del):
                    return 'Del'
            return ''

        def visit(node, parent_id=None, depth=0, control_depth=0):
            node_type = self.NODE_TYPE_MAP.get(type(node), type(node).__name__)
            nid = get_node_id()
            node_map[id(node)] = nid

            node_info = {
                'id': nid,
                'type': node_type,
                'token': get_token(node),
                'context': get_context(node),
                'line_start': getattr(node, 'lineno', 0),
                'line_end': getattr(node, 'end_lineno', getattr(node, 'lineno', 0)),
                'col_offset': getattr(node, 'col_offset', 0),
                'depth': depth,
                'control_depth': control_depth,
                'in_degree': 0,
                'num_children': 0,
            }
            if isinstance(node, ast.ExceptHandler):
                node_info['is_bare'] = node.type is None
            nodes.append(node_info)

            if parent_id is not None:
                edges.append({
                    'source': parent_id,
                    'target': nid,
                    'type': 'AST'
                })
                for n in nodes:
                    if n['id'] == parent_id:
                        n['num_children'] += 1
                        break
                node_info['in_degree'] += 1

            # control-flow nesting: only these constructs deepen nesting, and a
            # nested function definition RESETS the counter (a closure is not
            # "deeper" control flow — it's a new scope).
            #
            # Special-case elif: Python represents `elif` as an If nested in the
            # parent If's `orelse`. Visually an elif is a SIBLING branch, not a
            # deeper level, so we keep elif chains at the same control_depth
            # rather than incrementing for each elif.
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                for child in ast.iter_child_nodes(node):
                    visit(child, nid, depth + 1, 0)
            elif isinstance(node, ast.If):
                deeper = control_depth + 1
                # body of the if is one level deeper
                for child in node.body:
                    visit(child, nid, depth + 1, deeper)
                # the test / decorators etc. live at the if's own level
                for child in ast.iter_child_nodes(node):
                    if child in node.body or child in node.orelse:
                        continue
                    visit(child, nid, depth + 1, deeper)
                # orelse: a lone If is an elif (same level); a real else block
                # of statements goes one level deeper
                if len(node.orelse) == 1 and isinstance(node.orelse[0], ast.If):
                    visit(node.orelse[0], nid, depth + 1, control_depth)
                else:
                    for child in node.orelse:
                        visit(child, nid, depth + 1, deeper)
            elif isinstance(node, (ast.For, ast.AsyncFor, ast.While, ast.With, ast.AsyncWith, ast.Try)):
                child_control = control_depth + 1
                for child in ast.iter_child_nodes(node):
                    visit(child, nid, depth + 1, child_control)
            else:
                child_control = control_depth
                for child in ast.iter_child_nodes(node):
                    visit(child, nid, depth + 1, child_control)

        visit(tree)

        functions = self._extract_functions(tree, nodes, node_map)
        cfg_edges = self._build_cfg(tree, node_map)
        dfg_edges = self._build_dfg(tree, node_map)

        return {
            'nodes': nodes,
            'edges': edges,
            'cfg_edges': cfg_edges,
            'dfg_edges': dfg_edges,
            'functions': functions,
            'language': 'Python',
            'file_path': file_path,
            'num_lines': source_code.count('\n') + 1
        }

    def _extract_functions(self, tree, nodes, node_map):
        functions = []
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                args = [a.arg for a in node.args.args]

                # ---- return analysis: does any return carry a value? ----
                has_return_value = False
                for n in ast.walk(node):
                    if isinstance(n, ast.Return) and n.value is not None:
                        has_return_value = True
                        break

                # ---- "assigns then branches": computes a local inside an if/elif
                # branch but the function never returns it. This is the precise
                # signature of a missing-return bug, vs. a pure side-effect proc. ----
                assigns_in_branch = False
                for n in ast.walk(node):
                    if isinstance(n, ast.If):
                        for sub in ast.walk(n):
                            if isinstance(sub, (ast.Assign, ast.AnnAssign)):
                                assigns_in_branch = True
                                break
                    if assigns_in_branch:
                        break

                # ---- mutable default arguments ----
                mutable_default = any(
                    isinstance(d, (ast.List, ast.Dict, ast.Set))
                    for d in node.args.defaults
                )

                # ---- local def-use for unused-variable detection ----
                local_stores, used_locals = self._local_def_use(node, node_map)

                # ---- comparison to None with == / != ----
                none_cmps = []
                for n in ast.walk(node):
                    if isinstance(n, ast.Compare):
                        for op, comp in zip(n.ops, n.comparators):
                            if isinstance(op, (ast.Eq, ast.NotEq)) and (
                                (isinstance(comp, ast.Constant) and comp.value is None)
                            ):
                                none_cmps.append(getattr(n, 'lineno', 0))
                        # also check the left operand
                        if isinstance(n.left, ast.Constant) and n.left.value is None and \
                                any(isinstance(op, (ast.Eq, ast.NotEq)) for op in n.ops):
                            none_cmps.append(getattr(n, 'lineno', 0))

                # ---- unreachable code after return/raise/break/continue ----
                unreachable = []
                def _check_block(stmts):
                    terminated = False
                    for s in stmts:
                        if terminated:
                            unreachable.append(getattr(s, 'lineno', 0))
                            terminated = False  # only flag the first dead stmt
                        if isinstance(s, (ast.Return, ast.Raise, ast.Break, ast.Continue)):
                            terminated = True
                        # recurse into compound statements
                        for field in ('body', 'orelse', 'finalbody'):
                            if hasattr(s, field):
                                _check_block(getattr(s, field))
                _check_block(node.body)

                # ---- string concatenation in a loop (s = s + ...  or  s += ...) ----
                # Only flag when the accumulator is evidently a STRING: initialised
                # to a string literal, or the concatenated value is a string
                # literal / str() call. Numeric accumulators (running += n) are fine.
                str_vars = set()
                for n in ast.walk(node):
                    if isinstance(n, ast.Assign) and len(n.targets) == 1 and isinstance(n.targets[0], ast.Name):
                        v = n.value
                        if isinstance(v, ast.Constant) and isinstance(v.value, str):
                            str_vars.add(n.targets[0].id)
                        elif isinstance(v, ast.JoinedStr):  # f-string
                            str_vars.add(n.targets[0].id)
                        elif isinstance(v, ast.Call) and isinstance(v.func, ast.Name) and v.func.id == 'str':
                            str_vars.add(n.targets[0].id)

                def _is_str_rhs(val):
                    if isinstance(val, ast.Constant) and isinstance(val.value, str):
                        return True
                    if isinstance(val, ast.JoinedStr):
                        return True
                    if isinstance(val, ast.Call) and isinstance(val.func, ast.Name) and val.func.id == 'str':
                        return True
                    return False

                str_concat = []
                for n in ast.walk(node):
                    if isinstance(n, (ast.For, ast.While)):
                        for sub in ast.walk(n):
                            if isinstance(sub, ast.AugAssign) and isinstance(sub.op, ast.Add) \
                                    and isinstance(sub.target, ast.Name):
                                tgt = sub.target.id
                                if tgt in str_vars or _is_str_rhs(sub.value):
                                    str_concat.append(getattr(sub, 'lineno', 0))
                                    str_vars.add(tgt)
                            elif isinstance(sub, ast.Assign) and isinstance(sub.value, ast.BinOp) \
                                    and isinstance(sub.value.op, ast.Add) \
                                    and len(sub.targets) == 1 and isinstance(sub.targets[0], ast.Name) \
                                    and isinstance(sub.value.left, ast.Name) \
                                    and sub.value.left.id == sub.targets[0].id:
                                tgt = sub.targets[0].id
                                if tgt in str_vars or _is_str_rhs(sub.value.right):
                                    str_concat.append(getattr(sub, 'lineno', 0))
                                    str_vars.add(tgt)

                functions.append({
                    'name': node.name,
                    'node_id': node_map.get(id(node), -1),
                    'line_start': node.lineno,
                    'line_end': getattr(node, 'end_lineno', node.lineno),
                    'args': args,
                    'num_statements': len(node.body),
                    'has_return': any(isinstance(n, ast.Return) for n in ast.walk(node)),
                    'has_return_value': has_return_value,
                    'assigns_then_branches': assigns_in_branch and not has_return_value,
                    'mutable_default': mutable_default,
                    'complexity': self._compute_complexity(node),
                    'local_stores': local_stores,
                    'used_locals': used_locals,
                    'none_comparisons': sorted(set(none_cmps)),
                    'unreachable_lines': sorted(set(unreachable)),
                    'string_concat_lines': sorted(set(str_concat)),
                })
        return functions

    def _local_def_use(self, func_node, node_map):
        """Return (list of stored locals, set of names that are ever loaded /
        mutated / returned). A name counts as 'used' if it is read, augmented,
        used as a call/attribute target, appended to, or returned — this avoids
        the classic false positive of flagging accumulators like `result`."""
        stores = {}          # name -> first store node info
        used = set()
        arg_names = {a.arg for a in func_node.args.args}

        # nested function arg names should not be treated as outer locals
        for n in ast.walk(func_node):
            if isinstance(n, ast.Name):
                if isinstance(n.ctx, ast.Store):
                    if n.id not in stores:
                        nid = node_map.get(id(n))
                        stores[n.id] = {'name': n.id, 'node_id': nid, 'line': n.lineno}
                elif isinstance(n.ctx, ast.Load):
                    used.add(n.id)
            elif isinstance(n, ast.AugAssign) and isinstance(n.target, ast.Name):
                used.add(n.target.id)  # x += 1 reads x
            elif isinstance(n, ast.Attribute) and isinstance(n.value, ast.Name):
                used.add(n.value.id)   # obj.method() uses obj
            elif isinstance(n, ast.Subscript) and isinstance(n.value, ast.Name):
                used.add(n.value.id)   # arr[i] uses arr

        # don't report arguments as unused locals here
        stores = {k: v for k, v in stores.items() if k not in arg_names}
        return list(stores.values()), used

    def _compute_complexity(self, node):
        complexity = 1
        for child in ast.walk(node):
            if isinstance(child, (ast.If, ast.While, ast.For, ast.AsyncFor)):
                complexity += 1
            elif isinstance(child, ast.BoolOp):
                complexity += len(child.values) - 1
            elif isinstance(child, (ast.ExceptHandler,)):
                complexity += 1
            elif isinstance(child, (ast.Assert,)):
                complexity += 1
        return complexity

    def _build_cfg(self, tree, node_map):
        cfg_edges = []
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                self._build_function_cfg(node, node_map, cfg_edges)
        return cfg_edges

    def _build_function_cfg(self, func_node, node_map, cfg_edges):
        stmts = func_node.body
        for i in range(len(stmts) - 1):
            src_id = node_map.get(id(stmts[i]))
            tgt_id = node_map.get(id(stmts[i + 1]))
            if src_id is not None and tgt_id is not None:
                cfg_edges.append({
                    'source': src_id,
                    'target': tgt_id,
                    'type': 'CFG',
                    'label': 'sequential'
                })

        for stmt in stmts:
            self._build_stmt_cfg(stmt, node_map, cfg_edges)

    def _build_stmt_cfg(self, stmt, node_map, cfg_edges):
        stmt_id = node_map.get(id(stmt))
        if stmt_id is None:
            return

        if isinstance(stmt, ast.If):
            if stmt.body:
                body_id = node_map.get(id(stmt.body[0]))
                if body_id is not None:
                    cfg_edges.append({
                        'source': stmt_id, 'target': body_id,
                        'type': 'CFG', 'label': 'true_branch'
                    })
                for i in range(len(stmt.body) - 1):
                    s = node_map.get(id(stmt.body[i]))
                    t = node_map.get(id(stmt.body[i + 1]))
                    if s is not None and t is not None:
                        cfg_edges.append({'source': s, 'target': t, 'type': 'CFG', 'label': 'sequential'})

            if stmt.orelse:
                else_id = node_map.get(id(stmt.orelse[0]))
                if else_id is not None:
                    cfg_edges.append({
                        'source': stmt_id, 'target': else_id,
                        'type': 'CFG', 'label': 'false_branch'
                    })
                for i in range(len(stmt.orelse) - 1):
                    s = node_map.get(id(stmt.orelse[i]))
                    t = node_map.get(id(stmt.orelse[i + 1]))
                    if s is not None and t is not None:
                        cfg_edges.append({'source': s, 'target': t, 'type': 'CFG', 'label': 'sequential'})

        elif isinstance(stmt, (ast.For, ast.AsyncFor)):
            if stmt.body:
                body_id = node_map.get(id(stmt.body[0]))
                if body_id is not None:
                    cfg_edges.append({
                        'source': stmt_id, 'target': body_id,
                        'type': 'CFG', 'label': 'loop_body'
                    })
                last_body = node_map.get(id(stmt.body[-1]))
                if last_body is not None:
                    cfg_edges.append({
                        'source': last_body, 'target': stmt_id,
                        'type': 'CFG', 'label': 'back_edge'
                    })

        elif isinstance(stmt, ast.While):
            if stmt.body:
                body_id = node_map.get(id(stmt.body[0]))
                if body_id is not None:
                    cfg_edges.append({
                        'source': stmt_id, 'target': body_id,
                        'type': 'CFG', 'label': 'loop_body'
                    })
                last_body = node_map.get(id(stmt.body[-1]))
                if last_body is not None:
                    cfg_edges.append({
                        'source': last_body, 'target': stmt_id,
                        'type': 'CFG', 'label': 'back_edge'
                    })

        elif isinstance(stmt, ast.Try):
            if stmt.body:
                body_id = node_map.get(id(stmt.body[0]))
                if body_id is not None:
                    cfg_edges.append({
                        'source': stmt_id, 'target': body_id,
                        'type': 'CFG', 'label': 'try_body'
                    })
            for handler in stmt.handlers:
                handler_id = node_map.get(id(handler))
                if handler_id is not None:
                    cfg_edges.append({
                        'source': stmt_id, 'target': handler_id,
                        'type': 'CFG', 'label': 'exception_handler'
                    })

        for child in ast.iter_child_nodes(stmt):
            if isinstance(child, ast.stmt):
                self._build_stmt_cfg(child, node_map, cfg_edges)

    def _build_dfg(self, tree, node_map):
        dfg_edges = []
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                self._build_function_dfg(node, node_map, dfg_edges)
        return dfg_edges

    def _build_function_dfg(self, func_node, node_map, dfg_edges):
        definitions = {}

        for node in ast.walk(func_node):
            if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Store):
                nid = node_map.get(id(node))
                if nid is not None:
                    definitions[node.id] = definitions.get(node.id, [])
                    definitions[node.id].append(nid)

            if isinstance(node, ast.arg):
                nid = node_map.get(id(node))
                if nid is not None:
                    definitions[node.arg] = definitions.get(node.arg, [])
                    definitions[node.arg].append(nid)

        for node in ast.walk(func_node):
            if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Load):
                use_id = node_map.get(id(node))
                if use_id is not None and node.id in definitions:
                    for def_id in definitions[node.id]:
                        if def_id != use_id:
                            dfg_edges.append({
                                'source': def_id,
                                'target': use_id,
                                'type': 'DFG',
                                'variable': node.id
                            })

        return dfg_edges
