import { create } from 'zustand'
import { MAX_BODIES } from '../lib/constants'
import { telemetry } from './telemetry'
import { captureState, dropCapture, engine, restoreState } from './engine'

export type ToolId = 'drag' | 'poke' | 'spawnBox' | 'spawnBall'

export interface LabEvent {
  id: number
  t: number
  msg: string
  tone: 'info' | 'good' | 'warn' | 'acc'
}

export interface SpawnItem {
  id: number
  kind: 'box' | 'ball'
  pos: [number, number, number]
}

export interface Selection {
  handle: number
  name: string
}

let eventId = 0
let spawnId = 0

interface LabState {
  scenarioId: string
  resetNonce: number
  running: boolean
  timeScale: number
  requestStep: number
  tool: ToolId
  showColliders: boolean
  shadows: boolean
  showVelocity: boolean
  gravityY: number
  params: Record<string, number>
  selection: Selection | null
  events: LabEvent[]
  actionNonces: Record<string, number>
  hasCapture: boolean
  spawned: SpawnItem[]
  canvasReady: boolean
  helpOpen: boolean

  setScenario: (id: string, defaultGravity: number) => void
  reset: () => void
  setRunning: (v: boolean) => void
  toggleRunning: () => void
  singleStep: () => void
  setTimeScale: (v: number) => void
  setTool: (t: ToolId) => void
  setShowColliders: (v: boolean) => void
  setShadows: (v: boolean) => void
  setShowVelocity: (v: boolean) => void
  setGravity: (y: number) => void
  setParam: (key: string, v: number) => void
  setParamAndRebuild: (key: string, v: number) => void
  select: (s: Selection | null) => void
  addEvent: (msg: string, tone?: LabEvent['tone']) => void
  fireAction: (id: string) => void
  captureNow: () => void
  restoreNow: () => void
  spawn: (kind: 'box' | 'ball', pos: [number, number, number]) => void
  setCanvasReady: (v: boolean) => void
  setHelpOpen: (v: boolean) => void
}

export const useLab = create<LabState>((set, get) => ({
  scenarioId: 'restitution',
  resetNonce: 0,
  running: true,
  timeScale: 1,
  requestStep: 0,
  tool: 'drag',
  showColliders: false,
  shadows: true,
  showVelocity: false,
  gravityY: -9.81,
  params: {},
  selection: null,
  events: [],
  actionNonces: {},
  hasCapture: false,
  spawned: [],
  canvasReady: false,
  helpOpen: false,

  setScenario: (id, defaultGravity) => {
    if (get().scenarioId === id) return
    dropCapture()
    set((s) => ({
      scenarioId: id,
      resetNonce: s.resetNonce + 1,
      gravityY: defaultGravity,
      selection: null,
      spawned: [],
      hasCapture: false,
      running: true,
      events: [],
    }))
  },

  reset: () => {
    dropCapture()
    set((s) => ({
      resetNonce: s.resetNonce + 1,
      selection: null,
      spawned: [],
      hasCapture: false,
    }))
  },

  setRunning: (v) => set({ running: v }),
  toggleRunning: () => set((s) => ({ running: !s.running })),

  singleStep: () => {
    const s = get()
    if (s.running) return
    set({ requestStep: s.requestStep + 1 })
  },

  setTimeScale: (v) => set({ timeScale: v }),
  setTool: (t) => set({ tool: t }),
  setShowColliders: (v) => set({ showColliders: v }),
  setShadows: (v) => set({ shadows: v }),
  setShowVelocity: (v) => set({ showVelocity: v }),

  setGravity: (y) => {
    set({ gravityY: y })
    // Apply live and wake everything: sleeping bodies never re-check gravity.
    const w = engine.world
    if (w) {
      w.gravity.x = 0
      w.gravity.y = y
      w.gravity.z = 0
      w.forEachRigidBody((b) => b.wakeUp())
    }
  },

  setParam: (key, v) => set((s) => ({ params: { ...s.params, [key]: v } })),

  setParamAndRebuild: (key, v) => {
    dropCapture()
    set((s) => ({
      params: { ...s.params, [key]: v },
      resetNonce: s.resetNonce + 1,
      selection: null,
      spawned: [],
      hasCapture: false,
    }))
  },

  select: (sel) => set({ selection: sel }),

  addEvent: (msg, tone = 'info') =>
    set((s) => ({
      events: [{ id: eventId++, t: telemetry.simTime, msg, tone }, ...s.events].slice(0, 60),
    })),

  fireAction: (id) =>
    set((s) => ({
      actionNonces: { ...s.actionNonces, [id]: (s.actionNonces[id] ?? 0) + 1 },
    })),

  captureNow: () => {
    if (captureState()) {
      set({ hasCapture: true })
      get().addEvent(`state captured @ t=${telemetry.simTime.toFixed(2)}s`, 'acc')
    }
  },

  restoreNow: () => {
    if (restoreState()) {
      get().addEvent(`state restored → t=${telemetry.simTime.toFixed(2)}s`, 'acc')
    }
  },

  spawn: (kind, pos) => {
    if (telemetry.bodyCount >= MAX_BODIES) {
      get().addEvent(`body cap reached (${MAX_BODIES}) — spawn refused`, 'warn')
      return
    }
    set((s) => ({ spawned: [...s.spawned, { id: spawnId++, kind, pos }] }))
  },

  setCanvasReady: (v) => set({ canvasReady: v }),
  setHelpOpen: (v) => set({ helpOpen: v }),
}))

/** Read a scenario param with its default. */
export function useParamValue(scopedKey: string, def: number): number {
  return useLab((s) => s.params[scopedKey] ?? def)
}
