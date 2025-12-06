import React from 'react'

// Monogram-only "Q" (no background), stroke uses currentColor
export default function LogoMonogram({ size = 24, className = '' }) {
  const s = Number(size)
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Quizzer Q monogram"
      className={className}
    >
      <g fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="14.5" cy="14.5" r="6.5" />
        <path d="M18.7 18.7 L22.2 22.2" />
      </g>
    </svg>
  )
}
