/** Satscope mark: a coin under a sighting reticle. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <circle cx="13" cy="13" r="9" fill="var(--orange)" />
      <circle cx="13" cy="13" r="5.2" fill="none" stroke="var(--paper)" strokeWidth="1.6" />
      <circle cx="19.5" cy="19.5" r="9.5" fill="none" stroke="var(--ink)" strokeWidth="2" />
      <path
        d="M19.5 7.5v4M19.5 27.5v4M7.5 19.5h4M27.5 19.5h4"
        stroke="var(--ink)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
