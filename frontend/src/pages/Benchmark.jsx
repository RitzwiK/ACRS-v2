import React, { useState, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { FlaskConical, Play, Info, Check, AlertCircle } from 'lucide-react'
import { api, catColor } from '../lib/api'
import { Reveal, Eyebrow, Spinner } from '../components/ui'

export default function Benchmark() {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const [data, setData] = useState(null)
  const [tab, setTab] = useState('overview')

  const run = useCallback(async () => {
    setLoading(true); setErr(null)
    try { setData(await api.benchmark()) } catch (e) { setErr(e.message) }
    setLoading(false)
  }, [])

  if (!data) {
    return (
      <div className="shell" style={{ paddingTop: 50, minHeight: '70vh' }}>
        <Reveal>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FlaskConical size={18} color="var(--red)" /><Eyebrow>Evaluation</Eyebrow>
          </div>
          <h1 className="display" style={{ fontSize: 'clamp(30px,4.5vw,46px)', margin: '14px 0 8px' }}>How accurate is it?</h1>
          <p style={{ fontSize: 15, color: 'var(--silver)', maxWidth: 580, marginBottom: 18 }}>
            Run the detector against a hand-labelled suite of 37 Python samples spanning bugs,
            smells, design debt, and deliberately clean code. Every number below is scored
            strictly at the level of individual findings, and computed live, in front of you.
          </p>
          <p style={{ fontSize: 13.5, color: 'var(--pewter)', maxWidth: 580, marginBottom: 28 }}>
            No cherry-picking: you'll see precision, recall, F1, the confusion matrix, and a full
            per-sample breakdown of exactly what was expected versus detected.
          </p>
          <button className="btn btn-primary" onClick={run} disabled={loading}>
            {loading ? <Spinner size={14} /> : <Play size={14} />} {loading ? 'Running…' : 'Run benchmark'}
          </button>
          {err && <p className="mono" style={{ color: 'var(--red)', fontSize: 13, marginTop: 16 }}>{err}</p>}
        </Reveal>
      </div>
    )
  }

  const fl = data.finding_level_metrics || {}
  const cov = data.overall_metrics || {}
  const bi = data.benchmark_info || {}
  const pp = data.per_pattern_metrics || {}
  const bd = data.sample_breakdown || []
  const fc = (v) => v >= 0.85 ? 'var(--pos)' : v >= 0.6 ? 'var(--mid)' : 'var(--neg)'
  const patBar = Object.entries(pp).sort((a, b) => b[1].f1 - a[1].f1).map(([p, m]) => ({ name: p.replace(/_/g, ' '), F1: +(m.f1 * 100).toFixed(1) }))
  const cm = data.confusion_matrix

  const tabs = [['overview', 'Overview'], ['breakdown', 'Breakdown'], ['patterns', 'Patterns'], ['method', 'Methodology']]

  return (
    <div className="shell" style={{ paddingTop: 50, paddingBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={() => setData(null)} className="btn btn-ghost">← Reset</button>
        <FlaskConical size={16} color="var(--red)" />
        <span style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 600 }}>Benchmark results</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {tabs.map(([id, l]) => (
            <button key={id} onClick={() => setTab(id)} className="mono" style={{ padding: '8px 14px', borderRadius: 999, border: '1px solid var(--iron)', fontSize: 12, color: tab === id ? '#0A0A0B' : 'var(--silver)', background: tab === id ? 'var(--bone)' : 'transparent', borderColor: tab === id ? 'var(--bone)' : 'var(--iron)' }}>{l}</button>
          ))}
        </div>
      </div>

      <Reveal className="glass-soft" style={{ display: 'flex', gap: 12, padding: '14px 18px', marginBottom: 16, alignItems: 'flex-start' }}>
        <Info size={16} color="var(--silver)" style={{ flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: 12.5, color: 'var(--silver)', lineHeight: 1.6 }}>
          Headline numbers use <strong style={{ color: 'var(--bone)' }}>strict finding-level scoring</strong>, every
          labelled issue must be matched by a prediction overlapping its exact lines and category, and every unmatched
          prediction counts against precision. Several of the "extra" detections are real issues the minimal labels
          omit, so the precision shown is a conservative floor. See the <button onClick={() => setTab('method')} style={{ color: 'var(--red)', background: 'none', font: 'inherit', cursor: 'pointer', padding: 0 }}>Methodology</button> tab.
        </p>
      </Reveal>

      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Reveal className="glass" style={{ padding: 28 }}>
            <Eyebrow>Finding-level · strict</Eyebrow>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 20, marginTop: 16 }} className="ov-metrics">
              {[
                ['Precision', `${(fl.precision * 100).toFixed(1)}%`, fc(fl.precision)],
                ['Recall', `${(fl.recall * 100).toFixed(1)}%`, fc(fl.recall)],
                ['F1', `${(fl.f1 * 100).toFixed(1)}%`, fc(fl.f1)],
                ['Exact samples', `${fl.exact_samples}/${bi.total_samples}`, null],
                ['Findings', `${fl.tp}`, null],
                ['Latency', `${bi.avg_latency_ms}ms`, null],
              ].map(([l, v, c]) => (
                <div key={l}>
                  <div className="num display" style={{ fontSize: 30, color: c || 'var(--bone)' }}>{v}</div>
                  <div className="eyebrow" style={{ marginTop: 8 }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 18, marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--iron)', flexWrap: 'wrap' }}>
              <span className="mono" style={{ fontSize: 12, color: 'var(--pos)' }}>TP {fl.tp}</span>
              <span className="mono" style={{ fontSize: 12, color: 'var(--neg)' }}>FP {fl.fp} <span style={{ color: 'var(--pewter)' }}>(some are real, unlabelled)</span></span>
              <span className="mono" style={{ fontSize: 12, color: 'var(--mid)' }}>FN {fl.fn}</span>
            </div>
          </Reveal>

          <Reveal delay={60} className="glass-soft" style={{ padding: '18px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <Eyebrow>Category coverage · lenient</Eyebrow>
              <span className="mono" style={{ fontSize: 11, color: 'var(--pewter)' }}>"did the sample contain this category at all?"</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 22 }}>
                {[['Micro F1', cov.micro_f1], ['Macro F1', cov.macro_f1], ['Precision', cov.micro_precision], ['Recall', cov.micro_recall]].map(([l, v]) => (
                  <div key={l} style={{ textAlign: 'right' }}>
                    <div className="num" style={{ fontFamily: 'var(--display)', fontSize: 18, color: 'var(--silver)' }}>{(v * 100).toFixed(1)}%</div>
                    <div className="eyebrow" style={{ fontSize: 9.5 }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 16 }} className="bench-grid">
            <Reveal className="glass" style={{ padding: 22 }}>
              <Eyebrow>Confusion matrix · category</Eyebrow>
              <table style={{ width: '100%', marginTop: 16, borderSpacing: 3, borderCollapse: 'separate' }}>
                <thead>
                  <tr>
                    <th className="mono" style={{ fontSize: 9.5, color: 'var(--pewter)', textAlign: 'right', padding: 4, fontWeight: 500 }}>actual ↓ / pred →</th>
                    {cm.labels.map((l) => <th key={l} className="mono" style={{ fontSize: 9.5, color: catColor[l], padding: 4 }}>{l.replace('-Prone', '').replace(' Inefficiency', '')}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {cm.matrix.map((row, i) => {
                    const mv = Math.max(...cm.matrix.flat(), 1)
                    return (
                      <tr key={i}>
                        <td className="mono" style={{ fontSize: 9.5, color: catColor[cm.labels[i]], textAlign: 'right', padding: 4 }}>{cm.labels[i].replace('-Prone', '').replace(' Inefficiency', '')}</td>
                        {row.map((v, j) => {
                          const ok = i === j, int = v / mv
                          return <td key={j} className="num" style={{ textAlign: 'center', fontSize: 17, fontWeight: 600, fontFamily: 'var(--display)', padding: 12, borderRadius: 6, background: ok ? `rgba(143,169,155,${0.12 + int * 0.32})` : v > 0 ? `rgba(201,138,140,${0.12 + int * 0.3})` : 'var(--coal)', color: v > 0 ? 'var(--bone)' : 'var(--ghost)' }}>{v}</td>
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Reveal>

            <Reveal delay={60} className="glass" style={{ padding: 22 }}>
              <Eyebrow>F1 by pattern · strict</Eyebrow>
              <div style={{ marginTop: 16 }}>
                <ResponsiveContainer width="100%" height={Math.max(220, patBar.length * 26)}>
                  <BarChart data={patBar} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--slate)" />
                    <XAxis type="number" unit="%" tick={{ fill: 'var(--pewter)', fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" tick={{ fill: 'var(--silver)', fontSize: 10 }} width={120} />
                    <Tooltip contentStyle={{ background: 'var(--graphite)', border: '1px solid var(--iron)', borderRadius: 10 }} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="F1" radius={[0, 3, 3, 0]}>
                      {patBar.map((d, i) => <Cell key={i} fill={d.F1 >= 85 ? 'var(--pos)' : d.F1 >= 60 ? 'var(--mid)' : 'var(--neg)'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Reveal>
          </div>
        </div>
      )}

      {tab === 'breakdown' && (
        <Reveal className="glass" style={{ padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
            <Eyebrow>Per-sample breakdown · all {bd.length}</Eyebrow>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, fontSize: 11, fontFamily: 'var(--mono)' }}>
              <span style={{ color: 'var(--pos)' }}>● exact</span>
              <span style={{ color: 'var(--mid)' }}>● extra detection</span>
              <span style={{ color: 'var(--neg)' }}>● missed</span>
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--pewter)', marginBottom: 16 }}>Expected = hand-labelled ground truth. Detected = what the model returned. "Extra" often means a real issue the label omitted.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {bd.map((s) => {
              const status = s.exact ? 'pos' : s.missed > 0 ? 'neg' : 'mid'
              const col = { pos: 'var(--pos)', mid: 'var(--mid)', neg: 'var(--neg)' }[status]
              return (
                <div key={s.id} className="panel-inset" style={{ padding: 14, borderLeft: `2px solid ${col}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                    {s.exact ? <Check size={14} color="var(--pos)" /> : <AlertCircle size={14} color={col} />}
                    <span className="mono" style={{ fontSize: 12.5, color: 'var(--bone)' }}>{s.id}</span>
                    <span style={{ fontSize: 12, color: 'var(--pewter)' }}>{s.description}</span>
                    <span className="mono" style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--pewter)' }}>
                      {s.matched} matched · {s.missed} missed · {s.extra} extra
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="bd-cols">
                    <div>
                      <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 6 }}>Expected</div>
                      {s.expected.length === 0
                        ? <span className="mono" style={{ fontSize: 11, color: 'var(--pos)' }}>clean, no issues</span>
                        : s.expected.map((e, i) => (
                          <div key={i} className="mono" style={{ fontSize: 11, color: 'var(--silver)', padding: '2px 0' }}>
                            <span style={{ color: catColor[e.category] }}>●</span> {e.pattern || e.category} <span style={{ color: 'var(--ghost)' }}>L{e.line_start}</span>
                          </div>
                        ))}
                    </div>
                    <div>
                      <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 6 }}>Detected</div>
                      {s.detected.length === 0
                        ? <span className="mono" style={{ fontSize: 11, color: 'var(--pos)' }}>clean, no issues</span>
                        : s.detected.map((d, i) => {
                          const matched = s.expected.some((e) => e.category === d.category && d.line_start <= e.line_end && e.line_start <= d.line_end)
                          return (
                            <div key={i} className="mono" style={{ fontSize: 11, color: matched ? 'var(--silver)' : 'var(--mid)', padding: '2px 0' }}>
                              <span style={{ color: catColor[d.category] }}>●</span> {d.pattern || d.category} <span style={{ color: 'var(--ghost)' }}>L{d.line_start}</span>
                              {!matched && <span style={{ color: 'var(--mid)', marginLeft: 6 }}>· extra</span>}
                            </div>
                          )
                        })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Reveal>
      )}

      {tab === 'patterns' && (
        <Reveal className="glass" style={{ padding: 22 }}>
          <Eyebrow>Per-pattern metrics · strict</Eyebrow>
          <div style={{ overflowX: 'auto', marginTop: 16 }}>
            <table style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--iron)' }}>
                  {['Pattern', 'P', 'R', 'F1', 'TP', 'FP', 'FN', 'Support'].map((h) => <th key={h} className="eyebrow" style={{ padding: '10px 12px', textAlign: h === 'Pattern' ? 'left' : 'center' }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {Object.entries(pp).sort((a, b) => b[1].f1 - a[1].f1).map(([pat, m]) => (
                  <tr key={pat} style={{ borderBottom: '1px solid var(--slate)' }}>
                    <td className="mono" style={{ padding: 12, color: 'var(--bone)' }}>{pat.replace(/_/g, ' ')}</td>
                    <td className="num" style={{ textAlign: 'center' }}>{(m.precision * 100).toFixed(0)}%</td>
                    <td className="num" style={{ textAlign: 'center' }}>{(m.recall * 100).toFixed(0)}%</td>
                    <td className="num" style={{ textAlign: 'center', fontWeight: 600, color: fc(m.f1) }}>{(m.f1 * 100).toFixed(0)}%</td>
                    <td className="num" style={{ textAlign: 'center', color: 'var(--pos)' }}>{m.tp}</td>
                    <td className="num" style={{ textAlign: 'center', color: 'var(--neg)' }}>{m.fp}</td>
                    <td className="num" style={{ textAlign: 'center', color: 'var(--mid)' }}>{m.fn}</td>
                    <td className="num" style={{ textAlign: 'center', color: 'var(--pewter)' }}>{m.support}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      )}

      {tab === 'method' && (
        <Reveal className="glass" style={{ padding: 28, maxWidth: 760 }}>
          <Eyebrow>How these numbers are computed</Eyebrow>
          <div style={{ fontSize: 14.5, color: 'var(--silver)', lineHeight: 1.7, marginTop: 16 }}>
            <p style={{ marginBottom: 16 }}>
              The suite is <strong style={{ color: 'var(--bone)' }}>{bi.total_samples} Python samples</strong>, {bi.defective_samples} with
              hand-labelled defects and {bi.clean_samples} deliberately clean, totalling {bi.total_ground_truth_issues} labelled issues.
            </p>
            <h3 style={{ fontFamily: 'var(--display)', fontSize: 17, fontWeight: 600, margin: '20px 0 8px', color: 'var(--bone)' }}>Strict finding-level (the headline)</h3>
            <p style={{ marginBottom: 8 }}>For every labelled issue, a detection counts as a match only if it:</p>
            <ul style={{ paddingLeft: 20, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li>shares the same <strong style={{ color: 'var(--bone)' }}>category</strong> (Bug-Prone / Code Smell / Design), and</li>
              <li>overlaps the issue's <strong style={{ color: 'var(--bone)' }}>line range</strong>.</li>
            </ul>
            <p style={{ marginBottom: 16 }}>
              Matches are TP, unmatched labels are FN (a miss), and any detection that matches no label is FP. This is
              strict: a single spurious detection lowers precision, and approximate line ranges fail the overlap test.
            </p>
            <h3 style={{ fontFamily: 'var(--display)', fontSize: 17, fontWeight: 600, margin: '20px 0 8px', color: 'var(--bone)' }}>Why precision is a floor, not a ceiling</h3>
            <p style={{ marginBottom: 16 }}>
              Ground-truth labels are intentionally minimal, usually the single "headline" issue per sample. The
              detector frequently finds <em>additional real issues</em> (e.g. a high-complexity function that is also
              deeply nested). Those count as false positives here even though they're correct, so the true precision
              is higher than the {(fl.precision * 100).toFixed(1)}% shown. Open the Breakdown tab to judge each one yourself.
            </p>
            <h3 style={{ fontFamily: 'var(--display)', fontSize: 17, fontWeight: 600, margin: '20px 0 8px', color: 'var(--bone)' }}>Category coverage (the secondary number)</h3>
            <p style={{ marginBottom: 16 }}>
              The lenient coverage metric only asks whether a sample <em>contained</em> a category at all, not whether
              every issue was pinned to the right lines. It reads 100% because the detector never misses a category,
              but it hides the extra detections. We show it for completeness, clearly labelled, but it is not the headline.
            </p>
            <h3 style={{ fontFamily: 'var(--display)', fontSize: 17, fontWeight: 600, margin: '20px 0 8px', color: 'var(--bone)' }}>Caveats</h3>
            <p>
              37 samples is a small, hand-built suite, useful as a sanity check and regression guard, not a claim of
              real-world accuracy. The detector is heuristic over a GAT, not trained on this set, so there's no leakage;
              but a larger, independently-labelled corpus would be needed for production-grade evaluation.
            </p>
          </div>
        </Reveal>
      )}

      <style>{`@media (max-width: 860px){ .bench-grid { grid-template-columns: 1fr !important; } .ov-metrics { grid-template-columns: repeat(3,1fr) !important; gap: 16px !important; } .bd-cols { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}
