import { useEffect, useState } from 'react'
import { TIME_SCALES } from '../lib/constants'
import { telemetry } from '../state/telemetry'
import { useLab } from '../state/store'
import { Segmented } from './controls'
import { IconAtom, IconHelp, IconPause, IconPlay, IconReset, IconStep } from './icons'

function FpsBadge() {
  const [fps, setFps] = useState(0)
  useEffect(() => {
    const iv = setInterval(() => setFps(telemetry.fps), 300)
    return () => clearInterval(iv)
  }, [])
  const color = fps >= 55 ? 'var(--good)' : fps >= 30 ? 'var(--warn)' : 'var(--bad)'
  return (
    <span className="fps-badge" title="render frames per second">
      <span className="dot" style={{ background: color }} />
      {fps.toFixed(0)} fps
    </span>
  )
}

export function TopBar() {
  const running = useLab((s) => s.running)
  const timeScale = useLab((s) => s.timeScale)
  const toggleRunning = useLab((s) => s.toggleRunning)
  const singleStep = useLab((s) => s.singleStep)
  const reset = useLab((s) => s.reset)
  const setTimeScale = useLab((s) => s.setTimeScale)
  const setHelpOpen = useLab((s) => s.setHelpOpen)

  return (
    <header className="topbar">
      <div className="brand">
        <IconAtom size={22} />
        Rapier Physics Lab
        <span className="sub">RAPIER WASM · 60 Hz fixed step</span>
      </div>

      <div className="topbar-spacer" />

      <div className="transport">
        <button className="icon-btn" onClick={reset} title="Reset scenario (R)">
          <IconReset />
        </button>
        <button
          className="icon-btn primary"
          onClick={toggleRunning}
          title={running ? 'Pause (Space)' : 'Play (Space)'}
        >
          {running ? <IconPause /> : <IconPlay />}
        </button>
        <button
          className="icon-btn"
          onClick={singleStep}
          disabled={running}
          title="Advance one step — 16.7 ms (S)"
        >
          <IconStep />
        </button>
      </div>

      <Segmented
        options={TIME_SCALES}
        value={timeScale}
        onChange={setTimeScale}
        render={(v) => `${v}×`}
      />

      <div className="topbar-spacer" />

      <FpsBadge />
      <button className="icon-btn" onClick={() => setHelpOpen(true)} title="Help & shortcuts (H)">
        <IconHelp />
      </button>
    </header>
  )
}
