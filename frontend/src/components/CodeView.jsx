import React from 'react'

export default function CodeView({ source, flagged = new Set(), maxHeight = 480 }) {
  const lines = (source || '').split('\n')
  return (
    <div className="code" style={{ maxHeight, padding: '12px 0', width: '100%', maxWidth: '100%', overflow: 'auto' }}>
      {lines.map((line, i) => {
        const ln = i + 1
        const isFlagged = flagged.has(ln)
        return (
          <div key={i} className={`code-line ${isFlagged ? 'code-flagged' : ''}`}>
            <span className="code-gutter">{ln}</span>
            <span style={{ whiteSpace: 'pre', paddingRight: 16, color: isFlagged ? 'var(--bone)' : 'var(--silver)' }}>
              {line || ' '}
            </span>
          </div>
        )
      })}
    </div>
  )
}
