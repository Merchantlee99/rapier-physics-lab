import { SCENARIOS } from '../scenarios/registry'
import { useLab } from '../state/store'

export function Sidebar() {
  const scenarioId = useLab((s) => s.scenarioId)
  const setScenario = useLab((s) => s.setScenario)

  return (
    <nav className="sidebar">
      <div className="section-label">Scenarios</div>
      {SCENARIOS.map((s) => (
        <button
          key={s.id}
          className={`scenario-card ${s.id === scenarioId ? 'active' : ''}`}
          onClick={() => setScenario(s.id, s.gravity ?? -9.81)}
        >
          <div className="row">
            <span className="name">{s.title}</span>
            <span className="tag">{s.tag}</span>
          </div>
          <div className="blurb">{s.blurb}</div>
        </button>
      ))}
    </nav>
  )
}
