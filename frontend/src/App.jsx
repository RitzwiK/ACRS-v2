import React, { useState, useEffect } from 'react'
import { Routes, Route, NavLink, Link, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Analyze from './pages/Analyze'
import AIDetect from './pages/AIDetect'
import Benchmark from './pages/Benchmark'
import Docs from './pages/Docs'
import BackgroundField from './components/BackgroundField'
import { Aperture } from 'lucide-react'

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/analyze', label: 'Analyze' },
  { to: '/ai-detect', label: 'AI Detection' },
  { to: '/benchmark', label: 'Benchmark' },
  { to: '/docs', label: 'Docs' },
]

function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => { setOpen(false) }, [loc])

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 200, padding: '14px 0' }}>
      <div className="shell">
        <div className="glass" style={{
          height: 60, display: 'flex', alignItems: 'center', gap: 16, padding: '0 12px 0 20px',
          borderRadius: 999,
          background: scrolled ? 'var(--glass)' : 'rgba(22,22,26,0.32)',
          transition: 'background .3s',
        }}>
          <Link to="/" className="acrs-logo" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Aperture size={20} color="var(--bone)" strokeWidth={2} className="acrs-aperture" />
            <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 17, letterSpacing: '-0.02em' }}>ACRS</span>
          </Link>

          <nav style={{ marginLeft: 'auto', display: 'flex', gap: 2 }} className="desktop-nav">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}
                style={({ isActive }) => ({
                  fontSize: 13.5, fontWeight: 500, padding: '8px 15px', borderRadius: 999,
                  color: isActive ? 'var(--bone)' : 'var(--silver)',
                  background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                  transition: 'all .2s',
                })}
                onMouseEnter={(e) => { if (!e.currentTarget.getAttribute('aria-current')) e.currentTarget.style.color = 'var(--red)' }}
                onMouseLeave={(e) => { if (!e.currentTarget.getAttribute('aria-current')) e.currentTarget.style.color = 'var(--silver)' }}>
                {n.label}
              </NavLink>
            ))}
          </nav>

          <Link to="/analyze" className="btn btn-primary desktop-cta" style={{ padding: '9px 18px', fontSize: 13.5 }}>Scan</Link>

          <button className="mobile-toggle" onClick={() => setOpen((o) => !o)}
            style={{ marginLeft: 'auto', display: 'none', borderRadius: 999, width: 38, height: 38, color: 'var(--bone)', border: '1px solid var(--glass-edge)' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 18 }}>{open ? '×' : '≡'}</span>
          </button>
        </div>
      </div>

      {open && (
        <div className="shell" style={{ marginTop: 8 }}>
          <div className="glass mobile-menu" style={{ padding: 8 }}>
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}
                style={({ isActive }) => ({ display: 'block', padding: '13px 16px', borderRadius: 10, fontSize: 15, fontWeight: 500, color: isActive ? 'var(--bone)' : 'var(--silver)', background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent' })}>
                {n.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .acrs-aperture {
          transition: transform .6s cubic-bezier(.34,1.56,.64,1), color .3s;
          transform-origin: center;
        }
        .acrs-logo:hover .acrs-aperture {
          transform: rotate(120deg) scale(1.12);
          color: var(--red);
        }
        @media (max-width: 760px) {
          .desktop-nav, .desktop-cta { display: none !important; }
          .mobile-toggle { display: flex !important; align-items: center; justify-content: center; }
        }
        @media (min-width: 761px) { .mobile-menu { display: none; } }
      `}</style>
    </header>
  )
}

function Footer() {
  return (
    <footer style={{ marginTop: 120, paddingBottom: 40 }}>
      <div className="shell">
        <div style={{ height: 1, background: 'var(--iron)', marginBottom: 40 }} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ maxWidth: 300 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
              <Aperture size={18} color="var(--bone)" />
              <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 16 }}>ACRS</span>
            </div>
            <p style={{ fontSize: 13.5, color: 'var(--pewter)', lineHeight: 1.6 }}>
              Structural code review with graph attention networks. Reveal what's hidden before it ships.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 56, flexWrap: 'wrap' }}>
            <FooterCol title="Product" links={[['Analyze', '/analyze'], ['AI Detection', '/ai-detect'], ['Benchmark', '/benchmark']]} />
            <FooterCol title="Reference" links={[['Docs', '/docs'], ['GitHub', 'https://github.com/RitzwiK/ACRS', true]]} />
          </div>
        </div>
        <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid var(--iron)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <span className="mono" style={{ fontSize: 11, color: 'var(--ash)' }}>© 2026 ACRS · SRMIST</span>
          <span className="mono" style={{ fontSize: 11, color: 'var(--ash)' }}>AST · CFG · DFG → GAT</span>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({ title, links }) {
  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 14 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {links.map(([label, href, ext]) => ext
          ? <a key={label} href={href} target="_blank" rel="noreferrer" style={{ fontSize: 13.5, color: 'var(--silver)', transition: 'color .2s' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--red)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--silver)'}>{label}</a>
          : <Link key={label} to={href} style={{ fontSize: 13.5, color: 'var(--silver)', transition: 'color .2s' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--red)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--silver)'}>{label}</Link>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const loc = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [loc.pathname])
  return (
    <>
      <BackgroundField />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Nav />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/analyze" element={<Analyze />} />
            <Route path="/ai-detect" element={<AIDetect />} />
            <Route path="/benchmark" element={<Benchmark />} />
            <Route path="/docs" element={<Docs />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </>
  )
}
