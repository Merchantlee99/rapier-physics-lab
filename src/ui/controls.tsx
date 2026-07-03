import { useState, type ReactNode } from 'react'

export function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  rebuild,
  fmt,
  onLive,
  onCommit,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  /** Rebuild params only apply on release (each commit reconstructs the world). */
  rebuild?: boolean
  fmt?: (v: number) => string
  onLive?: (v: number) => void
  onCommit: (v: number) => void
}) {
  const [draft, setDraft] = useState<number | null>(null)
  const shown = draft ?? value
  const commit = () => {
    if (draft !== null && draft !== value) onCommit(draft)
    setDraft(null)
  }

  return (
    <div className="slider-row">
      <div className="head">
        <span className="lbl">
          {label}
          {rebuild && (
            <span className="rebuild" title="applies on release — rebuilds the scene">
              ↻
            </span>
          )}
        </span>
        <span className="val">
          {fmt ? fmt(shown) : String(Math.round(shown * 1000) / 1000)}
          {unit && <span className="unit">{unit}</span>}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={shown}
        onChange={(e) => {
          const v = Number(e.target.value)
          if (rebuild) setDraft(v)
          else {
            onLive?.(v)
            onCommit(v)
          }
        }}
        onPointerUp={rebuild ? commit : undefined}
        onKeyUp={rebuild ? commit : undefined}
        onBlur={rebuild ? commit : undefined}
      />
    </div>
  )
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  render,
}: {
  options: readonly T[]
  value: T
  onChange: (v: T) => void
  render?: (v: T) => ReactNode
}) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={String(o)} className={o === value ? 'active' : ''} onClick={() => onChange(o)}>
          {render ? render(o) : String(o)}
        </button>
      ))}
    </div>
  )
}

export function Toggle({
  label,
  value,
  onChange,
  kbd,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
  kbd?: string
}) {
  return (
    <div className="toggle-row">
      <span className="lbl">
        {label} {kbd && <span className="kbd">{kbd}</span>}
      </span>
      <button
        className={`switch ${value ? 'on' : ''}`}
        onClick={() => onChange(!value)}
        aria-pressed={value}
        aria-label={label}
      />
    </div>
  )
}
