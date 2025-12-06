import React from 'react'

// Favicon-inspired logo: rounded gradient square with white "Q"
// Uses same colors as public/favicon.svg (#667eea → #a855f7)
export default function Logo({ size = 32, className = '' }) {
  const s = Number(size)
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Quizzer logo"
      className={className}
    >
      <defs>
        <linearGradient id="qz-fav" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#667eea" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>

      {/* Rounded square background */}
      <rect x="1" y="1" width="30" height="30" rx="7" fill="url(#qz-fav)" />

      {/* White Q scaled from favicon geometry (512px → 32px) */}
      <g fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="16" cy="15" r="6" />
        <path d="M19.9 18.9 L22.3 21.3" />
      </g>
    </svg>
  )
}
