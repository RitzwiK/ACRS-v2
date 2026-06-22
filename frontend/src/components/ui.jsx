import React, { useState, useEffect, useRef } from 'react'

export function Reveal({ children, delay = 0, className = '', as: Tag = 'div', ...rest }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight) { setShown(true); return }
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect() } },
      { threshold: 0.05, rootMargin: '0px 0px -40px 0px' }
    )
    io.observe(el)
    const t = setTimeout(() => setShown(true), 1200 + delay)
    return () => { io.disconnect(); clearTimeout(t) }
  }, [delay])
  return (
    <Tag ref={ref} className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'translateY(0)' : 'translateY(18px)',
        filter: shown ? 'blur(0)' : 'blur(5px)',
        transition: `opacity .8s cubic-bezier(.16,1,.3,1) ${delay}ms, transform .8s cubic-bezier(.16,1,.3,1) ${delay}ms, filter .8s cubic-bezier(.16,1,.3,1) ${delay}ms`,
      }} {...rest}>
      {children}
    </Tag>
  )
}

export function Eyebrow({ children }) {
  return <span className="eyebrow">{children}</span>
}

export function Stat({ label, value, sub, accent, animate = true }) {
  const [v, setV] = useState(animate ? 0 : value)
  useEffect(() => {
    if (!animate || typeof value !== 'number') { setV(value); return }
    let raf, start
    const dur = 1000
    const tick = (t) => {
      if (!start) start = t
      const p = Math.min((t - start) / dur, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setV(Math.round(value * eased * 10) / 10)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, animate])
  const display = typeof value === 'number' ? (Number.isInteger(value) ? Math.round(v) : v) : value
  return (
    <div>
      <div className="num display" style={{ fontSize: 42, lineHeight: 1, color: accent || 'var(--bone)' }}>
        {typeof display === 'number' ? display.toLocaleString() : display}
      </div>
      <div className="eyebrow" style={{ marginTop: 12 }}>{label}</div>
      {sub && <div style={{ fontSize: 12.5, color: 'var(--pewter)', marginTop: 5 }}>{sub}</div>}
    </div>
  )
}

export function Ring({ value, max = 100, label, sub, color, size = 156 }) {
  const r = (size - 16) / 2
  const circ = 2 * Math.PI * r
  const [offset, setOffset] = useState(circ)
  const pct = Math.max(0, Math.min(1, value / max))
  useEffect(() => {
    const t = setTimeout(() => setOffset(circ - pct * circ), 120)
    return () => clearTimeout(t)
  }, [pct, circ])
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--slate)" strokeWidth="5" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color || 'var(--bone)'} strokeWidth="5"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.3s cubic-bezier(.16,1,.3,1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span className="num display" style={{ fontSize: size * 0.25, color: 'var(--bone)' }}>
          {typeof value === 'number' ? value.toFixed(value < 10 ? 2 : value < 100 ? 1 : 0) : value}
        </span>
        {label && <span className="eyebrow" style={{ marginTop: 6 }}>{label}</span>}
        {sub && <span style={{ fontSize: 11, color: 'var(--pewter)', marginTop: 2 }}>{sub}</span>}
      </div>
    </div>
  )
}

export function Sev({ level, children }) {
  const colors = {
    critical: 'var(--neg)', warning: 'var(--mid)', info: 'var(--silver)', none: 'var(--pos)',
    high: 'var(--neg)', medium: 'var(--mid)', low: 'var(--silver)',
  }
  const c = colors[level] || 'var(--silver)'
  return (
    <span className="tag" style={{ color: c, borderColor: 'var(--iron)' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c }} />
      {children || level}
    </span>
  )
}

export function Spinner({ size = 18 }) {
  return <span style={{ width: size, height: size, borderRadius: '50%', border: `2px solid var(--slate)`, borderTopColor: 'var(--bone)', display: 'inline-block', animation: 'spin .7s linear infinite' }} />
}

export function Rule({ style }) {
  return <div style={{ height: 1, background: 'var(--iron)', ...style }} />
}
