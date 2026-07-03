/** Fixed physics timestep. Every simulation path steps in exact multiples of
 *  this quantum, which is what makes runs reproducible regardless of display
 *  refresh rate or the selected time scale. */
export const DT = 1 / 60

/** Hard cap on rigid bodies in a world; spawning is refused beyond this. */
export const MAX_BODIES = 700

export const GRAVITY_PRESETS = [
  { label: 'Earth', y: -9.81 },
  { label: 'Moon', y: -1.62 },
  { label: 'Mars', y: -3.71 },
  { label: 'Zero-g', y: 0 },
] as const

export const TIME_SCALES = [0.25, 0.5, 1, 2] as const
