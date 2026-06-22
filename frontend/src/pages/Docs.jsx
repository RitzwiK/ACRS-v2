import React, { useState } from 'react'
import { Reveal, Eyebrow, Rule } from '../components/ui'
import { Link } from 'react-router-dom'

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'pipeline', label: 'How it works' },
  { id: 'detection', label: 'Detection patterns' },
  { id: 'ai', label: 'AI detection' },
  { id: 'api', label: 'API' },
  { id: 'setup', label: 'Self-host' },
]

function Code({ children }) {
  return <pre className="code" style={{ padding: 16, marginTop: 12, marginBottom: 8 }}><code style={{ color: 'var(--silver)' }}>{children}</code></pre>
}

export default function Docs() {
  const [active, setActive] = useState('overview')
  return (
    <div className="shell" style={{ paddingTop: 50, paddingBottom: 40 }}>
      <Reveal>
        <Eyebrow>Documentation</Eyebrow>
        <h1 className="display" style={{ fontSize: 'clamp(30px,4.5vw,46px)', margin: '14px 0 8px' }}>Reference.</h1>
        <p style={{ fontSize: 15, color: 'var(--silver)', maxWidth: 560, marginBottom: 28 }}>Everything you need to use ACRS, integrate the API, or run it yourself.</p>
      </Reveal>

      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 40 }} className="docs-grid">
        <aside style={{ position: 'sticky', top: 80, alignSelf: 'start' }} className="docs-nav">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} onClick={() => setActive(s.id)} className="mono"
              style={{ display: 'block', padding: '7px 0', fontSize: 12.5, color: active === s.id ? 'var(--red)' : 'var(--silver)', borderLeft: active === s.id ? '2px solid var(--red)' : '2px solid var(--slate)', paddingLeft: 12, transition: 'all .2s' }}>
              {s.label}
            </a>
          ))}
        </aside>

        <div style={{ maxWidth: 680 }}>
          <Section id="overview" title="Overview">
            <p>ACRS reviews code by its <em>structure</em>, not just its text. For every file it builds a unified program graph, the abstract syntax tree (AST) overlaid with control-flow (CFG) and data-flow (DFG) edges, and runs a type-aware Graph Attention Network over that graph to surface bugs, code smells, and design inefficiencies, each with a line range, severity, confidence, and a concrete fix.</p>
            <p style={{ marginTop: 14 }}>Version 2.0 adds an AI-code detection module and ships measurably higher precision: on the labelled evaluation suite, micro-F1 rose from 81.8% to 95%+ and precision from 75% to 95%+, mostly by eliminating false positives in unused-variable, deep-nesting, and missing-return detection.</p>
          </Section>

          <Section id="pipeline" title="How it works">
            <p>Five stages take source to findings:</p>
            <ol style={{ marginTop: 14, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['Parse', 'Each language parser turns source into an AST. Python uses the std-lib ast module for an exact tree; other languages use structural parsers.'],
                ['Graph', 'CFG edges (sequential, branch, loop, back-edge) and DFG edges (definition → use) are layered onto the AST to form one heterogeneous graph.'],
                ['Encode', 'Every node gets a 64-dim feature vector combining a type embedding, a token embedding, and a positional encoding of its depth and degree.'],
                ['Attend', 'A 3-layer GAT with 4 heads passes messages along edges. Crucially, each edge type (AST / CFG / DFG) has its own attention parameters, so data-flow and control-flow are weighted independently.'],
                ['Report', 'Structural heuristics, refined by the GAT confidence, produce de-duplicated, line-level findings and an overall health score.'],
              ].map(([t, d]) => (
                <li key={t} style={{ fontSize: 14, color: 'var(--silver)' }}><strong style={{ color: 'var(--bone)' }}>{t}.</strong> {d}</li>
              ))}
            </ol>
          </Section>

          <Section id="detection" title="Detection patterns">
            <p>The defect detector covers eleven patterns across three categories:</p>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--slate)', border: '1px solid var(--slate)' }}>
              {[
                ['Bug-Prone', 'critical', 'missing_return, bare_except, mutable_default_arg, unbalanced_resource'],
                ['Code Smell', 'warning', 'high_complexity, deep_nesting, unused_variable, long_parameter_list'],
                ['Design Inefficiency', 'info', 'god_function, duplicate structure'],
              ].map(([cat, sev, pats]) => (
                <div key={cat} style={{ background: 'var(--graphite)', padding: '14px 16px' }}>
                  <span className="tag" style={{ color: sev === 'critical' ? 'var(--neg)' : sev === 'warning' ? 'var(--mid)' : 'var(--silver)', borderColor: 'var(--iron)' }}>{cat}</span>
                  <p className="mono" style={{ fontSize: 12, color: 'var(--silver)', marginTop: 8 }}>{pats}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section id="ai" title="AI detection">
            <p>The AI-code module is a maintainability check. It scores seven weighted signals, explanatory-comment ratio, restating comments, placeholder logic, generic naming, defensive boilerplate, uniform structure, and tutorial docstrings, into a likelihood band, then returns a concrete cleaner-rewrite for each finding.</p>
            <p style={{ marginTop: 14 }}>No single signal can push a file past "likely" on its own; the score reflects a <em>combination</em> of tells, the way a human reviewer judges it. It does not claim authorship or police academic integrity, it flags code that's expensive to maintain regardless of who wrote it.</p>
            <Link to="/ai-detect" className="mono" style={{ fontSize: 13, color: 'var(--red)', display: 'inline-block', marginTop: 12 }}>→ Try it</Link>
          </Section>

          <Section id="api" title="API">
            <p>The Flask backend exposes a small JSON API.</p>
            <p className="mono" style={{ fontSize: 12.5, color: 'var(--red)', marginTop: 14 }}>POST /api/analyze</p>
            <Code>{`{ "repo_url": "github.com/user/repo",
  "ai_detection": true }`}</Code>
            <p className="mono" style={{ fontSize: 12.5, color: 'var(--red)', marginTop: 14 }}>POST /api/analyze-snippet</p>
            <Code>{`{ "code": "def f(): ...",
  "language": "Python" }`}</Code>
            <p className="mono" style={{ fontSize: 12.5, color: 'var(--red)', marginTop: 14 }}>POST /api/ai-detect</p>
            <Code>{`{ "code": "...", "language": "Python" }`}</Code>
            <p className="mono" style={{ fontSize: 12.5, color: 'var(--red)', marginTop: 14 }}>POST /api/benchmark · GET /api/health</p>
          </Section>

          <Section id="setup" title="Self-host">
            <p>Backend (Flask + NumPy, no GPU required):</p>
            <Code>{`cd backend
pip install -r requirements.txt
python app.py   # → http://localhost:5000`}</Code>
            <p style={{ marginTop: 14 }}>Frontend (Vite + React):</p>
            <Code>{`cd frontend
npm install
npm run dev     # → http://localhost:5173`}</Code>
            <p style={{ marginTop: 14 }}>For production, <span className="mono" style={{ color: 'var(--silver)' }}>npm run build</span> emits <span className="mono" style={{ color: 'var(--silver)' }}>frontend/dist</span>, which the Flask app serves directly.</p>
          </Section>
        </div>
      </div>

      <style>{`@media (max-width: 760px){ .docs-grid { grid-template-columns: 1fr !important; } .docs-nav { position: static !important; display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; } .docs-nav a { border-left: none !important; padding-left: 0 !important; } }`}</style>
    </div>
  )
}

function Section({ id, title, children }) {
  return (
    <section id={id} style={{ marginBottom: 48, scrollMarginTop: 90 }}>
      <Rule style={{ marginBottom: 20 }} />
      <h2 className="display" style={{ fontSize: 24, fontWeight: 600, marginBottom: 14 }}>{title}</h2>
      <div style={{ fontSize: 14.5, color: 'var(--silver)', lineHeight: 1.7 }}>{children}</div>
    </section>
  )
}
