import { useLab, type ToolId } from '../state/store'
import { IconBox, IconCamera, IconCursor, IconPoke, IconSphere } from './icons'

const TOOLS: { id: ToolId; label: string; kbd: string; icon: React.ReactNode; hint: string }[] = [
  { id: 'drag', label: 'Select / Drag', kbd: '1', icon: <IconCursor />, hint: 'click to inspect · hold to pull with a spring' },
  { id: 'poke', label: 'Poke', kbd: '2', icon: <IconPoke />, hint: 'click a body to fire an impulse along the view ray' },
  { id: 'spawnBox', label: 'Crate', kbd: '3', icon: <IconBox />, hint: 'click anywhere to drop a crate' },
  { id: 'spawnBall', label: 'Ball', kbd: '4', icon: <IconSphere />, hint: 'click anywhere to drop a ball' },
]

export function toolHint(tool: ToolId): string {
  return TOOLS.find((t) => t.id === tool)?.hint ?? ''
}

export function ToolDock() {
  const tool = useLab((s) => s.tool)
  const setTool = useLab((s) => s.setTool)
  const fireAction = useLab((s) => s.fireAction)

  return (
    <div className="tool-dock">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          className={`tool-btn ${tool === t.id ? 'active' : ''}`}
          onClick={() => setTool(t.id)}
          title={`${t.hint}`}
        >
          {t.icon}
          {t.label}
          <span className="kbd">{t.kbd}</span>
        </button>
      ))}
      <div className="divider" />
      <button
        className="tool-btn"
        onClick={() => fireAction('resetCam')}
        title="Return the camera to this scenario's vantage point"
      >
        <IconCamera />
        View
        <span className="kbd">0</span>
      </button>
    </div>
  )
}
