import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Color, type InstancedMesh } from 'three'
import {
  CuboidCollider,
  InstancedRigidBodies,
  useBeforePhysicsStep,
  type InstancedRigidBodyProps,
  type RapierRigidBody,
} from '@react-three/rapier'
import { LabGround } from './shared'
import { useInstancedInteractive } from '../three/interactive'
import { useLab } from '../state/store'
import { useAction, useParam, type ScenarioDef } from './types'

const ID = 'dominoes'
const T = 0.16 // thickness (along the path)
const H = 0.95 // height
const W = 0.5 // width (radial)
const TRIGGER_STEP = 45 // auto-push happens at this exact physics step

const P_COUNT = {
  key: 'count',
  label: 'Dominoes',
  min: 40,
  max: 180,
  step: 10,
  def: 110,
  rebuild: true,
}
const P_SPACING = {
  key: 'spacing',
  label: 'Spacing',
  min: 0.5,
  max: 0.85,
  step: 0.05,
  def: 0.6,
  unit: '×h',
  rebuild: true,
}

interface Layout {
  instances: InstancedRigidBodyProps[]
  /** Unit tangent of the first domino — the push direction. */
  pushDir: { x: number; z: number }
  firstTop: [number, number, number]
}

function buildSpiral(count: number, spacingF: number): Layout {
  const a = 2.1
  const b = 0.17
  const ds = H * spacingF
  const instances: InstancedRigidBodyProps[] = []
  let phi = 0
  let pushDir = { x: 1, z: 0 }
  let firstTop: [number, number, number] = [0, 0, 0]
  for (let n = 0; n < count; n++) {
    const r = a + b * phi
    const x = r * Math.cos(phi)
    const z = r * Math.sin(phi)
    const tx = b * Math.cos(phi) - r * Math.sin(phi)
    const tz = b * Math.sin(phi) + r * Math.cos(phi)
    const len = Math.hypot(tx, tz)
    const alpha = Math.atan2(tz, tx)
    if (n === 0) {
      pushDir = { x: tx / len, z: tz / len }
      firstTop = [x, H * 0.92, z]
    }
    instances.push({
      key: n,
      position: [x, H / 2 + 0.002, z],
      rotation: [0, -alpha, 0],
    })
    phi += ds / Math.sqrt(b * b + r * r)
  }
  return { instances, pushDir, firstTop }
}

function Scene() {
  const count = useParam(ID, P_COUNT)
  const spacingF = useParam(ID, P_SPACING)
  const api = useRef<(RapierRigidBody | null)[] | null>(null)
  const meshRef = useRef<InstancedMesh>(null)
  const stepRef = useRef(0)
  const milestones = useRef(new Set<number>())
  const layout = useMemo(() => buildSpiral(count, spacingF), [count, spacingF])
  const handlers = useInstancedInteractive(api, 'Domino', 0.6)

  const push = () => {
    const first = api.current?.[0]
    if (!first) return
    const j = first.mass() * 1.3
    first.applyImpulseAtPoint(
      { x: layout.pushDir.x * j, y: 0, z: layout.pushDir.z * j },
      { x: layout.firstTop[0], y: layout.firstTop[1], z: layout.firstTop[2] },
      true,
    )
  }

  // Deterministic auto-trigger: the push lands on the same physics step every run.
  useBeforePhysicsStep(() => {
    stepRef.current++
    if (stepRef.current === TRIGGER_STEP) {
      push()
      useLab.getState().addEvent(`auto-push on domino 1 (step ${TRIGGER_STEP})`, 'acc')
    }
  })

  useAction('trigger', () => {
    push()
    useLab.getState().addEvent('manual push on domino 1', 'info')
  })

  // Per-instance color ramp along the run.
  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const c = new Color()
    for (let i = 0; i < count; i++) {
      c.setHSL((0.54 + (0.38 * i) / count) % 1, 0.62, 0.6)
      mesh.setColorAt(i, c)
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [count])

  // Progress reporting: % fallen, sampled at 2.5 Hz outside the physics loop.
  useEffect(() => {
    const iv = setInterval(() => {
      const bodies = api.current
      if (!bodies) return
      let fallen = 0
      for (const b of bodies) {
        if (!b) continue
        const q = b.rotation()
        const upY = 1 - 2 * (q.x * q.x + q.z * q.z)
        if (upY < 0.55) fallen++
      }
      const pct = Math.floor((fallen / count) * 100)
      for (const m of [25, 50, 75, 100]) {
        if (pct >= m && !milestones.current.has(m)) {
          milestones.current.add(m)
          useLab
            .getState()
            .addEvent(`${m}% of the run is down (${fallen}/${count})`, m === 100 ? 'good' : 'info')
        }
      }
    }, 400)
    return () => clearInterval(iv)
  }, [count])

  return (
    <>
      <LabGround size={40} friction={0.7} />
      <InstancedRigidBodies
        ref={api}
        instances={layout.instances}
        colliders={false}
        colliderNodes={[<CuboidCollider key="c" args={[T / 2, H / 2, W / 2]} />]}
        friction={0.55}
        restitution={0}
        density={900}
      >
        <instancedMesh
          ref={meshRef}
          args={[undefined, undefined, count]}
          castShadow
          receiveShadow
          {...handlers}
        >
          <boxGeometry args={[T, H, W]} />
          <meshStandardMaterial roughness={0.6} metalness={0.05} />
        </instancedMesh>
      </InstancedRigidBodies>
    </>
  )
}

export const dominoesScenario: ScenarioDef = {
  id: ID,
  title: 'Domino Spiral',
  tag: 'chain reaction',
  blurb: 'An Archimedean spiral of up to 180 dominoes — one impulse topples them all.',
  camera: { position: [8.5, 10.5, 8.5], target: [0, 0.4, 0] },
  params: [P_COUNT, P_SPACING],
  actions: [{ id: 'trigger', label: 'Push again', kbd: 'T' }],
  info: [
    'One instanced mesh → a single draw call for the whole run.',
    'The starting impulse is applied on physics step 45, so every replay is identical.',
    'Resting dominoes sleep (grey in collider view) until the wave wakes them.',
  ],
  Component: Scene,
}
