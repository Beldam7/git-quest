/**
 * Layered twilight kingdom used behind the main menu.
 * Pure SVG: no raster downloads, scales to any screen, and the slow float animations
 * are disabled automatically by the global prefers-reduced-motion rule.
 * Composition follows the hero art in docs/design-reference (castle, floating islands, mountains).
 */
function Island({ x, y, scale = 1, delay = '0s' }: { x: number; y: number; scale?: number; delay?: string }) {
  // Outer <g> positions the island (SVG attribute); the inner <g> carries the CSS float animation.
  // They must be separate: a CSS transform would otherwise override the positioning transform.
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <g className="animate-float" style={{ animationDelay: delay }}>
        <path d="M-70 0 Q0 -22 70 0 L40 38 Q0 70 -40 38 Z" fill="#162a4a" />
        <path d="M-70 0 Q0 -22 70 0 Q0 12 -70 0Z" fill="#2a6b55" />
        <polygon points="-8,-14 0,-46 8,-14" fill="#3b5fa8" />
        <rect x="-9" y="-26" width="18" height="14" fill="#2b3f6b" />
        <circle cx="0" cy="-19" r="2" fill="#f5b942" />
      </g>
    </g>
  );
}

export function Backdrop() {
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMax slice"
    >
      <defs>
        <linearGradient id="kqSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#050a1c" />
          <stop offset="0.55" stopColor="#10285a" />
          <stop offset="0.85" stopColor="#3a4f8e" />
          <stop offset="1" stopColor="#e39a62" />
        </linearGradient>
        <radialGradient id="kqGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffd9a0" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffd9a0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="kqFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#060b17" stopOpacity="0" />
          <stop offset="1" stopColor="#060b17" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#kqSky)" />
      {/* stars */}
      <g fill="#e8eefc" opacity="0.75">
        {[[120, 90], [260, 160], [420, 60], [610, 120], [780, 50], [960, 110], [1130, 70], [1290, 150], [1450, 60], [1530, 170], [340, 240], [1040, 230]].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={i % 3 === 0 ? 2 : 1.3} />
        ))}
      </g>
      <circle cx="1220" cy="200" r="70" fill="url(#kqGlow)" />
      <circle cx="1220" cy="200" r="26" fill="#fbe9c0" />
      {/* horizon glow */}
      <ellipse cx="800" cy="700" rx="760" ry="170" fill="url(#kqGlow)" opacity="0.5" />
      {/* floating islands */}
      <Island x={270} y={250} scale={0.9} />
      <Island x={560} y={170} scale={0.55} delay="1.2s" />
      <Island x={1380} y={330} scale={0.75} delay="0.6s" />
      {/* far mountains */}
      <polygon points="0,720 180,500 330,640 520,460 720,660 900,520 1100,680 1300,470 1480,640 1600,560 1600,900 0,900" fill="#1b2c58" />
      {/* mid mountains */}
      <polygon points="0,780 220,610 400,730 620,580 860,760 1060,640 1280,770 1450,650 1600,740 1600,900 0,900" fill="#142447" />
      {/* castle */}
      <g transform="translate(980 520)">
        <rect x="-150" y="80" width="300" height="130" fill="#0f1c3d" />
        <rect x="-60" y="20" width="120" height="190" fill="#14274f" />
        <polygon points="-72,22 0,-80 72,22" fill="#2b5cc4" />
        {[-120, -86, 86, 120].map((tx) => (
          <g key={tx}>
            <rect x={tx - 14} y="30" width="28" height="180" fill="#132349" />
            <polygon points={`${tx - 19},32 ${tx},-26 ${tx + 19},32`} fill="#2b5cc4" />
          </g>
        ))}
        {[[-8, 60], [-8, 110], [-100, 120], [100, 120], [-40, 150], [40, 150]].map(([wx, wy], i) => (
          <rect key={i} x={wx} y={wy} width="8" height="14" rx="3" fill="#f5b942" opacity="0.9" />
        ))}
        <rect x="-16" y="170" width="32" height="40" rx="14" fill="#f5b942" opacity="0.35" />
      </g>
      {/* foreground hills + fade to page background */}
      <path d="M0 830 Q300 740 600 810 T1200 800 T1600 820 V900 H0Z" fill="#0a1a2e" />
      <rect y="560" width="1600" height="340" fill="url(#kqFade)" />
    </svg>
  );
}
