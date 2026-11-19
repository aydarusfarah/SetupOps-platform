import type { ReactNode } from 'react';

export interface SegmentOption<V extends string> {
  value: V;
  label: ReactNode;
  icon?: ReactNode;
  count?: number;
}

/**
 * Compact segmented control. `role="tablist"` when it switches content panels,
 * otherwise a toggle-button group.
 */
export function SegmentedControl<V extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  variant = 'group',
}: {
  options: SegmentOption<V>[];
  value: V;
  onChange: (value: V) => void;
  ariaLabel: string;
  variant?: 'group' | 'tabs';
}) {
  const tabs = variant === 'tabs';
  return (
    <div
      role={tabs ? 'tablist' : 'group'}
      aria-label={ariaLabel}
      className="inline-flex max-w-full flex-wrap items-center gap-0.5 rounded-input border border-line bg-subtle p-0.5"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role={tabs ? 'tab' : undefined}
            aria-selected={tabs ? active : undefined}
            aria-pressed={tabs ? undefined : active}
            onClick={() => onChange(option.value)}
            className={`inline-flex h-7 items-center gap-1.5 rounded-control px-2.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-focus ${
              active ? 'bg-surface text-fg shadow-sm ring-1 ring-line' : 'text-fg-muted hover:text-fg'
            }`}
          >
            {option.icon}
            <span>{option.label}</span>
            {option.count !== undefined && (
              <span
                className={`tabular-nums rounded-control px-1 text-[11px] ${
                  active ? 'bg-accent-soft text-accent' : 'bg-muted text-fg-subtle'
                }`}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
