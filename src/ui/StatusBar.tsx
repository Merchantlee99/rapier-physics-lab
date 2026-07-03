import { useEffect, useState } from 'react'
import { engine } from '../state/engine'
import { telemetry } from '../state/telemetry'
import { useLab } from '../state/store'
import { toolHint } from './ToolDock'

export function StatusBar() {
  const tool = useLab((s) => s.tool)
  const hasCapture = useLab((s) => s.hasCapture)
  const [, force] = useState(0)

  useEffect(() => {
    const iv = setInterval(() => force((n) => n + 1), 300)
    return () => clearInterval(iv)
  }, [])

  return (
    <footer className="statusbar">
      <span>
        t=<b>{telemetry.simTime.toFixed(2)}s</b>
      </span>
      <span>
        step <b>{telemetry.stepCount}</b>
      </span>
      <span>
        bodies <b>{telemetry.bodyCount}</b> ({telemetry.awakeCount} awake)
      </span>
      <span title="FNV-1a digest of all body transforms, refreshed every 60 steps">
        ⌗<b>{telemetry.stateHash}</b>
      </span>
      {hasCapture && <span style={{ color: 'var(--acc)' }}>● snapshot held</span>}
      <span className="grow" />
      <span>{toolHint(tool)}</span>
      <span>
        rapier <b>{engine.rapierVersion || '…'}</b>
      </span>
    </footer>
  )
}
