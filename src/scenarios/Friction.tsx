import { useEffect, useRef } from 'react'
import { CoefficientCombineRule } from '@dimforge/rapier3d-compat'
import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { LabGround, Label } from './shared'
import { useInteractive } from '../three/interactive'
import { ramp, SCENE } from '../lib/palette'
import { useLab } from '../state/store'
import { useParam, type ScenarioDef } from './types'

const ID = 'friction'
const MUS = [0.05, 0.12, 0.22, 0.35, 0.55, 0.8]
const RAMP_LEN = 10
const RAMP_WIDTH = 6.6
const RAMP_THICK = 0.4
const BOX_HALF = 0.35

const P_ANGLE = {
  key: 'angle',
  label: 'Ramp angle',
  min: 10,
  max: 32,
  step: 1,
  def: 20,
  unit: '°',
  rebuild: true,
}

function Box({
  i,
  angle,
  onHandle,
}: {
  i: number
  angle: number
  onHandle: (handle: number, mu: number) => void
}) {
  const ref = useRef<RapierRigidBody>(null)
  const mu = MUS[i]
  const th = (angle * Math.PI) / 180
  const handlers = useInteractive(() => ref.current, {
    name: `Box μ=${mu.toFixed(2)}`,
    radius: BOX_HALF * 1.6,
  })

  // Report this box's body handle to the finish-line sensor map.
  useEffect(() => {
    let raf = 0
    let tries = 0
    const attempt = () => {
      const b = ref.current
      if (b) onHandle(b.handle, mu)
      else if (tries++ < 40) raf = requestAnimationFrame(attempt)
    }
    attempt()
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Place each box near the top of the incline, offset along the surface normal.
  const rampCY = (RAMP_LEN / 2) * Math.sin(th) + (RAMP_THICK / 2) * Math.cos(th)
  const s = -RAMP_LEN / 2 + 1.4 // distance along the slope from ramp center
  const dir = { x: Math.cos(th), y: -Math.sin(th) }
  const nrm = { x: Math.sin(th), y: Math.cos(th) }
  const lift = BOX_HALF + RAMP_THICK / 2 + 0.02
  const x = dir.x * s + nrm.x * lift
  const y = rampCY + dir.y * s + nrm.y * lift
  const z = (i - (MUS.length - 1) / 2) * 1.02
  const color = ramp(i / (MUS.length - 1))

  return (
    <>
      <RigidBody
        ref={ref}
        position={[x, y, z]}
        rotation={[0, 0, -th]}
        colliders={false}
        // Min combine rule against the μ=1 ramp keeps each box's own μ in charge.
        friction={mu}
        frictionCombineRule={CoefficientCombineRule.Min}
        restitution={0}
        density={800}
      >
        <CuboidCollider args={[BOX_HALF, BOX_HALF, BOX_HALF]} />
        <group {...handlers}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[BOX_HALF * 2, BOX_HALF * 2, BOX_HALF * 2]} />
            <meshStandardMaterial color={color} roughness={0.55} metalness={0.05} />
          </mesh>
        </group>
      </RigidBody>
      <Label text={`μ=${mu.toFixed(2)}`} position={[x - 0.35, y + 0.9, z]} scale={0.85} />
    </>
  )
}

function Scene() {
  const angle = useParam(ID, P_ANGLE)
  const th = (angle * Math.PI) / 180
  const rampCY = (RAMP_LEN / 2) * Math.sin(th) + (RAMP_THICK / 2) * Math.cos(th)
  const finishX = (RAMP_LEN / 2) * Math.cos(th) + 2.6
  const crossed = useRef<Set<number>>(new Set())
  const handleToMu = useRef<Map<number, number>>(new Map())

  return (
    <>
      <LabGround size={44} friction={0.9} restitution={0} />

      {/* Incline, μ=1; Max precedence loses to the boxes' Min rule. */}
      <RigidBody
        type="fixed"
        colliders={false}
        friction={1}
        restitution={0}
        position={[0, rampCY, 0]}
        rotation={[0, 0, -th]}
      >
        <CuboidCollider args={[RAMP_LEN / 2, RAMP_THICK / 2, RAMP_WIDTH / 2]} />
        <mesh castShadow receiveShadow>
          <boxGeometry args={[RAMP_LEN, RAMP_THICK, RAMP_WIDTH]} />
          <meshStandardMaterial color={SCENE.static} roughness={0.85} />
        </mesh>
      </RigidBody>

      {MUS.map((_, i) => (
        <Box
          key={i}
          i={i}
          angle={angle}
          onHandle={(h, mu) => handleToMu.current.set(h, mu)}
        />
      ))}

      {/* Finish-line sensor on the run-out: logs arrival order with sim time. */}
      <RigidBody type="fixed" colliders={false} position={[finishX, 0, 0]}>
        <CuboidCollider
          args={[0.12, 0.9, RAMP_WIDTH / 2]}
          position={[0, 0.9, 0]}
          sensor
          onIntersectionEnter={(payload) => {
            const h = payload.other.rigidBody?.handle
            if (h == null || crossed.current.has(h)) return
            crossed.current.add(h)
            const mu = handleToMu.current.get(h)
            if (mu != null) {
              useLab.getState().addEvent(`μ=${mu.toFixed(2)} crossed the line`, 'good')
            }
          }}
        />
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.24, RAMP_WIDTH]} />
          <meshStandardMaterial
            color="#f5b53f"
            emissive="#f5b53f"
            emissiveIntensity={0.5}
            transparent
            opacity={0.85}
          />
        </mesh>
      </RigidBody>
    </>
  )
}

export const frictionScenario: ScenarioDef = {
  id: ID,
  title: 'Friction Ramp',
  tag: 'friction',
  blurb: 'Six boxes with μ = 0.05 → 0.80 race (or refuse to race) down an incline.',
  camera: { position: [9.5, 5.5, 10.5], target: [-1.2, 1.5, 0] },
  params: [P_ANGLE],
  info: [
    'The ramp has μ=1; boxes use the Min combine rule, so each pair uses the box’s own μ.',
    'A box slides only when tan(θ) exceeds its μ — raise the angle and watch the threshold move.',
    'The amber line is a Rapier sensor collider; crossings are logged in Events.',
  ],
  Component: Scene,
}
