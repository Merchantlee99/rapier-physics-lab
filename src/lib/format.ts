export const f1 = (v: number) => v.toFixed(1)
export const f2 = (v: number) => v.toFixed(2)

export function fmtVec(v: { x: number; y: number; z: number }, digits = 2) {
  return `${v.x.toFixed(digits)}, ${v.y.toFixed(digits)}, ${v.z.toFixed(digits)}`
}

export function fmtTime(t: number) {
  return `${t.toFixed(2)}s`
}

export function mag(v: { x: number; y: number; z: number }) {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
}
