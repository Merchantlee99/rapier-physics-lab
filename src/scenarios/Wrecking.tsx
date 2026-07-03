import { useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import { Color, type InstancedMesh } from 'three'
import {
  BallCollider,
  CapsuleCollider,
  CuboidCollider,
  InstancedRigidBodies,
  RigidBody,
  interactionGroups,
  useSphericalJoint,
  type InstancedRigidBodyProps,
  type RapierRigidBody,
} from '@react-three/rapier'
import { LabGround } from './shared'
import { useInstancedInteractive, useInteractive } from '../three/interactive'
import { SCENE } from '../lib/palette'
import { useParam, type ScenarioDef } from './types'

const ID = 'wrecking'
const ANCHOR: [number, number, number] = [0, 5.2, 0]
const LINKS = 8
const LINK_R = 0.06
const BALL_R = 0.55
const SWING_R = 3.84 // anchor → ball center
const LINK_LEN = (SWING_R - BALL_R) / LINKS // 0.411
const LINK_HH = LINK_LEN / 2 - LINK_R
const WALL_X = 2.4
const BRICK: [number, number, number] = [0.25, 0.25, 0.45] // half extents

// Collision groups: links(g1) and ball(g2) touch the world(g0) but never
// each other — overlapping joint ends would otherwise fight the solver.
const G_WORLD = interactionGroups(0)
const G_LINK = interactionGroups(1, [0])
const G_BALL = interactionGroups(2, [0])

const P_MASS = { key: 'mass', label: 'Ball mass', min: 20, max: 120, step: 5, def: 60, unit: 'kg', rebuild: true }
const P_ROWS = { key: 'rows', label: 'Wall rows', min: 4, max: 9, step: 1, def: 7, rebuild: true }
const P_ANGLE = { key: 'angle', label: 'Release angle', min: 35, max: 80, step: 1, def: 65, unit: '°', rebuild: true }

/** Chain direction from the anchor at release angle φ (pulled to −X side). */
function chainDir(phi: number) {
  return { x: -Math.sin(phi), y: -Math.cos(phi) }
}

function SphJoint({
  a,
  b,
  anchorA,
  anchorB,
}: {
  a: RefObject<RapierRigidBody | null>
  b: RefObject<RapierRigidBody | null>
  anchorA: [number, number, number]
  anchorB: [number, number, number]
}) {
  useSphericalJoint(a as RefObject<RapierRigidBody>, b as RefObject<RapierRigidBody>, [
    anchorA,
    anchorB,
  ])
  return null
}

function Scene() {
  const ballMass = useParam(ID, P_MASS)
  const rows = useParam(ID, P_ROWS)
  const angleDeg = useParam(ID, P_ANGLE)
  const phi = (angleDeg * Math.PI) / 180
  const u = chainDir(phi)

  const beamRef = useRef<RapierRigidBody>(null)
  const ballRef = useRef<RapierRigidBody>(null)
  const linkRefs = useRef(
    Array.from({ length: LINKS }, () => ({ current: null as RapierRigidBody | null })),
  ).current

  const ballHandlers = useInteractive(() => ballRef.current, {
    name: `Wrecking ball ${ballMass}kg`,
    radius: BALL_R * 1.35,
  })

  // Bricks: staggered courses, one instanced mesh.
  const bricks = useMemo(() => {
    const arr: InstancedRigidBodyProps[] = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < 4; c++) {
        arr.push({
          key: `${r}-${c}`,
          position: [
            WALL_X,
            BRICK[1] + r * BRICK[1] * 2,
            (c - 1.5) * BRICK[2] * 2 + (r % 2 ? BRICK[2] * 0.5 : -BRICK[2] * 0.5),
          ],
        })
      }
    }
    return arr
  }, [rows])
  const brickApi = useRef<(RapierRigidBody | null)[] | null>(null)
  const brickMesh = useRef<InstancedMesh>(null)
  const brickHandlers = useInstancedInteractive(brickApi, 'Brick', 0.55)

  useLayoutEffect(() => {
    const mesh = brickMesh.current
    if (!mesh) return
    const c = new Color()
    for (let i = 0; i < bricks.length; i++) {
      c.setHSL(0.045, 0.34, 0.31 + (i % 5) * 0.022)
      mesh.setColorAt(i, c)
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [bricks.length])

  // Links are ~1/8 of the ball's mass — heavy joint chains with extreme mass
  // ratios make impulse solvers stretch. Density scales with the mass param.
  const linkDensity = ballMass * 36

  return (
    <>
      <LabGround size={44} friction={0.85} />

      {/* Gantry: two posts + crossbeam (all fixed, physical). */}
      {[-1.3, 1.3].map((z) => (
        <RigidBody key={z} type="fixed" colliders={false} position={[0, 2.6, z]}>
          <CuboidCollider args={[0.16, 2.6, 0.16]} collisionGroups={G_WORLD} />
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.32, 5.2, 0.32]} />
            <meshStandardMaterial color={SCENE.staticDark} roughness={0.6} metalness={0.35} />
          </mesh>
        </RigidBody>
      ))}
      <RigidBody ref={beamRef} type="fixed" colliders={false} position={ANCHOR}>
        <CuboidCollider args={[0.12, 0.12, 1.46]} collisionGroups={G_WORLD} />
        <mesh castShadow>
          <boxGeometry args={[0.24, 0.24, 2.92]} />
          <meshStandardMaterial color={SCENE.static} roughness={0.55} metalness={0.35} />
        </mesh>
      </RigidBody>

      {/* Chain links: capsules joined by spherical joints, self-collision off. */}
      {Array.from({ length: LINKS }, (_, i) => {
        const d = LINK_LEN / 2 + LINK_LEN * i
        return (
          <RigidBody
            key={i}
            ref={(b) => {
              linkRefs[i].current = b
            }}
            position={[ANCHOR[0] + u.x * d, ANCHOR[1] + u.y * d, 0]}
            rotation={[0, 0, -phi]}
            colliders={false}
            density={linkDensity}
            angularDamping={0.2}
            linearDamping={0.05}
          >
            <CapsuleCollider args={[LINK_HH, LINK_R]} collisionGroups={G_LINK} />
            <mesh castShadow>
              <capsuleGeometry args={[LINK_R, LINK_HH * 2, 4, 10]} />
              <meshStandardMaterial color="#8b9bb0" roughness={0.35} metalness={0.7} />
            </mesh>
          </RigidBody>
        )
      })}

      {/* Ball at the end of the chain, CCD on. */}
      <RigidBody
        ref={ballRef}
        position={[ANCHOR[0] + u.x * (SWING_R - 0), ANCHOR[1] + u.y * SWING_R, 0]}
        rotation={[0, 0, -phi]}
        colliders={false}
        ccd
        linearDamping={0.01}
        angularDamping={0.1}
      >
        <BallCollider args={[BALL_R]} mass={ballMass} collisionGroups={G_BALL} friction={0.4} restitution={0.05} />
        <group {...ballHandlers}>
          <mesh castShadow receiveShadow>
            <sphereGeometry args={[BALL_R, 32, 24]} />
            <meshStandardMaterial color="#5d7391" roughness={0.32} metalness={0.45} />
          </mesh>
        </group>
      </RigidBody>

      {/* Joints: beam → link0 → … → link7 → ball. */}
      <SphJoint a={beamRef} b={linkRefs[0]} anchorA={[0, 0, 0]} anchorB={[0, LINK_LEN / 2, 0]} />
      {Array.from({ length: LINKS - 1 }, (_, i) => (
        <SphJoint
          key={i}
          a={linkRefs[i]}
          b={linkRefs[i + 1]}
          anchorA={[0, -LINK_LEN / 2, 0]}
          anchorB={[0, LINK_LEN / 2, 0]}
        />
      ))}
      <SphJoint
        a={linkRefs[LINKS - 1]}
        b={ballRef}
        anchorA={[0, -LINK_LEN / 2, 0]}
        anchorB={[0, BALL_R, 0]}
      />

      {/* Brick wall — light enough (≈16 kg each) for a 60 kg ball to scatter. */}
      <InstancedRigidBodies
        ref={brickApi}
        instances={bricks}
        colliders={false}
        colliderNodes={[
          <CuboidCollider key="b" args={BRICK} collisionGroups={G_WORLD} />,
        ]}
        density={70}
        friction={0.55}
        restitution={0.05}
      >
        <instancedMesh
          ref={brickMesh}
          args={[undefined, undefined, bricks.length]}
          castShadow
          receiveShadow
          {...brickHandlers}
        >
          <boxGeometry args={[BRICK[0] * 2, BRICK[1] * 2, BRICK[2] * 2]} />
          <meshStandardMaterial roughness={0.75} metalness={0.02} />
        </instancedMesh>
      </InstancedRigidBodies>
    </>
  )
}

export const wreckingScenario: ScenarioDef = {
  id: ID,
  title: 'Wrecking Ball',
  tag: 'joint chain',
  blurb: 'A spherical-joint chain releases from height and swings into a staggered brick wall.',
  camera: { position: [-8.5, 5, 12.5], target: [0.2, 2.5, 0] },
  solverIterations: 12,
  params: [P_MASS, P_ROWS, P_ANGLE],
  info: [
    '8 capsule links under spherical joints; the release angle is built into the start pose, so every run is identical.',
    'Links carry ~1/8 of the ball mass — extreme joint mass ratios destabilize impulse solvers.',
    'Collision groups stop chain self-contacts; the ball flies with CCD.',
    'Solver runs 12 iterations here (vs 4 default) to keep the chain stiff.',
  ],
  Component: Scene,
}
