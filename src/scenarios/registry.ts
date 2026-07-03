import type { ScenarioDef } from './types'
import { restitutionScenario } from './Restitution'
import { frictionScenario } from './Friction'
import { pendulumScenario } from './PendulumWave'
import { dominoesScenario } from './Dominoes'
import { projectileScenario } from './Projectile'
import { wreckingScenario } from './Wrecking'
import { stressScenario } from './Stress'
import { sandboxScenario } from './Sandbox'

export const SCENARIOS: ScenarioDef[] = [
  restitutionScenario,
  frictionScenario,
  pendulumScenario,
  dominoesScenario,
  projectileScenario,
  wreckingScenario,
  stressScenario,
  sandboxScenario,
]

const map = new Map(SCENARIOS.map((s) => [s.id, s]))

export function byId(id: string): ScenarioDef {
  return map.get(id) ?? SCENARIOS[0]
}
