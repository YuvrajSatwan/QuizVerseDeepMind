import React from 'react'

// Hero mark: circular gradient ring with a clean monogram Q
// Distinct from the favicon-style Navbar logo
export default function LogoHero({ size = 72, className = '' }) {
  const s = Number(size)
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Quizzer hero logo"
      className={className}
    >
      <defs>
        {/* Brand gradient (same palette as favicon) */}
        <linearGradient id="qz-hero" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#667eea" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        {/* Soft inner glow for the Q */}
        <filter id="qz-hero-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="rgba(0,0,0,0.18)" />
        </filter>
      </defs>

      {/* Filled gradient circle background */}
      <g filter="url(#qz-hero-shadow)">
        <circle cx="16" cy="16" r="14" fill="url(#qz-hero)" />
      </g>
      {/* Subtle inner rim for depth */}
      <circle cx="16" cy="16" r="12.5" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="1.5" />

      {/* Monogram Q */}
      <g>
        <circle cx="16" cy="15" r="6" fill="none" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" />
        <path d="M19.9 18.9 L22.3 21.3" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  )
}
