import { useMemo, useRef } from 'react'
import { ArrowHelper, DoubleSide, Group, Mesh, Vector3 } from 'three'
import { useFrame } from '@react-three/fiber'
import { bodyMeta, getBody } from '../state/engine'
import { useLab } from '../state/store'
import { SCENE } from '../lib/palette'

/**
 * Camera-facing ring around the selected body plus an optional live velocity
 * vector. Reads the rapier body imperatively every frame — zero React churn.
 */
export function SelectionOverlay() {
  const selection = useLab((s) => s.selection)
  const groupRef = useRef<Group>(null)
  const ringRef = useRef<Mesh>(null)
  const arrow = useMemo(() => {
    const a = new ArrowHelper(new Vector3(1, 0, 0), new Vector3(), 1, SCENE.accent, 0.22, 0.12)
    a.visible = false
    return a
  }, [])
  const dir = useMemo(() => new Vector3(), [])

  useFrame(({ camera, clock }) => {
    const g = groupRef.current
    if (!g || !selection) return
    const body = getBody(selection.handle)
    if (!body) {
      useLab.getState().select(null)
      return
    }
    const t = body.translation()
    g.position.set(t.x, t.y, t.z)
    const meta = bodyMeta.get(selection.handle)
    const r = (meta?.radius ?? 0.5) * 1.25
    const pulse = 1 + 0.05 * Math.sin(clock.elapsedTime * 5)
    const ring = ringRef.current
    if (ring) {
      ring.quaternion.copy(camera.quaternion)
      ring.scale.setScalar(r * pulse)
    }
    const showVel = useLab.getState().showVelocity
    const lv = body.linvel()
    const speed = Math.sqrt(lv.x * lv.x + lv.y * lv.y + lv.z * lv.z)
    if (showVel && speed > 0.05) {
      arrow.visible = true
      dir.set(lv.x, lv.y, lv.z).normalize()
      arrow.setDirection(dir)
      arrow.setLength(Math.min(0.3 + speed * 0.28, 4), 0.22, 0.12)
    } else {
      arrow.visible = false
    }
  })

  if (!selection) return null
  return (
    <group ref={groupRef}>
      <mesh ref={ringRef} renderOrder={999}>
        <ringGeometry args={[0.92, 1, 48]} />
        <meshBasicMaterial
          color={SCENE.selection}
          transparent
          opacity={0.9}
          side={DoubleSide}
          depthTest={false}
        />
      </mesh>
      <primitive object={arrow} />
    </group>
  )
}
