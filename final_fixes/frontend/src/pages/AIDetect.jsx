import React, { useState, useCallback } from 'react'
import { Sparkles, ScanLine, ArrowRight } from 'lucide-react'
import { api, bandColor, LANGS, getSample } from '../lib/api'
import { Reveal, Eyebrow, Ring, Sev, Spinner, Rule } from '../components/ui'
import CodeView from '../components/CodeView'

export default function AIDetect() {
  const [code, setCode] = useState('')
  const [lang, setLang] = useState('Python')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const [result, setResult] = useState(null)

  const run = useCallback(async () => {
    setLoading(true); setErr(null)
    try {
      const d = await api.aiDetect(code, lang)
      setResult(d)
    } catch (e) { setErr(e.message) }
    setLoading(false)
  }, [code, lang])

  const flagged = new Set()
  if (result) result.findings.forEach((f) => { if (f.line_start > 0) for (let l = f.line_start; l <= f.line_end; l++) flagged.add(l) })

  return (
    <div className="shell" style={{ paddingTop: 50, paddingBottom: 40 }}>
      <Reveal>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sparkles size={18} color="var(--red)" />
          <Eyebrow>New in v2.0</Eyebrow>
        </div>
        <h1 className="display" style={{ fontSize: 'clamp(30px,4.5vw,46px)', margin: '14px 0 8px' }}>
          Is this code <span style={{ color: 'var(--red)' }}>AI-generated?</span>
        </h1>
        <p style={{ fontSize: 15, color: 'var(--silver)', maxWidth: 600, marginBottom: 28 }}>
          A maintainability check, not a plagiarism tool. ACRS scores the stylistic and structural
          tells of LLM-written code, over-narration, placeholder stubs, generic naming, defensive
          boilerplate, and hands back concrete, cleaner rewrites for each one.
        </p>
      </Reveal>

      <div style={{ display: 'grid', gridTemplateColumns: result ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'minmax(0, 1fr)', gap: 16 }} className="ai-grid">
        <Reveal className="glass" style={{ padding: 18, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <Eyebrow>Paste code</Eyebrow>
            <div style={{ display: 'flex', gap: 4, marginLeft: 'auto', flexWrap: 'wrap' }}>
              {LANGS.map((l) => (
                <button key={l} onClick={() => setLang(l)} className="mono" style={{ padding: '5px 10px', fontSize: 11, borderRadius: 3, border: '1px solid var(--iron)', background: lang === l ? 'var(--bone)' : 'transparent', color: lang === l ? '#0A0A0B' : 'var(--silver)', borderColor: lang === l ? 'var(--bone)' : 'var(--iron)' }}>{l}</button>
              ))}
            </div>
          </div>
          <textarea value={code} onChange={(e) => setCode(e.target.value)} placeholder="# paste a function, class, or file…" spellCheck={false}
            style={{ width: '100%', minHeight: result ? 300 : 260, background: 'var(--coal)', border: '1px solid var(--slate)', borderRadius: 4, color: 'var(--bone)', fontFamily: 'var(--mono)', fontSize: 13, lineHeight: 1.6, padding: 14, resize: 'vertical', outline: 'none' }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={run} disabled={!code.trim() || loading}>
              {loading ? <Spinner size={14} /> : <ScanLine size={14} />} Detect
            </button>
            <span className="mono" style={{ fontSize: 11, color: 'var(--pewter)' }}>load:</span>
            {[['AI-style', 'ai'], ['Human', 'clean']].map(([label, kind]) => (
              <button key={label} onClick={() => setCode(getSample(lang, kind))} className="tag" style={{ cursor: 'pointer' }}>{label}</button>
            ))}
          </div>
          {err && <p className="mono" style={{ color: 'var(--red)', fontSize: 13, marginTop: 14 }}>{err}</p>}
          {result && <div style={{ marginTop: 18 }}><Rule style={{ marginBottom: 14 }} /><Eyebrow>Annotated source</Eyebrow><div style={{ marginTop: 12 }}><CodeView source={code} flagged={flagged} maxHeight={260} /></div></div>}
        </Reveal>

        {result && (
          <Reveal delay={80} style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
            <div className="glass" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 24 }}>
              <Ring value={result.ai_likelihood * 100} label="Likelihood" color={bandColor[result.band]} />
              <div>
                <span className="tag" style={{ color: bandColor[result.band], borderColor: bandColor[result.band] + '50', fontSize: 12.5 }}>{result.band_label}</span>
                <p style={{ fontSize: 14, color: 'var(--silver)', marginTop: 12, maxWidth: 280 }}>{result.band_description}.</p>
                <p className="mono" style={{ fontSize: 11.5, color: 'var(--pewter)', marginTop: 8 }}>{result.finding_count} finding{result.finding_count !== 1 ? 's' : ''} · {result.analyzed_lines} lines</p>
              </div>
            </div>

            <div className="glass" style={{ padding: 20 }}>
              <Eyebrow>Signal breakdown</Eyebrow>
              <div style={{ marginTop: 14 }}>
                {result.signals.map((sig) => (
                  <div key={sig.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--slate)' }}>
                    <span className="mono" style={{ fontSize: 12, color: sig.strength > 0.02 ? 'var(--silver)' : 'var(--ghost)', width: 180 }}>{sig.label}</span>
                    <div style={{ flex: 1, height: 5, background: 'var(--slate)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${sig.strength * 100}%`, background: sig.strength > 0.5 ? 'var(--red)' : sig.strength > 0.2 ? 'var(--red)' : 'var(--mid)', transition: 'width .6s ease' }} />
                    </div>
                    <span className="mono num" style={{ fontSize: 11, color: 'var(--pewter)', width: 36, textAlign: 'right' }}>{(sig.strength * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {result.findings.length > 0 && (
              <div className="glass" style={{ padding: 20 }}>
                <Eyebrow>Cleaner rewrites</Eyebrow>
                <div style={{ marginTop: 14 }}>
                  {result.findings.map((f, i) => (
                    <div key={i} className="panel-inset" style={{ padding: 13, marginBottom: 8 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                        <Sev level={f.severity} />
                        <span className="mono" style={{ fontSize: 11, color: 'var(--pewter)' }}>{f.line_start > 0 ? `L${f.line_start}` : 'file-level'}</span>
                        {f.snippet && <span className="mono" style={{ fontSize: 10.5, color: 'var(--ghost)', marginLeft: 'auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{f.snippet}</span>}
                      </div>
                      <p style={{ fontSize: 13, marginBottom: 4 }}>{f.description}</p>
                      <p style={{ fontSize: 12.5, color: 'var(--red)' }}>→ {f.suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Reveal>
        )}
      </div>

      {!result && (
        <Reveal delay={120} style={{ marginTop: 40 }}>
          <Rule style={{ marginBottom: 32 }} />
          <Eyebrow>What it looks for</Eyebrow>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginTop: 20 }} className="tell-grid">
            {[
              ['Over-narration', 'A comment above every line restating what the code already says.'],
              ['Placeholder logic', 'pass, ..., "your code here", and TODO stubs left where real behaviour should be.'],
              ['Generic naming', 'data, result, temp, do_something, names that force you to read the body.'],
              ['Defensive boilerplate', 'try/except Exception wrapped around two trivial lines, often silently.'],
              ['Uniform structure', 'Every function the same shape: docstring, one loop, one return.'],
              ['Tutorial docstrings', '"This function takes the given data and we then return the result."'],
            ].map(([t, d], i) => (
              <div key={t} className="glass" style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--bone)' }}>{t}</span>
                  <span className="eyebrow">{String(i + 1).padStart(2, '0')}</span>
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--silver)', lineHeight: 1.6 }}>{d}</p>
              </div>
            ))}
          </div>
        </Reveal>
      )}

      <style>{`@media (max-width: 860px){ .ai-grid { grid-template-columns: 1fr !important; } .tell-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}
