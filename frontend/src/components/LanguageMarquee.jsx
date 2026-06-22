import React from 'react'

/* ------------------------------------------------------------------
   LanguageMarquee — an infinite, seamless sliding bar of the languages
   ACRS supports.

   To stay full-bleed and seamless at ANY zoom / screen width, the track
   renders FOUR identical copies of the list and animates by exactly the
   width of one copy (-25%). Four copies guarantee the track is always
   wider than the viewport (even zoomed far out on an ultrawide display),
   so there is never a visible end, and translating by one-copy-width
   makes the wrap point invisible.
   ------------------------------------------------------------------ */

const LANGS = [
  'Python', 'JavaScript', 'TypeScript', 'Java', 'C', 'C++',
  'HTML', 'CSS', 'JSON',
]

const COPIES = 4

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
  // one "set" = the full language list; render COPIES sets back to back
  const set = LANGS
  return (
    <div className="lm-wrap" aria-hidden="true">
      <div className="lm-track">
        {Array.from({ length: COPIES }).flatMap((_, c) =>
          set.map((l, i) => <Item key={`${c}-${i}`} name={l} />)
        )}
      </div>
      <style>{`
        .lm-wrap {
          position: relative;
          width: 100%;
          overflow: hidden;
          padding: 18px 0;
          border-top: 1px solid var(--iron);
          border-bottom: 1px solid var(--iron);
          -webkit-mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
          mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
        }
        .lm-track {
          display: inline-flex;
          align-items: center;
          width: max-content;
          animation: lm-scroll 26s linear infinite;
          will-change: transform;
        }
        .lm-wrap:hover .lm-track { animation-play-state: paused; }
        /* there are ${COPIES} copies, so one copy = ${100 / COPIES}% of the track.
           translating by that amount loops seamlessly. */
        @keyframes lm-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-${100 / COPIES}%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .lm-track { animation: none; }
        }
      `}</style>
    </div>
  )
}
