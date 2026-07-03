import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAfterPhysicsStep, useBeforePhysicsStep, useRapier } from '@react-three/rapier'
import { DT } from '../lib/constants'
import { applyDragSpring, engine, exposeLab } from '../state/engine'
import { telemetry } from '../state/telemetry'
import { useLab } from '../state/store'

/**
 * Stepping strategy (see README):
 * - running @ 1× → the library's own fixed-step loop runs (Physics not paused),
 *   with transform interpolation for smooth rendering.
 * - paused / single-step / any other time scale → Physics is paused and this
 *   driver advances the world manually via step(delta · timeScale).
 * Both paths advance physics in exact DT quanta, so trajectories are identical
 * regardless of playback mode — only wall-clock pacing differs.
 */
export function SimulationDriver({ epoch }: { epoch: string }) {
  const { world, step, rapier } = useRapier()
  const lastStepReq = useRef(useLab.getState().requestStep)
  const t0 = useRef(0)

  useEffect(() => {
    engine.world = world
    engine.step = step
    engine.epoch = epoch
    engine.rapierVersion = rapier.version()
    telemetry.resetRun(world)
    exposeLab()
    return () => {
      engine.world = null
      engine.step = null
      engine.drag = null
    }
    // step identity changes with the paused prop; keep the bridge current
  }, [world, step, epoch, rapier])

  useBeforePhysicsStep((w) => {
    applyDragSpring(w, DT)
    t0.current = performance.now()
  })

  useAfterPhysicsStep((w) => {
    telemetry.step(w, performance.now() - t0.current)
  })

  useFrame((_, delta) => {
    telemetry.frame(delta)
    const s = useLab.getState()
    if (s.running) {
      // 1×: the internal Physics loop is stepping; nothing to do here.
      if (s.timeScale !== 1) step(Math.min(delta, 0.1) * s.timeScale)
    } else if (s.requestStep !== lastStepReq.current) {
      lastStepReq.current = s.requestStep
      step(DT)
    }
  })

  return null
}
