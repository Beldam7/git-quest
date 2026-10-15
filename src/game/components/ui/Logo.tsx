/**
 * Code-drawn Git Quest emblem + wordmark.
 * Drawn in SVG (not cropped from the concept board) so it stays sharp at any size and has a
 * transparent background. Art direction follows docs/design-reference/references/01_hero_logo_and_kingdom.png.
 */
export function Logo() {
  return (
    <div className="flex flex-col items-center text-center">
      <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden="true" className="drop-shadow-[0_0_18px_rgba(245,185,66,0.35)]">
        <defs>
          <linearGradient id="kqLogoGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffe48f" />
            <stop offset="0.55" stopColor="#f5b942" />
            <stop offset="1" stopColor="#a8680f" />
          </linearGradient>
        </defs>
        <polygon points="48,3 93,48 48,93 3,48" fill="url(#kqLogoGold)" />
        <polygon points="48,11 85,48 48,85 11,48" fill="#0a1a3a" />
        <polygon points="48,11 85,48 48,85 11,48" fill="none" stroke="#3dd6f5" strokeOpacity="0.55" strokeWidth="1.5" />
        <g stroke="#3dd6f5" strokeWidth="4.5" strokeLinecap="round" fill="none">
          <line x1="48" y1="30" x2="48" y2="66" />
          <path d="M48 52 C48 44 62 46 62 38" />
        </g>
        <g fill="#0a1a3a" stroke="#e8eefc" strokeWidth="3.5">
          <circle cx="48" cy="30" r="6" />
          <circle cx="48" cy="66" r="6" />
          <circle cx="62" cy="38" r="6" />
        </g>
      </svg>
      <h1 className="kq-gold-text font-display font-bold text-5xl sm:text-6xl leading-none mt-3 tracking-wide">
        Git Quest
      </h1>
      <p className="mt-2 font-display text-sm sm:text-base tracking-[0.18em] text-kq-cyan">
        The Repository Kingdom
      </p>
      <p className="mt-3 text-kq-muted text-base sm:text-lg">Master Git. Complete quests. Become a legend.</p>
    </div>
  );
}
