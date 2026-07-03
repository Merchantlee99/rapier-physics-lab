import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { Plane, Vector3 } from 'three'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import type { RapierRigidBody } from '@react-three/rapier'
import { bodyMeta, engine, type BodyMeta } from '../state/engine'
import { useLab } from '../state/store'

/** Δv (m/s) imparted along the view ray by the poke tool. */
const POKE_DV = 3.5

interface ControlsLike {
  enabled: boolean
}

type BodyResolver = (e: ThreeEvent<PointerEvent>) => RapierRigidBody | null
type NameResolver = (e: ThreeEvent<PointerEvent>) => string

/**
 * Tool-switched pointer behavior shared by single and instanced bodies:
 *  - drag  : select + pull with a damped spring (real impulses, not teleport)
 *  - poke  : impulse at the clicked point along the view ray
 *  - spawn : drop a new object above the clicked point
 */
function useBodyHandlers(resolve: BodyResolver, nameOf: NameResolver) {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as unknown as ControlsLike | null
  const dragging = useRef<{
    pointerId: number
    plane: Plane
    offset: Vector3
    handle: number
  } | null>(null)

  return useMemo(() => {
    const endDrag = (e: ThreeEvent<PointerEvent>) => {
      const d = dragging.current
      if (!d || e.pointerId !== d.pointerId) return
      dragging.current = null
      engine.drag = null
      if (controls) controls.enabled = true
      ;(e.target as Element | null)?.releasePointerCapture?.(e.pointerId)
    }

    const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
      const s = useLab.getState()
      if (s.tool === 'spawnBox' || s.tool === 'spawnBall') {
        e.stopPropagation()
        s.spawn(s.tool === 'spawnBox' ? 'box' : 'ball', [e.point.x, e.point.y + 1.6, e.point.z])
        return
      }
      const body = resolve(e)
      if (!body) return
      if (s.tool === 'drag') {
        e.stopPropagation()
        s.select({ handle: body.handle, name: nameOf(e) })
        if (!body.isDynamic()) return
        const t = body.translation()
        const camDir = new Vector3()
        camera.getWorldDirection(camDir)
        const plane = new Plane().setFromNormalAndCoplanarPoint(camDir, e.point)
        const offset = e.point.clone().sub(new Vector3(t.x, t.y, t.z))
        dragging.current = { pointerId: e.pointerId, plane, offset, handle: body.handle }
        engine.drag = { handle: body.handle, target: { x: t.x, y: t.y, z: t.z } }
        if (controls) controls.enabled = false
        ;(e.target as Element | null)?.setPointerCapture?.(e.pointerId)
      } else if (s.tool === 'poke') {
        e.stopPropagation()
        if (!body.isDynamic()) return
        const dir = e.ray.direction
        const k = POKE_DV * body.mass()
        body.applyImpulseAtPoint({ x: dir.x * k, y: dir.y * k, z: dir.z * k }, e.point, true)
      }
    }

    const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
      const d = dragging.current
      if (!d || e.pointerId !== d.pointerId) return
      e.stopPropagation()
      const hit = new Vector3()
      if (e.ray.intersectPlane(d.plane, hit)) {
        hit.sub(d.offset)
        const drag = engine.drag
        if (drag && drag.handle === d.handle) {
          drag.target.x = hit.x
          drag.target.y = hit.y
          drag.target.z = hit.z
        }
      }
    }

    return {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, controls])
}

/** Retry-until-mounted registration of body display metadata. */
function useMetaRegistration(register: () => (() => void) | false) {
  useEffect(() => {
    let cleanup: (() => void) | false = false
    let raf = 0
    let tries = 0
    const attempt = () => {
      cleanup = register()
      if (!cleanup && tries++ < 40) raf = requestAnimationFrame(attempt)
    }
    attempt()
    return () => {
      cancelAnimationFrame(raf)
      if (cleanup) cleanup()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

/** Handlers + metadata registration for a single RigidBody. */
export function useInteractive(getBody: () => RapierRigidBody | null, meta: BodyMeta) {
  useMetaRegistration(() => {
    const b = getBody()
    if (!b) return false
    const handle = b.handle
    bodyMeta.set(handle, meta)
    return () => bodyMeta.delete(handle)
  })
  return useBodyHandlers(
    () => getBody(),
    () => meta.name,
  )
}

/** Handlers + metadata registration for an InstancedRigidBodies array.
 *  Spread onto the instancedMesh; instanceId resolves the body. */
export function useInstancedInteractive(
  apiRef: RefObject<(RapierRigidBody | null)[] | null>,
  baseName: string,
  radius: number,
) {
  useMetaRegistration(() => {
    const arr = apiRef.current
    if (!arr || arr.length === 0 || !arr[0]) return false
    const handles: number[] = []
    arr.forEach((b, i) => {
      if (!b) return
      bodyMeta.set(b.handle, { name: `${baseName} #${i + 1}`, radius })
      handles.push(b.handle)
    })
    return () => handles.forEach((h) => bodyMeta.delete(h))
  })
  return useBodyHandlers(
    (e) => (e.instanceId != null ? (apiRef.current?.[e.instanceId] ?? null) : null),
    (e) => `${baseName} #${(e.instanceId ?? 0) + 1}`,
  )
}

/** Ground behavior: spawn tools drop objects, drag tool clears selection. */
export function useGroundHandlers() {
  return useMemo(
    () => ({
      onPointerDown: (e: ThreeEvent<PointerEvent>) => {
        const s = useLab.getState()
        if (s.tool === 'spawnBox' || s.tool === 'spawnBall') {
          e.stopPropagation()
          s.spawn(s.tool === 'spawnBox' ? 'box' : 'ball', [e.point.x, e.point.y + 1.6, e.point.z])
        } else if (s.tool === 'drag') {
          s.select(null)
        }
      },
    }),
    [],
  )
}
