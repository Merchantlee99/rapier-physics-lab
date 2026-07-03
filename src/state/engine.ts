import type { World, Vector } from '@dimforge/rapier3d-compat'
import { telemetry, worldHash } from './telemetry'

/**
 * Imperative bridge between the Rapier world (which lives inside the <Physics>
 * mount) and UI that renders outside the canvas. The SimulationDriver fills
 * these refs on mount and clears them on unmount; everyone else reads.
 */

export interface BodyMeta {
  name: string
  /** Approximate bounding radius, used to scale the selection marker. */
  radius: number
}

interface DragState {
  handle: number
  /** World-space point the grabbed body center is pulled toward. */
  target: { x: number; y: number; z: number }
}

export const engine = {
  world: null as World | null,
  step: null as ((dt: number) => void) | null,
  rapierVersion: '',
  /** Identity of the current world mount: `${scenarioId}:${resetNonce}` */
  epoch: '',
  drag: null as DragState | null,
}

/** handle → display metadata for selectable bodies. */
export const bodyMeta = new Map<number, BodyMeta>()

export function getBody(handle: number) {
  const w = engine.world
  if (!w) return null
  try {
    return w.getRigidBody(handle) ?? null
  } catch {
    return null
  }
}

/* ------------------------------------------------------------------ */
/* Drag spring — applied by the driver inside useBeforePhysicsStep so  */
/* the pull is a real per-step impulse, not a kinematic teleport.      */
/* ------------------------------------------------------------------ */

const KP = 45 // spring stiffness (1/s²)
const KD = 13 // damping (~2·√KP, near-critical)
const MAX_STRETCH = 4 // clamp pull distance (m) to avoid explosive forces

export function applyDragSpring(world: World, dt: number) {
  const d = engine.drag
  if (!d) return
  const body = world.getRigidBody(d.handle)
  if (!body || !body.isDynamic()) {
    engine.drag = null
    return
  }
  const p = body.translation()
  const v = body.linvel()
  let dx = d.target.x - p.x
  let dy = d.target.y - p.y
  let dz = d.target.z - p.z
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
  if (dist > MAX_STRETCH) {
    const s = MAX_STRETCH / dist
    dx *= s
    dy *= s
    dz *= s
  }
  const m = body.mass()
  body.applyImpulse(
    {
      x: (KP * dx - KD * v.x) * m * dt,
      y: (KP * dy - KD * v.y) * m * dt,
      z: (KP * dz - KD * v.z) * m * dt,
    },
    true,
  )
}

/* ------------------------------------------------------------------ */
/* Kinematic state capture / restore.                                  */
/*                                                                     */
/* Restores position/rotation/velocities/sleep of every body that      */
/* existed at capture time. Solver internals (contact warm-starts) are */
/* not part of the capture, so continuation after restore can differ   */
/* minutely from the original run — documented in the README.          */
/* ------------------------------------------------------------------ */

interface BodySnap {
  t: Vector
  r: { x: number; y: number; z: number; w: number }
  lv: Vector
  av: Vector
  sleeping: boolean
}

let capture: { epoch: string; simTime: number; bodies: Map<number, BodySnap> } | null = null

export function captureState(): boolean {
  const w = engine.world
  if (!w) return false
  const bodies = new Map<number, BodySnap>()
  w.forEachRigidBody((b) => {
    bodies.set(b.handle, {
      t: { ...b.translation() },
      r: { ...b.rotation() },
      lv: { ...b.linvel() },
      av: { ...b.angvel() },
      sleeping: b.isSleeping(),
    })
  })
  capture = { epoch: engine.epoch, simTime: telemetry.simTime, bodies }
  return true
}

export function hasCaptureFor(epoch: string) {
  return capture !== null && capture.epoch === epoch
}

export function restoreState(): boolean {
  const w = engine.world
  if (!w || !capture || capture.epoch !== engine.epoch) return false
  capture.bodies.forEach((s, handle) => {
    const b = w.getRigidBody(handle)
    if (!b) return
    b.setTranslation(s.t, true)
    b.setRotation(s.r, true)
    b.setLinvel(s.lv, true)
    b.setAngvel(s.av, true)
    if (s.sleeping) b.sleep()
  })
  telemetry.simTime = capture.simTime
  telemetry.scan(w)
  // Sync meshes without advancing physics (step with zero delta only
  // re-runs the transform propagation).
  engine.step?.(0)
  return true
}

export function dropCapture() {
  capture = null
}

/* ------------------------------------------------------------------ */
/* Dev/inspection surface: window.__lab                                 */
/* ------------------------------------------------------------------ */

export function exposeLab() {
  ;(window as unknown as Record<string, unknown>).__lab = {
    telemetry,
    engine,
    hash: () => (engine.world ? worldHash(engine.world) : null),
    hashAt: () => ({ hash: telemetry.stateHash, step: telemetry.hashStep }),
  }
}
