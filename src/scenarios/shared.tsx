import { useMemo } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useGroundHandlers } from '../three/interactive'
import { SCENE } from '../lib/palette'

/**
 * Shared physical floor: a thick fixed cuboid (top face at y=0) plus a dark
 * visual disc. The drei Grid overlay lives at canvas level.
 */
export function LabGround({
  size = 44,
  friction = 0.8,
  restitution = 0,
  visualRadius,
}: {
  size?: number
  friction?: number
  restitution?: number
  visualRadius?: number
}) {
  const handlers = useGroundHandlers()
  return (
    <RigidBody type="fixed" colliders={false} friction={friction} restitution={restitution}>
      <CuboidCollider args={[size / 2, 0.5, size / 2]} position={[0, -0.5, 0]} />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.001, 0]}
        receiveShadow
        {...handlers}
      >
        <circleGeometry args={[visualRadius ?? size * 0.72, 64]} />
        <meshStandardMaterial color={SCENE.ground} roughness={0.96} metalness={0} />
      </mesh>
    </RigidBody>
  )
}

const labelCache = new Map<string, CanvasTexture>()

function labelTexture(text: string, color: string) {
  const key = `${text}|${color}`
  let tex = labelCache.get(key)
  if (tex) return tex
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 80
  const ctx = canvas.getContext('2d')!
  ctx.font = '600 44px ui-monospace, Menlo, monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = color
  ctx.fillText(text, 128, 42)
  tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 4
  labelCache.set(key, tex)
  return tex
}

/** Small always-facing text label rendered from a cached canvas texture
 *  (no external font fetches — the app is fully self-contained). */
export function Label({
  text,
  position,
  color = '#9aabbf',
  scale = 1,
}: {
  text: string
  position: [number, number, number]
  color?: string
  scale?: number
}) {
  const tex = useMemo(() => labelTexture(text, color), [text, color])
  return (
    <sprite position={position} scale={[1.5 * scale, 0.47 * scale, 1]}>
      <spriteMaterial map={tex} transparent depthWrite={false} />
    </sprite>
  )
}
