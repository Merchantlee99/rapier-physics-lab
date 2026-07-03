import { useEffect, useRef } from 'react'
import { MathUtils, Vector3 } from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useLab } from '../state/store'
import { byId } from '../scenarios/registry'

interface ControlsLike {
  target: Vector3
  update: () => void
}

/** Glides the camera to each scenario's vantage point on switch, and back
 *  again whenever the "View" dock button fires the resetCam action. */
export function CameraRig() {
  const scenarioId = useLab((s) => s.scenarioId)
  const resetCamNonce = useLab((s) => s.actionNonces['resetCam'] ?? 0)
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as unknown as ControlsLike | null
  const anim = useRef<{ p: Vector3; t: Vector3; until: number } | null>(null)

  useEffect(() => {
    const def = byId(scenarioId)
    anim.current = {
      p: new Vector3(...def.camera.position),
      t: new Vector3(...def.camera.target),
      until: performance.now() + 1100,
    }
  }, [scenarioId, resetCamNonce])

  // Verification handle for automated checks (harmless in production).
  useEffect(() => {
    ;(window as unknown as Record<string, unknown>).__labCam = {
      camera,
      controls,
      anim,
    }
  }, [camera, controls])

  useFrame((_, dt) => {
    const a = anim.current
    if (!a || !controls) return
    const l = 5.5
    camera.position.x = MathUtils.damp(camera.position.x, a.p.x, l, dt)
    camera.position.y = MathUtils.damp(camera.position.y, a.p.y, l, dt)
    camera.position.z = MathUtils.damp(camera.position.z, a.p.z, l, dt)
    controls.target.x = MathUtils.damp(controls.target.x, a.t.x, l, dt)
    controls.target.y = MathUtils.damp(controls.target.y, a.t.y, l, dt)
    controls.target.z = MathUtils.damp(controls.target.z, a.t.z, l, dt)
    controls.update()
    if (performance.now() > a.until) anim.current = null
  })

  return null
}
