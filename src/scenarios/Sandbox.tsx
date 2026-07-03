import { useRef } from 'react'
import {
  BallCollider,
  CuboidCollider,
  RigidBody,
  useRevoluteJoint,
  type RapierRigidBody,
} from '@react-three/rapier'
import { LabGround } from './shared'
import { useInteractive } from '../three/interactive'
import { SCENE, spawnColor } from '../lib/palette'
import type { ScenarioDef } from './types'

const ID = 'sandbox'

function Crate({ pos, i }: { pos: [number, number, number]; i: number }) {
  const ref = useRef<RapierRigidBody>(null)
  const handlers = useInteractive(() => ref.current, { name: `Crate ${i}`, radius: 0.55 })
  return (
    <RigidBody ref={ref} position={pos} colliders={false} density={600} friction={0.7} restitution={0.1}>
      <CuboidCollider args={[0.38, 0.38, 0.38]} />
      <group {...handlers}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.76, 0.76, 0.76]} />
          <meshStandardMaterial color={spawnColor(i * 3 + 1)} roughness={0.6} />
        </mesh>
      </group>
    </RigidBody>
  )
}

function Ball({ pos, i }: { pos: [number, number, number]; i: number }) {
  const ref = useRef<RapierRigidBody>(null)
  const handlers = useInteractive(() => ref.current, { name: `Ball ${i}`, radius: 0.36 })
  return (
    <RigidBody ref={ref} position={pos} colliders={false} density={1200} friction={0.6} restitution={0.6}>
      <BallCollider args={[0.32]} />
      <group {...handlers}>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.32, 28, 20]} />
          <meshStandardMaterial color={spawnColor(i * 5 + 2)} roughness={0.35} metalness={0.15} />
        </mesh>
      </group>
    </RigidBody>
  )
}

/** A revolute-joint seesaw — drop things on either end. */
function Seesaw() {
  const baseRef = useRef<RapierRigidBody>(null)
  const plankRef = useRef<RapierRigidBody>(null)
  const handlers = useInteractive(() => plankRef.current, { name: 'Seesaw plank', radius: 1.9 })

  useRevoluteJoint(
    baseRef as React.RefObject<RapierRigidBody>,
    plankRef as React.RefObject<RapierRigidBody>,
    [
      [0, 0.42, 0],
      [0, 0, 0],
      [0, 0, 1],
    ],
  )

  return (
    <>
      <RigidBody ref={baseRef} type="fixed" colliders={false} position={[2.6, 0.3, -2.2]}>
        <CuboidCollider args={[0.18, 0.3, 0.3]} />
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.36, 0.6, 0.6]} />
          <meshStandardMaterial color={SCENE.staticDark} roughness={0.7} />
        </mesh>
      </RigidBody>
      <RigidBody
        ref={plankRef}
        position={[2.6, 0.72, -2.2]}
        colliders={false}
        density={400}
        friction={0.8}
      >
        <CuboidCollider args={[1.9, 0.05, 0.42]} />
        <group {...handlers}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[3.8, 0.1, 0.84]} />
            <meshStandardMaterial color="#6b7a90" roughness={0.55} metalness={0.2} />
          </mesh>
        </group>
      </RigidBody>
    </>
  )
}

function Scene() {
  return (
    <>
      <LabGround size={44} />
      <Crate pos={[-2.2, 0.4, -1]} i={1} />
      <Crate pos={[-2.2, 1.2, -1]} i={2} />
      <Crate pos={[-2.15, 2.0, -0.95]} i={3} />
      <Ball pos={[-0.5, 0.35, 1.6]} i={1} />
      <Ball pos={[0.9, 0.35, 2.4]} i={2} />
      <Seesaw />
    </>
  )
}

export const sandboxScenario: ScenarioDef = {
  id: ID,
  title: 'Sandbox',
  tag: 'free play',
  blurb: 'An open floor with a seesaw. Spawn, drag, poke — then flip gravity to the Moon.',
  camera: { position: [7, 5.5, 9.5], target: [0, 1, 0] },
  params: [],
  info: [
    'Use the spawn tools in the dock to drop crates and balls where you click.',
    'Gravity presets live in the Environment section — changes apply live and wake all bodies.',
    'The seesaw is a revolute joint; balance spawned objects on it.',
  ],
  Component: Scene,
}
