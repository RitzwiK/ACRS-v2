# ACRS 2.0 — Automated Code Review System

ACRS reviews code by its structure, not just its text. For every file it builds a program
graph (an AST overlaid with control-flow and data-flow edges) and runs a type-aware Graph
Attention Network over that graph to find bugs, code smells, and design inefficiencies. Every
finding comes with a line range, a severity, a confidence score, and a concrete fix.

There's also a separate AI-code detection module that flags the stylistic tells of
LLM-written code and hands back cleaner rewrites.

<!-- ─────────────────────────────────────────────────────────────
     HERO / DEMO IMAGE
     Add a screenshot of the landing page or an analysis in action.
     ───────────────────────────────────────────────────────────── -->
<p align="center">
  <img src="docs/screenshots/hero.png" alt="ACRS landing page" width="820">
</p>

**Live:** [acrsscan.vercel.app](https://acrsscan.vercel.app)

---

## What's new in 2.0

- **AI-code detection** — a maintainability check (not a plagiarism tool) that scores the
  structural tells of generated code and suggests cleaner rewrites.
- **A rebuilt engine** — after fixing the noisiest detectors and the scoring logic, the
  bundled suite reports 100% precision and recall at the finding level (see [Benchmark](#benchmark)
  for exactly what that means, and why it isn't a real-world accuracy claim).
- **A full website revamp** — a multi-page React app (Home, Analyze, AI Detection, Benchmark,
  Docs) in a monochrome "darkroom" design with an interactive graph view.
- **Snippet mode** — paste a single file and analyze it instantly, no repository needed.
- **Six languages for snippets** — Python, JavaScript, TypeScript, Java, C, and C++.

<!-- ─────────────────────────────────────────────────────────────
     FEATURE SCREENSHOTS
     A row of 2–3 shots works well here: Analyze view, Graph view,
     AI Detection, Benchmark. Replace the paths below.
     ───────────────────────────────────────────────────────────── -->
<p align="center">
  <img src="docs/screenshots/analyze.png"   alt="Repository analysis"  width="410">
  <img src="docs/screenshots/graph.png"     alt="Program graph view"   width="410">
</p>
<p align="center">
  <img src="docs/screenshots/ai-detect.png" alt="AI code detection"    width="410">
  <img src="docs/screenshots/benchmark.png" alt="Live benchmark"       width="410">
</p>

---

## Quick start

**Backend** — Flask and NumPy, no GPU:

```bash
cd backend
pip install -r requirements.txt
python app.py            # http://localhost:5000
```

**Frontend** — Vite and React:

```bash
cd frontend
npm install
npm run dev              # http://localhost:5173  (proxies /api to :5000)
```

For production, `npm run build` emits `frontend/dist`, which Flask serves directly at `/`, so
a single process can host both the API and the UI.

---

## How it works

Source becomes findings in five stages:

1. **Parse.** Source turns into an AST. Python uses the standard-library `ast` module for an
   exact tree; the other languages use structural parsers.
2. **Graph.** Control-flow edges (branches, loops, back-edges) and data-flow edges
   (definition to use) are layered onto the AST to form one graph with three edge types.
3. **Encode.** Each node gets a 64-dimensional feature vector: a type embedding, a token
   embedding, and a positional encoding of its depth and degree.
4. **Attend.** A 3-layer, 4-head GAT passes messages along the edges, with separate attention
   parameters for AST, CFG, and DFG so the three relationships stay distinct.
5. **Report.** Structural heuristics propose findings, the GAT sharpens their confidence,
   duplicates are merged, and the survivors come back line-level with a health score.

Findings originate in the heuristics and the GAT refines them, which keeps every result
traceable to a concrete rule and lets very large files skip the expensive message-passing step
without losing any findings.

<!-- ─────────────────────────────────────────────────────────────
     ARCHITECTURE / PIPELINE DIAGRAM (optional)
     If you have a diagram of the AST+CFG+DFG pipeline, drop it here.
     ───────────────────────────────────────────────────────────── -->
<!--
<p align="center">
  <img src="docs/screenshots/pipeline.png" alt="Analysis pipeline" width="760">
</p>
-->

---

## Project layout

```
ACRS/
├── backend/                Flask API + GNN engine (NumPy, no GPU)
│   ├── app.py              server + endpoints
│   ├── parsers/            per-language structural parsers
│   ├── graph/              program-graph builder + 64-dim feature encoder
│   ├── models/             type-aware GAT + benchmark suite
│   ├── detectors/          ai_code_detector.py
│   └── utils/              repo handler, report generator, graph exporter
├── frontend/               Vite + React 18, react-router, D3, Recharts
│   └── src/
│       ├── App.jsx         shell, nav, routing, background field
│       ├── pages/          Home, Analyze, AIDetect, Benchmark, Docs
│       ├── components/     UI primitives, ProgramGraph, CodeView, ScanFeed
│       └── lib/api.js      API client + per-language sample snippets
└── notebook/               EDA + benchmark report
```

---

## API

| Method | Path | Body | Purpose |
|--------|------|------|---------|
| POST | `/api/analyze` | `{ repo_url, ai_detection? }` | Full repository scan |
| POST | `/api/analyze-snippet` | `{ code, language }` | Single-file scan |
| POST | `/api/ai-detect` | `{ code, language }` | AI-code detection only |
| POST | `/api/benchmark` | `{}` | Run the evaluation suite live |
| GET  | `/api/health` | — | Version and capabilities |

---

## Detection patterns

Eleven patterns across three categories, each a precise structural rule:

**Bug-Prone** — `missing_return`, `bare_except`, `mutable_default_arg`,
`unreachable_after_return`, `comparison_to_none`

**Code Smell** — `high_complexity`, `deep_nesting`, `unused_variable`,
`long_parameter_list`

**Design Inefficiency** — `god_function`, `string_concat_in_loop`

Most of the precision work went into the three noisiest detectors:

- **Unused variables** use real def-use analysis, so accumulators, subscript mutation, and
  augmented assignment all count as a use.
- **Deep nesting** uses true control-flow depth that resets at function boundaries, reported
  once per region at the line where it begins. An elif chain no longer inflates the depth.
- **Missing return** only fires when a function assigns a value inside its branches but never
  returns it, so pure side-effect procedures are left alone.

---

## AI-code detection

This is a maintainability check, not plagiarism detection. It never claims authorship. Seven
weighted signals — over-narration, restating comments, placeholder logic, generic naming,
defensive boilerplate, uniform structure, and redundant type echoes — combine into a
likelihood band, each with a suggested rewrite. No single signal can reach "likely" on its
own, so the band reflects a combination of tells the way a human reviewer would judge it. The
signals are language-aware, so the check works across all six supported languages.

---

## Benchmark

The detector is evaluated live against a hand-labelled suite of Python samples covering every
pattern, plus deliberately clean code that must produce zero findings. Run it from the
Benchmark page or with `POST /api/benchmark`.

Two numbers are reported, and the page is explicit about which is which:

- **Strict finding-level scoring** (the headline). Every labelled issue must be matched by a
  prediction that overlaps its exact lines and shares its category and pattern; any stray
  prediction counts against precision. The current suite scores 100% precision and recall at
  this level.
- **Category coverage** (the lenient secondary number). It only asks whether a sample
  contained a category at all, so it is easy to score high on and is never the headline.

The suite is small and hand-built, so treat it as a regression guard and a sanity check, not a
claim of real-world accuracy. The Breakdown tab lists every sample's expected versus detected
findings so you can audit each verdict yourself.

---

## Deployment

The frontend runs on Vercel and the backend on Render. The frontend's `/api` route rewrites to
the backend URL, so the two deploy independently. The GAT is pure NumPy, so the backend runs on
a free-tier CPU instance with no GPU.

---

## Author

Ritwik Kumar 
