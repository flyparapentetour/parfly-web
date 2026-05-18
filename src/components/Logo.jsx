/**
 * Fly Parapente Tour · Logo
 * Marca reutilizable: <Logo /> (sólo mark) o <Logo variant="wordmark" />
 * Props:
 *  - variant: 'mark' | 'wordmark'  (default 'mark')
 *  - tone:    'color' | 'light' | 'dark'  (default 'color')
 *  - size:    px (default 32 para mark, 140 para wordmark)
 */
function Logo({ variant = 'mark', tone = 'color', size, className = '' }) {
  const ribStroke = tone === 'light' ? 'rgba(255,255,255,.55)' : '#0A1628'
  const wingFill = tone === 'color' ? 'url(#parfly-wing)' : 'currentColor'
  const pilotInner = tone === 'light' ? '#fff' : '#0A1628'

  const Mark = (
    <>
      <defs>
        <linearGradient id="parfly-wing" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF8A4D" />
          <stop offset="100%" stopColor="#FF6B2B" />
        </linearGradient>
      </defs>
      <path
        d="M4 36 C 12 10, 84 10, 92 36 L 84 42 C 76 22, 20 22, 12 42 Z"
        fill={wingFill}
      />
      <g stroke={ribStroke} strokeWidth="1.2" strokeLinecap="round" opacity={tone === 'light' ? 0.5 : 0.55}>
        <line x1="22" y1="22" x2="22" y2="38" />
        <line x1="36" y1="16" x2="36" y2="37" />
        <line x1="48" y1="14" x2="48" y2="37" />
        <line x1="60" y1="16" x2="60" y2="37" />
        <line x1="74" y1="22" x2="74" y2="38" />
      </g>
      <g stroke="#FF6B2B" strokeLinecap="round" fill="none">
        <line x1="14" y1="40" x2="48" y2="70" strokeWidth="1.6" />
        <line x1="82" y1="40" x2="48" y2="70" strokeWidth="1.6" />
        <line x1="30" y1="38" x2="48" y2="70" strokeWidth="1.1" opacity=".55" />
        <line x1="66" y1="38" x2="48" y2="70" strokeWidth="1.1" opacity=".55" />
      </g>
      <circle cx="48" cy="70" r="4" fill={pilotInner} />
      <circle cx="48" cy="70" r="2.2" fill="#FF6B2B" />
    </>
  )

  if (variant === 'wordmark') {
    const h = size || 44
    const textFill = tone === 'light' ? '#ffffff' : '#0A1628'
    return (
      <svg
        className={className}
        viewBox="0 0 560 96"
        height={h}
        role="img"
        aria-label="Fly Parapente Tour"
      >
        <g transform="translate(0,8)">{Mark}</g>
        <text
          x="116" y="56"
          fontFamily="Bebas Neue, sans-serif"
          fontSize="46"
          letterSpacing="2"
          fill={textFill}
        >FLY PARAPENTE TOUR</text>
        <text
          x="118" y="80"
          fontFamily="Inter, sans-serif"
          fontSize="10"
          letterSpacing="4"
          fontWeight="600"
          fill="#FF6B2B"
        >PARAPENTE · COLOMBIA</text>
      </svg>
    )
  }

  const s = size || 32
  return (
    <svg
      className={className}
      viewBox="0 0 96 80"
      width={s * 1.2}
      height={s}
      role="img"
      aria-label="Fly Parapente Tour"
    >
      {Mark}
    </svg>
  )
}

export default Logo
