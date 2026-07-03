import { useEffect, useState } from 'react'
import { GRAVITY_PRESETS } from '../lib/constants'
import { mag } from '../lib/format'
import { byId } from '../scenarios/registry'
import { scoped } from '../scenarios/types'
import { getBody } from '../state/engine'
import { telemetry } from '../state/telemetry'
import { useLab } from '../state/store'
import { Slider, Toggle } from './controls'
import { Sparkline } from './Sparkline'

type Tab = 'controls' | 'inspect' | 'stats'

export function RightPanel() {
  const [tab, setTab] = useState<Tab>('controls')
  const selection = useLab((s) => s.selection)

  // Jump to the inspector when the user picks a body.
  useEffect(() => {
    if (selection) setTab('inspect')
  }, [selection?.handle]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <aside className="rpanel">
      <div className="rpanel-tabs">
        {(
          [
            ['controls', 'Controls'],
            ['inspect', 'Inspector'],
            ['stats', 'Telemetry'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      <div className="rpanel-body">
        {tab === 'controls' && <ControlsTab />}
        {tab === 'inspect' && <InspectTab />}
        {tab === 'stats' && <StatsTab />}
      </div>
    </aside>
  )
}

/* ------------------------------------------------------------------ */

function ControlsTab() {
  const scenarioId = useLab((s) => s.scenarioId)
  const params = useLab((s) => s.params)
  const setParam = useLab((s) => s.setParam)
  const setParamAndRebuild = useLab((s) => s.setParamAndRebuild)
  const fireAction = useLab((s) => s.fireAction)
  const gravityY = useLab((s) => s.gravityY)
  const setGravity = useLab((s) => s.setGravity)
  const showColliders = useLab((s) => s.showColliders)
  const setShowColliders = useLab((s) => s.setShowColliders)
  const shadows = useLab((s) => s.shadows)
  const setShadows = useLab((s) => s.setShadows)
  const showVelocity = useLab((s) => s.showVelocity)
  const setShowVelocity = useLab((s) => s.setShowVelocity)
  const hasCapture = useLab((s) => s.hasCapture)
  const captureNow = useLab((s) => s.captureNow)
  const restoreNow = useLab((s) => s.restoreNow)

  const def = byId(scenarioId)

  return (
    <>
      <div className="panel-section">
        <div className="section-label">
          {def.title}
          <span className="chip">{def.tag}</span>
        </div>
        {def.params.map((p) => {
          const key = scoped(def.id, p.key)
          return (
            <Slider
              key={key}
              label={p.label}
              value={params[key] ?? p.def}
              min={p.min}
              max={p.max}
              step={p.step}
              unit={p.unit}
              rebuild={p.rebuild}
              fmt={p.fmt}
              onCommit={(v) => (p.rebuild ? setParamAndRebuild(key, v) : setParam(key, v))}
            />
          )
        })}
        {def.actions && def.actions.length > 0 && (
          <div className="btn-row">
            {def.actions.map((a) => (
              <button
                key={a.id}
                className={`btn ${a.tone === 'warn' ? 'warn' : 'primary'}`}
                onClick={() => fireAction(a.id)}
              >
                {a.label}
                {a.kbd && <span className="kbd">{a.kbd}</span>}
              </button>
            ))}
          </div>
        )}
        {def.info && (
          <div className="info-list">
            {def.info.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}
      </div>

      <div className="panel-section">
        <div className="section-label">Environment</div>
        <Slider
          label="Gravity"
          value={gravityY}
          min={-20}
          max={0}
          step={0.01}
          unit="m/s²"
          fmt={(v) => v.toFixed(2)}
          onCommit={setGravity}
        />
        <div className="btn-row">
          {GRAVITY_PRESETS.map((g) => (
            <button
              key={g.label}
              className={`btn small ${Math.abs(gravityY - g.y) < 0.001 ? 'primary' : ''}`}
              onClick={() => setGravity(g.y)}
            >
              {g.label}
            </button>
          ))}
        </div>
        <div className="hint">
          Applies live to the running world and wakes every body — sleeping islands never re-read
          gravity on their own.
        </div>
      </div>

      <div className="panel-section">
        <div className="section-label">Display</div>
        <Toggle label="Collider wireframes" value={showColliders} onChange={setShowColliders} kbd="C" />
        <Toggle label="Shadows" value={shadows} onChange={setShadows} />
        <Toggle label="Velocity vector" value={showVelocity} onChange={setShowVelocity} kbd="V" />
      </div>

      <div className="panel-section">
        <div className="section-label">State snapshot</div>
        <div className="btn-row">
          <button className="btn" onClick={captureNow}>
            Capture
          </button>
          <button className="btn" onClick={restoreNow} disabled={!hasCapture}>
            Restore
          </button>
        </div>
        <div className="hint">
          Captures every body's pose + velocities; Restore rewinds to that instant. Solver contact
          caches aren't captured, so continuation can differ minutely — Reset replays the exact
          scenario instead.
        </div>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */

interface BodyView {
  type: string
  sleeping: boolean
  mass: number
  pos: { x: number; y: number; z: number }
  vel: { x: number; y: number; z: number }
  angvel: { x: number; y: number; z: number }
  friction: number | null
  restitution: number | null
  linDamp: number
  angDamp: number
}

const BODY_TYPES = ['dynamic', 'fixed', 'kinematic (pos)', 'kinematic (vel)']

function InspectTab() {
  const selection = useLab((s) => s.selection)
  const select = useLab((s) => s.select)
  const [view, setView] = useState<BodyView | null>(null)

  useEffect(() => {
    if (!selection) {
      setView(null)
      return
    }
    const read = () => {
      const b = getBody(selection.handle)
      if (!b) {
        setView(null)
        return
      }
      const c = b.numColliders() > 0 ? b.collider(0) : null
      setView({
        type: BODY_TYPES[b.bodyType()] ?? '?',
        sleeping: b.isSleeping(),
        mass: b.mass(),
        pos: b.translation(),
        vel: b.linvel(),
        angvel: b.angvel(),
        friction: c ? c.friction() : null,
        restitution: c ? c.restitution() : null,
        linDamp: b.linearDamping(),
        angDamp: b.angularDamping(),
      })
    }
    read()
    const iv = setInterval(read, 125)
    return () => clearInterval(iv)
  }, [selection])

  if (!selection || !view) {
    return (
      <div className="empty-state">
        No body selected.
        <br />
        Use the <b>Select / Drag</b> tool <span className="kbd">1</span> and click any object in
        the scene to stream its live state here.
      </div>
    )
  }

  const speed = mag(view.vel)
  const ke = 0.5 * view.mass * speed * speed
  const nudge = (x: number, y: number, z: number) => {
    const b = getBody(selection.handle)
    if (!b) return
    const j = b.mass() * 2.5
    b.applyImpulse({ x: x * j, y: y * j, z: z * j }, true)
  }

  return (
    <>
      <div className="panel-section">
        <div className="section-label">
          {selection.name}
          <span className={`chip ${view.sleeping ? 'warn' : 'good'}`}>
            {view.sleeping ? 'sleeping' : 'awake'}
          </span>
        </div>
        <StatRow k="Body type" v={view.type} />
        <StatRow k="Mass" v={`${view.mass.toFixed(2)}`} unit=" kg" />
        <StatRow k="Position" v={fmtV(view.pos)} unit=" m" />
        <StatRow k="Speed |v|" v={speed.toFixed(2)} unit=" m/s" />
        <StatRow k="Velocity" v={fmtV(view.vel)} unit=" m/s" />
        <StatRow k="Angular |ω|" v={mag(view.angvel).toFixed(2)} unit=" rad/s" />
        <StatRow k="Kinetic energy" v={ke.toFixed(1)} unit=" J" />
        {view.friction !== null && <StatRow k="Friction μ" v={view.friction.toFixed(2)} />}
        {view.restitution !== null && <StatRow k="Restitution e" v={view.restitution.toFixed(2)} />}
        <StatRow k="Damping lin/ang" v={`${view.linDamp.toFixed(2)} / ${view.angDamp.toFixed(2)}`} />
      </div>

      <div className="panel-section">
        <div className="section-label">Apply impulse (Δv = 2.5 m/s)</div>
        <div className="btn-row">
          <button className="btn small" onClick={() => nudge(0, 1, 0)}>
            +Y kick
          </button>
          <button className="btn small" onClick={() => nudge(-1, 0, 0)}>
            −X
          </button>
          <button className="btn small" onClick={() => nudge(1, 0, 0)}>
            +X
          </button>
          <button className="btn small" onClick={() => nudge(0, 0, -1)}>
            −Z
          </button>
          <button className="btn small" onClick={() => nudge(0, 0, 1)}>
            +Z
          </button>
        </div>
        <div className="btn-row">
          <button
            className="btn small"
            onClick={() => getBody(selection.handle)?.wakeUp()}
          >
            Wake
          </button>
          <button className="btn small" onClick={() => getBody(selection.handle)?.sleep()}>
            Force sleep
          </button>
          <button className="btn small" onClick={() => select(null)}>
            Deselect
          </button>
        </div>
      </div>
    </>
  )
}

function fmtV(v: { x: number; y: number; z: number }) {
  return `${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)}`
}

function StatRow({ k, v, unit }: { k: string; v: string; unit?: string }) {
  return (
    <div className="stat-row">
      <span className="k">{k}</span>
      <span className="v">
        {v}
        {unit && <span className="unit">{unit}</span>}
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function StatsTab() {
  const events = useLab((s) => s.events)
  const [, force] = useState(0)
  useEffect(() => {
    const iv = setInterval(() => force((n) => n + 1), 400)
    return () => clearInterval(iv)
  }, [])

  return (
    <>
      <div className="panel-section">
        <div className="section-label">Series (last ~18 s)</div>
        <Sparkline
          label="Frame rate"
          color="#34d399"
          series={() => telemetry.fpsRing.values()}
          latest={() => telemetry.fps}
          fmt={(v) => `${v.toFixed(0)} fps`}
          target={60}
        />
        <Sparkline
          label="Physics step"
          color="#35c9f0"
          series={() => telemetry.stepMsRing.values()}
          latest={() => telemetry.stepMs}
          fmt={(v) => `${v.toFixed(2)} ms`}
        />
        <Sparkline
          label="Kinetic energy (linear)"
          color="#a78bfa"
          series={() => telemetry.keRing.values()}
          latest={() => telemetry.kineticEnergy}
          fmt={(v) => `${v.toFixed(0)} J`}
        />
        <Sparkline
          label="Awake bodies"
          color="#f5b53f"
          series={() => telemetry.awakeRing.values()}
          latest={() => telemetry.awakeCount}
          fmt={(v) => `${v.toFixed(0)}`}
        />
      </div>

      <div className="panel-section">
        <div className="section-label">Simulation</div>
        <StatRow k="Sim time" v={telemetry.simTime.toFixed(2)} unit=" s" />
        <StatRow k="Steps" v={String(telemetry.stepCount)} />
        <StatRow k="Bodies (awake)" v={`${telemetry.bodyCount} (${telemetry.awakeCount})`} />
        <StatRow k="Impulse joints" v={String(telemetry.jointCount)} />
        <StatRow
          k="State hash"
          v={`⌗${telemetry.stateHash} @ ${telemetry.hashStep}`}
        />
        <div className="hint">
          The hash digests every body transform (FNV-1a over exact float bits) every 60 steps.
          Reset and watch identical hashes reappear at the same step numbers — that's determinism
          you can check, not just trust.
        </div>
      </div>

      <div className="panel-section">
        <div className="section-label">Events</div>
        {events.length === 0 ? (
          <div className="empty-state">
            Sensor crossings, triggers and milestones will appear here.
          </div>
        ) : (
          <div className="event-log">
            {events.map((e) => (
              <div key={e.id} className={`ev ${e.tone}`}>
                <span className="t">{e.t.toFixed(2)}s</span>
                <span className="m">{e.msg}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
