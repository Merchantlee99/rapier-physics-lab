import { useEffect } from 'react'
import { byId } from '../scenarios/registry'
import { useLab, type ToolId } from '../state/store'

const TOOL_KEYS: Record<string, ToolId> = {
  '1': 'drag',
  '2': 'poke',
  '3': 'spawnBox',
  '4': 'spawnBall',
}

export function useHotkeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return

      const s = useLab.getState()
      const key = e.key.toLowerCase()

      if (key === ' ') {
        e.preventDefault()
        s.toggleRunning()
      } else if (key === 's') {
        s.singleStep()
      } else if (key === 'r') {
        s.reset()
      } else if (key === 'c') {
        s.setShowColliders(!s.showColliders)
      } else if (key === 'v') {
        s.setShowVelocity(!s.showVelocity)
      } else if (key === 'h' || key === '?') {
        s.setHelpOpen(!s.helpOpen)
      } else if (key === 'escape') {
        s.setHelpOpen(false)
      } else if (key === '0') {
        s.fireAction('resetCam')
      } else if (TOOL_KEYS[key]) {
        s.setTool(TOOL_KEYS[key])
      } else {
        // scenario-declared action keys (F = fire, T = push, …)
        const action = byId(s.scenarioId).actions?.find((a) => a.kbd?.toLowerCase() === key)
        if (action) s.fireAction(action.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
