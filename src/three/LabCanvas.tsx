import { Suspense, useEffect } from 'react'
import { PCFShadowMap } from 'three'
import { Canvas } from '@react-three/fiber'
import { Grid, OrbitControls } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { DT } from '../lib/constants'
import { byId } from '../scenarios/registry'
import { P_COUNT as STRESS_COUNT } from '../scenarios/Stress'
import { useLab } from '../state/store'
import { CameraRig } from './CameraRig'
import { SelectionOverlay } from './SelectionOverlay'
import { SimulationDriver } from './SimulationDriver'
import { SpawnedBodies } from './SpawnedBodies'

/** Flags the splash screen away once the WASM world has actually mounted. */
function Ready() {
  const setCanvasReady = useLab((s) => s.setCanvasReady)
  useEffect(() => {
    setCanvasReady(true)
  }, [setCanvasReady])
  return null
}

function SceneLights({ shadows }: { shadows: boolean }) {
  return (
    <>
      <ambientLight intensity={0.62} />
      <hemisphereLight args={['#5d7590', '#1a2129', 0.7]} />
      <directionalLight
        position={[9, 15, 7]}
        intensity={1.55}
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-19}
        shadow-camera-right={19}
        shadow-camera-top={19}
        shadow-camera-bottom={-19}
        shadow-camera-near={2}
        shadow-camera-far={45}
        shadow-bias={-0.00018}
      />
      <directionalLight position={[-7, 9, -9]} intensity={0.4} />
    </>
  )
}

export function LabCanvas() {
  const scenarioId = useLab((s) => s.scenarioId)
  const resetNonce = useLab((s) => s.resetNonce)
  const running = useLab((s) => s.running)
  const timeScale = useLab((s) => s.timeScale)
  const showColliders = useLab((s) => s.showColliders)
  const shadows = useLab((s) => s.shadows)
  const gravityY = useLab((s) => s.gravityY)
  const stressCount = useLab((s) => s.params['stress.count'] ?? STRESS_COUNT.def)

  const def = byId(scenarioId)
  const epoch = `${scenarioId}:${resetNonce}`
  // 1× playback uses the library's own interpolated loop; every other mode is
  // driven manually by SimulationDriver (see its header comment).
  const paused = !(running && timeScale === 1)
  const effShadows = shadows && !(scenarioId === 'stress' && stressCount > 320)
  const Scenario = def.Component

  return (
    <Canvas
      shadows={{ type: PCFShadowMap }}
      flat
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 42, near: 0.1, far: 220, position: def.camera.position }}
      onPointerMissed={() => {
        const s = useLab.getState()
        if (s.tool === 'drag') s.select(null)
      }}
    >
      <color attach="background" args={['#0c1016']} />
      <fog attach="fog" args={['#0c1016', 36, 100]} />
      <SceneLights shadows={effShadows} />
      <Grid
        position={[0, 0.015, 0]}
        args={[80, 80]}
        cellSize={1}
        cellThickness={0.65}
        cellColor="#314054"
        sectionSize={5}
        sectionThickness={1.2}
        sectionColor="#4a627f"
        fadeDistance={62}
        fadeStrength={1.4}
        infiniteGrid
      />

      <Suspense fallback={null}>
        <Physics
          key={epoch}
          paused={paused}
          timeStep={DT}
          interpolate
          gravity={[0, gravityY, 0]}
          numSolverIterations={def.solverIterations ?? 4}
          debug={showColliders}
          colliders={false}
        >
          <Ready />
          <SimulationDriver epoch={epoch} />
          <Scenario />
          <SpawnedBodies />
          <SelectionOverlay />
        </Physics>
      </Suspense>

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.09}
        maxPolarAngle={Math.PI / 2 - 0.03}
        minDistance={2.5}
        maxDistance={70}
      />
      <CameraRig />
    </Canvas>
  )
}
