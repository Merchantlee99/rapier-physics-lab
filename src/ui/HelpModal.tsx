import { Fragment } from 'react'
import { useLab } from '../state/store'
import { IconClose } from './icons'

const SHORTCUTS: [string, string][] = [
  ['Space', 'play / pause'],
  ['S', 'advance one physics step (paused)'],
  ['R', 'reset scenario (deterministic replay)'],
  ['1 – 4', 'tools: drag · poke · crate · ball'],
  ['0', 'reset camera view'],
  ['C', 'collider wireframes'],
  ['V', 'velocity vector on selection'],
  ['F / T', 'scenario action (fire / push)'],
  ['H', 'this panel'],
]

export function HelpModal() {
  const open = useLab((s) => s.helpOpen)
  const setOpen = useLab((s) => s.setHelpOpen)
  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={() => setOpen(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Rapier Physics Lab</h2>
          <button className="icon-btn" onClick={() => setOpen(false)}>
            <IconClose />
          </button>
        </div>

        <div className="shortcut-grid">
          {SHORTCUTS.map(([k, d]) => (
            <Fragment key={k}>
              <span className="kbd" style={{ justifySelf: 'start' }}>
                {k}
              </span>
              <span>{d}</span>
            </Fragment>
          ))}
        </div>

        <div className="foot">
          Every scenario runs on the{' '}
          <a href="https://rapier.rs" target="_blank" rel="noreferrer">
            Rapier
          </a>{' '}
          rigid-body engine (WebAssembly) at a fixed 60 Hz timestep — restitution, friction,
          joints, sensors and CCD are all the real thing, not animation. Runs are deterministic:
          reset and the state hash sequence in Telemetry repeats exactly. Drag pulls bodies with a
          damped spring of real impulses; slow-motion re-paces the same fixed steps, so playback
          speed never changes a trajectory.
        </div>
      </div>
    </div>
  )
}
