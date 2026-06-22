import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, GitBranch, Network, Sparkles, Eye, Boxes, Search, Gauge } from 'lucide-react'
import { Reveal, Eyebrow } from '../components/ui'
import ScanFeed from '../components/ScanFeed'
import LanguageMarquee from '../components/LanguageMarquee'

export default function Home() {
  const nav = useNavigate()
  const [url, setUrl] = useState('')
  const go = () => { if (url.trim()) nav(`/analyze?repo=${encodeURIComponent(url.trim())}`) }

  return (
    <div>
      {/* ============ HERO — editorial, hard left, module on the right ============ */}
      <section className="shell" style={{ paddingTop: 64, paddingBottom: 30 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.05fr) minmax(0,0.95fr)', gap: 48, alignItems: 'center' }} className="hero-grid">
          <div>
            <Reveal>
              <span className="glass-soft" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 15px', fontSize: 12.5, color: 'var(--silver)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red)', boxShadow: '0 0 8px var(--red-glow)' }} />
                Graph-neural code review
              </span>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="display" style={{ fontSize: 'clamp(42px, 6vw, 84px)', margin: '24px 0 0', maxWidth: 640 }}>
                Catch what review misses.
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p style={{ fontSize: 'clamp(16px,1.5vw,18px)', color: 'var(--silver)', lineHeight: 1.55, maxWidth: 460, margin: '24px 0 0' }}>
                ACRS reads your code as a graph and runs a graph attention network over it, surfacing
                bugs, smells, and AI-generated code with line-level precision.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div className="glass" style={{ display: 'flex', padding: 7, maxWidth: 460, margin: '32px 0 0', borderRadius: 999 }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px' }}>
                  <GitBranch size={16} color="var(--pewter)" />
                  <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()}
                    placeholder="github.com/user/repo"
                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--bone)', fontSize: 15, padding: '11px 0', fontFamily: 'var(--mono)' }} />
                </div>
                <button className="btn btn-primary" onClick={go} disabled={!url.trim()}>Scan <ArrowRight size={15} /></button>
              </div>
            </Reveal>
            <Reveal delay={300}>
              <div style={{ display: 'flex', gap: 22, marginTop: 18, flexWrap: 'wrap' }}>
                <Link to="/analyze" className="hover-red" style={{ fontSize: 13.5, color: 'var(--silver)', display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                  <Search size={14} /> Paste a snippet
                </Link>
                <Link to="/ai-detect" className="hover-red" style={{ fontSize: 13.5, color: 'var(--silver)', display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                  <Sparkles size={14} /> Try AI detection
                </Link>
              </div>
            </Reveal>
          </div>

          <Reveal delay={200}>
            <ScanFeed />
          </Reveal>
        </div>
      </section>

      {/* ============ language marquee ============ */}
      <section style={{ marginTop: 44 }}>
        <div className="shell" style={{ marginBottom: 16 }}>
          <Reveal><Eyebrow>Polyglot by design, nine languages, one engine</Eyebrow></Reveal>
        </div>
        <Reveal><LanguageMarquee /></Reveal>
      </section>

      {/* ============ trust strip — left aligned numbers ============ */}
      <section className="shell" style={{ marginTop: 90 }}>
        <Reveal>
          <div className="glass" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, padding: '30px 36px' }} className="trust-grid">
            {[['100%', 'Finding-level F1'], ['9', 'Languages'], ['11', 'Defect patterns'], ['100+', 'Frameworks']].map(([v, l]) => (
              <div key={l}>
                <div className="num display" style={{ fontSize: 38 }}>{v}</div>
                <div className="eyebrow" style={{ marginTop: 8 }}>{l}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ============ problem — left header, asymmetric ============ */}
      <section className="shell" style={{ marginTop: 120 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,0.85fr) minmax(0,1.15fr)', gap: 40, alignItems: 'start' }} className="split">
          <Reveal>
            <Eyebrow>The problem</Eyebrow>
            <h2 className="display" style={{ fontSize: 'clamp(28px,4vw,44px)', margin: '16px 0 0', maxWidth: 320 }}>
              Reviews read lines. Bugs live between them.
            </h2>
          </Reveal>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              ['Structure is invisible to text tools', 'A function can pass every style check and still hide a control-flow bug five branches deep.'],
              ['AI code slips through', 'Generated code looks clean but ships placeholder stubs, dead defaults, and generic naming.'],
              ['Findings without fixes are noise', 'A warning you have to research is a warning you ignore. Every finding needs a next step.'],
            ].map(([t, d], i) => (
              <Reveal key={t} delay={i * 70} className="glass" style={{ padding: '22px 24px', display: 'flex', gap: 20, alignItems: 'baseline' }}>
                <span className="num display" style={{ fontSize: 20, color: 'var(--ash)', flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3 style={{ fontFamily: 'var(--display)', fontSize: 17.5, fontWeight: 600, marginBottom: 6 }}>{t}</h3>
                  <p style={{ fontSize: 13.5, color: 'var(--silver)', lineHeight: 1.6 }}>{d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ how it works — left header, 3 steps ============ */}
      <section className="shell" style={{ marginTop: 120 }}>
        <Reveal>
          <Eyebrow>How it works</Eyebrow>
          <h2 className="display" style={{ fontSize: 'clamp(28px,4vw,44px)', margin: '16px 0 40px', maxWidth: 520 }}>
            Source in. Structure out. Findings ranked.
          </h2>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }} className="step-grid">
          {[
            [Network, 'Build the graph', 'Every file becomes an AST overlaid with control-flow and data-flow edges, one unified graph.'],
            [Gauge, 'Attend and score', 'A type-aware GAT passes messages along each edge type, scoring every node for defect patterns.'],
            [Eye, 'Rank and explain', 'Findings come back de-duplicated, line-level, with a confidence score and a concrete fix.'],
          ].map(([Icon, t, d], i) => (
            <Reveal key={t} delay={i * 80} className="glass" style={{ padding: '32px 26px' }}>
              <div style={{ width: 46, height: 46, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-edge)', marginBottom: 20 }}>
                <Icon size={21} color="var(--bone)" strokeWidth={1.7} />
              </div>
              <div className="eyebrow" style={{ marginBottom: 10 }}>Step {i + 1}</div>
              <h3 style={{ fontFamily: 'var(--display)', fontSize: 19, fontWeight: 600, marginBottom: 8 }}>{t}</h3>
              <p style={{ fontSize: 14, color: 'var(--silver)', lineHeight: 1.6 }}>{d}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ capabilities — left header, 2x2 ============ */}
      <section className="shell" style={{ marginTop: 120 }}>
        <Reveal>
          <Eyebrow>Capabilities</Eyebrow>
          <h2 className="display" style={{ fontSize: 'clamp(28px,4vw,44px)', margin: '16px 0 40px', maxWidth: 480 }}>
            Four ways to read a codebase.
          </h2>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }} className="cap-grid">
          {[
            [Network, 'Repository scan', 'Clone any public repo, graph every file, and get a ranked report with hotspots and a health score.', '/analyze'],
            [Sparkles, 'AI detection', 'Flag probable AI-generated code from its structural tells, and get cleaner rewrites for each.', '/ai-detect'],
            [Eye, 'Graph view', 'Inspect the AST, CFG, and DFG of any file as an interactive force graph.', '/analyze'],
            [Boxes, 'Live benchmark', 'See precision, recall, and the confusion matrix on a labelled evaluation suite.', '/benchmark'],
          ].map(([Icon, t, d, to], i) => (
            <Reveal key={t} delay={i * 60}>
              <Link to={to} className="glass card-hover" style={{ display: 'block', padding: '28px 26px', height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                  <Icon size={22} color="var(--bone)" strokeWidth={1.7} />
                  <ArrowUpRight size={18} color="var(--pewter)" className="card-arrow" />
                </div>
                <h3 style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{t}</h3>
                <p style={{ fontSize: 14, color: 'var(--silver)', lineHeight: 1.6 }}>{d}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ CTA — left aligned big ============ */}
      <section className="shell" style={{ marginTop: 120 }}>
        <Reveal className="glass" style={{ padding: '64px 48px', borderRadius: 'var(--r-lg)' }}>
          <h2 className="display" style={{ fontSize: 'clamp(30px,4.5vw,52px)', maxWidth: 620 }}>
            Develop your code before it ships.
          </h2>
          <p style={{ fontSize: 16, color: 'var(--silver)', maxWidth: 440, margin: '18px 0 28px' }}>
            Point ACRS at a repository, or paste a single file. No signup to try it.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link to="/analyze" className="btn btn-primary">Scan a repo <ArrowRight size={15} /></Link>
            <Link to="/ai-detect" className="btn btn-ghost">Try AI detection</Link>
          </div>
        </Reveal>
      </section>

      <style>{`
        .hover-red { transition: color .2s; }
        .hover-red:hover { color: var(--red) !important; }
        .card-hover { transition: transform .3s, border-color .3s; }
        .card-hover:hover { transform: translateY(-4px); border-color: rgba(229,72,77,0.35); }
        .card-hover .card-arrow { transition: transform .3s, color .3s; }
        .card-hover:hover .card-arrow { transform: translate(2px,-2px); color: var(--red); }
        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr !important; gap: 36px !important; }
          .split { grid-template-columns: 1fr !important; gap: 24px !important; }
        }
        @media (max-width: 760px) {
          .step-grid, .cap-grid, .trust-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
