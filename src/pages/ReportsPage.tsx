import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { FileDown, Printer } from 'lucide-react';
import { useWorkshopData } from '../hooks/useWorkshopData';
import { useLanguage } from '../hooks/useLanguage';
import { LOCALE, useT, type MessageKey } from '../i18n';
import { trDeviceStatus, trDeviceType, trTicketCategory, trTicketPriority } from '../i18n/labels';
import { generateDevicesCsv, generateTicketsCsv } from '../lib/domain';
import { datedFilename, triggerDownload } from '../lib/download';
import { buildWorkshopReport, type ReportPeriod } from '../lib/reports';
import { PageHeader, Panel } from '../components/ui/Panel';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { BrandMark } from '../components/ui/BrandMark';
import { STATUS_COLORS, TYPE_COLORS, chartVar } from '../components/dashboard/chartColors';

const PERIODS: Array<{ value: ReportPeriod; label: MessageKey }> = [
  { value: 30, label: 'reports.period30' },
  { value: 90, label: 'reports.period90' },
  { value: 365, label: 'reports.period365' },
  { value: 'all', label: 'reports.periodAll' },
];

type PeriodKey = '30' | '90' | '365' | 'all';
const toKey = (p: ReportPeriod) => String(p) as PeriodKey;
const fromKey = (k: PeriodKey): ReportPeriod => (k === 'all' ? 'all' : (Number(k) as ReportPeriod));

function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-xs break-inside-avoid">
      <p className="text-[13px] font-medium text-fg-muted">{label}</p>
      <p className="tabular-nums mt-1.5 text-2xl leading-none font-semibold tracking-tight text-fg">{value}</p>
      {hint && <p className="tabular-nums mt-1.5 text-xs text-fg-subtle">{hint}</p>}
    </div>
  );
}

function BarList({ rows }: { rows: Array<{ key: string; label: string; value: number; color: string }> }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2.5">
      {rows.map((row) => (
        <li key={row.key} className="grid grid-cols-[minmax(0,9rem)_1fr_2.5rem] items-center gap-3 text-sm">
          <span className="truncate text-fg-muted">{row.label}</span>
          <span className="h-2 overflow-hidden rounded-xs bg-muted">
            <span
              className="block h-full rounded-xs [print-color-adjust:exact]"
              style={{ width: `${(row.value / max) * 100}%`, backgroundColor: row.color }}
            />
          </span>
          <span className="tabular-nums text-right font-semibold text-fg">{row.value}</span>
        </li>
      ))}
    </ul>
  );
}

const th = 'px-3 py-2 text-left text-xs font-semibold text-fg-muted';
const td = 'tabular-nums px-3 py-2';

export function ReportsPage() {
  const { devices, tickets, auditLogs } = useWorkshopData();
  const { lang } = useLanguage();
  const t = useT();
  const [period, setPeriod] = useState<ReportPeriod>(30);

  // Paper is white: print the report with the light palette even in dark mode.
  useEffect(() => {
    const root = document.documentElement;
    let wasDark = false;
    const before = () => {
      wasDark = root.classList.contains('dark');
      root.classList.remove('dark');
    };
    const after = () => {
      if (wasDark) root.classList.add('dark');
    };
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, []);

  const report = useMemo(
    () => buildWorkshopReport(devices, tickets, auditLogs, period, new Date(), t('common.unassigned')),
    [devices, tickets, auditLogs, period, t],
  );

  const hours = (h: number | null) => (h === null ? '—' : t('reports.hoursValue', { hours: h.toLocaleString(LOCALE[lang]) }));
  const percent = (p: number | null) => (p === null ? '—' : `${p}%`);
  const date = (d: Date) => d.toLocaleDateString(LOCALE[lang], { day: '2-digit', month: 'short', year: 'numeric' });
  const periodText = report.range.from
    ? `${date(report.range.from)} – ${date(report.range.to)}`
    : t('reports.periodAll');

  return (
    <div className="space-y-5">
      <div className="no-print">
        <PageHeader
          title={t('reports.title')}
          subtitle={t('reports.subtitle')}
          actions={
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => triggerDownload(datedFilename('devices'), generateDevicesCsv(devices, lang))}
              >
                <FileDown className="h-4 w-4" />
                {t('reports.devicesCsv')}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => triggerDownload(datedFilename('tickets'), generateTicketsCsv(tickets, lang))}
              >
                <FileDown className="h-4 w-4" />
                {t('reports.ticketsCsv')}
              </button>
              <button type="button" className="btn btn-primary" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
                {t('reports.exportPdf')}
              </button>
            </>
          }
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <SegmentedControl<PeriodKey>
            ariaLabel={t('reports.periodLabel')}
            value={toKey(period)}
            onChange={(k) => setPeriod(fromKey(k))}
            options={PERIODS.map((p) => ({ value: toKey(p.value), label: t(p.label) }))}
          />
          <span className="tabular-nums text-xs text-fg-subtle">{periodText}</span>
        </div>
      </div>

      <div id="print-report-area" className="space-y-5">
        {/* Print-only letterhead */}
        <header className="hidden items-start justify-between border-b border-line pb-4 print:flex">
          <div className="flex items-center gap-3">
            <BrandMark className="h-8 w-8" />
            <div>
              <p className="text-lg font-semibold text-fg">{t('reports.printTitle')}</p>
              <p className="tabular-nums text-xs text-fg-muted">{periodText}</p>
            </div>
          </div>
          <p className="tabular-nums text-right text-xs text-fg-muted">
            {t('reports.generatedAt', { date: new Date().toLocaleString(LOCALE[lang]) })}
          </p>
        </header>

        <section
          aria-label={t('reports.summary')}
          className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6 print:grid-cols-3"
        >
          <Stat label={t('reports.ticketsCreated')} value={report.ticketsCreated} />
          <Stat label={t('reports.ticketsResolved')} value={report.ticketsResolved} />
          <Stat
            label={t('reports.slaCompliance')}
            value={percent(report.compliancePct)}
            hint={t('reports.ofResolved', { count: report.ticketsResolved })}
          />
          <Stat label={t('reports.avgResolution')} value={hours(report.avgResolutionHours)} />
          <Stat
            label={t('reports.openNow')}
            value={report.openNow}
            hint={t('reports.overdueNow', { count: report.overdueNow })}
          />
          <Stat
            label={t('reports.handedOver')}
            value={report.devicesHandedOver}
            hint={t('reports.devicesThroughput', {
              registered: report.devicesRegistered,
              readied: report.devicesReadied,
            })}
          />
        </section>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 print:grid-cols-1">
          <Panel
            className="break-inside-avoid lg:col-span-7"
            title={t('reports.slaByPriority')}
            description={t('reports.slaByPriorityHint')}
            bodyClassName="overflow-x-auto"
          >
            <table className="w-full text-sm">
              <thead className="bg-subtle">
                <tr>
                  <th className={th}>{t('common.priority')}</th>
                  <th className={`${th} text-right`}>{t('sla.target')}</th>
                  <th className={`${th} text-right`}>{t('reports.resolved')}</th>
                  <th className={`${th} text-right`}>{t('reports.withinSla')}</th>
                  <th className={`${th} text-right`}>{t('reports.compliance')}</th>
                  <th className={`${th} text-right`}>{t('reports.avgResolution')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {report.slaByPriority.map((row) => (
                  <tr key={row.priority}>
                    <td className="px-3 py-2 font-medium text-fg">{trTicketPriority(row.priority, lang)}</td>
                    <td className={`${td} text-right text-fg-muted`}>{t('sla.hours', { hours: row.targetHours })}</td>
                    <td className={`${td} text-right`}>{row.resolved}</td>
                    <td className={`${td} text-right`}>{row.met}</td>
                    <td
                      className={`${td} text-right font-semibold ${
                        row.compliancePct === null
                          ? 'text-fg-subtle'
                          : row.compliancePct >= 90
                            ? 'text-success-fg'
                            : row.compliancePct >= 70
                              ? 'text-warning-fg'
                              : 'text-danger-fg'
                      }`}
                    >
                      {percent(row.compliancePct)}
                    </td>
                    <td className={`${td} text-right text-fg-muted`}>{hours(row.avgResolutionHours)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <Panel
            className="break-inside-avoid lg:col-span-5"
            title={t('reports.ticketsByCategory')}
            description={t('reports.createdInPeriod')}
          >
            <BarList
              rows={report.ticketsByCategory.map((c, i) => ({
                key: c.category,
                label: trTicketCategory(c.category, lang),
                value: c.count,
                color: chartVar(([1, 6, 2, 3] as const)[i % 4]),
              }))}
            />
          </Panel>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 print:grid-cols-1">
          <Panel
            className="break-inside-avoid lg:col-span-7"
            title={t('reports.workload')}
            description={t('reports.workloadHint')}
            bodyClassName="overflow-x-auto"
          >
            {report.workload.length === 0 ? (
              <p className="p-5 text-sm text-fg-subtle">{t('reports.noTickets')}</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-subtle">
                  <tr>
                    <th className={th}>{t('common.assignee')}</th>
                    <th className={`${th} text-right`}>{t('reports.openTickets')}</th>
                    <th className={`${th} text-right`}>{t('reports.resolved')}</th>
                    <th className={`${th} text-right`}>{t('reports.avgResolution')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle">
                  {report.workload.map((row) => (
                    <tr key={row.assignee}>
                      <td className="px-3 py-2 font-medium text-fg">{row.assignee}</td>
                      <td className={`${td} text-right`}>{row.open}</td>
                      <td className={`${td} text-right`}>{row.resolved}</td>
                      <td className={`${td} text-right text-fg-muted`}>{hours(row.avgResolutionHours)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          <Panel
            className="break-inside-avoid lg:col-span-5"
            title={t('reports.fleet')}
            description={t('reports.fleetHint', { count: devices.length })}
          >
            <BarList
              rows={report.fleetByStatus.map((s) => ({
                key: s.status,
                label: trDeviceStatus(s.status, lang),
                value: s.count,
                color: STATUS_COLORS[s.status],
              }))}
            />
            <div className="my-4 h-px bg-line-subtle" />
            <BarList
              rows={report.fleetByType.map((ty) => ({
                key: ty.type,
                label: trDeviceType(ty.type, lang),
                value: ty.count,
                color: TYPE_COLORS[ty.type],
              }))}
            />
          </Panel>
        </div>
      </div>
    </div>
  );
}
