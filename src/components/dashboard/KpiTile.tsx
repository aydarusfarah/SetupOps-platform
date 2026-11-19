import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export type KpiTone = 'accent' | 'success' | 'warning' | 'neutral';

const TONE_BAR: Record<KpiTone, string> = {
  accent: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  neutral: 'bg-neutral',
};

/** Single KPI tile: label, headline number, meter and a one-line footnote. Whole tile is a link. */
export function KpiTile({
  to,
  label,
  value,
  icon,
  tone = 'accent',
  percent,
  segments,
  footnote,
  linkHint,
}: {
  to: string;
  label: string;
  value: number;
  icon: ReactNode;
  tone?: KpiTone;
  /** 0–100 single-series meter */
  percent?: number;
  /** Multi-series meter (e.g. fleet by status). Widths are relative to the sum. */
  segments?: Array<{ key: string; value: number; color: string }>;
  footnote: ReactNode;
  linkHint: string;
}) {
  const segmentTotal = segments?.reduce((sum, s) => sum + s.value, 0) ?? 0;
  return (
    <Link
      to={to}
      className="group flex flex-col rounded-card border border-line bg-surface p-4 shadow-xs transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-focus"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-fg-muted">{label}</span>
        <span className="text-fg-subtle" aria-hidden="true">
          {icon}
        </span>
      </div>

      <div className="tabular-nums mt-2 flex items-baseline justify-between gap-2">
        <span className="text-[28px] leading-none font-semibold tracking-tight text-fg">{value}</span>
        <span className="inline-flex items-center gap-0.5 text-xs font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          {linkHint}
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>

      <div aria-hidden="true" className="mt-4 flex h-1 w-full overflow-hidden rounded-full bg-muted">
        {segments && segmentTotal > 0
          ? segments.map((s) => (
              <span
                key={s.key}
                style={{ width: `${(s.value / segmentTotal) * 100}%`, backgroundColor: s.color }}
              />
            ))
          : percent !== undefined && (
              <span className={`h-full ${TONE_BAR[tone]}`} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
            )}
      </div>

      <p className="tabular-nums mt-2 text-xs text-fg-subtle">{footnote}</p>
    </Link>
  );
}
