/** Decorative spinner; always pair it with visible text (ux-standard section 6). */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`motion-essential inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className ?? ""}`}
    />
  );
}
