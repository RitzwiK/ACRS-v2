import React, { useState, useEffect } from 'react'
import { Reveal, Eyebrow } from '../components/ui'
import { Link } from 'react-router-dom'

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'pipeline', label: 'The pipeline' },
  { id: 'graph', label: 'Program graph' },
  { id: 'gat', label: 'The GAT' },
  { id: 'detection', label: 'Detection patterns' },
  { id: 'ai', label: 'AI detection' },
  { id: 'graphview', label: 'Graph view' },
  { id: 'benchmark', label: 'Benchmark' },
  { id: 'api', label: 'API reference' },
  { id: 'setup', label: 'Self-host' },
  { id: 'faq', label: 'FAQ' },
]

function Code({ children }) {
  return <pre className="code" style={{ padding: 16, marginTop: 12, marginBottom: 8, overflowX: 'auto' }}><code style={{ color: 'var(--silver)' }}>{children}</code></pre>
}

function P({ children, top = 14 }) {
  return <p style={{ fontSize: 14.5, color: 'var(--silver)', lineHeight: 1.7, marginTop: top }}>{children}</p>
}

function H3({ children }) {
  return <h3 style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 600, color: 'var(--bone)', margin: '24px 0 4px' }}>{children}</h3>
}

function B({ children }) {
  return <strong style={{ color: 'var(--bone)' }}>{children}</strong>
}

function M({ children }) {
  return <span className="mono" style={{ color: 'var(--silver)', fontSize: '0.92em' }}>{children}</span>
}

export default function Docs() {
  const [active, setActive] = useState('overview')

  useEffect(() => {
    const ids = SECTIONS.map((s) => s.id)
    const onScroll = () => {
      let cur = ids[0]
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= 120) cur = id
      }
      setActive(cur)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="shell" style={{ paddingTop: 50, paddingBottom: 60 }}>
      <Reveal>
        <Eyebrow>Documentation</Eyebrow>
        <h1 className="display" style={{ fontSize: 'clamp(32px,4.5vw,52px)', margin: '14px 0 8px' }}>Reference.</h1>
        <p style={{ fontSize: 16, color: 'var(--silver)', maxWidth: 600, marginBottom: 36, lineHeight: 1.6 }}>
          A complete guide to how ACRS reads code as a graph, what it detects and why, how the
          AI-code check works, and how to run or integrate the whole system yourself.
        </p>
      </Reveal>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 48 }} className="docs-grid">
        <aside style={{ position: 'sticky', top: 80, alignSelf: 'start' }} className="docs-nav">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="mono"
              style={{ display: 'block', padding: '6px 0', fontSize: 12.5, color: active === s.id ? 'var(--red)' : 'var(--silver)', borderLeft: active === s.id ? '2px solid var(--red)' : '2px solid var(--slate)', paddingLeft: 12, transition: 'all .2s' }}>
              {s.label}
            </a>
          ))}
        </aside>

        <div style={{ maxWidth: 720, minWidth: 0 }}>
          {/* ---------------- OVERVIEW ---------------- */}
          <Section id="overview" title="Overview">
            <P top={0}>
              Most review tools read code as <em>text</em>: a stream of tokens matched against
              regular expressions or style rules. ACRS reads code as <B>structure</B>. For every
              file it constructs a unified <B>program graph</B> — the abstract syntax tree (AST)
              overlaid with control-flow (CFG) and data-flow (DFG) edges — and runs a type-aware
              Graph Attention Network (GAT) over that graph. The result is a set of findings, each
              with a category, a precise line range, a severity, a confidence score, and a concrete
              suggested fix.
            </P>
            <P>
              Reading structure is what lets ACRS catch problems that are invisible to text tools: a
              function that assigns a result inside every branch but never returns it, a variable
              that is written but never read, a control-flow nest five levels deep, or a default
              argument that silently persists across calls. None of these are spelling mistakes —
              they are <em>shapes</em>, and shapes live in the graph.
            </P>
            <P>
              Version 2.0 adds a dedicated <B>AI-code detection</B> module and reaches 100%
              finding-level precision and recall on the bundled evaluation suite, after a round of
              fixes that removed the last false positives in deep-nesting line attribution and
              cross-pattern matching. The benchmark page recomputes those numbers live, in front of
              you, so nothing here is a static claim.
            </P>
          </Section>

          {/* ---------------- PIPELINE ---------------- */}
          <Section id="pipeline" title="The pipeline">
            <P top={0}>Source becomes findings in five stages. Each is deterministic and inspectable.</P>
            <ol style={{ marginTop: 16, paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['Parse', <>Each language parser turns source into an AST. Python uses the standard-library <M>ast</M> module for an exact, lossless tree; JavaScript, TypeScript, Java, C, and C++ use structural parsers that recover functions, control constructs, declarations, and comments.</>],
                ['Graph', <>Control-flow edges (sequential, branch, loop, and back-edges) and data-flow edges (each variable definition linked to its uses) are layered onto the AST, producing one heterogeneous graph with three distinct edge types.</>],
                ['Encode', <>Every node receives a 64-dimensional feature vector: a learned type embedding (what kind of node it is), a token embedding (its surface text), and a positional encoding of its depth in the tree and its degree in the graph.</>],
                ['Attend', <>A 3-layer GAT with 4 attention heads passes messages along edges. Each edge type — AST, CFG, DFG — carries its own attention parameters, so structural, control, and data relationships are weighted independently rather than blurred together.</>],
                ['Report', <>Structural heuristics propose candidate findings; the GAT's node confidences sharpen them; duplicates are merged; and the survivors are returned line-level, ranked, and paired with fixes, alongside an overall health score.</>],
              ].map(([t, d], i) => (
                <li key={t} style={{ fontSize: 14.5, color: 'var(--silver)', lineHeight: 1.7 }}>
                  <B>{t}.</B> {d}
                </li>
              ))}
            </ol>
            <P>
              A key design choice: the <B>findings come from the structural heuristics</B>, and the
              GAT refines confidence and supplies the attention overlay for the graph view. That
              separation is deliberate — it keeps detection explainable (you can always trace a
              finding to a concrete structural rule) and means very large files can skip the
              expensive message-passing step without losing any findings.
            </P>
          </Section>

          {/* ---------------- PROGRAM GRAPH ---------------- */}
          <Section id="graph" title="The program graph">
            <P top={0}>
              The program graph is the heart of ACRS. Three edge types are layered onto a single set
              of nodes:
            </P>
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--slate)', border: '1px solid var(--iron)' }}>
              {[
                ['AST', '#6E6C72', 'Abstract syntax tree', 'The parent-child skeleton of the code: a function contains a body, a body contains an if-statement, an if contains a comparison. This is the backbone every other edge attaches to.'],
                ['CFG', '#9A988F', 'Control-flow graph', 'The order statements can execute in: straight-line sequence, branches at every if/elif/else, loop entry and exit, and back-edges that close a loop. Deep nesting and unreachable code are CFG-shaped.'],
                ['DFG', '#E5484D', 'Data-flow graph', 'Where each value goes: every variable definition is linked to the places it is later read. Unused variables, missing returns, and value mismatches are DFG-shaped.'],
              ].map(([k, c, name, desc]) => (
                <div key={k} style={{ background: 'var(--graphite)', padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 22, height: 3, background: c, borderRadius: 2 }} />
                    <span className="mono" style={{ fontSize: 13, color: 'var(--bone)' }}>{k}</span>
                    <span style={{ fontSize: 13, color: 'var(--pewter)' }}>{name}</span>
                  </div>
                  <p style={{ fontSize: 13.5, color: 'var(--silver)', marginTop: 8, lineHeight: 1.6 }}>{desc}</p>
                </div>
              ))}
            </div>
            <P>
              Because all three live on the same nodes, a single finding can draw on multiple views
              at once. "This loop variable is assigned but never used" is a DFG fact about a node
              whose position the AST describes and whose reachability the CFG confirms. That overlap
              is exactly what a flat text scan cannot see.
            </P>
          </Section>

          {/* ---------------- THE GAT ---------------- */}
          <Section id="gat" title="The Graph Attention Network">
            <P top={0}>
              A Graph Attention Network learns, for each node, how much to listen to each of its
              neighbours. Rather than treating every connected node equally (as a plain graph
              convolution would), it computes an <B>attention weight</B> per edge and forms a
              weighted sum.
            </P>
            <H3>Type-aware attention</H3>
            <P top={6}>
              The crucial detail in ACRS is that attention is <B>computed per edge type</B>. The AST,
              CFG, and DFG each have their own weight matrices and attention vectors. A node attends
              to its syntactic parent differently from how it attends to the statement that runs
              before it, differently again from the definition that feeds it a value. Collapsing
              these into one channel would lose the distinction that makes structural detection work.
            </P>
            <H3>Architecture</H3>
            <P top={6}>
              Three layers, four heads each. Each head projects node features through a per-type
              linear map, scores every incoming edge with a LeakyReLU-gated attention function,
              normalises the scores with a softmax over each node's neighbourhood, and aggregates.
              Heads are concatenated and passed through an ELU-style activation. The implementation
              is pure NumPy — no GPU, no heavyweight framework — which is why it runs on a free-tier
              CPU instance.
            </P>
            <P>
              On very large files (above roughly 1,200 nodes) the message-passing step is skipped to
              stay within request-time limits. Findings are unaffected because they originate in the
              heuristics; only the attention overlay in the graph view is omitted for those files.
            </P>
          </Section>

          {/* ---------------- DETECTION PATTERNS ---------------- */}
          <Section id="detection" title="Detection patterns">
            <P top={0}>
              The defect detector covers <B>eleven patterns</B> across three categories. Each is a
              precise structural rule, not a fuzzy guess.
            </P>

            {[
              ['Bug-Prone', 'var(--neg)', [
                ['missing_return', 'A function assigns a result inside its branches but can fall through without returning it on some path.'],
                ['bare_except', 'An except clause with no exception type swallows every error, including ones you never meant to catch.'],
                ['mutable_default_arg', 'A list/dict/set default argument is created once and shared across all calls — a classic silent state-leak bug.'],
                ['unreachable_after_return', 'Code following a return, raise, break, or continue that can never execute.'],
                ['comparison_to_none', 'Using == or != to compare with None instead of the identity operators is / is not.'],
              ]],
              ['Code Smell', 'var(--mid)', [
                ['high_complexity', 'A function with too many independent branches — high cyclomatic complexity — that is hard to test and reason about.'],
                ['deep_nesting', 'Control flow nested four or more levels deep, reported at the line where the over-nested region begins.'],
                ['unused_variable', 'A local variable that is assigned but never read on any path.'],
                ['long_parameter_list', 'A function signature with more than five parameters, a sign it is doing too much.'],
              ]],
              ['Design Inefficiency', 'var(--silver)', [
                ['god_function', 'A single function with an outsized number of statements, concentrating responsibility that should be split.'],
                ['string_concat_in_loop', 'Building a string with repeated concatenation inside a loop — quadratic where a join would be linear.'],
              ]],
            ].map(([cat, col, rows]) => (
              <div key={cat} style={{ marginTop: 18 }}>
                <span className="tag" style={{ color: col, borderColor: 'var(--iron)' }}>{cat}</span>
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--slate)', border: '1px solid var(--iron)' }}>
                  {rows.map(([name, desc]) => (
                    <div key={name} style={{ background: 'var(--graphite)', padding: '12px 16px' }}>
                      <span className="mono" style={{ fontSize: 12.5, color: 'var(--bone)' }}>{name}</span>
                      <p style={{ fontSize: 13, color: 'var(--silver)', marginTop: 5, lineHeight: 1.55 }}>{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <P>
              Every finding carries a <M>line_start</M> / <M>line_end</M>, a severity
              (<M>critical</M> / <M>warning</M> / <M>info</M>), a confidence in [0, 1], and a
              one-line fix. Findings are de-duplicated so a region that trips two rules is reported
              once, at the right line.
            </P>
          </Section>

          {/* ---------------- AI DETECTION ---------------- */}
          <Section id="ai" title="AI detection">
            <P top={0}>
              The AI-code module is a <B>maintainability check, not a plagiarism tool</B>. It never
              claims authorship and never polices academic integrity. It scores the stylistic and
              structural tells that LLM-written code tends to ship with, and hands back a cleaner
              rewrite for each one. Code that is expensive to maintain is worth flagging regardless
              of who or what wrote it.
            </P>
            <H3>The signals</H3>
            <P top={6}>Seven weighted signals are combined into a single likelihood:</P>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--slate)', border: '1px solid var(--iron)' }}>
              {[
                ['explanatory_comment_ratio', '0.22', 'A comment on nearly every line. Humans comment intent; models narrate mechanics.'],
                ['restating_comments', '0.18', '"Initialize the result list" sitting above result = []. The comment restates the code verbatim.'],
                ['placeholder_logic', '0.16', 'TODO stubs, pass bodies, and "implement this" left where real logic should be.'],
                ['generic_naming', '0.14', 'data, result, temp, do_something — names that force you to read the body to learn anything.'],
                ['defensive_boilerplate', '0.14', 'try/except (or empty catch) wrapped around trivial code, blanket exception handling.'],
                ['uniform_structure', '0.08', 'Every function the same shape: a narration comment, a loop, a return. Unnaturally regular.'],
                ['redundant_type_echo', '0.06', 'A docstring or comment that simply repeats the type annotation already in the signature.'],
              ].map(([name, w, desc]) => (
                <div key={name} style={{ background: 'var(--graphite)', padding: '12px 16px', display: 'flex', gap: 14, alignItems: 'baseline' }}>
                  <span className="num mono" style={{ fontSize: 12, color: 'var(--red)', flexShrink: 0, width: 32 }}>{w}</span>
                  <div style={{ minWidth: 0 }}>
                    <span className="mono" style={{ fontSize: 12.5, color: 'var(--bone)' }}>{name}</span>
                    <p style={{ fontSize: 13, color: 'var(--silver)', marginTop: 4, lineHeight: 1.55 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <P>
              No single signal can push a file past "likely" on its own; the band reflects a
              <em> combination</em> of tells, the way a human reviewer forms a judgement. Each signal
              is squashed through a saturating function so one extreme ratio cannot dominate. The
              signals are language-aware — comment detection understands <M>#</M>, <M>//</M>, and
              <M>/* */</M> — so the check works across Python, JavaScript, TypeScript, Java, C, and C++.
            </P>
            <Link to="/ai-detect" className="mono" style={{ fontSize: 13, color: 'var(--red)', display: 'inline-block', marginTop: 14 }}>→ Try the detector</Link>
          </Section>

          {/* ---------------- GRAPH VIEW ---------------- */}
          <Section id="graphview" title="The graph view">
            <P top={0}>
              Every analysis renders the file's program graph as an interactive force-directed
              diagram. Nodes are AST elements sized by importance; edges are coloured by type using
              the same legend as above — neutral grey for AST, warm grey for CFG, red for DFG.
            </P>
            <P>
              Drag any node to reposition it; the layout settles around your change. Scroll to zoom.
              Larger, brighter nodes are the structural anchors — module, function, and class
              definitions — while leaves are individual statements and expressions. When the GAT runs,
              edge opacity reflects attention weight, so you can literally see which relationships the
              network weighted most heavily in reaching a finding.
            </P>
          </Section>

          {/* ---------------- BENCHMARK ---------------- */}
          <Section id="benchmark" title="The benchmark">
            <P top={0}>
              The benchmark page evaluates the detector live against a hand-labelled suite of Python
              samples spanning every pattern, plus deliberately clean code that must produce zero
              findings. It reports two very different numbers, and is explicit about which is which.
            </P>
            <H3>Strict finding-level scoring</H3>
            <P top={6}>
              The headline. Every labelled issue must be matched by a prediction that overlaps its
              exact line range <em>and</em> shares its category and pattern. Unmatched labels are
              misses (hurting recall); unmatched predictions are false alarms (hurting precision).
              A single stray detection lowers the score. This is the honest, demanding metric.
            </P>
            <H3>Category coverage</H3>
            <P top={6}>
              The lenient secondary number, shown clearly labelled. It asks only whether a sample
              <em> contained</em> a category at all, not whether every issue was pinned to the right
              lines. It is easy to score high on and is never presented as the headline.
            </P>
            <P>
              The Breakdown tab lists every sample with its expected versus detected findings, so you
              can audit each verdict yourself rather than trust an aggregate. The Methodology tab
              spells out the matching rules and the caveat that a small hand-built suite is a
              regression guard, not a claim of real-world accuracy.
            </P>
            <Link to="/benchmark" className="mono" style={{ fontSize: 13, color: 'var(--red)', display: 'inline-block', marginTop: 14 }}>→ Run the benchmark</Link>
          </Section>

          {/* ---------------- API ---------------- */}
          <Section id="api" title="API reference">
            <P top={0}>The Flask backend exposes a small JSON API. All POST bodies are JSON; all responses are JSON.</P>

            <H3>POST /api/analyze</H3>
            <P top={6}>Clone and analyse a public repository. Returns per-file findings, a summary, and a health report.</P>
            <Code>{`{
  "repo_url": "https://github.com/user/repo",
  "branch": "main",        // optional, defaults to main
  "ai_detection": true     // optional, run the AI check per file
}`}</Code>

            <H3>POST /api/analyze-snippet</H3>
            <P top={6}>Analyse a single chunk of code without cloning anything.</P>
            <Code>{`{
  "code": "def f(x):\\n    ...",
  "language": "Python"     // Python | JavaScript | TypeScript | Java | C | C++
}`}</Code>

            <H3>POST /api/ai-detect</H3>
            <P top={6}>Run only the AI-code maintainability check on a snippet.</P>
            <Code>{`{
  "code": "...",
  "language": "JavaScript"
}`}</Code>

            <H3>POST /api/benchmark</H3>
            <P top={6}>Recompute the full evaluation suite and return finding-level metrics, the per-sample breakdown, per-pattern metrics, and the confusion matrix. Takes no body.</P>

            <H3>GET /api/health</H3>
            <P top={6}>Liveness probe. Returns <M>{`{ "status": "healthy" }`}</M> when the service is up.</P>
          </Section>

          {/* ---------------- SELF-HOST ---------------- */}
          <Section id="setup" title="Self-host">
            <P top={0}>ACRS runs anywhere Python and Node run. No GPU, no external services.</P>
            <H3>Backend — Flask + NumPy</H3>
            <Code>{`cd backend
pip install -r requirements.txt
python app.py        # → http://localhost:5000`}</Code>
            <H3>Frontend — Vite + React</H3>
            <Code>{`cd frontend
npm install
npm run dev          # → http://localhost:5173 (proxies /api)`}</Code>
            <H3>Production build</H3>
            <P top={6}>
              <M>npm run build</M> emits <M>frontend/dist</M>, which the Flask app serves directly —
              so a single process can host both API and UI. For a split deployment, host the backend
              on any Python platform and point the frontend's <M>/api</M> rewrite at its URL.
            </P>
          </Section>

          {/* ---------------- FAQ ---------------- */}
          <Section id="faq" title="FAQ">
            {[
              ['Does it need a GPU?', 'No. The GAT is implemented in pure NumPy and runs comfortably on a free-tier CPU instance.'],
              ['Is my code stored?', 'No. Repositories are cloned to a temporary directory, analysed, and deleted in the same request. Snippets are never persisted.'],
              ['Why did a large repo time out?', 'On free hosting tiers, very large repositories can exceed the platform request limit. ACRS caps file count and per-file size and skips message-passing on huge graphs to stay within bounds; if a scan still times out, the first request after the server wakes from sleep is usually the culprit — try again once it is warm.'],
              ['Is the AI detector a plagiarism tool?', 'No. It measures maintainability tells, not authorship. A human can write code it flags, and a model can write code it passes.'],
              ['Which languages are supported?', 'Python has the deepest structural analysis via the standard-library AST. JavaScript, TypeScript, Java, C, and C++ are supported through structural parsers, with the AI check working across all of them.'],
            ].map(([q, a]) => (
              <div key={q} style={{ marginTop: 18 }}>
                <p style={{ fontSize: 15, color: 'var(--bone)', fontWeight: 600 }}>{q}</p>
                <p style={{ fontSize: 14, color: 'var(--silver)', marginTop: 6, lineHeight: 1.65 }}>{a}</p>
              </div>
            ))}
          </Section>
        </div>
      </div>

      <style>{`@media (max-width: 760px){ .docs-grid { grid-template-columns: 1fr !important; } .docs-nav { position: static !important; display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; } .docs-nav a { border-left: none !important; padding-left: 0 !important; } }`}</style>
    </div>
  )
}

function Section({ id, title, children }) {
  return (
    <section id={id} style={{ marginBottom: 56, scrollMarginTop: 90 }}>
      <h2 className="display" style={{ fontSize: 27, fontWeight: 600, marginBottom: 14, color: 'var(--bone)' }}>{title}</h2>
      {children}
    </section>
  )
}
