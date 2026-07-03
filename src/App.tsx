import { LabCanvas } from './three/LabCanvas'
import { HelpModal } from './ui/HelpModal'
import { RightPanel } from './ui/RightPanel'
import { Sidebar } from './ui/Sidebar'
import { StatusBar } from './ui/StatusBar'
import { ToolDock } from './ui/ToolDock'
import { TopBar } from './ui/TopBar'
import { useHotkeys } from './ui/hotkeys'
import { useLab } from './state/store'

export default function App() {
  useHotkeys()
  const ready = useLab((s) => s.canvasReady)

  return (
    <div className="app">
      <TopBar />
      <div className="app-mid">
        <Sidebar />
        <main className="viewport">
          <LabCanvas />
          <ToolDock />
          <div className={`splash ${ready ? 'hidden' : ''}`}>
            <div className="ring" />
            <div className="msg">
              Compiling the <b>Rapier</b> WASM world…
            </div>
          </div>
        </main>
        <RightPanel />
      </div>
      <StatusBar />
      <HelpModal />
    </div>
  )
}
