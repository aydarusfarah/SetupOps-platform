import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';

export interface OverflowItem {
  label: string;
  icon?: ReactNode;
  onSelect?: () => void;
  to?: string;
  tone?: 'default' | 'danger';
  /** Draws a separator above the item (use before destructive actions). */
  separated?: boolean;
}

/**
 * "More actions" menu. Keeps secondary and destructive actions out of the
 * primary button row so they can't be hit by accident.
 */
export function OverflowMenu({ items, label }: { items: OverflowItem[]; label: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    rootRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const nodes = Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const idx = nodes.indexOf(document.activeElement as HTMLElement);
    const next = e.key === 'ArrowDown' ? (idx + 1) % nodes.length : (idx - 1 + nodes.length) % nodes.length;
    nodes[next]?.focus();
  };

  if (items.length === 0) return null;

  const itemClass = (tone: OverflowItem['tone']) =>
    `flex w-full items-center gap-2.5 rounded-control px-2.5 py-2 text-left text-sm outline-none focus-visible:bg-muted ${
      tone === 'danger' ? 'text-danger-fg hover:bg-danger/10 focus-visible:bg-danger/10' : 'text-fg hover:bg-muted'
    }`;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        onClick={() => setOpen((v) => !v)}
        className="btn btn-secondary w-9 px-0"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 z-40 mt-1 w-56 rounded-card border border-line bg-surface p-1 shadow-lg"
        >
          {items.map((item) => (
            <div key={item.label}>
              {item.separated && <div role="separator" className="my-1 h-px bg-line-subtle" />}
              {item.to ? (
                <Link role="menuitem" to={item.to} className={itemClass(item.tone)} onClick={() => setOpen(false)}>
                  {item.icon}
                  {item.label}
                </Link>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  className={itemClass(item.tone)}
                  onClick={() => {
                    setOpen(false);
                    item.onSelect?.();
                  }}
                >
                  {item.icon}
                  {item.label}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
