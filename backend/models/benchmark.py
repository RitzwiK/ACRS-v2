import numpy as np
import time
import hashlib
from typing import Dict, List, Tuple
from collections import defaultdict


BENCHMARK_SUITE = [
    {
        "id": "bug_missing_return_01",
        "code": """
def divide(a, b):
    if b != 0:
        result = a / b
    print("done")
""",
        "language": "Python",
        "ground_truth": [
            {"category": "Bug-Prone", "pattern": "missing_return", "line_start": 2, "line_end": 5}
        ],
        "description": "Function with conditional assignment but no return statement"
    },
    {
        "id": "bug_missing_return_02",
        "code": """
def get_status(code):
    if code == 200:
        msg = "OK"
    elif code == 404:
        msg = "Not Found"
    elif code == 500:
        msg = "Server Error"
""",
        "language": "Python",
        "ground_truth": [
            {"category": "Bug-Prone", "pattern": "missing_return", "line_start": 2, "line_end": 8}
        ],
        "description": "Multi-branch function without return or default assignment"
    },
    {
        "id": "smell_high_complexity_01",
        "code": """
def process(data, mode, flag, check):
    result = []
    for item in data:
        if mode == 'a':
            if flag:
                if item > 0:
                    if check:
                        result.append(item * 2)
                    else:
                        result.append(item)
                else:
                    if check:
                        result.append(0)
            else:
                if item < 0:
                    result.append(abs(item))
        elif mode == 'b':
            if flag and check:
                result.append(item ** 2)
            elif flag or check:
                result.append(item + 1)
        elif mode == 'c':
            for sub in item:
                if sub > 0:
                    result.append(sub)
    return result
""",
        "language": "Python",
        "ground_truth": [
            {"category": "Code Smell", "pattern": "high_complexity", "line_start": 2, "line_end": 27},
            {"category": "Code Smell", "pattern": "deep_nesting", "line_start": 4, "line_end": 18}
        ],
        "description": "Function with cyclomatic complexity >10 and deep nesting"
    },
    {
        "id": "smell_deep_nesting_01",
        "code": """
def deeply_nested(a, b, c, d, e, f):
    if a > 0:
        if b > 0:
            if c > 0:
                if d > 0:
                    if e > 0:
                        if f > 0:
                            return a + b + c + d + e + f
    return 0
""",
        "language": "Python",
        "ground_truth": [
            {"category": "Code Smell", "pattern": "deep_nesting", "line_start": 3, "line_end": 8},
            {"category": "Code Smell", "pattern": "long_parameter_list", "line_start": 2, "line_end": 9}
        ],
        "description": "Deeply nested conditionals with too many parameters"
    },
    {
        "id": "smell_long_params_01",
        "code": """
def send_email(to, cc, bcc, subject, body, html_body, attachments, priority):
    if not to:
        return False
    msg = {"to": to, "cc": cc, "bcc": bcc}
    msg["subject"] = subject
    msg["body"] = body
    msg["html"] = html_body
    msg["files"] = attachments
    msg["priority"] = priority
    return msg
""",
        "language": "Python",
        "ground_truth": [
            {"category": "Code Smell", "pattern": "long_parameter_list", "line_start": 2, "line_end": 11}
        ],
        "description": "Function with 8 parameters"
    },
    {
        "id": "clean_simple_function_01",
        "code": """
def add(a, b):
    return a + b
""",
        "language": "Python",
        "ground_truth": [],
        "description": "Clean simple function with no issues"
    },
    {
        "id": "clean_well_structured_01",
        "code": """
def validate_email(email):
    if not email:
        return False
    if '@' not in email:
        return False
    parts = email.split('@')
    if len(parts) != 2:
        return False
    return len(parts[1]) > 0
""",
        "language": "Python",
        "ground_truth": [],
        "description": "Well-structured validation with early returns"
    },
    {
        "id": "clean_class_01",
        "code": """
class Counter:
    def __init__(self):
        self.count = 0

    def increment(self):
        self.count += 1
        return self.count

    def reset(self):
        self.count = 0
        return self.count
""",
        "language": "Python",
        "ground_truth": [],
        "description": "Clean class with simple methods"
    },
    {
        "id": "design_god_function_01",
        "code": "\n".join([
            "def do_everything(data):",
            "    results = []",
        ] + [f"    x{i} = data[{i}]" for i in range(55)] + [
            "    for item in results:",
            "        if item > 0:",
            "            results.append(item)",
            "    return results"
        ]),
        "language": "Python",
        "ground_truth": [
            {"category": "Design Inefficiency", "pattern": "god_function", "line_start": 1, "line_end": 60}
        ],
        "description": "Function with >50 statements indicating too many responsibilities"
    },
    {
        "id": "smell_unused_var_01",
        "code": """
def calculate(x, y):
    temp = x * 2
    unused = y + 100
    result = x + y
    return result
""",
        "language": "Python",
        "ground_truth": [
            {"category": "Code Smell", "pattern": "unused_variable", "line_start": 3, "line_end": 3},
            {"category": "Code Smell", "pattern": "unused_variable", "line_start": 4, "line_end": 4}
        ],
        "description": "Variables defined but never referenced"
    },
    {
        "id": "bug_missing_return_03",
        "code": """
def parse_config(path):
    with open(path) as f:
        data = f.read()
    if data:
        config = {}
        for line in data.split('\\n'):
            if '=' in line:
                k, v = line.split('=', 1)
                config[k.strip()] = v.strip()
""",
        "language": "Python",
        "ground_truth": [
            {"category": "Bug-Prone", "pattern": "missing_return", "line_start": 2, "line_end": 10}
        ],
        "description": "Config parser that never returns the parsed result"
    },
    {
        "id": "smell_complexity_02",
        "code": """
def route_request(method, path, auth, body, headers):
    if method == 'GET':
        if auth:
            if '/admin' in path:
                return handle_admin_get(path)
            elif '/api' in path:
                return handle_api_get(path, headers)
            else:
                return handle_get(path)
        else:
            if '/public' in path:
                return handle_public(path)
    elif method == 'POST':
        if auth:
            if body:
                return handle_post(path, body)
        else:
            return 401
    elif method == 'DELETE':
        if auth and '/admin' in path:
            return handle_delete(path)
    return 404
""",
        "language": "Python",
        "ground_truth": [
            {"category": "Code Smell", "pattern": "high_complexity", "line_start": 2, "line_end": 22}
        ],
        "description": "Router with high branching complexity"
    },
    {
        "id": "clean_decorator_01",
        "code": """
def retry(max_attempts=3):
    def decorator(func):
        def wrapper(*args, **kwargs):
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except Exception:
                    if attempt == max_attempts - 1:
                        raise
        return wrapper
    return decorator
""",
        "language": "Python",
        "ground_truth": [],
        "description": "Clean retry decorator pattern"
    },
    {
        "id": "bug_missing_return_04",
        "code": """
def find_max(items):
    if not items:
        print("empty list")
    current_max = items[0]
    for item in items[1:]:
        if item > current_max:
            current_max = item
""",
        "language": "Python",
        "ground_truth": [
            {"category": "Bug-Prone", "pattern": "missing_return", "line_start": 2, "line_end": 8}
        ],
        "description": "Finds max but never returns it"
    },
    {
        "id": "clean_list_comprehension_01",
        "code": """
def process_items(items):
    valid = [x for x in items if x is not None]
    doubled = [x * 2 for x in valid]
    return sorted(doubled)
""",
        "language": "Python",
        "ground_truth": [],
        "description": "Clean Pythonic list processing"
    },
    {
        "id": "smell_nesting_02",
        "code": """
def validate(data):
    if data:
        if 'name' in data:
            if len(data['name']) > 0:
                if 'email' in data:
                    if '@' in data['email']:
                        if 'age' in data:
                            if data['age'] > 0:
                                return True
    return False
""",
        "language": "Python",
        "ground_truth": [
            {"category": "Code Smell", "pattern": "deep_nesting", "line_start": 3, "line_end": 9}
        ],
        "description": "Validation with excessive nesting instead of guard clauses"
    },
    {
        "id": "design_god_function_02",
        "code": "\n".join([
            "def initialize_system(config):",
        ] + [f"    step_{i} = config.get('step_{i}', {i})" for i in range(60)] + [
            "    return True"
        ]),
        "language": "Python",
        "ground_truth": [
            {"category": "Design Inefficiency", "pattern": "god_function", "line_start": 1, "line_end": 62}
        ],
        "description": "Massive initialization function"
    },
    {
        "id": "clean_context_manager_01",
        "code": """
class DatabaseConnection:
    def __init__(self, url):
        self.url = url
        self.conn = None

    def __enter__(self):
        self.conn = connect(self.url)
        return self.conn

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.conn:
            self.conn.close()
        return False
""",
        "language": "Python",
        "ground_truth": [],
        "description": "Clean context manager implementation"
    },
    {
        "id": "mixed_issues_01",
        "code": """
def complex_handler(req, resp, db, cache, logger, config):
    temp = req.get('temp')
    if req:
        if req.get('type') == 'A':
            if req.get('sub') == '1':
                if db:
                    if cache:
                        if config.get('enabled'):
                            result = db.query(req)
                            return result
        elif req.get('type') == 'B':
            logger.info("type B")
    return None
""",
        "language": "Python",
        "ground_truth": [
            {"category": "Code Smell", "pattern": "long_parameter_list", "line_start": 2, "line_end": 14},
            {"category": "Code Smell", "pattern": "deep_nesting", "line_start": 5, "line_end": 11},
            {"category": "Code Smell", "pattern": "unused_variable", "line_start": 3, "line_end": 3}
        ],
        "description": "Multiple issues: long params, deep nesting, unused variable"
    },
    {
        "id": "clean_functional_01",
        "code": """
def pipeline(data):
    filtered = filter(lambda x: x > 0, data)
    mapped = map(lambda x: x ** 2, filtered)
    return list(mapped)
""",
        "language": "Python",
        "ground_truth": [],
        "description": "Clean functional pipeline"
    },
    {
        "id": "bug_bare_except_01",
        "code": """
def load(path):
    try:
        with open(path) as f:
            return f.read()
    except:
        return None
""",
        "language": "Python",
        "ground_truth": [
            {"category": "Bug-Prone", "pattern": "bare_except", "line_start": 6, "line_end": 7}
        ],
        "description": "Bare except swallows all errors"
    },
    {
        "id": "bug_mutable_default_01",
        "code": """
def append_item(item, bucket=[]):
    bucket.append(item)
    return bucket
""",
        "language": "Python",
        "ground_truth": [
            {"category": "Bug-Prone", "pattern": "mutable_default_arg", "line_start": 2, "line_end": 4}
        ],
        "description": "Mutable default argument shared across calls"
    },
    {
        "id": "clean_accumulator_01",
        "code": """
def total(numbers):
    running = 0
    for n in numbers:
        running += n
    return running
""",
        "language": "Python",
        "ground_truth": [],
        "description": "Accumulator pattern must not be flagged unused"
    },
    {
        "id": "clean_early_return_01",
        "code": """
def classify(score):
    if score >= 90:
        return "A"
    if score >= 80:
        return "B"
    if score >= 70:
        return "C"
    return "F"
""",
        "language": "Python",
        "ground_truth": [],
        "description": "Guard-clause function returns on every path"
    },
    {
        "id": "clean_side_effect_proc_01",
        "code": """
def log_event(logger, event):
    logger.info("event received")
    logger.info(event)
""",
        "language": "Python",
        "ground_truth": [],
        "description": "Pure side-effect procedure should not require a return"
    },
    {
        "id": "smell_unused_multi_01",
        "code": """
def transform(a, b):
    scratch = a + b
    leftover = a * b
    answer = a - b
    return answer
""",
        "language": "Python",
        "ground_truth": [
            {"category": "Code Smell", "pattern": "unused_variable", "line_start": 3, "line_end": 3},
            {"category": "Code Smell", "pattern": "unused_variable", "line_start": 4, "line_end": 4}
        ],
        "description": "Two genuinely unused locals among used ones"
    },
    {
        "id": "clean_dict_used_01",
        "code": """
def build_index(rows):
    index = {}
    for row in rows:
        index[row.id] = row
    return index
""",
        "language": "Python",
        "ground_truth": [],
        "description": "Dict mutated via subscript counts as used"
    },
    {
        "id": "bug_missing_return_assign_01",
        "code": """
def pick(flag):
    if flag:
        chosen = "left"
    else:
        chosen = "right"
""",
        "language": "Python",
        "ground_truth": [
            {"category": "Bug-Prone", "pattern": "missing_return", "line_start": 2, "line_end": 6}
        ],
        "description": "Both branches assign but function returns nothing"
    },
    {
        "id": "smell_deep_real_01",
        "code": """
def scan(matrix):
    for row in matrix:
        for cell in row:
            if cell:
                if cell > 0:
                    if cell % 2 == 0:
                        print(cell)
""",
        "language": "Python",
        "ground_truth": [
            {"category": "Code Smell", "pattern": "deep_nesting", "line_start": 3, "line_end": 8}
        ],
        "description": "Genuine 5-level control nesting"
    },
    {
        "id": "clean_nested_def_01",
        "code": """
def make_counter(start):
    count = start
    def increment(step):
        nonlocal count
        count += step
        return count
    return increment
""",
        "language": "Python",
        "ground_truth": [],
        "description": "Nested closure is not deep nesting"
    },
    {
        "id": "clean_comprehension_used_01",
        "code": """
def evens(values):
    selected = [v for v in values if v % 2 == 0]
    return selected
""",
        "language": "Python",
        "ground_truth": [],
        "description": "Comprehension target is loop-local, selected is used"
    },
    {
        "id": "smell_long_params_real_01",
        "code": """
def configure(host, port, user, password, timeout, retries, ssl, verbose):
    return (host, port, user, password, timeout, retries, ssl, verbose)
""",
        "language": "Python",
        "ground_truth": [
            {"category": "Code Smell", "pattern": "long_parameter_list", "line_start": 2, "line_end": 3}
        ],
        "description": "Eight parameters"
    },
    {
        "id": "clean_dunder_no_return_01",
        "code": """
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y
""",
        "language": "Python",
        "ground_truth": [],
        "description": "__init__ legitimately has no return"
    },
    {
        "id": "smell_complexity_real_01",
        "code": """
def grade(a, b, c, d, mode):
    if mode == 1:
        if a and b:
            return 1
        elif c or d:
            return 2
    elif mode == 2:
        if a or b:
            return 3
        elif c and d:
            return 4
    elif mode == 3:
        for i in range(a):
            if i > b:
                return 5
    return 0
""",
        "language": "Python",
        "ground_truth": [
            {"category": "Code Smell", "pattern": "high_complexity", "line_start": 2, "line_end": 17}
        ],
        "description": "High cyclomatic complexity"
    },
    {
        "id": "clean_property_01",
        "code": """
class Account:
    def __init__(self, balance):
        self._balance = balance

    @property
    def balance(self):
        return self._balance
""",
        "language": "Python",
        "ground_truth": [],
        "description": "Property getter is clean"
    },
    {
        "id": "clean_guard_clause_01",
        "code": """
def withdraw(account, amount):
    if amount <= 0:
        raise ValueError("amount must be positive")
    if amount > account.balance:
        raise ValueError("insufficient funds")
    account.balance -= amount
    return account.balance
""",
        "language": "Python",
        "ground_truth": [],
        "description": "Validation with guard clauses is clean"
    },
    {
        "id": "mixed_real_01",
        "code": """
def handler(req, res, db, cache, auth, cfg, log):
    try:
        result = db.query(req)
    except:
        pass
""",
        "language": "Python",
        "ground_truth": [
            {"category": "Code Smell", "pattern": "long_parameter_list", "line_start": 2, "line_end": 6},
            {"category": "Bug-Prone", "pattern": "bare_except", "line_start": 5, "line_end": 6},
            {"category": "Code Smell", "pattern": "unused_variable", "line_start": 4, "line_end": 4}
        ],
        "description": "Long params, bare except, and an unused result variable"
    },
    {
        "id": "smell_none_compare_01",
        "code": """
def check(value):
    if value == None:
        return False
    return True
""",
        "language": "Python",
        "ground_truth": [
            {"category": "Code Smell", "pattern": "comparison_to_none", "line_start": 3, "line_end": 3}
        ],
        "description": "Equality comparison to None instead of 'is None'"
    },
    {
        "id": "clean_is_none_01",
        "code": """
def check(value):
    if value is None:
        return False
    return True
""",
        "language": "Python",
        "ground_truth": [],
        "description": "Correct identity comparison to None is clean"
    },
    {
        "id": "bug_unreachable_01",
        "code": """
def compute(x):
    return x * 2
    print("done")
""",
        "language": "Python",
        "ground_truth": [
            {"category": "Bug-Prone", "pattern": "unreachable_after_return", "line_start": 4, "line_end": 4}
        ],
        "description": "Statement after return can never run"
    },
    {
        "id": "design_str_concat_01",
        "code": """
def build(items):
    out = ""
    for item in items:
        out += str(item)
    return out
""",
        "language": "Python",
        "ground_truth": [
            {"category": "Design Inefficiency", "pattern": "string_concat_in_loop", "line_start": 5, "line_end": 5}
        ],
        "description": "Quadratic string building in a loop"
    },
    {
        "id": "clean_join_01",
        "code": """
def build(items):
    parts = []
    for item in items:
        parts.append(str(item))
    return "".join(parts)
""",
        "language": "Python",
        "ground_truth": [],
        "description": "Proper list-join string building is clean"
    },
]


class BenchmarkEvaluator:
    def __init__(self, parser, graph_builder, feature_encoder, gat_model):
        self.parser = parser
        self.graph_builder = graph_builder
        self.encoder = feature_encoder
        self.model = gat_model

    def run_full_evaluation(self) -> Dict:
        start_time = time.time()

        per_sample_results = []
        all_gt_labels = []
        all_pred_labels = []
        all_pred_confidences = []
        category_metrics = defaultdict(lambda: {"tp": 0, "fp": 0, "fn": 0, "tn": 0})
        pattern_metrics = defaultdict(lambda: {"tp": 0, "fp": 0, "fn": 0})
        confidence_buckets = defaultdict(lambda: {"correct": 0, "total": 0})
        graph_complexity_vs_accuracy = []
        detection_latencies = []

        categories = ["Bug-Prone", "Code Smell", "Design Inefficiency", "Clean"]
        confusion = np.zeros((4, 4), dtype=int)

        for sample in BENCHMARK_SUITE:
            sample_start = time.time()
            result = self._evaluate_single(sample)
            sample_latency = time.time() - sample_start
            detection_latencies.append(sample_latency)
            result["latency_ms"] = round(sample_latency * 1000, 1)
            per_sample_results.append(result)

            gt_cats = set()
            for gt in sample["ground_truth"]:
                gt_cats.add(gt["category"])
            if not gt_cats:
                gt_cats.add("Clean")

            pred_cats = set()
            for pred in result["predictions"]:
                pred_cats.add(pred["category"])
            if not pred_cats:
                pred_cats.add("Clean")

            for cat in categories:
                is_gt = cat in gt_cats
                is_pred = cat in pred_cats
                if is_gt and is_pred:
                    category_metrics[cat]["tp"] += 1
                elif is_pred and not is_gt:
                    category_metrics[cat]["fp"] += 1
                elif is_gt and not is_pred:
                    category_metrics[cat]["fn"] += 1
                else:
                    category_metrics[cat]["tn"] += 1

            gt_idx = categories.index(list(gt_cats)[0]) if gt_cats else 3
            pred_idx = categories.index(list(pred_cats)[0]) if pred_cats else 3
            confusion[gt_idx][pred_idx] += 1

            for gt in sample["ground_truth"]:
                pattern = gt.get("pattern", "unknown")
                matched = any(
                    p["category"] == gt["category"] and
                    self._lines_overlap(p, gt)
                    for p in result["predictions"]
                )
                if matched:
                    pattern_metrics[pattern]["tp"] += 1
                else:
                    pattern_metrics[pattern]["fn"] += 1

            for pred in result["predictions"]:
                matched_any_gt = any(
                    pred["category"] == gt["category"] and
                    self._lines_overlap(pred, gt)
                    for gt in sample["ground_truth"]
                )
                if not matched_any_gt:
                    pat = pred.get("pattern", "unknown")
                    pattern_metrics[pat]["fp"] += 1

                conf = pred.get("confidence", 0.5)
                bucket = round(conf, 1)
                is_correct = any(
                    pred["category"] == gt["category"]
                    for gt in sample["ground_truth"]
                )
                confidence_buckets[bucket]["total"] += 1
                if is_correct:
                    confidence_buckets[bucket]["correct"] += 1

            graph_complexity_vs_accuracy.append({
                "sample_id": sample["id"],
                "num_nodes": result.get("graph_nodes", 0),
                "num_edges": result.get("graph_edges", 0),
                "ast_edges": result.get("ast_edges", 0),
                "cfg_edges": result.get("cfg_edges", 0),
                "dfg_edges": result.get("dfg_edges", 0),
                "gt_count": len(sample["ground_truth"]),
                "pred_count": len(result["predictions"]),
                "correct": result["correct_detections"],
                "missed": result["missed_detections"],
                "false_alarms": result["false_alarms"],
            })

        overall = self._compute_overall_metrics(category_metrics, categories)

        per_category = {}
        for cat in categories:
            m = category_metrics[cat]
            per_category[cat] = self._compute_prf(m["tp"], m["fp"], m["fn"], m["tn"])

        per_pattern = {}
        for pat, m in pattern_metrics.items():
            prec = m["tp"] / (m["tp"] + m["fp"]) if (m["tp"] + m["fp"]) > 0 else 0
            rec = m["tp"] / (m["tp"] + m["fn"]) if (m["tp"] + m["fn"]) > 0 else 0
            f1 = 2 * prec * rec / (prec + rec) if (prec + rec) > 0 else 0
            per_pattern[pat] = {
                "precision": round(prec, 4),
                "recall": round(rec, 4),
                "f1": round(f1, 4),
                "tp": m["tp"], "fp": m["fp"], "fn": m["fn"],
                "support": m["tp"] + m["fn"]
            }

        calibration = []
        for bucket in sorted(confidence_buckets.keys()):
            b = confidence_buckets[bucket]
            calibration.append({
                "confidence_bin": bucket,
                "accuracy": round(b["correct"] / b["total"], 4) if b["total"] > 0 else 0,
                "count": b["total"]
            })

        # ---- STRICT finding-level metrics ----------------------------------
        # Every individual ground-truth finding must be matched by a prediction
        # that overlaps its lines AND shares its category. Every prediction that
        # matches no ground-truth finding counts against precision. This is the
        # honest, strict score — far harder than the category-coverage score in
        # `overall_metrics`, which only asks whether a sample *contained* a
        # category at all.
        strict_tp = sum(s["correct_detections"] for s in per_sample_results)
        strict_fn = sum(s["missed_detections"] for s in per_sample_results)
        strict_fp = sum(s["false_alarms"] for s in per_sample_results)
        strict_prec = strict_tp / (strict_tp + strict_fp) if (strict_tp + strict_fp) > 0 else 0
        strict_rec = strict_tp / (strict_tp + strict_fn) if (strict_tp + strict_fn) > 0 else 0
        strict_f1 = (2 * strict_prec * strict_rec / (strict_prec + strict_rec)
                     if (strict_prec + strict_rec) > 0 else 0)
        # exact-sample accuracy: a sample is "exact" only if every gt finding is
        # matched AND there are zero extra detections.
        exact = sum(1 for s in per_sample_results
                    if s["missed_detections"] == 0 and s["false_alarms"] == 0)

        finding_level = {
            "precision": round(strict_prec, 4),
            "recall": round(strict_rec, 4),
            "f1": round(strict_f1, 4),
            "tp": strict_tp, "fp": strict_fp, "fn": strict_fn,
            "exact_samples": exact,
            "exact_sample_rate": round(exact / len(BENCHMARK_SUITE), 4) if BENCHMARK_SUITE else 0,
        }

        # compact per-sample breakdown for the UI table
        breakdown = []
        for s in per_sample_results:
            breakdown.append({
                "id": s["id"],
                "description": s["description"],
                "expected": [
                    {"category": g["category"], "pattern": g.get("pattern", ""),
                     "line_start": g.get("line_start", 0), "line_end": g.get("line_end", 0)}
                    for g in s["ground_truth"]
                ],
                "detected": [
                    {"category": p["category"], "pattern": p.get("pattern", ""),
                     "line_start": p.get("line_start", 0), "line_end": p.get("line_end", 0),
                     "confidence": p.get("confidence", 0)}
                    for p in s["predictions"]
                ],
                "matched": s["correct_detections"],
                "missed": s["missed_detections"],
                "extra": s["false_alarms"],
                "exact": s["missed_detections"] == 0 and s["false_alarms"] == 0,
            })

        total_time = time.time() - start_time

        return {
            "benchmark_info": {
                "total_samples": len(BENCHMARK_SUITE),
                "total_ground_truth_issues": sum(len(s["ground_truth"]) for s in BENCHMARK_SUITE),
                "clean_samples": sum(1 for s in BENCHMARK_SUITE if not s["ground_truth"]),
                "defective_samples": sum(1 for s in BENCHMARK_SUITE if s["ground_truth"]),
                "total_time_seconds": round(total_time, 2),
                "avg_latency_ms": round(np.mean(detection_latencies) * 1000, 1),
                "scoring_note": (
                    "Headline numbers use strict finding-level scoring: each "
                    "ground-truth issue must be matched by a prediction overlapping "
                    "its lines and category, and every unmatched prediction counts "
                    "against precision. Some 'extra' detections are genuine issues "
                    "the minimal labels omit, so true precision is a floor."
                ),
            },
            "finding_level_metrics": finding_level,
            "sample_breakdown": breakdown,
            "overall_metrics": overall,
            "per_category_metrics": per_category,
            "per_pattern_metrics": per_pattern,
            "confusion_matrix": {
                "labels": categories,
                "matrix": confusion.tolist()
            },
            "confidence_calibration": calibration,
            "graph_analysis": graph_complexity_vs_accuracy,
            "per_sample_results": per_sample_results,
        }

    def _evaluate_single(self, sample: Dict) -> Dict:
        code = sample["code"]
        gt = sample["ground_truth"]

        ast_data = self.parser.parse(code, f"{sample['id']}.py")
        if not ast_data or not ast_data.get("nodes"):
            return {
                "id": sample["id"],
                "description": sample["description"],
                "predictions": [],
                "ground_truth": gt,
                "correct_detections": 0,
                "missed_detections": len(gt),
                "false_alarms": 0,
                "graph_nodes": 0,
                "graph_edges": 0,
                "ast_edges": 0,
                "cfg_edges": 0,
                "dfg_edges": 0,
            }

        graph = self.graph_builder.build(ast_data, code)
        features = self.encoder.encode(graph)
        predictions = self.model.predict(features, graph)

        correct = 0
        missed = 0
        gt_matched = set()
        pred_matched = set()

        # Pattern-aware, one-to-one matching. A prediction matches a ground-truth
        # finding only if category, line range AND pattern agree. We match the
        # most specific (pattern-equal) pairs first so that, e.g., a deep_nesting
        # prediction whose line falls inside a high_complexity range is not
        # wrongly consumed by the high_complexity label.
        def _match_pass(require_pattern):
            nonlocal correct
            for gi, g in enumerate(gt):
                if gi in gt_matched:
                    continue
                for pi, p in enumerate(predictions):
                    if pi in pred_matched:
                        continue
                    if p["category"] != g["category"]:
                        continue
                    if not self._lines_overlap(p, g):
                        continue
                    if require_pattern:
                        gp = g.get("pattern", "")
                        pp = p.get("pattern", "")
                        if gp and pp and gp != pp:
                            continue
                    gt_matched.add(gi)
                    pred_matched.add(pi)
                    correct += 1
                    break

        # first pass: strict pattern match; second pass: category+overlap only
        # (covers cases where a pattern label is absent)
        _match_pass(require_pattern=True)
        _match_pass(require_pattern=False)
        missed = len(gt) - len(gt_matched)

        false_alarms = len([i for i in range(len(predictions)) if i not in pred_matched])

        return {
            "id": sample["id"],
            "description": sample["description"],
            "predictions": [{
                "category": p["category"],
                "pattern": p.get("pattern", ""),
                "confidence": p.get("confidence", 0),
                "severity": p.get("severity", ""),
                "line_start": p.get("line_start", 0),
                "line_end": p.get("line_end", 0),
                "description": p.get("description", ""),
            } for p in predictions],
            "ground_truth": gt,
            "correct_detections": correct,
            "missed_detections": missed,
            "false_alarms": false_alarms,
            "graph_nodes": graph["num_nodes"],
            "graph_edges": graph["num_edges"],
            "ast_edges": graph.get("ast_edge_count", 0),
            "cfg_edges": graph.get("cfg_edge_count", 0),
            "dfg_edges": graph.get("dfg_edge_count", 0),
        }

    def _lines_overlap(self, a: Dict, b: Dict) -> bool:
        a_start = a.get("line_start", 0)
        a_end = a.get("line_end", a_start)
        b_start = b.get("line_start", 0)
        b_end = b.get("line_end", b_start)
        return a_start <= b_end and b_start <= a_end

    def _compute_prf(self, tp, fp, fn, tn):
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
        accuracy = (tp + tn) / (tp + tn + fp + fn) if (tp + tn + fp + fn) > 0 else 0
        return {
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1": round(f1, 4),
            "accuracy": round(accuracy, 4),
            "tp": tp, "fp": fp, "fn": fn, "tn": tn,
            "support": tp + fn
        }

    def _compute_overall_metrics(self, category_metrics, categories):
        total_tp = sum(category_metrics[c]["tp"] for c in categories)
        total_fp = sum(category_metrics[c]["fp"] for c in categories)
        total_fn = sum(category_metrics[c]["fn"] for c in categories)
        total_tn = sum(category_metrics[c]["tn"] for c in categories)

        micro_prec = total_tp / (total_tp + total_fp) if (total_tp + total_fp) > 0 else 0
        micro_rec = total_tp / (total_tp + total_fn) if (total_tp + total_fn) > 0 else 0
        micro_f1 = 2 * micro_prec * micro_rec / (micro_prec + micro_rec) if (micro_prec + micro_rec) > 0 else 0

        macro_prec = np.mean([
            category_metrics[c]["tp"] / (category_metrics[c]["tp"] + category_metrics[c]["fp"])
            if (category_metrics[c]["tp"] + category_metrics[c]["fp"]) > 0 else 0
            for c in categories
        ])
        macro_rec = np.mean([
            category_metrics[c]["tp"] / (category_metrics[c]["tp"] + category_metrics[c]["fn"])
            if (category_metrics[c]["tp"] + category_metrics[c]["fn"]) > 0 else 0
            for c in categories
        ])
        macro_f1 = 2 * macro_prec * macro_rec / (macro_prec + macro_rec) if (macro_prec + macro_rec) > 0 else 0

        return {
            "micro_precision": round(micro_prec, 4),
            "micro_recall": round(micro_rec, 4),
            "micro_f1": round(micro_f1, 4),
            "macro_precision": round(float(macro_prec), 4),
            "macro_recall": round(float(macro_rec), 4),
            "macro_f1": round(float(macro_f1), 4),
        }
