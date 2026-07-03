import { useEffect, useRef, useState } from 'react'

export function Sparkline({
  label,
  color,
  series,
  latest,
  fmt,
  target,
}: {
  label: string
  color: string
  series: () => number[]
  latest: () => number
  fmt: (v: number) => string
  /** Optional reference line (e.g. 60 fps). */
  target?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [val, setVal] = useState(0)

  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const dpr = window.devicePixelRatio || 1
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (w === 0) return
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr
        canvas.height = h * dpr
      }
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      const vals = series()
      if (vals.length < 2) return
      let min = Math.min(...vals)
      let max = Math.max(...vals)
      if (target !== undefined) {
        min = Math.min(min, target)
        max = Math.max(max, target)
      }
      const span = max - min || 1
      min -= span * 0.12
      max += span * 0.12
      const ny = (v: number) => h - ((v - min) / (max - min)) * h

      if (target !== undefined) {
        ctx.strokeStyle = 'rgba(154,171,191,0.28)'
        ctx.setLineDash([3, 4])
        ctx.beginPath()
        ctx.moveTo(0, ny(target))
        ctx.lineTo(w, ny(target))
        ctx.stroke()
        ctx.setLineDash([])
      }

      ctx.strokeStyle = color
      ctx.lineWidth = 1.4
      ctx.beginPath()
      const n = vals.length
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * w
        const y = ny(vals[i])
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }

    const iv = setInterval(() => {
      setVal(latest())
      draw()
    }, 120)
    draw()
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="spark">
      <div className="head">
        <span className="lbl">{label}</span>
        <span className="val" style={{ color }}>
          {fmt(val)}
        </span>
      </div>
      <canvas ref={canvasRef} />
    </div>
  )
}
