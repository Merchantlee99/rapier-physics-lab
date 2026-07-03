import { createRoot } from 'react-dom/client'
import App from './App'
import { useLab } from './state/store'
import './styles/global.css'

// Inspection surface (pairs with window.__lab from the engine bridge).
;(window as unknown as Record<string, unknown>).__labStore = useLab

// No <StrictMode>: its dev-only double mount would create and destroy every
// rigid body twice, churning the physics world and breaking the stable
// construction order that our determinism guarantee rests on.
createRoot(document.getElementById('root')!).render(<App />)
