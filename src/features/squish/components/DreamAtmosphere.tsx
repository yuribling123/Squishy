/** Decorative color washes stay separate from the interactive canvas. */
export function DreamAtmosphere() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[45%]">
      <div className="absolute inset-x-[12%] top-[12%] h-[68%] rounded-full bg-mist/75 blur-3xl" />
      <div className="absolute top-[10%] left-[15%] h-[38%] w-[48%] rounded-full bg-blush/65 blur-3xl" />
      <div className="absolute right-[10%] bottom-[10%] h-[42%] w-[55%] rounded-full bg-pollen/80 blur-3xl" />
      <svg viewBox="0 0 600 500" className="absolute inset-0 h-full w-full text-accent/25" fill="none">
        <path d="M86 374C152 363 84 308 136 292S222 333 178 379 101 396 120 352M497 338C444 319 486 268 451 252S392 301 426 347 470 383 476 310" stroke="currentColor" strokeWidth=".8" />
        <path d="M128 346l-18-45m24 43 39-40m304 13 29-26m-30 28-38-25" stroke="currentColor" strokeWidth=".8" />
        <g fill="#f2edac">
          <circle cx="137" cy="223" r="4" /><circle cx="459" cy="185" r="5" />
          <circle cx="115" cy="304" r="3" /><circle cx="430" cy="363" r="4" />
        </g>
        <g fill="#dfaab9">
          <circle cx="161" cy="183" r="3" /><circle cx="482" cy="255" r="4" />
          <circle cx="186" cy="364" r="4" /><circle cx="435" cy="153" r="2" />
        </g>
        <g fill="#fff9e6">
          <path d="m113 249 2 7 7 2-7 2-2 7-2-7-7-2 7-2zm372 99 2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
        </g>
      </svg>
    </div>
  );
}
