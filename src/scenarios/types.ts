import type { FC } from 'react'
import { useLab } from '../state/store'

export interface ParamDef {
  key: string
  label: string
  min: number
  max: number
  step: number
  def: number
  unit?: string
  /** Rebuild params reconstruct the world on commit (slider release). */
  rebuild?: boolean
  fmt?: (v: number) => string
}

export interface ActionDef {
  id: string
  label: string
  kbd?: string
  tone?: 'primary' | 'warn'
}

export interface ScenarioDef {
  id: string
  title: string
  tag: string
  blurb: string
  camera: { position: [number, number, number]; target: [number, number, number] }
  /** Default gravity Y for this scenario (m/s²). */
  gravity?: number
  solverIterations?: number
  params: ParamDef[]
  actions?: ActionDef[]
  /** Physics-notes lines shown under the parameters. */
  info?: string[]
  Component: FC
}

export function scoped(scenarioId: string, key: string) {
  return `${scenarioId}.${key}`
}

/** Hook: current value of a scenario param (store value or default). */
export function useParam(scenarioId: string, def: ParamDef): number {
  return useLab((s) => s.params[scoped(scenarioId, def.key)] ?? def.def)
}

/** Hook: fires `cb` every time an action button/key is triggered (not on mount). */
export function useAction(id: string, cb: () => void) {
  const nonce = useLab((s) => s.actionNonces[id] ?? 0)
  useActionEffect(nonce, cb)
}

import { useEffect, useRef } from 'react'

function useActionEffect(nonce: number, cb: () => void) {
  const first = useRef(true)
  const cbRef = useRef(cb)
  cbRef.current = cb
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    cbRef.current()
  }, [nonce])
}
