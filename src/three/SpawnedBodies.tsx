import { useRef } from 'react'
import { BallCollider, CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { useLab, type SpawnItem } from '../state/store'
import { useInteractive } from './interactive'
import { spawnColor } from '../lib/palette'

/** User-dropped objects. Cleared on reset so presets stay deterministic. */
export function SpawnedBodies() {
  const spawned = useLab((s) => s.spawned)
  return (
    <>
      {spawned.map((item) => (
        <Spawned key={item.id} item={item} />
      ))}
    </>
  )
}

function Spawned({ item }: { item: SpawnItem }) {
  const ref = useRef<RapierRigidBody>(null)
  const isBox = item.kind === 'box'
  const name = isBox ? `Crate #${item.id}` : `Ball #${item.id}`
  const handlers = useInteractive(() => ref.current, { name, radius: isBox ? 0.5 : 0.34 })
  const color = spawnColor(item.id)

  return (
    <RigidBody
      ref={ref}
      position={item.pos}
      colliders={false}
      density={isBox ? 600 : 1200}
      friction={0.7}
      restitution={isBox ? 0.15 : 0.55}
    >
      {isBox ? <CuboidCollider args={[0.32, 0.32, 0.32]} /> : <BallCollider args={[0.3]} />}
      <group {...handlers}>
        {isBox ? (
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.64, 0.64, 0.64]} />
            <meshStandardMaterial color={color} roughness={0.6} metalness={0.05} />
          </mesh>
        ) : (
          <mesh castShadow receiveShadow>
            <sphereGeometry args={[0.3, 28, 20]} />
            <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
          </mesh>
        )}
      </group>
    </RigidBody>
  )
}
