/**
 * SetupOps brand mark: a workstation display with a completed-setup check.
 * Kept in sync with /public/favicon.svg.
 */
export function BrandMark({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="6" fill="#0B5CB8" />
      <rect x="6.5" y="7.5" width="19" height="13" rx="1.5" fill="none" stroke="#fff" strokeWidth="2" />
      <path
        d="M11.5 14.2l2.9 2.8 6.1-6"
        fill="none"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M16 20.5v3.5M11.5 24.5h9" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
