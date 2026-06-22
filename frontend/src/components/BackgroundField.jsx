import React, { useRef, useEffect } from 'react'

/* ------------------------------------------------------------------
   BackgroundField — atmospheric, flowing fog on a fixed full-screen
   WebGL canvas behind all content. Monochrome (black & white).

   Motion is domain-warped fractal noise (fbm) — the technique behind
   the slow, organic "aurora / smoke" backgrounds on sites like Skarlo.
   It drifts continuously and warps gently toward the cursor, with a
   vignette and grain for depth. Pure WebGL, no libraries.

   Falls back to a static CSS gradient if WebGL is unavailable, and
   respects prefers-reduced-motion.
   ------------------------------------------------------------------ */

const VERT = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`

const FRAG = `
precision highp float;
uniform vec2  u_res;
uniform float u_time;
uniform vec2  u_mouse;
uniform float u_mouseOn;

float hash(vec2 p){
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}
float noise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i + vec2(0.0,0.0));
  float b = hash(i + vec2(1.0,0.0));
  float c = hash(i + vec2(0.0,1.0));
  float d = hash(i + vec2(1.0,1.0));
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0;
  float amp = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for(int i = 0; i < 6; i++){
    v += amp * noise(p);
    p = rot * p * 2.0 + 0.03;
    amp *= 0.5;
  }
  return v;
}
void main(){
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  vec2 p = uv;
  p.x *= u_res.x / u_res.y;
  float t = u_time * 0.025;

  vec2 q = vec2(
    fbm(p * 1.6 + vec2(0.0, t)),
    fbm(p * 1.6 + vec2(5.2, -t))
  );
  vec2 r = vec2(
    fbm(p * 1.6 + 3.0 * q + vec2(1.7, 9.2) + 0.15 * t),
    fbm(p * 1.6 + 3.0 * q + vec2(8.3, 2.8) - 0.12 * t)
  );

  if(u_mouseOn > 0.5){
    vec2 m = u_mouse; m.x *= u_res.x / u_res.y;
    float d = distance(p, m);
    float infl = smoothstep(0.55, 0.0, d) * 0.45;
    r += infl * normalize(m - p + 0.0001);
  }

  float f = fbm(p * 1.6 + 4.0 * r + t * 0.5);
  float density = smoothstep(0.25, 0.95, f);
  density = pow(density, 1.6);

  vec3 col = vec3(density) * 0.16;

  float ridge = smoothstep(0.55, 0.85, length(r));
  col += ridge * 0.05;

  if(u_mouseOn > 0.5){
    vec2 m = u_mouse; m.x *= u_res.x / u_res.y;
    float d = distance(p, m);
    col += smoothstep(0.35, 0.0, d) * 0.06;
  }

  vec2 vc = uv - 0.5;
  float vig = 1.0 - dot(vc, vc) * 1.1;
  col *= clamp(vig, 0.0, 1.0);

  float g = (hash(gl_FragCoord.xy + u_time) - 0.5) * 0.025;
  col += g;

  gl_FragColor = vec4(max(col, 0.0), 1.0);
}
`

export default function BackgroundField() {
  const canvasRef = useRef(null)
  const rafRef = useRef(0)
  const mouse = useRef({ x: 0.5, y: 0.5, on: 0, tx: 0.5, ty: 0.5 })

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const canvas = canvasRef.current
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false })

    if (!gl) {
      canvas.style.background =
        'radial-gradient(1200px 600px at 50% 0%, rgba(255,255,255,0.05), transparent 60%), #060607'
      return
    }

    function compile(type, src) {
      const s = gl.createShader(type)
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn('shader', gl.getShaderInfoLog(s))
      return s
    }
    const prog = gl.createProgram()
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'position')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const uRes = gl.getUniformLocation(prog, 'u_res')
    const uTime = gl.getUniformLocation(prog, 'u_time')
    const uMouse = gl.getUniformLocation(prog, 'u_mouse')
    const uMouseOn = gl.getUniformLocation(prog, 'u_mouseOn')

    // Render at a reduced internal resolution — the fog is soft and doesn't
    // need full res, so this cuts fragment-shader cost ~3-4x on weak GPUs.
    // CSS stretches the canvas back to full size.
    const SCALE = 0.6
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25)
    function resize() {
      const w = window.innerWidth, h = window.innerHeight
      canvas.width = Math.floor(w * dpr * SCALE)
      canvas.height = Math.floor(h * dpr * SCALE)
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    const start = performance.now()
    function frame(now) {
      const t = (now - start) / 1000
      const m = mouse.current
      m.x += (m.tx - m.x) * 0.06
      m.y += (m.ty - m.y) * 0.06
      gl.uniform2f(uRes, canvas.width, canvas.height)
      gl.uniform1f(uTime, t)
      gl.uniform2f(uMouse, m.x, m.y)
      gl.uniform1f(uMouseOn, m.on)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      rafRef.current = requestAnimationFrame(frame)
    }
    function onMove(e) {
      mouse.current.tx = e.clientX / window.innerWidth
      mouse.current.ty = 1.0 - e.clientY / window.innerHeight
      mouse.current.on = 1
    }
    function onLeave() { mouse.current.on = 0 }
    function onVisibility() {
      if (document.hidden) cancelAnimationFrame(rafRef.current)
      else if (!reduce) rafRef.current = requestAnimationFrame(frame)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerleave', onLeave)
    document.addEventListener('visibilitychange', onVisibility)

    if (reduce) {
      gl.uniform2f(uRes, canvas.width, canvas.height)
      gl.uniform1f(uTime, 12.0)
      gl.uniform1f(uMouseOn, 0)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    } else {
      rafRef.current = requestAnimationFrame(frame)
    }

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('visibilitychange', onVisibility)
      gl.deleteProgram(prog); gl.deleteBuffer(buf)
    }
  }, [])

  return (
    <>
      <canvas ref={canvasRef} aria-hidden="true"
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none', display: 'block', filter: 'blur(0.5px)' }} />
      <ParticleLayer />
    </>
  )
}

function ParticleLayer() {
  const ref = useRef(null)
  const rafRef = useRef(0)
  const mouse = useRef({ x: -9999, y: -9999, active: false })

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    let w = 0, h = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let pts = []
    const LINK = 120, MD = 150

    function resize() {
      w = window.innerWidth; h = window.innerHeight
      canvas.width = w * dpr; canvas.height = h * dpr
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const n = Math.min(Math.floor((w * h) / 26000), 70)
      pts = new Array(n).fill(0).map(() => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.12, vy: (Math.random() - 0.5) * 0.12,
        r: Math.random() * 1.1 + 0.5,
      }))
    }
    function step() {
      ctx.clearRect(0, 0, w, h)
      const mx = mouse.current.x, my = mouse.current.y
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy
        if (p.x < -10) p.x = w + 10; if (p.x > w + 10) p.x = -10
        if (p.y < -10) p.y = h + 10; if (p.y > h + 10) p.y = -10
        let glow = 0
        if (mouse.current.active) {
          const dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy
          if (d2 < MD * MD) glow = 1 - Math.sqrt(d2) / MD
        }
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r + glow * 0.6, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(235,235,238,${0.10 + glow * 0.4})`
        ctx.fill()
      }
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i], b = pts[j]
          const dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy
          if (d2 < LINK * LINK) {
            const d = Math.sqrt(d2)
            let al = (1 - d / LINK) * 0.07
            if (mouse.current.active) {
              const cx = (a.x + b.x) / 2 - mx, cy = (a.y + b.y) / 2 - my
              const cd = Math.sqrt(cx * cx + cy * cy)
              if (cd < MD) al += (1 - cd / MD) * 0.12
            }
            ctx.strokeStyle = `rgba(210,210,216,${al})`
            ctx.lineWidth = 0.5
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
          }
        }
      }
      rafRef.current = requestAnimationFrame(step)
    }
    function onMove(e) { mouse.current.x = e.clientX; mouse.current.y = e.clientY; mouse.current.active = true }
    function onLeave() { mouse.current.active = false }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerleave', onLeave)
    if (!reduce) rafRef.current = requestAnimationFrame(step)
    else step()

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return (
    <canvas ref={ref} aria-hidden="true"
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none', display: 'block', opacity: 0.6 }} />
  )
}
