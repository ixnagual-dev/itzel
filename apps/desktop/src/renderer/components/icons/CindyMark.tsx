// Modified for Itzel: geometric aperture mark, 2026-11-04.
/** Internal component name retained for compatibility with existing consumers. */
export function CindyMark({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M12 1.5 22.5 12 12 22.5 1.5 12Z M12 6 6 12 12 18 18 12Z" fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}
