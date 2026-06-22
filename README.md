# ACRS 2.0 — Automated Code Review System

Structural code review with Graph Attention Networks. ACRS builds an **AST + CFG + DFG**
program graph for every file and runs a **type-aware GAT** over it to surface bugs, code
smells, and design inefficiencies — with line-level precision and concrete fixes.

**New in 2.0**
- **AI-code detection module** — flags probable LLM-generated code and returns cleaner rewrites.
- **Precision-tuned engine** — micro-F1 **81.8% → 95%+**, precision **75% → 95%+** on the labelled suite.
- **Full website revamp** — multi-page React app (Home · Analyze · AI Detection · Benchmark · Docs) in a black + oxblood "darkroom" design.
- **Snippet mode** — paste a single file and analyze instantly, no clone required.

```
ACRS/
├── backend/                  ← Flask API + GNN engine (NumPy, no GPU)
│   ├── app.py                ← server + endpoints
│   ├── parsers/              ← 9-language structural parsers
│   ├── graph/                ← program-graph builder + 64-dim feature encoder
│   ├── models/               ← type-aware GAT + 37-sample benchmark
│   ├── detectors/            ← ai_code_detector.py  (NEW)
│   └── utils/                ← repo handler, report generator, graph exporter
├── frontend/                 ← Vite + React 18 + react-router + D3 + Recharts
│   └── src/
│       ├── App.jsx           ← shell, nav, routing
│       ├── pages/            ← Home, Analyze, AIDetect, Benchmark, Docs
│       ├── components/       ← ui primitives, ProgramGraph, CodeView
│       └── lib/api.js        ← API client + sample snippets
└── notebook/                 ← EDA + benchmark report
```

## Quick start

### Backend
```bash
cd backend
pip install -r requirements.txt
python app.py            # http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm run dev              # http://localhost:5173 (proxies /api → :5000)
```

For production, `npm run build` emits `frontend/dist`, which Flask serves directly at `/`.

## API

| Method | Path | Body | Purpose |
|--------|------|------|---------|
| POST | `/api/analyze` | `{repo_url, ai_detection?}` | Full repo scan |
| POST | `/api/analyze-snippet` | `{code, language}` | Single-file scan + AI detection |
| POST | `/api/ai-detect` | `{code, language}` | AI-code detection only |
| POST | `/api/benchmark` | `{}` | Run the evaluation suite |
| GET  | `/api/health` | — | Version + capabilities |

## How it works

1. **Parse** — source → AST (Python via std-lib `ast`; 8 other languages via structural parsers).
2. **Graph** — overlay CFG (control flow) and DFG (def→use) edges onto the AST.
3. **Encode** — 64-dim node features: type embedding + token embedding + positional encoding.
4. **Attend** — 3-layer, 4-head GAT with **separate attention parameters per edge type**.
5. **Report** — de-duplicated, line-level findings + health score.

## Engine improvements (2.0)

The precision gains came from fixing the three noisiest detectors:

- **Unused variables** now use real def-use analysis — accumulators (`result`, `total`),
  dict/list mutation via subscript, and augmented assignment all correctly count as "used".
- **Deep nesting** uses true *control-flow* nesting depth that resets at function boundaries,
  so a 3-level decorator closure no longer reads as deep nesting. One finding per region.
- **Missing return** only fires when a function assigns a value inside branches but never
  returns it — pure side-effect procedures and dunder methods are excluded.

Two new bug patterns were added: `bare_except` and `mutable_default_arg`.

## AI-code detection

A maintainability check (not plagiarism detection). Seven weighted signals —
over-narration, restating comments, placeholder logic, generic naming, defensive
boilerplate, uniform structure, tutorial docstrings — combine into a likelihood band, with a
concrete cleaner-rewrite per finding. No single signal can reach "likely" alone.

## Benchmark

37 hand-labelled Python samples across Bug-Prone / Code Smell / Design Inefficiency / Clean.
Run it live from the Benchmark page or `POST /api/benchmark`. Per-category precision, recall,
F1, accuracy, and the full confusion matrix are reported. Note: a handful of samples carry
*additional* genuine findings beyond their primary ground-truth label (e.g. a high-complexity
function that is also deeply nested) — these are correct detections against deliberately
minimal labels.

---
Team: Ritwik Kumar, Sristi Banik, Ritul Shekhar · Supervisor: Dr. A. Syed Ismail · Dept. of Data Science and Business Systems, SRMIST.
