import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, type InstancedMesh } from 'three'
import {
  BallCollider,
  CuboidCollider,
  InstancedRigidBodies,
  RigidBody,
  type InstancedRigidBodyProps,
  type RapierRigidBody,
} from '@react-three/rapier'
import { LabGround } from './shared'
import { useInstancedInteractive } from '../three/interactive'
import { mulberry32 } from '../lib/prng'
import { SCENE } from '../lib/palette'
import { useParam, type ScenarioDef } from './types'

const ID = 'stress'
const SEED = 1337
const BOX_H = 0.27
const BALL_R = 0.24

export const P_COUNT = {
  key: 'count',
  label: 'Bodies',
  min: 100,
  max: 600,
  step: 50,
  def: 300,
  rebuild: true,
}

function buildRain(count: number) {
  const rng = mulberry32(SEED + count)
  const boxes: InstancedRigidBodyProps[] = []
  const balls: InstancedRigidBodyProps[] = []
  for (let i = 0; i < count; i++) {
    const x = (rng() - 0.5) * 7
    const z = (rng() - 0.5) * 7
    const y = 2.5 + i * 0.055 + rng() * 0.04
    const rot: [number, number, number] = [rng() * 3.14, rng() * 3.14, 0]
    if (rng() < 0.55) boxes.push({ key: i, position: [x, y, z], rotation: rot })
    else balls.push({ key: i, position: [x, y, z], rotation: rot })
  }
  return { boxes, balls }
}

function tint(mesh: InstancedMesh | null, n: number, seed: number, sat: number) {
  if (!mesh) return
  const rng = mulberry32(seed)
  const c = new Color()
  for (let i = 0; i < n; i++) {
    c.setHSL(0.5 + rng() * 0.38, sat, 0.55 + rng() * 0.12)
    mesh.setColorAt(i, c)
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
}

function Scene() {
  const count = useParam(ID, P_COUNT)
  const { boxes, balls } = useMemo(() => buildRain(count), [count])
  const boxApi = useRef<(RapierRigidBody | null)[] | null>(null)
  const ballApi = useRef<(RapierRigidBody | null)[] | null>(null)
  const boxMesh = useRef<InstancedMesh>(null)
  const ballMesh = useRef<InstancedMesh>(null)
  const boxHandlers = useInstancedInteractive(boxApi, 'Box', 0.5)
  const ballHandlers = useInstancedInteractive(ballApi, 'Sphere', 0.42)

  useLayoutEffect(() => tint(boxMesh.current, boxes.length, 7, 0.5), [boxes.length])
  useLayoutEffect(() => tint(ballMesh.current, balls.length, 13, 0.62), [balls.length])

  return (
    <>
      <LabGround size={26} friction={0.6} />

      {/* Containment pit walls. */}
      {[
        { p: [0, 1.2, -6.8] as const, a: [7.2, 1.2, 0.35] as const },
        { p: [0, 1.2, 6.8] as const, a: [7.2, 1.2, 0.35] as const },
        { p: [-6.8, 1.2, 0] as const, a: [0.35, 1.2, 7.2] as const },
        { p: [6.8, 1.2, 0] as const, a: [0.35, 1.2, 7.2] as const },
      ].map((w, i) => (
        <RigidBody key={i} type="fixed" colliders={false} position={[...w.p]}>
          <CuboidCollider args={[...w.a]} />
          <mesh castShadow receiveShadow>
            <boxGeometry args={[w.a[0] * 2, w.a[1] * 2, w.a[2] * 2]} />
            <meshStandardMaterial color={SCENE.staticDark} roughness={0.8} transparent opacity={0.82} />
          </mesh>
        </RigidBody>
      ))}

      <InstancedRigidBodies
        ref={boxApi}
        instances={boxes}
        colliders={false}
        colliderNodes={[<CuboidCollider key="c" args={[BOX_H, BOX_H, BOX_H]} />]}
        density={700}
        friction={0.5}
        restitution={0.25}
      >
        <instancedMesh
          ref={boxMesh}
          args={[undefined, undefined, boxes.length]}
          castShadow
          receiveShadow
          {...boxHandlers}
        >
          <boxGeometry args={[BOX_H * 2, BOX_H * 2, BOX_H * 2]} />
          <meshStandardMaterial roughness={0.6} />
        </instancedMesh>
      </InstancedRigidBodies>

      <InstancedRigidBodies
        ref={ballApi}
        instances={balls}
        colliders={false}
        colliderNodes={[<BallCollider key="c" args={[BALL_R]} />]}
        density={1200}
        friction={0.5}
        restitution={0.45}
      >
        <instancedMesh
          ref={ballMesh}
          args={[undefined, undefined, balls.length]}
          castShadow
          receiveShadow
          {...ballHandlers}
        >
          <sphereGeometry args={[BALL_R, 18, 14]} />
          <meshStandardMaterial roughness={0.42} metalness={0.15} />
        </instancedMesh>
      </InstancedRigidBodies>
    </>
  )
}

export const stressScenario: ScenarioDef = {
  id: ID,
  title: 'Body Storm',
  tag: 'performance',
  blurb: 'Up to 600 seeded bodies rain into a pit — watch step time and FPS scale.',
  camera: { position: [11, 9.5, 11], target: [0, 1.5, 0] },
  params: [P_COUNT],
  info: [
    'Two instanced meshes → two draw calls regardless of body count.',
    'Placement comes from a seeded mulberry32 PRNG — every rebuild is the same storm.',
    'Sleeping islands turn the pile solid; poke it awake and watch step-ms jump.',
    'Shadows auto-disable above 320 bodies to protect frame rate.',
  ],
  Component: Scene,
}
