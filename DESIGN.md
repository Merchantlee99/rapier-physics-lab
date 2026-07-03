# Rapier Physics Lab — Design System

The UI is an **instrument panel around a viewport**, not a decorated demo. Users are
here to run experiments: change a parameter, replay, read the numbers. Every design
decision serves scan-speed and trust in the data.

**Style direction (single):** dark engineering console — flat panels, hairline borders,
mono numerics, one cold accent. No skeuomorphism, no gradients-as-decoration, no
glassmorphism.

## 1. Color tokens

| Token | Value | Use |
|---|---|---|
| `--bg0` | `#07090d` | page background |
| `--bg1` | `#0c1016` | canvas clear / fog color |
| `--panel` | `#10151d` | panel surfaces |
| `--panel2` | `#161d28` | raised rows, inputs, hover |
| `--border` | `#1d2632` | hairline borders |
| `--border2` | `#2c3949` | hover/focus borders |
| `--t1` | `#e8eef6` | primary text |
| `--t2` | `#9aabbf` | secondary text |
| `--t3` | `#5c6b7e` | faint text, disabled |
| `--acc` | `#35c9f0` | accent: interactive, selection, play |
| `--acc-dim` | `rgba(53,201,240,.13)` | accent fills |
| `--good` | `#34d399` | ok states, ≥55 fps |
| `--warn` | `#f5b53f` | triggers, 30–55 fps, caps |
| `--bad` | `#f87171` | errors, <30 fps |
| `--vio` | `#a78bfa` | energy/telemetry series |

3D scene: objects use HSL ramps per scenario (hue 195→330 for parameter sweeps);
static geometry slate `#2a3442`-ish; selection highlight = `--acc`.

## 2. Typography

- UI: system stack (`-apple-system, "Segoe UI", Inter, Roboto, sans-serif`)
- **All numerics** in `ui-monospace, "SF Mono", Menlo` with `tabular-nums`
- Sizes: 11px uppercase section labels (+0.08em tracking), 12px body, 13px controls,
  15px panel titles, 16px brand. Weights 400/500/600 only.
- Every physical quantity carries a unit (`m`, `m/s`, `J`, `ms`, `kg`, `°`).

## 3. Spacing & layout

- 4px base grid; panel padding 12px; row gap 8px; section gap 16px.
- Radii: 10px panels, 7px controls, 999px pills. Borders always 1px.
- App grid: rows `[48px topbar | 1fr | 28px statusbar]`,
  middle columns `[236px scenarios | 1fr viewport | 308px instrument panel]`.
- The viewport is the hero: side panels never overlay it; the floating tool dock is
  the only element allowed above the canvas (bottom-center).

## 4. Components

- **IconButton** 28×28, ghost; active state = `--acc-dim` fill + `--acc` icon.
- **Button** ghost / primary(accent) / small (24px).
- **Slider**: full-width labeled row — label left, mono value+unit right, 4px track,
  12px thumb. Rebuild-params show ↻ and commit on release, never mid-drag.
- **Segmented** control for time scale.
- **Toggle** (switch, 28×16).
- **Scenario card**: title + one-line blurb + tag chip; active = accent left rail.
- **Stat row**: label `--t2` left, mono value right.
- **Sparkline** 44px canvas, series color per token, faint target line.
- **Badge/chip**, **Kbd** hints.
- Empty states explain the next action, never blank.

## 5. Motion

- 120ms ease-out on hover/press/panel state. No entrance animations, no parallax.
  The simulation is the only thing that moves for its own sake.

## 6. 3D scene look

- Fog to `--bg1`, drei Grid (cell `#1b2531`, section `#2b3b4e`) over a dark ground
  disc; one shadow-casting directional light + soft ambient; standard materials,
  roughness ~0.55.

## 7. Do / Don't

- DO color-code meaning: cyan=interactive/selected, amber=triggers/warnings,
  violet=energy, green=ok.
- DO keep numbers stable-width (tabular) so telemetry doesn't jitter.
- DON'T overlay panels on the viewport; DON'T animate panel chrome;
  DON'T use more than the one accent; DON'T show a number without its unit.
