// Small outline icons for each asset type (simple SVG, no library needed)

const PATHS = {
  PC: 'M7 3h10v18H7z M10 7h4 M10 10h4 M12 16.5h.01',
  Laptop: 'M5 6h14v9H5z M3 18h18',
  Monitor: 'M3 5h18v12H3z M8 21h8',
  Server: 'M5 4h14v6H5z M5 14h14v6H5z M8 7h.01 M8 17h.01',
  Printer: 'M7 9V4h10v5 M5 9h14v7H5z M7 14h10v6H7z',
  Phone: 'M8 3h8v18H8z M11 18h2',
  Other: 'M4 7h16v12H4z M9 7V4h6v3',
}

export default function TypeIcon({ type, className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={PATHS[type] || PATHS.Other} />
    </svg>
  )
}
