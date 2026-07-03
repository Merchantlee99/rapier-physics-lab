/** Colors used inside the 3D scene. UI colors live in global.css tokens. */

export const SCENE = {
  ground: '#232f40',
  static: '#3b4a5c',
  staticDark: '#2f3d4e',
  accent: '#35c9f0',
  amber: '#f5b53f',
  selection: '#35c9f0',
} as const

/** Parameter-sweep ramp: t∈[0,1] → cyan(195°) … magenta(330°).
 *  Used so a body's color encodes its coefficient in comparison scenarios. */
export function ramp(t: number, s = 72, l = 60) {
  const h = 195 + t * 135
  return `hsl(${h.toFixed(0)}, ${s}%, ${l}%)`
}

/** Hue-cycled color for spawned objects, keyed by spawn index. */
export function spawnColor(i: number) {
  return `hsl(${(i * 47 + 180) % 360}, 65%, 62%)`
}
