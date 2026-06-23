import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  GitBranch, ScanLine, AlertTriangle, FileCode2, Network, Layers, Search, X,
  ChevronRight, Package, Sparkles, Code2, Zap,
} from 'lucide-react'
import { api, catColor, sevColor, bandColor, LANGS, getSample } from '../lib/api'
import { Reveal, Eyebrow, Ring, Sev, Spinner, Rule } from '../components/ui'
import ProgramGraph from '../components/ProgramGraph'
import CodeView from '../components/CodeView'

const STEPS = ['Cloning repository', 'Parsing source → AST', 'Building program graphs', 'Adding CFG + DFG edges', 'GAT message passing', 'AI-code detection', 'Generating report']

function LoadingSequence({ mode }) {
  const [s, setS] = useState(0)
  const steps = mode === 'snippet' ? STEPS.slice(1) : STEPS
  useEffect(() => {
    const i = setInterval(() => setS((v) => Math.min(v + 1, steps.length - 1)), mode === 'snippet' ? 500 : 1600)
    return () => clearInterval(i)
  }, [steps.length, mode])
  return (
    <div className="shell" style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
      <Spinner size={40} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 600 }}>Developing</div>
        <div className="mono" style={{ fontSize: 13, color: 'var(--silver)', marginTop: 6 }}>{steps[s]}…</div>
      </div>
      <div className="glass" style={{ padding: '16px 22px', width: 320 }}>
        {steps.map((st, i) => (
          <div key={st} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', fontSize: 12.5, fontFamily: 'var(--mono)', color: i <= s ? 'var(--bone)' : 'var(--ghost)', transition: 'color .3s' }}>
            <span style={{ width: 14, height: 14, borderRadius: 2, flexShrink: 0, background: i < s ? 'var(--pos)' : i === s ? 'var(--red)' : 'var(--slate)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff' }}>
              {i < s ? '✓' : ''}
            </span>
            {st}
          </div>
        ))}
      </div>
    </div>
  )
}

function Donut({ bugs, smells, design }) {
  const data = [
    { name: 'Bugs', value: bugs, color: 'var(--neg)' },
    { name: 'Smells', value: smells, color: 'var(--mid)' },
    { name: 'Design', value: design, color: 'var(--silver)' },
  ].filter((d) => d.value > 0)
  const show = data.length ? data : [{ name: 'Clean', value: 1, color: 'var(--pos)' }]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <PieChart width={130} height={130}>
        <Pie data={show} cx={65} cy={65} innerRadius={38} outerRadius={60} dataKey="value" paddingAngle={3} stroke="var(--void)" strokeWidth={2}>
          {show.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Pie>
      </PieChart>
      <div style={{ display: 'flex', gap: 14, fontSize: 11.5, fontFamily: 'var(--mono)' }}>
        {[['Bugs', 'var(--neg)', bugs], ['Smells', 'var(--mid)', smells], ['Design', 'var(--silver)', design]].map(([l, c, v]) => (
          <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--silver)' }}>
            <span style={{ width: 7, height: 7, borderRadius: 1, background: c }} />{l} {v}
          </span>
        ))}
      </div>
    </div>
  )
}

function FileModal({ file, onClose }) {
  const [tab, setTab] = useState('issues')
  if (!file) return null
  const flagged = new Set()
  ;(file.issues || []).forEach((iss) => { for (let l = iss.line_start; l <= iss.line_end; l++) flagged.add(l) })
  const ai = file.ai_detection
  const tabs = [
    ['issues', `Issues · ${file.issues?.length || 0}`],
    ...(ai ? [['ai', `AI · ${ai.band_label}`]] : []),
    ['imports', 'Imports'],
    ['graph', 'Graph'],
    ['source', 'Source'],
  ]
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(4,4,6,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} className="panel develop" style={{ width: '100%', maxWidth: 1000, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--slate)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{file.path}</div>
            <div className="mono" style={{ fontSize: 11.5, color: 'var(--pewter)', marginTop: 3 }}>
              {file.language} · {file.lines} lines · {file.graph_info?.num_nodes || 0} nodes · {file.graph_info?.num_edges || 0} edges
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 3, border: '1px solid var(--iron)', background: 'transparent', color: 'var(--silver)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={15} /></button>
        </div>
        <div style={{ display: 'flex', gap: 4, padding: '10px 22px', borderBottom: '1px solid var(--slate)' }}>
          {tabs.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className="mono" style={{ padding: '6px 12px', borderRadius: 3, border: 'none', fontSize: 11.5, color: tab === id ? 'var(--bone)' : 'var(--silver)', background: tab === id ? 'rgba(255,255,255,0.07)' : 'transparent', borderBottom: tab === id ? '1px solid var(--iron)' : '1px solid transparent' }}>{label}</button>
          ))}
        </div>
        <div style={{ overflow: 'auto', padding: '18px 22px' }}>
          {tab === 'issues' && (file.issues?.length ? file.issues.map((iss, i) => (
            <div key={i} className="panel-inset" style={{ padding: 14, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8, flexWrap: 'wrap' }}>
                <span className="tag" style={{ color: catColor[iss.category], borderColor: catColor[iss.category] + '40' }}>{iss.category}</span>
                <Sev level={iss.severity} />
                <span className="mono" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--pewter)' }}>
                  L{iss.line_start}{iss.line_end !== iss.line_start ? `–${iss.line_end}` : ''} · {(iss.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <p style={{ fontSize: 13.5, marginBottom: 4 }}>{iss.description}</p>
              <p style={{ fontSize: 12.5, color: 'var(--red)' }}>→ {iss.suggestion}</p>
            </div>
          )) : <Empty text="No structural issues, this file reads clean." />)}

          {tab === 'ai' && ai && <AIPanel ai={ai} />}
          {tab === 'imports' && <ImportsPanel imports={file.imports} />}
          {tab === 'graph' && <ProgramGraph data={file.graph_viz} height={440} />}
          {tab === 'source' && <CodeView source={file.source_preview} flagged={flagged} maxHeight={520} />}
        </div>
      </div>
    </div>
  )
}

function AIPanel({ ai }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
        <Ring value={ai.ai_likelihood * 100} label="Likelihood" color={bandColor[ai.band]} size={120} />
        <div>
          <span className="tag" style={{ color: bandColor[ai.band], borderColor: bandColor[ai.band] + '50', fontSize: 12 }}>{ai.band_label}</span>
          <p style={{ fontSize: 13.5, color: 'var(--silver)', marginTop: 10, maxWidth: 320 }}>{ai.band_description}.</p>
        </div>
      </div>
      <Eyebrow>Signals</Eyebrow>
      <div style={{ marginTop: 12, marginBottom: 20 }}>
        {ai.signals.filter((s) => s.strength > 0.02).map((s) => (
          <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0', borderBottom: '1px solid var(--slate)' }}>
            <span className="mono" style={{ fontSize: 12, color: 'var(--silver)', width: 200 }}>{s.label}</span>
            <div style={{ flex: 1, height: 5, background: 'var(--slate)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${s.strength * 100}%`, background: 'var(--red)' }} />
            </div>
            <span className="mono num" style={{ fontSize: 11, color: 'var(--pewter)', width: 40, textAlign: 'right' }}>{(s.strength * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
      {ai.findings.length > 0 && <>
        <Eyebrow>Cleaner rewrites</Eyebrow>
        <div style={{ marginTop: 12 }}>
          {ai.findings.map((f, i) => (
            <div key={i} className="panel-inset" style={{ padding: 12, marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <Sev level={f.severity} />
                <span className="mono" style={{ fontSize: 11, color: 'var(--pewter)' }}>{f.line_start > 0 ? `L${f.line_start}` : 'file'}</span>
              </div>
              <p style={{ fontSize: 13, marginBottom: 4 }}>{f.description}</p>
              <p style={{ fontSize: 12.5, color: 'var(--red)' }}>→ {f.suggestion}</p>
            </div>
          ))}
        </div>
      </>}
    </div>
  )
}

function ImportsPanel({ imports }) {
  if (!imports || (!imports.frameworks?.length && !imports.imports?.length)) return <Empty text="No imports detected." />
  return (
    <div>
      {imports.frameworks?.length > 0 && <>
        <Eyebrow>Detected libraries</Eyebrow>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '12px 0 20px' }}>
          {imports.frameworks.map((fw, i) => <span key={i} className="tag" style={{ color: 'var(--red)', borderColor: 'var(--red)40' }}>{fw.name}</span>)}
        </div>
      </>}
      <Eyebrow>Imports · {imports.imports?.length || 0}</Eyebrow>
      <div className="mono" style={{ marginTop: 12, fontSize: 12, color: 'var(--silver)' }}>
        {(imports.imports || []).slice(0, 40).map((im, i) => (
          <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid var(--slate)', display: 'flex', justifyContent: 'space-between' }}>
            <span>{im.module}</span><span style={{ color: 'var(--ghost)' }}>L{im.line}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Empty({ text }) {
  return <div style={{ padding: 36, textAlign: 'center', color: 'var(--pewter)', fontSize: 13 }}>{text}</div>
}

/* ---------- snippet input ---------- */
function SnippetInput({ onRun, loading }) {
  const [code, setCode] = useState('')
  const [lang, setLang] = useState('Python')
  return (
    <div className="glass" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <Eyebrow>Paste code</Eyebrow>
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto', flexWrap: 'wrap' }}>
          {LANGS.map((l) => (
            <button key={l} onClick={() => setLang(l)} className="mono" style={{ padding: '5px 10px', fontSize: 11, borderRadius: 3, border: '1px solid var(--iron)', background: lang === l ? 'var(--bone)' : 'transparent', color: lang === l ? '#0A0A0B' : 'var(--silver)', borderColor: lang === l ? 'var(--bone)' : 'var(--iron)' }}>{l}</button>
          ))}
        </div>
      </div>
      <textarea value={code} onChange={(e) => setCode(e.target.value)} placeholder="# paste a function, class, or whole file…" spellCheck={false}
        style={{ width: '100%', minHeight: 240, background: 'var(--coal)', border: '1px solid var(--slate)', borderRadius: 4, color: 'var(--bone)', fontFamily: 'var(--mono)', fontSize: 13, lineHeight: 1.6, padding: 14, resize: 'vertical', outline: 'none' }} />
      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn btn-primary" onClick={() => onRun(code, lang)} disabled={!code.trim() || loading}>
          {loading ? <Spinner size={14} /> : <ScanLine size={14} />} Analyze
        </button>
        <span className="mono" style={{ fontSize: 11, color: 'var(--pewter)' }}>or load:</span>
        {[['AI-style', 'ai'], ['Buggy', 'buggy'], ['Clean', 'clean']].map(([label, kind]) => (
          <button key={label} onClick={() => setCode(getSample(lang, kind))} className="tag" style={{ cursor: 'pointer' }}>{label}</button>
        ))}
      </div>
    </div>
  )
}

export default function Analyze() {
  const [params, setParams] = useSearchParams()
  const [mode, setMode] = useState('repo')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const [data, setData] = useState(null)
  const [snippet, setSnippet] = useState(null)
  const [repoUrl, setRepoUrl] = useState(params.get('repo') || '')
  const [openFile, setOpenFile] = useState(null)

  const runRepo = useCallback(async (url) => {
    setLoading(true); setErr(null); setSnippet(null)
    try {
      const d = await api.analyzeRepo(url)
      setData(d)
    } catch (e) { setErr(e.message) }
    setLoading(false)
  }, [])

  const runSnippet = useCallback(async (code, lang) => {
    setLoading(true); setErr(null); setData(null)
    try {
      const d = await api.analyzeSnippet(code, lang)
      setSnippet(d)
    } catch (e) { setErr(e.message) }
    setLoading(false)
  }, [])

  // auto-run if ?repo= present
  useEffect(() => {
    const r = params.get('repo')
    if (r && !data && !loading) { setMode('repo'); runRepo(r) }
    // eslint-disable-next-line
  }, [])

  if (loading) return <LoadingSequence mode={mode} />

  return (
    <div className="shell" style={{ paddingTop: 50, paddingBottom: 40 }}>
      {!data && !snippet && (
        <Reveal>
          <Eyebrow>Analyze</Eyebrow>
          <h1 className="display" style={{ fontSize: 'clamp(30px,4.5vw,46px)', margin: '14px 0 8px' }}>Scan a repo, or paste code.</h1>
          <p style={{ fontSize: 15, color: 'var(--silver)', maxWidth: 540, marginBottom: 28 }}>
            Point ACRS at a public GitHub repository for a full report, or drop in a single file to try it instantly, no clone, no signup.
          </p>
          <div style={{ display: 'flex', gap: 4, marginBottom: 22 }}>
            {[['repo', 'Repository', GitBranch], ['snippet', 'Snippet', Code2]].map(([id, label, Icon]) => (
              <button key={id} onClick={() => setMode(id)} className="mono" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 3, border: '1px solid var(--iron)', fontSize: 12.5, color: mode === id ? '#0A0A0B' : 'var(--silver)', background: mode === id ? 'var(--bone)' : 'transparent', borderColor: mode === id ? 'var(--bone)' : 'var(--iron)' }}>
                <Icon size={14} />{label}
              </button>
            ))}
          </div>

          {mode === 'repo' ? (
            <div className="glass" style={{ display: 'flex', padding: 6, maxWidth: 560, borderRadius: 5 }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px' }}>
                <GitBranch size={15} color="var(--pewter)" />
                <input value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && repoUrl.trim() && runRepo(repoUrl.trim())}
                  placeholder="github.com/user/repo" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--bone)', fontSize: 14.5, padding: '12px 0', fontFamily: 'var(--mono)' }} />
              </div>
              <button className="btn btn-primary" onClick={() => repoUrl.trim() && runRepo(repoUrl.trim())} disabled={!repoUrl.trim()}>Scan</button>
            </div>
          ) : <SnippetInput onRun={runSnippet} loading={loading} />}

          {err && <p className="mono" style={{ color: 'var(--red)', fontSize: 13, marginTop: 16, padding: '10px 14px', background: 'rgba(212,40,44,0.08)', borderRadius: 4, border: '1px solid var(--red)30', display: 'inline-block' }}>{err}</p>}
        </Reveal>
      )}

      {snippet && <SnippetResult data={snippet} onReset={() => { setSnippet(null); setParams({}) }} />}
      {data && <RepoResult data={data} onFile={setOpenFile} onReset={() => { setData(null); setRepoUrl(''); setParams({}) }} />}
      {openFile && <FileModal file={openFile} onClose={() => setOpenFile(null)} />}
    </div>
  )
}

/* ---------- snippet result ---------- */
function SnippetResult({ data, onReset }) {
  const flagged = new Set()
  ;(data.issues || []).forEach((iss) => { for (let l = iss.line_start; l <= iss.line_end; l++) flagged.add(l) })
  const ai = data.ai_detection
  return (
    <Reveal>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
        <button onClick={onReset} className="btn btn-ghost">← New analysis</button>
        <span className="mono" style={{ fontSize: 12.5, color: 'var(--pewter)' }}>{data.language} · {data.lines} lines · {data.graph_info?.num_nodes} nodes</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16 }} className="snip-grid">
        <div className="glass" style={{ padding: 18, minWidth: 0 }}>
          <Eyebrow>Issues · {data.issues?.length || 0}</Eyebrow>
          <div style={{ marginTop: 14 }}>
            {data.issues?.length ? data.issues.map((iss, i) => (
              <div key={i} className="panel-inset" style={{ padding: 13, marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 7, flexWrap: 'wrap' }}>
                  <span className="tag" style={{ color: catColor[iss.category], borderColor: catColor[iss.category] + '40' }}>{iss.category}</span>
                  <Sev level={iss.severity} />
                  <span className="mono" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--pewter)' }}>L{iss.line_start} · {(iss.confidence * 100).toFixed(0)}%</span>
                </div>
                <p style={{ fontSize: 13, marginBottom: 4 }}>{iss.description}</p>
                <p style={{ fontSize: 12.5, color: 'var(--red)' }}>→ {iss.suggestion}</p>
              </div>
            )) : <Empty text="No structural issues found." />}
          </div>
          {ai && <div style={{ marginTop: 18 }}><Rule style={{ marginBottom: 16 }} /><AIPanel ai={ai} /></div>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <div className="glass" style={{ padding: 18, minWidth: 0, overflow: 'hidden' }}>
            <Eyebrow>Source</Eyebrow>
            <div style={{ marginTop: 12 }}><CodeView source={data.source_preview} flagged={flagged} maxHeight={300} /></div>
          </div>
          <div className="glass" style={{ padding: 18, minWidth: 0, overflow: 'hidden' }}>
            <Eyebrow>Program graph</Eyebrow>
            <div style={{ marginTop: 12 }}><ProgramGraph data={data.graph_viz} height={320} /></div>
          </div>
        </div>
      </div>
      <style>{`@media (max-width: 860px){ .snip-grid { grid-template-columns: 1fr !important; } }`}</style>
    </Reveal>
  )
}

/* ---------- repo result dashboard ---------- */
function RepoResult({ data, onFile, onReset }) {
  const [tab, setTab] = useState('overview')
  const [q, setQ] = useState('')
  const [lf, setLf] = useState('all')
  const s = data.summary || {}, rp = data.report || {}, gs = data.graph_stats || {}
  const langs = Object.keys(s.language_breakdown || {})
  const files = (data.files || []).filter((f) => {
    if (q && !f.path.toLowerCase().includes(q.toLowerCase())) return false
    if (lf !== 'all' && f.language !== lf) return false
    return true
  })
  const edgeData = [
    { name: 'AST', value: gs.total_ast_edges || 0, fill: 'var(--silver)' },
    { name: 'CFG', value: gs.total_cfg_edges || 0, fill: 'var(--pos)' },
    { name: 'DFG', value: gs.total_dfg_edges || 0, fill: 'var(--red)' },
  ]
  const healthColor = rp.health_score >= 80 ? 'var(--pos)' : rp.health_score >= 60 ? 'var(--mid)' : 'var(--red)'
  const allFw = []; const seen = new Set()
  ;(data.files || []).forEach((f) => (f.imports?.frameworks || []).forEach((fw) => { if (!seen.has(fw.name)) { seen.add(fw.name); allFw.push(fw) } }))
  const tabs = [['overview', 'Overview'], ['files', 'Files'], ['graph', 'Graph']]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={onReset} className="btn btn-ghost">← New scan</button>
        <div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 600 }}>{data.repository?.name}</div>
          <div className="mono" style={{ fontSize: 11.5, color: 'var(--pewter)' }}>{data.repository?.branch} · {data.repository?.commit_hash} · {data.files_analyzed} files</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {tabs.map(([id, l]) => (
            <button key={id} onClick={() => setTab(id)} className="mono" style={{ padding: '8px 14px', borderRadius: 3, border: '1px solid var(--iron)', fontSize: 12, color: tab === id ? 'var(--bone)' : 'var(--silver)', background: tab === id ? 'rgba(255,255,255,0.07)' : 'transparent', borderColor: tab === id ? 'var(--bone)' : 'var(--iron)' }}>{l}</button>
          ))}
        </div>
      </div>

      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 16 }} className="ov-grid">
            <Reveal className="glass" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 24 }}>
              <Ring value={rp.health_score || 0} label={`Grade ${rp.health_grade || '?'}`} color={healthColor} />
              <div>
                <h3 style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Health score</h3>
                <p style={{ fontSize: 13, color: 'var(--silver)', marginBottom: 14 }}>{data.files_analyzed} files · {langs.length} language{langs.length !== 1 ? 's' : ''}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(rp.recommendations || []).map((r, i) => (
                    <span key={i} style={{ fontSize: 12, color: r.priority === 'high' ? 'var(--neg)' : r.priority === 'medium' ? 'var(--mid)' : 'var(--silver)' }}>• {r.text}</span>
                  ))}
                </div>
              </div>
            </Reveal>
            <Reveal delay={60} className="glass" style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Donut bugs={s.bugs} smells={s.code_smells} design={s.design_issues} />
            </Reveal>
            <Reveal delay={120} className="glass" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Sparkles size={18} color="var(--red)" />
                <div>
                  <div className="num" style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 600 }}>{s.ai_flagged_files || 0}</div>
                  <div className="eyebrow">AI-flagged files</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--pewter)' }}>avg likelihood {((s.ai_avg_likelihood || 0) * 100).toFixed(0)}% across repo</div>
            </Reveal>
          </div>

          {allFw.length > 0 && (
            <Reveal delay={100} className="glass" style={{ padding: '16px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <Package size={15} color="var(--pewter)" />
                <Eyebrow>Stack</Eyebrow>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginLeft: 6 }}>
                  {allFw.slice(0, 24).map((fw, i) => <span key={i} className="tag" style={{ color: 'var(--silver)' }}>{fw.name}</span>)}
                </div>
              </div>
            </Reveal>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: 'var(--slate)', border: '1px solid var(--slate)' }} className="metric-strip">
            {[['Issues', s.total_issues || 0, 'var(--red)'], ['Bugs', s.bugs || 0, 'var(--neg)'], ['Nodes', (data.total_nodes || 0).toLocaleString(), 'var(--bone)'], ['Edges', (data.total_edges || 0).toLocaleString(), 'var(--silver)']].map(([l, v, c]) => (
              <div key={l} style={{ background: 'var(--graphite)', padding: '20px 22px' }}>
                <div className="num" style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 600, color: c }}>{v}</div>
                <div className="eyebrow" style={{ marginTop: 6 }}>{l}</div>
              </div>
            ))}
          </div>

          {rp.hotspots?.length > 0 && (
            <Reveal className="glass" style={{ padding: 22 }}>
              <Eyebrow>Hotspots</Eyebrow>
              <div style={{ marginTop: 14 }}>
                {rp.hotspots.slice(0, 6).map((h, i) => (
                  <div key={i} onClick={() => onFile(data.files.find((f) => f.path === h.path))} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--slate)', cursor: 'pointer' }}>
                    <span className="mono" style={{ width: 22, height: 22, borderRadius: 2, background: 'rgba(212,40,44,0.12)', color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>{i + 1}</span>
                    <span className="mono" style={{ flex: 1, fontSize: 13, color: 'var(--bone)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.path}</span>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--silver)' }}>{h.issue_count}</span>
                    {h.critical_count > 0 && <Sev level="critical">{h.critical_count} crit</Sev>}
                    <ChevronRight size={14} color="var(--pewter)" />
                  </div>
                ))}
              </div>
            </Reveal>
          )}
        </div>
      )}

      {tab === 'files' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <div className="glass" style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px' }}>
              <Search size={14} color="var(--pewter)" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="filter files…" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--bone)', fontSize: 13.5, padding: '11px 0', fontFamily: 'var(--mono)' }} />
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {['all', ...langs].map((l) => (
                <button key={l} onClick={() => setLf(l)} className="mono" style={{ padding: '8px 12px', fontSize: 11.5, borderRadius: 3, border: '1px solid var(--iron)', color: lf === l ? '#0A0A0B' : 'var(--silver)', background: lf === l ? 'var(--bone)' : 'transparent', borderColor: lf === l ? 'var(--bone)' : 'var(--iron)' }}>{l === 'all' ? 'All' : l}</button>
              ))}
            </div>
          </div>
          <div className="glass" style={{ padding: 6 }}>
            {files.length === 0 && <Empty text="No files match." />}
            {files.map((f, i) => (
              <div key={i} onClick={() => onFile(f)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 4, cursor: 'pointer', transition: 'background .15s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--coal)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                <span className="mono" style={{ width: 32, height: 32, borderRadius: 3, background: 'var(--coal)', border: '1px solid var(--slate)', color: 'var(--silver)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, flexShrink: 0 }}>{f.language === 'Python' ? 'py' : f.language === 'C++' ? 'c++' : f.language?.slice(0, 2).toLowerCase()}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="mono" style={{ fontSize: 12.5, color: 'var(--bone)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.path}</div>
                  <div className="mono" style={{ fontSize: 10.5, color: 'var(--pewter)', marginTop: 1 }}>{f.lines} ln · {f.graph_info?.num_nodes || 0} nodes</div>
                </div>
                {f.ai_detection && (f.ai_detection.band === 'likely' || f.ai_detection.band === 'very_likely') && <Sev level="medium">AI</Sev>}
                {f.issue_count > 0 ? <Sev level="critical">{f.issue_count}</Sev> : <Sev level="none">clean</Sev>}
                <ChevronRight size={14} color="var(--pewter)" />
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'graph' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: 'var(--slate)', border: '1px solid var(--slate)' }}>
            {[['AST edges', gs.total_ast_edges, 'var(--silver)'], ['CFG edges', gs.total_cfg_edges, 'var(--pos)'], ['DFG edges', gs.total_dfg_edges, 'var(--red)']].map(([l, v, c]) => (
              <div key={l} style={{ background: 'var(--graphite)', padding: '20px 22px' }}>
                <div className="num" style={{ fontFamily: 'var(--display)', fontSize: 26, fontWeight: 600, color: c }}>{(v || 0).toLocaleString()}</div>
                <div className="eyebrow" style={{ marginTop: 6 }}>{l}</div>
              </div>
            ))}
          </div>
          <div className="glass" style={{ padding: 22 }}>
            <Eyebrow>Edge distribution</Eyebrow>
            <div style={{ marginTop: 16 }}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={edgeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--slate)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--silver)', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'var(--pewter)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'var(--coal)', border: '1px solid var(--iron)', borderRadius: 4 }} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="value" radius={[3, 3, 0, 0]}>{edgeData.map((d, i) => <Cell key={i} fill={d.fill} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="glass" style={{ padding: 22 }}>
            <Eyebrow>Per-file graphs</Eyebrow>
            <p style={{ fontSize: 12.5, color: 'var(--pewter)', margin: '6px 0 14px' }}>Open any file to inspect its AST/CFG/DFG.</p>
            <div>
              {(data.files || []).filter((f) => f.graph_viz?.nodes?.length > 0).slice(0, 18).map((f, i) => (
                <div key={i} onClick={() => onFile(f)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12.5 }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--coal)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <Network size={14} color="var(--red)" />
                  <span className="mono" style={{ flex: 1, color: 'var(--bone)' }}>{f.path}</span>
                  <span className="mono" style={{ color: 'var(--pewter)', fontSize: 11 }}>{f.graph_viz?.stats?.total_nodes || 0}n · {f.graph_viz?.stats?.total_edges || 0}e</span>
                  <ChevronRight size={13} color="var(--pewter)" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`@media (max-width: 860px){ .ov-grid { grid-template-columns: 1fr !important; } .metric-strip { grid-template-columns: repeat(2,1fr) !important; } }`}</style>
    </div>
  )
}
