import type { World } from '@dimforge/rapier3d-compat'
import { DT } from '../lib/constants'

/** Fixed-size ring buffer for sparkline series. */
export class Ring {
  data: Float32Array
  private idx = 0
  filled = 0

  constructor(size = 180) {
    this.data = new Float32Array(size)
  }

  push(v: number) {
    this.data[this.idx] = v
    this.idx = (this.idx + 1) % this.data.length
    if (this.filled < this.data.length) this.filled++
  }

  /** Copy out in chronological order. */
  values(): number[] {
    const n = this.filled
    const out = new Array<number>(n)
    const start = (this.idx - n + this.data.length) % this.data.length
    for (let i = 0; i < n; i++) out[i] = this.data[(start + i) % this.data.length]
    return out
  }

  clear() {
    this.idx = 0
    this.filled = 0
  }
}

/**
 * Telemetry lives outside React: the driver writes every frame/step, UI reads
 * at low frequency (4–10 Hz). This keeps the hot path allocation- and
 * rerender-free.
 */
class Telemetry {
  // live values
  fps = 0
  stepMs = 0
  kineticEnergy = 0
  bodyCount = 0
  awakeCount = 0
  jointCount = 0
  simTime = 0
  stepCount = 0
  stateHash = '--------'
  hashStep = 0

  // series (sampled at 10 Hz)
  fpsRing = new Ring()
  stepMsRing = new Ring()
  keRing = new Ring()
  awakeRing = new Ring()

  private frameAcc = 0
  private frameCnt = 0
  private sampleAcc = 0
  private stepMsAcc = 0
  private stepMsCnt = 0

  /** Called once per rendered frame. */
  frame(delta: number) {
    this.frameAcc += delta
    this.frameCnt++
    this.sampleAcc += delta
    // update instantaneous fps ~4x/sec
    if (this.frameAcc >= 0.25) {
      this.fps = this.frameCnt / this.frameAcc
      this.frameAcc = 0
      this.frameCnt = 0
    }
    if (this.sampleAcc >= 0.1) {
      this.sampleAcc = 0
      this.fpsRing.push(this.fps)
      this.stepMsRing.push(this.stepMs)
      this.keRing.push(this.kineticEnergy)
      this.awakeRing.push(this.awakeCount)
    }
  }

  /** Called after every physics step with its wall-clock cost. */
  step(world: World, ms: number) {
    this.stepCount++
    this.simTime += DT
    this.stepMsAcc += ms
    this.stepMsCnt++
    if (this.stepMsCnt >= 6) {
      this.stepMs = this.stepMsAcc / this.stepMsCnt
      this.stepMsAcc = 0
      this.stepMsCnt = 0
    }
    if (this.stepCount % 6 === 0) this.scan(world)
    if (this.stepCount % 60 === 0) {
      this.stateHash = worldHash(world)
      this.hashStep = this.stepCount
    }
  }

  /** Body census + total linear kinetic energy (rotational energy is omitted;
   *  see README "measurements"). */
  scan(world: World) {
    let ke = 0
    let awake = 0
    let n = 0
    world.forEachRigidBody((b) => {
      n++
      if (!b.isSleeping()) awake++
      if (b.isDynamic()) {
        const v = b.linvel()
        ke += 0.5 * b.mass() * (v.x * v.x + v.y * v.y + v.z * v.z)
      }
    })
    this.kineticEnergy = ke
    this.awakeCount = awake
    this.bodyCount = n
    this.jointCount = world.impulseJoints.len()
  }

  /** New world mounted (scenario switch or reset). */
  resetRun(world: World | null) {
    this.simTime = 0
    this.stepCount = 0
    this.stateHash = '--------'
    this.hashStep = 0
    this.stepMs = 0
    this.kineticEnergy = 0
    if (world) this.scan(world)
  }
}

/**
 * FNV-1a over the exact float bits of every body transform. Two runs of a
 * deterministic scenario produce identical hash sequences — reset and watch
 * the same hashes reappear at the same step numbers.
 */
export function worldHash(world: World): string {
  let h = 0x811c9dc5
  const buf = new ArrayBuffer(4)
  const dv = new DataView(buf)
  const mix = (f: number) => {
    dv.setFloat32(0, f)
    for (let i = 0; i < 4; i++) {
      h ^= dv.getUint8(i)
      h = Math.imul(h, 0x01000193)
    }
  }
  world.forEachRigidBody((b) => {
    const t = b.translation()
    const r = b.rotation()
    mix(t.x)
    mix(t.y)
    mix(t.z)
    mix(r.x)
    mix(r.y)
    mix(r.z)
    mix(r.w)
  })
  return (h >>> 0).toString(16).padStart(8, '0')
}

export const telemetry = new Telemetry()
