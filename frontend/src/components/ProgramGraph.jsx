import React, { useRef, useEffect, useState } from 'react'
import * as d3 from 'd3'

const EDGE_COLORS = { AST: '#6E6C72', CFG: '#9A988F', DFG: '#E5484D' }
const EDGE_DESC = { AST: 'Syntax tree', CFG: 'Control flow', DFG: 'Data flow' }

export default function ProgramGraph({ data, height = 460 }) {
  const wrapRef = useRef(null)
  const svgRef = useRef(null)
  const [filter, setFilter] = useState({ AST: true, CFG: true, DFG: true })
  const [hover, setHover] = useState(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const measure = (w) => {
      // clamp to a sane floor; ignore 0-width transient layouts
      if (w && w > 0) setWidth(Math.max(280, Math.floor(w)))
    }
    const el = wrapRef.current
    if (el) measure(el.clientWidth)
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) measure(e.contentRect.width)
    })
    if (el) ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!data || !data.nodes || data.nodes.length === 0) return
    if (!width || width <= 0) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const g = svg.append('g')
    const zoom = d3.zoom().scaleExtent([0.2, 4]).on('zoom', (e) => g.attr('transform', e.transform))
    svg.call(zoom)

    const nodes = data.nodes.map((n) => ({ ...n }))
    const idSet = new Set(nodes.map((n) => n.id))
    const edges = data.edges
      .filter((e) => filter[e.type] && idSet.has(e.source) && idSet.has(e.target))
      .map((e) => ({ ...e }))

    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(edges).id((d) => d.id).distance(42).strength(0.4))
      .force('charge', d3.forceManyBody().strength(-130))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius((d) => (d.size || 5) + 4))

    const link = g.append('g')
      .attr('stroke-opacity', 0.45)
      .selectAll('line').data(edges).join('line')
      .attr('stroke', (d) => EDGE_COLORS[d.type] || '#555')
      .attr('stroke-width', (d) => (d.type === 'AST' ? 1 : 1.2))
      .attr('stroke-dasharray', (d) => (d.type === 'CFG' ? '4,3' : d.type === 'DFG' ? '2,3' : null))

    const node = g.append('g').selectAll('g').data(nodes).join('g')
      .style('cursor', 'grab')
      .call(d3.drag()
        .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
        .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y })
        .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null }))

    node.append('circle')
      .attr('r', (d) => d.size || 5)
      .attr('fill', (d) => d.color || '#888')
      .attr('stroke', 'var(--void)')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.92)

    node.append('text')
      .text((d) => (d.size >= 11 ? d.label : ''))
      .attr('x', (d) => (d.size || 5) + 5)
      .attr('y', 3)
      .attr('font-size', 9.5)
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('fill', 'var(--silver)')

    node.on('mouseenter', (e, d) => {
      const rect = svgRef.current.getBoundingClientRect()
      setHover({ x: e.clientX - rect.left, y: e.clientY - rect.top, node: d })
    }).on('mouseleave', () => setHover(null))

    sim.on('tick', () => {
      link.attr('x1', (d) => d.source.x).attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x).attr('y2', (d) => d.target.y)
      node.attr('transform', (d) => `translate(${d.x},${d.y})`)
    })

    return () => sim.stop()
  }, [data, filter, width, height])

  if (!data || !data.nodes || data.nodes.length === 0) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--pewter)', fontSize: 13 }}>No graph data for this file.</div>
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%', minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {['AST', 'CFG', 'DFG'].map((t) => (
          <button key={t} onClick={() => setFilter((f) => ({ ...f, [t]: !f[t] }))}
            className="tag"
            style={{
              cursor: 'pointer',
              color: filter[t] ? EDGE_COLORS[t] : 'var(--ghost)',
              borderColor: filter[t] ? EDGE_COLORS[t] + '50' : 'var(--slate)',
              background: filter[t] ? EDGE_COLORS[t] + '10' : 'transparent',
            }}>
            <span style={{ width: 14, height: 0, borderTop: `2px ${t === 'CFG' ? 'dashed' : t === 'DFG' ? 'dotted' : 'solid'} ${filter[t] ? EDGE_COLORS[t] : 'var(--ghost)'}` }} />
            {t} · {EDGE_DESC[t]}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--pewter)', fontFamily: 'var(--mono)', alignSelf: 'center' }}>
          {data.stats?.total_nodes ?? data.nodes.length} nodes · {data.stats?.total_edges ?? data.edges.length} edges · scroll to zoom
        </span>
      </div>
      <div className="panel-inset" style={{ overflow: 'hidden', width: '100%' }}>
        <svg ref={svgRef} viewBox={`0 0 ${width || 600} ${height}`} width="100%" height={height} preserveAspectRatio="xMidYMid meet" style={{ display: 'block', width: '100%', maxWidth: '100%', background: 'var(--coal)' }} />
      </div>
      {hover && (
        <div style={{
          position: 'absolute', left: Math.min(hover.x + 14, width - 180), top: hover.y + 60,
          background: 'var(--graphite)', border: '1px solid var(--iron)', borderRadius: 4,
          padding: '8px 11px', pointerEvents: 'none', zIndex: 10, fontFamily: 'var(--mono)', fontSize: 11,
        }}>
          <div style={{ color: hover.node.color, fontWeight: 600 }}>{hover.node.type}</div>
          {hover.node.token && <div style={{ color: 'var(--silver)', marginTop: 2 }}>{hover.node.token}</div>}
          <div style={{ color: 'var(--pewter)', marginTop: 2 }}>line {hover.node.line} · depth {hover.node.depth}</div>
        </div>
      )}
    </div>
  )
}
