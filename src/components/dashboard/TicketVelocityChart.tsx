import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useT } from '../../i18n';
import { Panel } from '../ui/Panel';
import { AXIS_TICK, chartVar, GRID_STROKE } from './chartColors';

interface WeekBucket {
  label: string;
  created: number;
  resolved: number;
}

interface TooltipItem {
  dataKey?: string;
  value?: number;
}

function VelocityTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipItem[]; label?: string }) {
  const t = useT();
  if (!active || !payload?.length) return null;
  const value = (key: string) => payload.find((p) => p.dataKey === key)?.value ?? 0;
  return (
    <div className="rounded-input border border-line bg-surface px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-fg">{label}</p>
      {(
        [
          ['created', chartVar(1), t('dashboard.created')],
          ['resolved', chartVar(2), t('dashboard.resolved')],
        ] as const
      ).map(([key, color, name]) => (
        <p key={key} className="mt-1 flex items-center justify-between gap-6 text-fg-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-xs" style={{ backgroundColor: color }} />
            {name}
          </span>
          <span className="tabular-nums font-semibold text-fg">{value(key)}</span>
        </p>
      ))}
    </div>
  );
}

export function TicketVelocityChart({ weeks, className = '' }: { weeks: WeekBucket[]; className?: string }) {
  const t = useT();
  const totals = weeks.reduce(
    (acc, w) => ({ created: acc.created + w.created, resolved: acc.resolved + w.resolved }),
    { created: 0, resolved: 0 },
  );

  return (
    <Panel
      className={className}
      title={t('dashboard.ticketVelocityLast8Weeks')}
      description={t('dashboard.weeklyIntakeComparedAgainstResolved')}
      actions={
        <dl className="tabular-nums flex items-center gap-4 text-xs">
          {(
            [
              [chartVar(1), t('dashboard.created'), totals.created],
              [chartVar(2), t('dashboard.resolved'), totals.resolved],
            ] as const
          ).map(([color, name, total]) => (
            <div key={name} className="flex items-center gap-1.5 text-fg-muted">
              <span className="h-2.5 w-2.5 rounded-xs" style={{ backgroundColor: color }} aria-hidden="true" />
              <dt>{name}</dt>
              <dd className="font-semibold text-fg">{total}</dd>
            </div>
          ))}
        </dl>
      }
    >
      <div className="h-60 w-full" role="img" aria-label={t('dashboard.ticketVelocityLast8Weeks')}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeks} margin={{ top: 6, right: 4, left: -24, bottom: 0 }} barGap={3}>
            <CartesianGrid vertical={false} stroke={GRID_STROKE} />
            <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: 'var(--so-muted)' }} content={<VelocityTooltip />} />
            <Bar dataKey="created" fill={chartVar(1)} radius={[2, 2, 0, 0]} maxBarSize={16} isAnimationActive={false} />
            <Bar dataKey="resolved" fill={chartVar(2)} radius={[2, 2, 0, 0]} maxBarSize={16} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
