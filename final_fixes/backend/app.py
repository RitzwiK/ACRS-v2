import os
import sys
import json
import shutil
import tempfile
import traceback
import hashlib
from pathlib import Path
from datetime import datetime

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

from parsers.python_parser import PythonASTParser
from parsers.java_parser import JavaParser
from parsers.cpp_parser import CppParser
from parsers.js_parser import JSParser
from parsers.html_parser import HTMLParser_
from parsers.css_parser import CSSParser
from parsers.json_parser import JSONParser
from graph.program_graph import ProgramGraphBuilder
from graph.feature_encoder import FeatureEncoder
from models.gat_model import GATDefectDetector
from models.benchmark import BenchmarkEvaluator
from detectors.ai_code_detector import AICodeDetector
from utils.repo_handler import RepoHandler
from utils.report_generator import ReportGenerator
from utils.graph_exporter import detect_imports, export_graph_for_viz

app = Flask(__name__, static_folder='../frontend/dist', static_url_path='')
CORS(app)

UPLOAD_DIR = tempfile.mkdtemp(prefix='acrs_')
RESULTS_CACHE = {}

PARSERS = {
    '.py': PythonASTParser(),
    '.java': JavaParser(),
    '.c': CppParser(),
    '.cpp': CppParser(),
    '.h': CppParser(),
    '.hpp': CppParser(),
    '.js': JSParser(),
    '.jsx': JSParser(),
    '.ts': JSParser(),
    '.tsx': JSParser(),
    '.mjs': JSParser(),
    '.cjs': JSParser(),
    '.html': HTMLParser_(),
    '.htm': HTMLParser_(),
    '.css': CSSParser(),
    '.scss': CSSParser(),
    '.json': JSONParser(),
}

SUPPORTED_EXTENSIONS = set(PARSERS.keys())

LANG_MAP = {
    '.py': 'Python', '.java': 'Java', '.c': 'C', '.cpp': 'C++', '.h': 'C', '.hpp': 'C++',
    '.js': 'JavaScript', '.jsx': 'JavaScript', '.mjs': 'JavaScript', '.cjs': 'JavaScript',
    '.ts': 'TypeScript', '.tsx': 'TypeScript',
    '.html': 'HTML', '.htm': 'HTML',
    '.css': 'CSS', '.scss': 'CSS',
    '.json': 'JSON',
}

gat_model = GATDefectDetector(
    input_dim=64, hidden_dim=128, output_dim=4,
    num_heads=4, num_layers=3, edge_types=['AST', 'CFG', 'DFG']
)
feature_encoder = FeatureEncoder(embedding_dim=64)
report_generator = ReportGenerator()
ai_detector = AICodeDetector()


@app.route('/')
def serve_frontend():
    if os.path.isdir(app.static_folder):
        return send_from_directory(app.static_folder, 'index.html')
    return jsonify({'status': 'ACRS API running', 'frontend': 'not built'})


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'version': '2.0.0',
        'model': 'GAT-v2 (type-aware, precision-tuned)',
        'modules': ['defect_detection', 'ai_code_detection'],
        'supported_languages': ['Python', 'Java', 'C', 'C++', 'JavaScript', 'TypeScript', 'HTML', 'CSS', 'JSON'],
        'timestamp': datetime.now().isoformat()
    })


# ---------------------------------------------------------------------------
# Snippet analysis — paste a single file / function, no clone required.
# This is the entry point students use to "just try the code".
# ---------------------------------------------------------------------------
@app.route('/api/analyze-snippet', methods=['POST'])
def analyze_snippet():
    data = request.get_json() or {}
    code = data.get('code', '')
    language = data.get('language', 'Python')
    if not code.strip():
        return jsonify({'error': 'No code provided'}), 400
    try:
        result = analyze_source(code, f'snippet.{_ext_for(language)}', language, 'snippet')
        ai = ai_detector.analyze(code, language)
        result['ai_detection'] = ai
        return jsonify(result)
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/ai-detect', methods=['POST'])
def ai_detect():
    """Run only the AI-code detector on a snippet."""
    data = request.get_json() or {}
    code = data.get('code', '')
    language = data.get('language', 'Python')
    if not code.strip():
        return jsonify({'error': 'No code provided'}), 400
    try:
        return jsonify(ai_detector.analyze(code, language))
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/analyze', methods=['POST'])
def analyze_repository():
    data = request.get_json()
    if not data or 'repo_url' not in data:
        return jsonify({'error': 'Repository URL is required'}), 400

    repo_url = data['repo_url']
    branch = data.get('branch', 'main')
    run_ai = data.get('ai_detection', True)
    scan_id = hashlib.md5(f"{repo_url}:{branch}:{datetime.now().isoformat()}".encode()).hexdigest()[:12]

    try:
        repo_handler = RepoHandler(UPLOAD_DIR)
        repo_path, repo_info = repo_handler.clone_repository(repo_url, branch)
        source_files = repo_handler.discover_source_files(repo_path, SUPPORTED_EXTENSIONS)

        if not source_files:
            return jsonify({
                'error': 'No supported source files found in repository',
                'supported': list(SUPPORTED_EXTENSIONS)
            }), 400

        analysis_results = _empty_results(scan_id, repo_info)
        all_confidences = []
        ai_likelihoods = []

        # Safety bounds so a single request can never hang the server / hit a
        # platform timeout: cap the number of files analysed and skip individual
        # files that are pathologically large. These limits are generous enough
        # that normal repositories are fully covered.
        MAX_FILES = 120
        MAX_FILE_LINES = 6000
        skipped_large = 0
        if len(source_files) > MAX_FILES:
            source_files = source_files[:MAX_FILES]
            analysis_results['truncated'] = True

        for file_path in source_files:
            try:
                rel_path = str(Path(file_path).relative_to(repo_path))
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    source_code = f.read()
                if len(source_code.strip()) < 10:
                    continue
                if source_code.count('\n') > MAX_FILE_LINES:
                    skipped_large += 1
                    continue
                ext = Path(file_path).suffix.lower()
                language = LANG_MAP.get(ext, 'Unknown')

                result = analyze_source(source_code, rel_path, language, rel_path)
                if not result:
                    continue

                if run_ai:
                    ai = ai_detector.analyze(source_code, language)
                    result['ai_detection'] = ai
                    ai_likelihoods.append(ai['ai_likelihood'])

                _accumulate(analysis_results, result, all_confidences)

            except Exception as e:
                analysis_results['files'].append({
                    'path': str(Path(file_path).relative_to(repo_path)),
                    'error': str(e), 'issues': []
                })

        _finalize(analysis_results, all_confidences, ai_likelihoods)
        analysis_results['report'] = report_generator.generate(analysis_results)
        RESULTS_CACHE[scan_id] = analysis_results

        shutil.rmtree(repo_path, ignore_errors=True)
        return jsonify(analysis_results)

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


# ---------------------------------------------------------------------------
# Core single-file analysis (shared by snippet + repo paths)
# ---------------------------------------------------------------------------
def analyze_source(source_code, rel_path, language, file_key):
    ext = '.' + _ext_for(language)
    parser = PARSERS.get(ext, PARSERS.get(Path(rel_path).suffix.lower()))
    if not parser:
        return None

    ast_data = parser.parse(source_code, rel_path)
    if not ast_data or not ast_data.get('nodes'):
        return None

    graph_builder = ProgramGraphBuilder()
    program_graph = graph_builder.build(ast_data, source_code)
    encoded_features = feature_encoder.encode(program_graph)
    predictions = gat_model.predict(encoded_features, program_graph)

    issues = []
    for pred in predictions:
        if pred['category'] != 'Clean':
            issues.append({
                'category': pred['category'],
                'confidence': round(pred['confidence'], 3),
                'severity': pred['severity'],
                'line_start': pred.get('line_start', 0),
                'line_end': pred.get('line_end', 0),
                'node_type': pred.get('node_type', ''),
                'description': pred.get('description', ''),
                'suggestion': pred.get('suggestion', ''),
                'pattern': pred.get('pattern', ''),
                'attention_weights': pred.get('attention_weights', {}),
                'structural_context': pred.get('structural_context', ''),
            })

    import_info = detect_imports(source_code, language)
    graph_viz = export_graph_for_viz(program_graph, max_nodes=200)

    return {
        'path': rel_path,
        'language': language,
        'lines': source_code.count('\n') + 1,
        'size_bytes': len(source_code.encode('utf-8')),
        'issues': issues,
        'issue_count': len(issues),
        'imports': import_info,
        'graph_info': {
            'num_nodes': program_graph['num_nodes'],
            'num_edges': program_graph['num_edges'],
            'ast_edges': program_graph.get('ast_edge_count', 0),
            'cfg_edges': program_graph.get('cfg_edge_count', 0),
            'dfg_edges': program_graph.get('dfg_edge_count', 0),
            'node_types': program_graph.get('node_type_counts', {}),
        },
        'graph_viz': graph_viz,
        'source_preview': source_code if len(source_code) < 20000 else source_code[:20000],
    }


def _ext_for(language):
    return {
        'Python': 'py', 'Java': 'java', 'C': 'c', 'C++': 'cpp',
        'JavaScript': 'js', 'TypeScript': 'ts', 'HTML': 'html',
        'CSS': 'css', 'JSON': 'json',
    }.get(language, 'py')


def _empty_results(scan_id, repo_info):
    return {
        'scan_id': scan_id, 'repository': repo_info,
        'timestamp': datetime.now().isoformat(),
        'files_analyzed': 0, 'total_nodes': 0, 'total_edges': 0, 'files': [],
        'summary': {
            'total_issues': 0, 'bugs': 0, 'code_smells': 0, 'design_issues': 0, 'clean': 0,
            'severity_distribution': {'critical': 0, 'warning': 0, 'info': 0},
            'language_breakdown': {}, 'confidence_avg': 0.0,
            'ai_flagged_files': 0, 'ai_avg_likelihood': 0.0,
        },
        'graph_stats': {
            'total_ast_edges': 0, 'total_cfg_edges': 0, 'total_dfg_edges': 0, 'avg_graph_density': 0.0
        },
    }


def _accumulate(results, result, all_confidences):
    results['files'].append(result)
    results['files_analyzed'] += 1
    results['total_nodes'] += result['graph_info']['num_nodes']
    results['total_edges'] += result['graph_info']['num_edges']

    lang = result['language']
    lb = results['summary']['language_breakdown']
    if lang not in lb:
        lb[lang] = {'files': 0, 'issues': 0, 'bugs': 0, 'smells': 0, 'design': 0}
    lb[lang]['files'] += 1

    for issue in result['issues']:
        results['summary']['total_issues'] += 1
        cat = issue['category'].lower()
        if 'bug' in cat:
            results['summary']['bugs'] += 1
            lb[lang]['bugs'] += 1
        elif 'smell' in cat:
            results['summary']['code_smells'] += 1
            lb[lang]['smells'] += 1
        elif 'design' in cat:
            results['summary']['design_issues'] += 1
            lb[lang]['design'] += 1
        sev = issue.get('severity', 'info')
        if sev in results['summary']['severity_distribution']:
            results['summary']['severity_distribution'][sev] += 1
        all_confidences.append(issue.get('confidence', 0.0))
    lb[lang]['issues'] += len(result['issues'])

    gi = result['graph_info']
    results['graph_stats']['total_ast_edges'] += gi.get('ast_edges', 0)
    results['graph_stats']['total_cfg_edges'] += gi.get('cfg_edges', 0)
    results['graph_stats']['total_dfg_edges'] += gi.get('dfg_edges', 0)

    ai = result.get('ai_detection')
    if ai and ai['band'] in ('likely', 'very_likely'):
        results['summary']['ai_flagged_files'] += 1


def _finalize(results, all_confidences, ai_likelihoods):
    results['summary']['clean'] = results['files_analyzed'] - len(
        [f for f in results['files'] if f.get('issues')]
    )
    if all_confidences:
        results['summary']['confidence_avg'] = round(sum(all_confidences) / len(all_confidences), 3)
    if ai_likelihoods:
        results['summary']['ai_avg_likelihood'] = round(sum(ai_likelihoods) / len(ai_likelihoods), 3)
    if results['total_edges'] > 0:
        total_e = (results['graph_stats']['total_ast_edges'] +
                   results['graph_stats']['total_cfg_edges'] +
                   results['graph_stats']['total_dfg_edges'])
        results['graph_stats']['avg_graph_density'] = round(total_e / max(results['total_nodes'], 1), 3)


@app.route('/api/results/<scan_id>', methods=['GET'])
def get_results(scan_id):
    if scan_id in RESULTS_CACHE:
        return jsonify(RESULTS_CACHE[scan_id])
    return jsonify({'error': 'Scan not found'}), 404


@app.route('/api/file/<scan_id>/<path:file_path>', methods=['GET'])
def get_file_detail(scan_id, file_path):
    if scan_id not in RESULTS_CACHE:
        return jsonify({'error': 'Scan not found'}), 404
    for f in RESULTS_CACHE[scan_id]['files']:
        if f['path'] == file_path:
            return jsonify(f)
    return jsonify({'error': 'File not found in scan'}), 404


@app.route('/api/benchmark', methods=['POST'])
def run_benchmark():
    try:
        evaluator = BenchmarkEvaluator(PARSERS['.py'], ProgramGraphBuilder(),
                                       feature_encoder, gat_model)
        return jsonify(evaluator.run_full_evaluation())
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


# SPA fallback — any unmatched route serves the app shell so client-side
# routing (react-router) works on hard refresh / direct links.
@app.errorhandler(404)
def spa_fallback(e):
    if request.path.startswith('/api/'):
        return jsonify({'error': 'not found'}), 404
    index = os.path.join(app.static_folder, 'index.html')
    if os.path.isfile(index):
        return send_from_directory(app.static_folder, 'index.html')
    return jsonify({'error': 'not found'}), 404


@app.route('/<path:path>')
def static_proxy(path):
    if os.path.isdir(app.static_folder):
        full = os.path.join(app.static_folder, path)
        if os.path.isfile(full):
            return send_from_directory(app.static_folder, path)
        return send_from_directory(app.static_folder, 'index.html')
    return jsonify({'error': 'not found'}), 404


if __name__ == '__main__':
    print("=" * 60)
    print("  ACRS 2.0 - Automated Code Review System")
    print("  GAT defect detection + AI-code detection")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5000, debug=True)
