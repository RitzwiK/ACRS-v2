import React, { useState, useEffect, useRef } from 'react'
import { Bug, Wind, Box, Sparkles } from 'lucide-react'

/* ------------------------------------------------------------------
   ScanFeed — the central interactive element.
   Mirrors Orbi's streaming "leads found" panel, but streams the issues
   ACRS detects: each finding floats in with a category glyph, a short
   description, and a confidence score. A scan-line sweeps the panel and
   the live counter ticks up — the whole thing reads as "the agent is
   working right now." Liquid glass throughout, monochrome with a single
   faint red live-dot.
   ------------------------------------------------------------------ */

const FINDINGS = [
  { icon: Bug, kind: 'Bug-Prone', label: 'Mutable default argument', file: 'api/handlers.py', conf: 94 },
  { icon: Sparkles, kind: 'AI-Generated', label: 'Over-narrated, generic naming', file: 'utils/process.py', conf: 88 },
  { icon: Wind, kind: 'Code Smell', label: 'Control flow nests 5 levels deep', file: 'core/scan.py', conf: 81 },
  { icon: Bug, kind: 'Bug-Prone', label: 'Bare except swallows errors', file: 'io/loader.py', conf: 96 },
  { icon: Box, kind: 'Design', label: 'God function · 84 statements', file: 'engine/run.py', conf: 79 },
  { icon: Wind, kind: 'Code Smell', label: 'Variable assigned, never used', file: 'parse/lexer.py', conf: 72 },
  { icon: Sparkles, kind: 'AI-Generated', label: 'Placeholder stub left in place', file: 'service/auth.py', conf: 90 },
  { icon: Bug, kind: 'Bug-Prone', label: 'Missing return on a branch', file: 'core/status.py', conf: 85 },
]

const KIND_TINT = {
  'Bug-Prone': 'var(--neg)',
  'Code Smell': 'var(--mid)',
  Design: 'var(--silver)',
  'AI-Generated': 'var(--bone)',
}

function FindingCard({ f, index }) {
  const Icon = f.icon
  return (
    <div
      className="glass-soft"
      style={{
        display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px',
        animation: `streamIn .7s cubic-bezier(.16,1,.3,1) ${index * 40}ms both`,
      }}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 9, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-edge)',
      }}>
        <Icon size={16} color={KIND_TINT[f.kind]} strokeWidth={1.8} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--bone)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {f.label}
        </div>
        <div className="mono" style={{ fontSize: 10.5, color: 'var(--pewter)', marginTop: 2 }}>
          {f.kind} · {f.file}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div className="num" style={{ fontFamily: 'var(--display)', fontSize: 16, fontWeight: 600, color: 'var(--bone)' }}>{f.conf}%</div>
        <div className="mono" style={{ fontSize: 9, color: 'var(--silver)', letterSpacing: '0.05em' }}>CONF</div>
      </div>
    </div>
  )
}

export default function ScanFeed() {
  const [visible, setVisible] = useState([])
  const [count, setCount] = useState(0)
  const idx = useRef(0)

  useEffect(() => {
    const interval = setInterval(() => {
      const f = FINDINGS[idx.current % FINDINGS.length]
      idx.current += 1
      setVisible((v) => {
        const next = [{ ...f, _id: idx.current }, ...v]
        return next.slice(0, 5)
      })
      setCount((c) => c + 1)
    }, 1900)
    // seed first three quickly
    const seeds = [0, 1, 2].map((i) => setTimeout(() => {
      const f = FINDINGS[idx.current % FINDINGS.length]; idx.current += 1
      setVisible((v) => [{ ...f, _id: idx.current }, ...v].slice(0, 5))
      setCount((c) => c + 1)
    }, i * 420))
    return () => { clearInterval(interval); seeds.forEach(clearTimeout) }
  }, [])

  return (
    <div className="glass" style={{ padding: 18, position: 'relative', overflow: 'hidden' }}>
      {/* scan sweep — travels the full height of the panel, top to bottom,
          with a soft glow trail above the bright line */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 0, height: 64, zIndex: 3,
        background: 'linear-gradient(180deg, transparent, rgba(229,72,77,0.10) 70%, rgba(229,72,77,0.22))',
        animation: 'scanGlow 3.6s cubic-bezier(.4,0,.2,1) infinite', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', left: 14, right: 14, top: 0, height: 1.5, zIndex: 4, borderRadius: 2,
        background: 'linear-gradient(90deg, transparent, rgba(229,72,77,0.9) 20%, rgba(255,140,140,1) 50%, rgba(229,72,77,0.9) 80%, transparent)',
        boxShadow: '0 0 12px rgba(229,72,77,0.6)',
        animation: 'scanLine 3.6s cubic-bezier(.4,0,.2,1) infinite', pointerEvents: 'none',
      }} />

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '0 2px' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', boxShadow: '0 0 10px var(--red-glow)', animation: 'pulse 1.8s ease-in-out infinite' }} />
        <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--bone)' }}>Scanning repository</span>
        <span className="mono num" style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--silver)' }}>
          {count} findings
        </span>
      </div>

      {/* streaming feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, minHeight: 320 }}>
        {visible.map((f) => <FindingCard key={f._id} f={f} index={0} />)}
        {visible.length === 0 && (
          <div className="mono" style={{ color: 'var(--pewter)', fontSize: 12, padding: 20, textAlign: 'center' }}>
            Parsing source → AST…
          </div>
        )}
      </div>
    </div>
  )
}
