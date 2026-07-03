interface P {
  size?: number
}

const S = (p: P) => p.size ?? 15

export const IconPlay = (p: P) => (
  <svg width={S(p)} height={S(p)} viewBox="0 0 16 16" fill="currentColor">
    <path d="M4.5 2.8v10.4c0 .6.7 1 1.2.7l8.2-5.2c.5-.3.5-1 0-1.3L5.7 2.1c-.5-.3-1.2 0-1.2.7z" />
  </svg>
)

export const IconPause = (p: P) => (
  <svg width={S(p)} height={S(p)} viewBox="0 0 16 16" fill="currentColor">
    <rect x="3.2" y="2.5" width="3.4" height="11" rx="1" />
    <rect x="9.4" y="2.5" width="3.4" height="11" rx="1" />
  </svg>
)

export const IconStep = (p: P) => (
  <svg width={S(p)} height={S(p)} viewBox="0 0 16 16" fill="currentColor">
    <path d="M3 3.4v9.2c0 .5.6.9 1 .6l6.5-4.6c.4-.3.4-.9 0-1.2L4 2.8c-.4-.3-1 0-1 .6z" />
    <rect x="11.6" y="2.5" width="2" height="11" rx="0.8" />
  </svg>
)

export const IconReset = (p: P) => (
  <svg width={S(p)} height={S(p)} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
    <path d="M13.2 8a5.2 5.2 0 1 1-1.6-3.8" />
    <path d="M12 1.6v3h-3" />
  </svg>
)

export const IconHelp = (p: P) => (
  <svg width={S(p)} height={S(p)} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="8" cy="8" r="6.2" />
    <path d="M6.2 6.2c.2-1 1-1.7 2-1.6 1 0 1.8.8 1.8 1.7 0 1.2-1.7 1.5-1.9 2.6" />
    <circle cx="8" cy="11.4" r="0.4" fill="currentColor" stroke="none" />
  </svg>
)

export const IconCursor = (p: P) => (
  <svg width={S(p)} height={S(p)} viewBox="0 0 16 16" fill="currentColor">
    <path d="M3.2 2.2 13 7.4c.5.3.4 1-.1 1.2l-4 1.2-2.4 3.5c-.3.5-1 .3-1.1-.2L2.2 3c-.1-.5.5-1 1-.8z" />
  </svg>
)

export const IconPoke = (p: P) => (
  <svg width={S(p)} height={S(p)} viewBox="0 0 16 16" fill="currentColor">
    <path d="M9.4 1.4 3.2 8.9c-.3.4 0 .9.4.9h2.9l-1 4.4c-.1.6.6.9 1 .5l6.3-7.6c.3-.4 0-.9-.4-.9H9.5l1-4.3c.1-.6-.7-.9-1.1-.5z" />
  </svg>
)

export const IconBox = (p: P) => (
  <svg width={S(p)} height={S(p)} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
    <path d="M8 1.8 14 5v6L8 14.2 2 11V5z" />
    <path d="M2 5l6 3 6-3M8 8v6.2" />
  </svg>
)

export const IconSphere = (p: P) => (
  <svg width={S(p)} height={S(p)} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="8" cy="8" r="6.2" />
    <ellipse cx="8" cy="8" rx="6.2" ry="2.4" />
  </svg>
)

export const IconCamera = (p: P) => (
  <svg width={S(p)} height={S(p)} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 5.5h2.4l1.2-1.8h4.8l1.2 1.8H14v7H2z" />
    <circle cx="8" cy="8.8" r="2.2" />
  </svg>
)

export const IconClose = (p: P) => (
  <svg width={S(p)} height={S(p)} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
    <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
  </svg>
)

export const IconAtom = (p: P) => (
  <svg width={S(p)} height={S(p)} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="2.6" fill="#35c9f0" />
    <ellipse cx="12" cy="12" rx="9.5" ry="4" stroke="#35c9f0" strokeWidth="1.4" opacity="0.75" transform="rotate(-24 12 12)" />
    <ellipse cx="12" cy="12" rx="9.5" ry="4" stroke="#5cd6f5" strokeWidth="1.2" opacity="0.4" transform="rotate(48 12 12)" />
    <circle cx="19.6" cy="7.6" r="1.4" fill="#f5b53f" />
  </svg>
)
