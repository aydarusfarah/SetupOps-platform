import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useT } from '../../i18n';
import { Panel } from '../ui/Panel';
import { SegmentedControl } from '../ui/SegmentedControl';

export interface BreakdownEntry {
  key: string;
  label: string;
  count: number;
  percent: number;
  color: string;
  to: string;
}

type Mode = 'status' | 'type';

export function FleetBreakdown({
  byStatus,
  byType,
  total,
  className = '',
}: {
  byStatus: BreakdownEntry[];
  byType: BreakdownEntry[];
  total: number;
  className?: string;
}) {
  const t = useT();
  const [mode, setMode] = useState<Mode>('status');
  const entries = mode === 'status' ? byStatus : byType;

  return (
    <Panel
      className={className}
      title={t('dashboard.fleetBreakdown')}
      actions={
        <SegmentedControl<Mode>
          ariaLabel={t('dashboard.breakdownView')}
          value={mode}
          onChange={setMode}
          options={[
            { value: 'status', label: t('dashboard.byStatus') },
            { value: 'type', label: t('dashboard.byType') },
          ]}
        />
      }
    >
      {entries.length === 0 ? (
        <div className="flex h-60 items-center justify-center text-sm text-fg-subtle">
          {t('dashboard.noDeviceDataAvailableYet')}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-5 sm:flex-row">
          <div className="relative h-[164px] w-[164px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={entries}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={54}
                  outerRadius={72}
                  paddingAngle={1.5}
                  isAnimationActive={false}
                  stroke="var(--so-surface)"
                  strokeWidth={2}
                >
                  {entries.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val) => [t('dashboard.valDevices', { val: String(val ?? '') }), t('dashboard.count')]}
                  contentStyle={{
                    borderRadius: 'var(--so-radius-input)',
                    border: '1px solid var(--so-line)',
                    backgroundColor: 'var(--so-surface)',
                    color: 'var(--so-fg)',
                    fontSize: '12px',
                  }}
                  itemStyle={{ color: 'var(--so-fg)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="tabular-nums text-2xl font-semibold tracking-tight text-fg">{total}</span>
              <span className="text-[11px] font-medium text-fg-subtle">{t('dashboard.assets')}</span>
            </div>
          </div>

          <table className="w-full min-w-0 flex-1 text-sm">
            <tbody className="divide-y divide-line-subtle">
              {entries.map((entry) => (
                <tr key={entry.key} className="group">
                  <td className="py-0">
                    <Link
                      to={entry.to}
                      className="flex items-center gap-2 py-2 text-fg-muted group-hover:text-accent"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-xs"
                        style={{ backgroundColor: entry.color }}
                        aria-hidden="true"
                      />
                      <span className="truncate">{entry.label}</span>
                    </Link>
                  </td>
                  <td className="tabular-nums w-12 py-2 text-right text-xs text-fg-subtle">{entry.percent}%</td>
                  <td className="tabular-nums w-10 py-2 text-right font-semibold text-fg">{entry.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
