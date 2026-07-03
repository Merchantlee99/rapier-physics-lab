import { useRef, type RefObject } from 'react'
import {
  BallCollider,
  CuboidCollider,
  RigidBody,
  useRevoluteJoint,
  type RapierRigidBody,
} from '@react-three/rapier'
import { LabGround } from './shared'
import { useInteractive } from '../three/interactive'
import { ramp, SCENE } from '../lib/palette'
import { useParam, type ScenarioDef } from './types'

const ID = 'pendulum'
const N = 15
const N0 = 18 // oscillations of the longest pendulum per full cycle
const G = 9.81 // lengths are tuned for the scenario's default gravity
const SPACING = 0.42
const BOB_R = 0.16

const P_CYCLE = {
  key: 'cycle',
  label: 'Wave cycle Γ',
  min: 24,
  max: 48,
  step: 2,
  def: 36,
  unit: 's',
  rebuild: true,
}
const P_AMP = {
  key: 'amp',
  label: 'Amplitude',
  min: 8,
  max: 32,
  step: 1,
  def: 22,
  unit: '°',
  rebuild: true,
}
const P_DAMP = {
  key: 'damp',
  label: 'Angular damping',
  min: 0,
  max: 0.1,
  step: 0.005,
  def: 0,
  unit: '',
}

/** Pendulum i completes N0+i oscillations per Γ: T=Γ/(N0+i), L=g·(T/2π)². */
function lengthOf(i: number, cycle: number) {
  const T = cycle / (N0 + i)
  return G * Math.pow(T / (2 * Math.PI), 2)
}

function Pendulum({
  i,
  beamRef,
  pivotY,
  cycle,
  amp,
  damping,
}: {
  i: number
  beamRef: RefObject<RapierRigidBody | null>
  pivotY: number
  cycle: number
  amp: number
  damping: number
}) {
  const bobRef = useRef<RapierRigidBody>(null)
  const L = lengthOf(i, cycle)
  const x = (i - (N - 1) / 2) * SPACING
  const th0 = (amp * Math.PI) / 180
  const color = ramp(i / (N - 1))
  const handlers = useInteractive(() => bobRef.current, {
    name: `Pendulum ${i + 1} · L=${L.toFixed(2)}m`,
    radius: BOB_R * 1.6,
  })

  // Hinge on the beam: shared world axis X, anchored at each pivot.
  useRevoluteJoint(beamRef as RefObject<RapierRigidBody>, bobRef as RefObject<RapierRigidBody>, [
    [x, 0, 0],
    [0, 0, 0],
    [1, 0, 0],
  ])

  return (
    <RigidBody
      ref={bobRef}
      position={[x, pivotY, 0]}
      rotation={[th0, 0, 0]}
      colliders={false}
      canSleep={false}
      angularDamping={damping}
      linearDamping={0}
    >
      {/* Only the bob carries mass → an ideal point pendulum with T=2π√(L/g). */}
      <BallCollider args={[BOB_R]} position={[0, -L, 0]} density={2600} />
      <group {...handlers}>
        <mesh position={[0, -L / 2, 0]} castShadow>
          <cylinderGeometry args={[0.013, 0.013, L, 8]} />
          <meshStandardMaterial color="#7a8b9f" roughness={0.5} metalness={0.4} />
        </mesh>
        <mesh position={[0, -L, 0]} castShadow>
          <sphereGeometry args={[BOB_R, 28, 20]} />
          <meshStandardMaterial color={color} roughness={0.3} metalness={0.25} />
        </mesh>
      </group>
    </RigidBody>
  )
}

function Scene() {
  const cycle = useParam(ID, P_CYCLE)
  const amp = useParam(ID, P_AMP)
  const damping = useParam(ID, P_DAMP)
  const beamRef = useRef<RapierRigidBody>(null)

  const maxL = lengthOf(0, cycle)
  const pivotY = maxL + BOB_R + 0.35
  const beamLen = (N - 1) * SPACING + 1.2

  return (
    <>
      <LabGround size={26} />

      {/* Support frame (fixed). The beam is the joint parent of every bob. */}
      <RigidBody ref={beamRef} type="fixed" colliders={false} position={[0, pivotY, 0]}>
        <CuboidCollider args={[beamLen / 2, 0.045, 0.045]} />
        <mesh castShadow>
          <boxGeometry args={[beamLen, 0.09, 0.09]} />
          <meshStandardMaterial color={SCENE.static} roughness={0.6} metalness={0.3} />
        </mesh>
      </RigidBody>
      {[-1, 1].map((s) => (
        <RigidBody key={s} type="fixed" colliders={false} position={[s * (beamLen / 2), pivotY / 2, 0]}>
          <CuboidCollider args={[0.07, pivotY / 2, 0.07]} />
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.14, pivotY, 0.14]} />
            <meshStandardMaterial color={SCENE.staticDark} roughness={0.7} />
          </mesh>
        </RigidBody>
      ))}

      {Array.from({ length: N }, (_, i) => (
        <Pendulum
          key={i}
          i={i}
          beamRef={beamRef}
          pivotY={pivotY}
          cycle={cycle}
          amp={amp}
          damping={damping}
        />
      ))}
    </>
  )
}

export const pendulumScenario: ScenarioDef = {
  id: ID,
  title: 'Pendulum Wave',
  tag: 'joints',
  blurb: '15 revolute-joint pendulums tuned so their phases braid and realign every Γ seconds.',
  camera: { position: [5.2, 2.6, 8.2], target: [0, 1.15, 0] },
  solverIterations: 8,
  params: [P_CYCLE, P_AMP, P_DAMP],
  info: [
    'Pendulum i swings N₀+i times per Γ; lengths follow L = g·(Γ/(2π(N₀+i)))².',
    'All mass sits in the bob (rod is visual), so each is a near-ideal point pendulum.',
    'Large amplitudes run ~2% slow vs the small-angle formula — the pattern still recurs.',
    'Sleeping is disabled on the bobs; drag one out of phase and watch it re-braid.',
  ],
  Component: Scene,
}
