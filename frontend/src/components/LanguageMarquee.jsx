import React from 'react'

/* ------------------------------------------------------------------
   LanguageMarquee — an infinite, seamless sliding bar of the languages
   ACRS supports. The track holds two identical copies of the list and
   translates by exactly -50% in a linear loop, so the seam is invisible
   and the motion never jumps. Because the animation is a percentage of
   the track's own width (not the viewport), it stays smooth and
   continuous at any zoom level or screen size.
   ------------------------------------------------------------------ */

const LANGS = [
  'Python', 'JavaScript', 'TypeScript', 'Java', 'C', 'C++',
  'HTML', 'CSS', 'JSON',
]

// each language gets a short mono tag glyph
function Item({ name }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 10,
      padding: '0 34px', flexShrink: 0, whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: 2,
        background: 'var(--pewter)', flexShrink: 0,
      }} />
      <span style={{
        fontFamily: 'var(--display)', fontWeight: 600,
        fontSize: 22, color: 'var(--silver)', letterSpacing: '-0.02em',
      }}>
        {name}
      </span>
    </div>
  )
}

export default function LanguageMarquee() {
  // duplicate the list so the -50% translate produces a seamless wrap
  const row = [...LANGS, ...LANGS]
  return (
    <div className="lm-wrap" aria-hidden="true">
      <div className="lm-track">
        {row.map((l, i) => <Item key={i} name={l} />)}
      </div>
      <style>{`
        .lm-wrap {
          position: relative;
          width: 100%;
          overflow: hidden;
          padding: 18px 0;
          border-top: 1px solid var(--iron);
          border-bottom: 1px solid var(--iron);
          /* fade the edges so items dissolve in/out instead of hard-cutting */
          -webkit-mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
          mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
        }
        .lm-track {
          display: inline-flex;
          align-items: center;
          width: max-content;
          animation: lm-scroll 38s linear infinite;
          will-change: transform;
        }
        .lm-wrap:hover .lm-track { animation-play-state: paused; }
        @keyframes lm-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .lm-track { animation: none; }
        }
      `}</style>
    </div>
  )
}
