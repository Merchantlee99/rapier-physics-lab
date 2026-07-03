import { useEffect, useMemo, useRef, useState } from 'react'
import { BufferAttribute, BufferGeometry, LineBasicMaterial, Line as ThreeLine } from 'three'
import { Line } from '@react-three/drei'
import {
  BallCollider,
  CylinderCollider,
  RigidBody,
  useAfterPhysicsStep,
  type RapierRigidBody,
} from '@react-three/rapier'
import { LabGround } from './shared'
import { useInteractive } from '../three/interactive'
import { engine } from '../state/engine'
import { DT } from '../lib/constants'
import { SCENE } from '../lib/palette'
import { useLab } from '../state/store'
import { useAction, useParam, type ScenarioDef } from './types'

const ID = 'projectile'
const PIVOT: [number, number, number] = [-9, 0.85, 0]
const BARREL_LEN = 1.75
const SHOT_R = 0.22
const MAX_SHOTS = 14
const CAN_ROWS = 5

const P_ANGLE = { key: 'angle', label: 'Launch angle', min: 5, max: 80, step: 1, def: 45, unit: '°' }
const P_POWER = { key: 'power', label: 'Muzzle speed', min: 6, max: 22, step: 0.5, def: 13.5, unit: 'm/s' }
const P_DIST = {
  key: 'dist',
  label: 'Target distance',
  min: 6,
  max: 14,
  step: 1,
  def: 9,
  unit: 'm',
  rebuild: true,
}

interface Shot {
  id: number
  pos: [number, number, number]
  vel: [number, number, number]
}

function muzzleOf(angleDeg: number): { pos: [number, number, number]; dir: [number, number] } {
  const th = (angleDeg * Math.PI) / 180
  const dir: [number, number] = [Math.cos(th), Math.sin(th)]
  return {
    pos: [PIVOT[0] + dir[0] * BARREL_LEN, PIVOT[1] + dir[1] * BARREL_LEN, 0],
    dir,
  }
}

/** Same semi-implicit Euler the engine uses: v += g·dt, then x += v·dt.
 *  That makes the dashed prediction overlap the simulated arc exactly. */
function predictArc(angleDeg: number, power: number, g: number): [number, number, number][] {
  const { pos, dir } = muzzleOf(angleDeg)
  let [x, y] = [pos[0], pos[1]]
  let vx = dir[0] * power
  let vy = dir[1] * power
  const pts: [number, number, number][] = [[x, y, 0]]
  for (let i = 0; i < 400 && y > 0.06; i++) {
    vy += g * DT
    x += vx * DT
    y += vy * DT
    if (i % 2 === 0) pts.push([x, Math.max(y, 0.05), 0])
  }
  return pts
}

function ShotBody({
  shot,
  onHandle,
}: {
  shot: Shot
  onHandle: (h: number, alive: boolean) => void
}) {
  const ref = useRef<RapierRigidBody>(null)
  const handlers = useInteractive(() => ref.current, { name: `Shot #${shot.id}`, radius: SHOT_R * 1.7 })

  useEffect(() => {
    let raf = 0
    let tries = 0
    let handle: number | null = null
    const attempt = () => {
      const b = ref.current
      if (b) {
        handle = b.handle
        onHandle(handle, true)
      } else if (tries++ < 40) raf = requestAnimationFrame(attempt)
    }
    attempt()
    return () => {
      cancelAnimationFrame(raf)
      if (handle != null) onHandle(handle, false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <RigidBody
      ref={ref}
      position={shot.pos}
      linearVelocity={shot.vel}
      colliders={false}
      ccd
      linearDamping={0}
      angularDamping={0.4}
      friction={0.5}
      restitution={0.35}
    >
      {/* Explicit 1 kg mass → impulse numbers read directly as Δv. */}
      <BallCollider args={[SHOT_R]} mass={1} />
      <group {...handlers}>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[SHOT_R, 26, 18]} />
          <meshStandardMaterial color="#e8eef6" roughness={0.25} metalness={0.5} />
        </mesh>
      </group>
    </RigidBody>
  )
}

function Can({
  row,
  col,
  dist,
  onHandle,
}: {
  row: number
  col: number
  dist: number
  onHandle: (h: number) => void
}) {
  const ref = useRef<RapierRigidBody>(null)
  const n = CAN_ROWS - row
  const z = (col - (n - 1) / 2) * 0.62
  const y = 0.38 + row * 0.77
  const handlers = useInteractive(() => ref.current, {
    name: `Can r${row + 1}c${col + 1}`,
    radius: 0.45,
  })

  useEffect(() => {
    let raf = 0
    let tries = 0
    const attempt = () => {
      const b = ref.current
      if (b) onHandle(b.handle)
      else if (tries++ < 40) raf = requestAnimationFrame(attempt)
    }
    attempt()
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <RigidBody
      ref={ref}
      position={[dist, y, z]}
      colliders={false}
      density={300}
      friction={0.6}
      restitution={0.1}
    >
      <CylinderCollider args={[0.375, 0.28]} />
      <group {...handlers}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.28, 0.28, 0.75, 20]} />
          <meshStandardMaterial color={row % 2 ? '#f5b53f' : '#d97706'} roughness={0.4} metalness={0.35} />
        </mesh>
      </group>
    </RigidBody>
  )
}

/** Imperative polyline fed by the physics loop — traces the newest shot. */
function ShotTrail({ newestHandle }: { newestHandle: React.RefObject<number | null> }) {
  const MAX = 300
  const line = useMemo(() => {
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(new Float32Array(MAX * 3), 3))
    geo.setDrawRange(0, 0)
    const mat = new LineBasicMaterial({ color: SCENE.amber, transparent: true, opacity: 0.85 })
    const l = new ThreeLine(geo, mat)
    l.frustumCulled = false
    return l
  }, [])
  const count = useRef(0)
  const parity = useRef(0)
  const tracked = useRef<number | null>(null)

  useAfterPhysicsStep((world) => {
    const h = newestHandle.current
    if (h == null) return
    if (tracked.current !== h) {
      tracked.current = h
      count.current = 0
      line.geometry.setDrawRange(0, 0)
    }
    if (parity.current++ % 2 !== 0 || count.current >= MAX) return
    const body = world.getRigidBody(h)
    if (!body) return
    const t = body.translation()
    const attr = line.geometry.getAttribute('position') as BufferAttribute
    attr.setXYZ(count.current, t.x, t.y, t.z)
    attr.needsUpdate = true
    count.current++
    line.geometry.setDrawRange(0, count.current)
  })

  return <primitive object={line} />
}

function Scene() {
  const angle = useParam(ID, P_ANGLE)
  const power = useParam(ID, P_POWER)
  const dist = useParam(ID, P_DIST)
  const gravityY = useLab((s) => s.gravityY)
  const [shots, setShots] = useState<Shot[]>([])
  const nextId = useRef(1)
  const shotHandles = useRef(new Set<number>())
  const newestHandle = useRef<number | null>(null)
  const scored = useRef(new Set<number>())
  const canHandles = useRef(new Set<number>())
  const knocked = useRef(0)

  const th = (angle * Math.PI) / 180
  const arc = useMemo(() => predictArc(angle, power, gravityY), [angle, power, gravityY])

  useAction('fire', () => {
    const { pos, dir } = muzzleOf(angle)
    const shot: Shot = {
      id: nextId.current++,
      pos,
      vel: [dir[0] * power, dir[1] * power, 0],
    }
    setShots((s) => [...s.slice(-(MAX_SHOTS - 1)), shot])
    useLab.getState().addEvent(`fired #${shot.id} — v₀=${power.toFixed(1)} m/s @ ${angle}°`, 'acc')
  })

  // Knock census against upright pose.
  useEffect(() => {
    knocked.current = 0
    const iv = setInterval(() => {
      let down = 0
      const world = engine.world
      if (!world) return
      canHandles.current.forEach((h) => {
        const b = world.getRigidBody(h)
        if (!b) return
        const q = b.rotation()
        const upY = 1 - 2 * (q.x * q.x + q.z * q.z)
        if (upY < 0.7) down++
      })
      if (down > knocked.current) {
        knocked.current = down
        useLab
          .getState()
          .addEvent(`cans down: ${down}/15`, down >= 15 ? 'good' : 'info')
      }
    }, 500)
    return () => clearInterval(iv)
  }, [dist])

  return (
    <>
      <LabGround size={44} friction={0.75} />

      {/* Launcher — pedestal is physical, the barrel is cosmetic (shots spawn at the muzzle). */}
      <RigidBody type="fixed" colliders={false} position={[PIVOT[0], 0.35, 0]}>
        <CylinderCollider args={[0.35, 0.55]} />
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.5, 0.62, 0.7, 24]} />
          <meshStandardMaterial color={SCENE.staticDark} roughness={0.6} metalness={0.3} />
        </mesh>
      </RigidBody>
      <group position={PIVOT} rotation={[0, 0, th]}>
        <mesh position={[BARREL_LEN / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.14, 0.19, BARREL_LEN, 20]} />
          <meshStandardMaterial color="#3b4a5e" roughness={0.35} metalness={0.6} />
        </mesh>
      </group>

      {/* Predicted arc — same integrator as the engine, so shots ride the dashes. */}
      <Line
        points={arc}
        color={SCENE.accent}
        lineWidth={1.4}
        dashed
        dashSize={0.22}
        gapSize={0.14}
        transparent
        opacity={0.55}
      />

      <ShotTrail newestHandle={newestHandle} />

      {shots.map((s) => (
        <ShotBody
          key={s.id}
          shot={s}
          onHandle={(h, alive) => {
            if (alive) {
              shotHandles.current.add(h)
              newestHandle.current = h
            } else {
              shotHandles.current.delete(h)
              if (newestHandle.current === h) newestHandle.current = null
            }
          }}
        />
      ))}

      {Array.from({ length: CAN_ROWS }, (_, r) =>
        Array.from({ length: CAN_ROWS - r }, (_, c) => (
          <Can
            key={`${r}-${c}`}
            row={r}
            col={c}
            dist={dist}
            onHandle={(h) => canHandles.current.add(h)}
          />
        )),
      )}

      {/* Bullseye pad: a sensor cylinder behind the pyramid scores direct hits. */}
      <RigidBody type="fixed" colliders={false} position={[dist + 3.2, 0, 0]}>
        <CylinderCollider
          args={[0.05, 1.05]}
          position={[0, 0.06, 0]}
          sensor
          onIntersectionEnter={(payload) => {
            const h = payload.other.rigidBody?.handle
            if (h == null || !shotHandles.current.has(h) || scored.current.has(h)) return
            scored.current.add(h)
            useLab.getState().addEvent('bullseye — shot landed on the pad', 'good')
          }}
        />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
          <ringGeometry args={[0.82, 1.05, 48]} />
          <meshStandardMaterial color={SCENE.amber} emissive={SCENE.amber} emissiveIntensity={0.35} transparent opacity={0.9} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
          <circleGeometry args={[0.3, 32]} />
          <meshStandardMaterial color={SCENE.amber} emissive={SCENE.amber} emissiveIntensity={0.5} />
        </mesh>
      </RigidBody>
    </>
  )
}

export const projectileScenario: ScenarioDef = {
  id: ID,
  title: 'Launch Range',
  tag: 'ballistics',
  blurb: 'Fire 1 kg shots at a can pyramid; a dashed line predicts the arc before you commit.',
  camera: { position: [0.8, 7, 23], target: [1.2, 2.8, 0] },
  params: [P_ANGLE, P_POWER, P_DIST],
  actions: [{ id: 'fire', label: 'Fire', kbd: 'F' }],
  info: [
    'Shots fly with CCD enabled so fast rounds never tunnel through cans.',
    'The prediction uses the engine’s own semi-implicit Euler — not the textbook parabola — so it matches exactly (zero linear damping).',
    'The amber pad is a sensor: intersections score without affecting motion.',
    'Change gravity in Environment and the prediction re-solves live.',
  ],
  Component: Scene,
}
