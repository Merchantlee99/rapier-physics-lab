import { useRef } from 'react'
import { CoefficientCombineRule } from '@dimforge/rapier3d-compat'
import { BallCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { LabGround, Label } from './shared'
import { useInteractive } from '../three/interactive'
import { ramp } from '../lib/palette'
import { useParam, type ScenarioDef } from './types'

const ID = 'restitution'
const COUNT = 8
const R = 0.35

const P_HEIGHT = {
  key: 'height',
  label: 'Drop height',
  min: 2,
  max: 9,
  step: 0.5,
  def: 5,
  unit: 'm',
  rebuild: true,
}

function coeff(i: number) {
  return 0.1 + (i / (COUNT - 1)) * 0.85
}

function Ball({ i, height }: { i: number; height: number }) {
  const ref = useRef<RapierRigidBody>(null)
  const e = coeff(i)
  const x = (i - (COUNT - 1) / 2) * 1.25
  const color = ramp(i / (COUNT - 1))
  const handlers = useInteractive(() => ref.current, {
    name: `Ball e=${e.toFixed(2)}`,
    radius: R,
  })

  return (
    <>
      <RigidBody
        ref={ref}
        position={[x, height, 0]}
        colliders={false}
        // Max combine rule: the ball's restitution wins against the e=0 floor,
        // so each column shows its own coefficient un-averaged.
        restitution={e}
        restitutionCombineRule={CoefficientCombineRule.Max}
        friction={0.3}
        density={1200}
      >
        <BallCollider args={[R]} />
        <group {...handlers}>
          <mesh castShadow receiveShadow>
            <sphereGeometry args={[R, 32, 24]} />
            <meshStandardMaterial color={color} roughness={0.35} metalness={0.15} />
          </mesh>
        </group>
      </RigidBody>
      <Label text={`e=${e.toFixed(2)}`} position={[x, height + 0.75, 0]} color="#9aabbf" scale={0.9} />
    </>
  )
}

function Scene() {
  const height = useParam(ID, P_HEIGHT)
  return (
    <>
      <LabGround size={30} friction={0.8} restitution={0} />
      {Array.from({ length: COUNT }, (_, i) => (
        <Ball key={i} i={i} height={height} />
      ))}
    </>
  )
}

export const restitutionScenario: ScenarioDef = {
  id: ID,
  title: 'Bounce Lab',
  tag: 'restitution',
  blurb: 'Eight spheres, restitution 0.10 → 0.95, dropped from the same height.',
  camera: { position: [0, 4.4, 14.5], target: [0, 3.1, 0] },
  params: [P_HEIGHT],
  info: [
    'Floor restitution is 0; balls use the Max combine rule so each contact keeps the ball’s own coefficient.',
    'No damping — energy loss you see is restitution only.',
    'e≈1 never quite reaches the drop height: the solver caps restitution at contact-velocity thresholds.',
  ],
  Component: Scene,
}
