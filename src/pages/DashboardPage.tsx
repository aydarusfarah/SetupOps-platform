import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Laptop,
  Wrench,
  CheckCircle2,
  Ticket as TicketIcon,
  Database,
  ArrowRight,
  ClipboardList,
  History,
  Plus,
  PackageCheck,
  UserCheck,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { useWorkshopData } from '../hooks/useWorkshopData';
import { useToast } from '../hooks/useToast';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';
import {
  formatLocaleDate,
  formatLocaleShortDateTime,
  trDeviceStatus,
  trDeviceType,
  trTicketCategory,
  trAuditField,
  trAuditValue,
} from '../i18n/labels';
import {
  formatRelativeAge,
  getChecklistProgress,
  getDashboardSummary,
  getDeviceStatusDistribution,
  getDeviceTypeDistribution,
  getUrgentOpenTickets,
  getWeeklyTicketActivity,
} from '../lib/domain';
import {
  DeviceStatusBadge,
  TicketPriorityBadge,
  TicketStatusBadge,
} from '../components/ui/Badges';
import { SkeletonBar } from '../components/ui/Skeleton';
import type { DeviceStatus, DeviceType } from '../types';
import { useT } from '../i18n';

const STATUS_CHART_COLORS: Record<DeviceStatus, string> = {
  Eingang: '#64748B',
  'In Arbeit': '#1D4ED8',
  Bereit: '#16A34A',
  Ausgegeben: '#0F294A',
  Defekt: '#DC2626',
  Entsorgt: '#94A3B8',
};

const TYPE_CHART_COLORS: Record<DeviceType, string> = {
  Laptop: '#1D4ED8',
  Desktop: '#0EA5E9',
  Monitor: '#16A34A',
  Sonstiges: '#64748B',
};

type BreakdownMode = 'status' | 'type';
type QueueTab = 'tickets' | 'workbench' | 'handover';
type TicketScope = 'all' | 'mine';

interface ActivityTooltipPayloadItem {
  dataKey?: string;
  value?: number;
  name?: string;
  color?: string;
}

function WeeklyActivityTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ActivityTooltipPayloadItem[];
  label?: string;
}) {
  const t = useT();
  if (!active || !payload || payload.length === 0) return null;
  const created = payload.find((p) => p.dataKey === 'created')?.value ?? 0;
  const resolved = payload.find((p) => p.dataKey === 'resolved')?.value ?? 0;

  return (
    <div className="rounded-input border border-line bg-surface px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-fg">{label}</p>
      <div className="mt-1.5 space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-fg-muted">
            <span className="h-2 w-2 rounded-xs bg-primary" />
            {t('dashboard.created')}
          </span>
          <span className="tabular-nums font-semibold text-fg">
            {created}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-fg-muted">
            <span className="h-2 w-2 rounded-xs bg-success" />
            {t('dashboard.resolved')}
          </span>
          <span className="tabular-nums font-semibold text-fg">
            {resolved}
          </span>
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { devices, tickets, auditLogs, currentUser, dataLoading, seedDemoData } =
    useWorkshopData();
  const { showToast } = useToast();
  const { theme } = useTheme();
  const { lang } = useLanguage();
  const t = useT();

  const [seeding, setSeeding] = useState(false);
  const [breakdownMode, setBreakdownMode] = useState<BreakdownMode>('status');
  const [queueTab, setQueueTab] = useState<QueueTab>('tickets');
  const [ticketScope, setTicketScope] = useState<TicketScope>('all');

  const isDark = theme === 'dark';

  const summary = useMemo(
    () => getDashboardSummary(devices, tickets, currentUser?.uid),
    [devices, tickets, currentUser?.uid],
  );

  const statusDistribution = useMemo(() => {
    const total = Math.max(1, devices.length);
    return getDeviceStatusDistribution(devices).map((item) => ({
      key: item.status,
      label: trDeviceStatus(item.status, lang),
      count: item.count,
      percent: Math.round((item.count / total) * 100),
      color: STATUS_CHART_COLORS[item.status],
      to: `/devices?status=${encodeURIComponent(item.status)}`,
    }));
  }, [devices, lang]);

  const typeDistribution = useMemo(() => {
    const total = Math.max(1, devices.length);
    return getDeviceTypeDistribution(devices).map((item) => ({
      key: item.typ,
      label: trDeviceType(item.typ, lang),
      count: item.count,
      percent: Math.round((item.count / total) * 100),
      color: TYPE_CHART_COLORS[item.typ],
      to: `/devices?type=${encodeURIComponent(item.typ)}`,
    }));
  }, [devices, lang]);

  const activeDistribution =
    breakdownMode === 'status' ? statusDistribution : typeDistribution;

  const weeklyActivity = useMemo(
    () => getWeeklyTicketActivity(tickets, 8, new Date(), lang),
    [tickets, lang],
  );

  const weeklyTotals = useMemo(
    () =>
      weeklyActivity.reduce(
        (acc, w) => ({
          created: acc.created + w.created,
          resolved: acc.resolved + w.resolved,
        }),
        { created: 0, resolved: 0 },
      ),
    [weeklyActivity],
  );

  const scopedUrgentTickets = useMemo(() => {
    const base =
      ticketScope === 'mine' && currentUser
        ? tickets.filter((ticket) => ticket.zugewiesenAn === currentUser.uid)
        : tickets;
    return getUrgentOpenTickets(base, 7);
  }, [tickets, ticketScope, currentUser]);

  const incompleteChecklistDevices = useMemo(() => {
    return devices
      .filter((d) => d.status !== 'Entsorgt' && d.status !== 'Ausgegeben')
      .map((d) => ({ device: d, progress: getChecklistProgress(d.checklist) }))
      .filter(({ progress }) => progress.total > 0 && !progress.isComplete)
      .sort((a, b) => b.progress.percent - a.progress.percent)
      .slice(0, 7);
  }, [devices]);

  const readyDevices = useMemo(
    () =>
      devices
        .filter((d) => d.status === 'Bereit')
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 5),
    [devices],
  );

  const recentHandovers = useMemo(
    () =>
      devices
        .filter((d) => d.status === 'Ausgegeben' && d.handover)
        .sort((a, b) =>
          (b.handover?.handedOverAt ?? '').localeCompare(a.handover?.handedOverAt ?? ''),
        )
        .slice(0, 4),
    [devices],
  );

  const recentLogs = useMemo(() => auditLogs.slice(0, 7), [auditLogs]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedDemoData();
      showToast(
        t('dashboard.demoDataLoaded'),
        'success',
        t('dashboard.n12DevicesAnd8Tickets'),
      );
    } catch (err) {
      showToast(
        t('dashboard.failedToLoadDemoData'),
        'error',
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setSeeding(false);
    }
  };

  if (dataLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SkeletonBar className="h-14 w-80" />
          <SkeletonBar className="h-10 w-60" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBar key={i} className="h-32 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <SkeletonBar className="h-76 w-full lg:col-span-7" />
          <SkeletonBar className="h-76 w-full lg:col-span-5" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <SkeletonBar className="h-80 w-full lg:col-span-8" />
          <SkeletonBar className="h-80 w-full lg:col-span-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Executive Page Header */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-balance text-fg">
            {t('dashboard.workshopOperations')}
          </h1>
          <p className="tabular-nums mt-1 text-sm text-fg-muted">
            {t('dashboard.totaldevicesDevicesTrackedOpenticketscountOpen', { totalDevices: summary.totalDevices, openTicketsCount: summary.openTicketsCount, readyCount: summary.readyCount })}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <Link
            to="/devices/new"
            className="inline-flex items-center gap-1.5 rounded-input border border-line bg-surface px-3.5 py-2 text-sm font-medium whitespace-nowrap text-fg shadow-xs transition-colors hover:border-line-strong hover:bg-subtle focus-visible:outline-2 focus-visible:outline-focus"
          >
            <Plus className="h-4 w-4 text-accent" />
            {t('dashboard.registerDevice')}
          </Link>
          <Link
            to="/tickets/new"
            className="inline-flex items-center gap-1.5 rounded-input bg-primary px-3.5 py-2 text-sm font-medium whitespace-nowrap text-white shadow-xs transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <Plus className="h-4 w-4" />
            {t('dashboard.newTicket')}
          </Link>
        </div>
      </header>

      {/* Empty Workshop Prompt */}
      {devices.length === 0 && tickets.length === 0 && (
        <div className="flex flex-col items-start justify-between gap-4 rounded-card border border-primary/35 bg-accent-soft p-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <Database className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <div>
              <h2 className="text-sm font-semibold text-fg">
                {t('dashboard.theWorkshopDatabaseIsCurrently')}
              </h2>
              <p className="mt-0.5 text-sm text-fg-muted">
                {t('dashboard.loadSampleData12Devices')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSeed}
            disabled={seeding}
            className="shrink-0 rounded-input bg-primary px-4 py-2 text-sm font-medium whitespace-nowrap text-white hover:bg-primary-hover disabled:opacity-60"
          >
            {seeding
              ? t('dashboard.loading')
              : t('dashboard.loadDemoData')}
          </button>
        </div>
      )}

      {/* 4-Column Precision KPI Strip */}
      <section
        aria-label={t('dashboard.keyMetrics')}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {/* Total Fleet */}
        <Link
          to="/devices"
          className="group flex flex-col justify-between rounded-card border border-line bg-surface p-5 shadow-xs transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-focus"
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold tracking-wider text-fg-muted uppercase">
                {t('dashboard.totalFleet')}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-input bg-accent-soft text-accent">
                <Laptop className="h-4 w-4" />
              </div>
            </div>
            <div className="tabular-nums mt-3 flex items-baseline justify-between gap-2">
              <span className="text-3xl font-semibold tracking-tight text-fg">
                {summary.totalDevices}
              </span>
              <span className="inline-flex items-center gap-0.5 text-xs font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
                {t('dashboard.inventory')}
                <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {summary.totalDevices > 0 && (
              <div
                aria-hidden="true"
                className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted"
              >
                {statusDistribution.map((item) => (
                  <div
                    key={item.key}
                    style={{
                      width: `${(item.count / summary.totalDevices) * 100}%`,
                      backgroundColor: item.color,
                    }}
                  />
                ))}
              </div>
            )}
            <p className="tabular-nums text-xs text-fg-muted">
              {t('dashboard.intakecountIntakeDefectivecountDefective', { intakeCount: summary.intakeCount, defectiveCount: summary.defectiveCount })}
            </p>
          </div>
        </Link>

        {/* Workbench & Setup */}
        <Link
          to="/devices?status=In%20Arbeit"
          className="group flex flex-col justify-between rounded-card border border-line bg-surface p-5 shadow-xs transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-focus"
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold tracking-wider text-fg-muted uppercase">
                {t('dashboard.onWorkbench')}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-input bg-accent-soft text-accent">
                <Wrench className="h-4 w-4" />
              </div>
            </div>
            <div className="tabular-nums mt-3 flex items-baseline justify-between gap-2">
              <span className="text-3xl font-semibold tracking-tight text-fg">
                {summary.inProgressCount}
              </span>
              <span className="inline-flex items-center gap-0.5 text-xs font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
                {t('dashboard.filter')}
                <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <div
              aria-hidden="true"
              className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-primary transition-all duration-200"
                style={{ width: `${summary.avgChecklistPercent}%` }}
              />
            </div>
            <p className="tabular-nums text-xs text-fg-muted">
              {t('dashboard.avgChecklistProgressAvgchecklistpercent', { avgChecklistPercent: summary.avgChecklistPercent })}
            </p>
          </div>
        </Link>

        {/* Ready for Issue */}
        <Link
          to="/devices?status=Bereit"
          className="group flex flex-col justify-between rounded-card border border-line bg-surface p-5 shadow-xs transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-focus"
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold tracking-wider text-fg-muted uppercase">
                {t('dashboard.readyForIssue')}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-input bg-success-soft text-success-fg">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="tabular-nums mt-3 flex items-baseline justify-between gap-2">
              <span className="text-3xl font-semibold tracking-tight text-fg">
                {summary.readyCount}
              </span>
              <span className="inline-flex items-center gap-0.5 text-xs font-medium text-success-fg opacity-0 transition-opacity group-hover:opacity-100">
                {t('dashboard.handover')}
                <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <div
              aria-hidden="true"
              className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-success transition-all duration-200"
                style={{
                  width: `${
                    summary.totalDevices > 0
                      ? Math.round((summary.readyCount / summary.totalDevices) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
            <p className="tabular-nums text-xs text-fg-muted">
              {t('dashboard.issuedcountHandedOverToStaff', { issuedCount: summary.issuedCount })}
            </p>
          </div>
        </Link>

        {/* Open Ticket Queue */}
        <Link
          to="/tickets?status=open"
          className="group flex flex-col justify-between rounded-card border border-line bg-surface p-5 shadow-xs transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-focus"
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold tracking-wider text-fg-muted uppercase">
                {t('dashboard.openTickets')}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-input bg-warning-soft text-warning-fg">
                <TicketIcon className="h-4 w-4" />
              </div>
            </div>
            <div className="tabular-nums mt-3 flex items-baseline justify-between gap-2">
              <span className="text-3xl font-semibold tracking-tight text-fg">
                {summary.openTicketsCount}
              </span>
              <span className="inline-flex items-center gap-0.5 text-xs font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
                {t('dashboard.queue')}
                <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <div
              aria-hidden="true"
              className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-warning transition-all duration-200"
                style={{
                  width: `${
                    summary.openTicketsCount > 0
                      ? Math.round(
                          (summary.criticalHighTicketsCount / summary.openTicketsCount) * 100,
                        )
                      : 0
                  }%`,
                }}
              />
            </div>
            <p className="tabular-nums text-xs text-fg-muted">
              {t('dashboard.criticalhighticketscountHighCriticalWaitingpartscountWaiting', { criticalHighTicketsCount: summary.criticalHighTicketsCount, waitingPartsCount: summary.waitingPartsCount })}
            </p>
          </div>
        </Link>
      </section>

      {/* 12-Column Analytics Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Ticket Velocity Chart */}
        <section className="rounded-card border border-line bg-surface p-5 shadow-xs lg:col-span-6 xl:col-span-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-fg">
                {t('dashboard.ticketVelocityLast8Weeks')}
              </h2>
              <p className="mt-0.5 text-xs text-fg-subtle">
                {t('dashboard.weeklyIntakeComparedAgainstResolved')}
              </p>
            </div>

            <div className="tabular-nums flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5 text-fg-muted">
                <span className="h-2.5 w-2.5 rounded-xs bg-primary" />
                <span>{t('dashboard.created')}:</span>
                <strong className="font-semibold text-fg">
                  {weeklyTotals.created}
                </strong>
              </div>
              <div className="flex items-center gap-1.5 text-fg-muted">
                <span className="h-2.5 w-2.5 rounded-xs bg-success" />
                <span>{t('dashboard.resolved')}:</span>
                <strong className="font-semibold text-fg">
                  {weeklyTotals.resolved}
                </strong>
              </div>
            </div>
          </div>

          <div className="mt-5 h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weeklyActivity}
                margin={{ top: 6, right: 6, left: -24, bottom: 0 }}
                barGap={4}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={isDark ? '#1E3252' : '#E2EAF5'}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#475569' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#475569' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(29, 78, 216, 0.05)' }}
                  content={<WeeklyActivityTooltip />}
                />
                <Bar
                  dataKey="created"
                  fill={isDark ? '#3B82F6' : '#1D4ED8'}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={18}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="resolved"
                  fill={isDark ? '#22C55E' : '#16A34A'}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={18}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Right: Interactive Hardware Fleet Breakdown */}
        <section className="rounded-card border border-line bg-surface p-5 shadow-xs lg:col-span-6 xl:col-span-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-fg">
              {t('dashboard.fleetBreakdown')}
            </h2>
            <div
              role="group"
              aria-label={t('dashboard.breakdownView')}
              className="flex items-center rounded-input border border-line bg-subtle p-0.5"
            >
              <button
                type="button"
                onClick={() => setBreakdownMode('status')}
                aria-pressed={breakdownMode === 'status'}
                className={`rounded-control px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                  breakdownMode === 'status'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-fg-muted hover:text-fg'
                }`}
              >
                {t('dashboard.byStatus')}
              </button>
              <button
                type="button"
                onClick={() => setBreakdownMode('type')}
                aria-pressed={breakdownMode === 'type'}
                className={`rounded-control px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                  breakdownMode === 'type'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-fg-muted hover:text-fg'
                }`}
              >
                {t('dashboard.byType')}
              </button>
            </div>
          </div>

          {activeDistribution.length === 0 ? (
            <div className="flex h-60 items-center justify-center text-sm text-fg-subtle">
              {t('dashboard.noDeviceDataAvailableYet')}
            </div>
          ) : (
            <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
              <div className="relative h-[172px] w-[172px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={activeDistribution}
                      dataKey="count"
                      nameKey="label"
                      innerRadius={48}
                      outerRadius={68}
                      paddingAngle={2}
                      isAnimationActive={false}
                      stroke="none"
                    >
                      {activeDistribution.map((entry) => (
                        <Cell key={entry.key} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => [
                        t('dashboard.valDevices', { val: String(val ?? '') }),
                        t('dashboard.count'),
                      ]}
                      contentStyle={{
                        borderRadius: '8px',
                        border: isDark ? '1px solid #1E3252' : '1px solid #C8D7EC',
                        backgroundColor: isDark ? '#0F1E36' : '#FFFFFF',
                        color: isDark ? '#F1F5F9' : '#0F172A',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="tabular-nums text-2xl font-semibold tracking-tight text-fg">
                    {devices.length}
                  </span>
                  <span className="text-[11px] font-medium tracking-wider text-fg-subtle uppercase">
                    {t('dashboard.assets')}
                  </span>
                </div>
              </div>

              <ul className="w-full min-w-0 flex-1 divide-y divide-line-subtle">
                {activeDistribution.map((entry) => (
                  <li key={entry.key}>
                    <Link
                      to={entry.to}
                      className="flex items-center justify-between gap-2 rounded-control px-1.5 py-2 text-sm transition-colors hover:bg-muted"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: entry.color }}
                          aria-hidden="true"
                        />
                        <span className="truncate text-fg-muted">
                          {entry.label}
                        </span>
                      </span>
                      <span className="tabular-nums flex shrink-0 items-center gap-2">
                        <span className="text-xs text-fg-subtle">
                          {entry.percent}%
                        </span>
                        <span className="min-w-[1.25rem] text-right font-semibold text-fg">
                          {entry.count}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      {/* 12-Column Technician Action Queue & Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Technician Action Queue */}
        <section className="rounded-card border border-line bg-surface shadow-xs lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-subtle px-5 py-3.5 xl:flex-nowrap">
            <div
              role="tablist"
              aria-label={t('dashboard.technicianQueueViews')}
              className="flex flex-wrap items-center gap-0.5 rounded-input border border-line bg-subtle p-0.5 sm:flex-nowrap"
            >
              <button
                type="button"
                role="tab"
                aria-selected={queueTab === 'tickets'}
                onClick={() => setQueueTab('tickets')}
                className={`inline-flex items-center gap-1.5 rounded-control px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                  queueTab === 'tickets'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-fg-muted hover:text-fg'
                }`}
              >
                <TicketIcon className="h-3.5 w-3.5" />
                <span>{t('dashboard.tickets')}</span>
                <span className="tabular-nums opacity-85">({summary.openTicketsCount})</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={queueTab === 'workbench'}
                onClick={() => setQueueTab('workbench')}
                className={`inline-flex items-center gap-1.5 rounded-control px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                  queueTab === 'workbench'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-fg-muted hover:text-fg'
                }`}
              >
                <ClipboardList className="h-3.5 w-3.5" />
                <span>{t('dashboard.workbench')}</span>
                <span className="tabular-nums opacity-85">({incompleteChecklistDevices.length})</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={queueTab === 'handover'}
                onClick={() => setQueueTab('handover')}
                className={`inline-flex items-center gap-1.5 rounded-control px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                  queueTab === 'handover'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-fg-muted hover:text-fg'
                }`}
              >
                <PackageCheck className="h-3.5 w-3.5" />
                <span>{t('dashboard.handovers')}</span>
                <span className="tabular-nums opacity-85">({summary.readyCount})</span>
              </button>
            </div>

            <div className="flex shrink-0 items-center gap-2.5">
              {queueTab === 'tickets' && (
                <div
                  role="group"
                  aria-label={t('dashboard.ticketScope')}
                  className="flex items-center rounded-input border border-line bg-subtle p-0.5"
                >
                  <button
                    type="button"
                    onClick={() => setTicketScope('all')}
                    aria-pressed={ticketScope === 'all'}
                    className={`rounded-control px-2 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                      ticketScope === 'all'
                        ? 'bg-surface text-fg shadow-xs'
                        : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    {t('dashboard.allOpen')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTicketScope('mine')}
                    aria-pressed={ticketScope === 'mine'}
                    className={`inline-flex items-center gap-1 rounded-control px-2 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                      ticketScope === 'mine'
                        ? 'bg-surface text-accent shadow-xs'
                        : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    <UserCheck className="h-3 w-3" />
                    <span className="tabular-nums">
                      {t('dashboard.mineMyopenticketscount', { myOpenTicketsCount: summary.myOpenTicketsCount })}
                    </span>
                  </button>
                </div>
              )}

              <Link
                to={
                  queueTab === 'tickets'
                    ? ticketScope === 'mine'
                      ? '/tickets?status=open&mine=1'
                      : '/tickets?status=open'
                    : queueTab === 'handover'
                      ? '/devices?status=Bereit'
                      : '/devices'
                }
                className="inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap text-accent hover:underline"
              >
                {t('dashboard.viewAll')}
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          <div className="p-5">
            {queueTab === 'tickets' && (
              <>
                {scopedUrgentTickets.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm font-medium text-fg">
                      {ticketScope === 'mine'
                        ? t('dashboard.noOpenTicketsAssignedTo')
                        : t('dashboard.noOpenTicketsInThe')}
                    </p>
                    <Link
                      to="/tickets/new"
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {t('common.createTicket')}
                    </Link>
                  </div>
                ) : (
                  <ul className="divide-y divide-line-subtle">
                    {scopedUrgentTickets.map((ticket) => (
                      <li key={ticket.id} className="py-3 first:pt-0 last:pb-0">
                        <Link
                          to={`/tickets/${ticket.id}`}
                          className="group flex flex-col justify-between gap-2 rounded-control py-0.5 transition-colors sm:flex-row sm:items-center focus-visible:outline-2 focus-visible:outline-focus"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                              <span className="font-mono-code font-semibold text-accent">
                                {ticket.ticketNr}
                              </span>
                              <span className="text-fg-subtle">·</span>
                              <span className="font-mono-code text-fg-muted">
                                {ticket.deviceAssetTag}
                              </span>
                              <span className="truncate text-fg-subtle">
                                {ticket.deviceModel}
                              </span>
                            </div>
                            <p className="mt-1 truncate text-sm font-medium text-fg group-hover:text-accent">
                              {ticket.titel}
                            </p>
                            <p className="tabular-nums mt-0.5 text-xs text-fg-subtle">
                              {trTicketCategory(ticket.kategorie, lang)} ·{' '}
                              {ticket.zugewiesenAnName ||
                                (t('common.unassigned'))}{' '}
                              · {formatRelativeAge(ticket.createdAt, new Date(), lang)}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <TicketPriorityBadge priority={ticket.prioritaet} />
                            <TicketStatusBadge status={ticket.status} />
                            <ChevronRight className="hidden h-4 w-4 text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-accent sm:block" />
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {queueTab === 'workbench' && (
              <>
                {incompleteChecklistDevices.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm font-medium text-fg">
                      {t('dashboard.allActiveDevicesHaveCompleted')}
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-line-subtle">
                    {incompleteChecklistDevices.map(({ device, progress }) => (
                      <li key={device.id} className="py-3 first:pt-0 last:pb-0">
                        <Link
                          to={`/devices/${device.id}?tab=checklist`}
                          className="group flex flex-col justify-between gap-3 rounded-control py-0.5 sm:flex-row sm:items-center focus-visible:outline-2 focus-visible:outline-focus"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono-code text-xs font-semibold text-accent">
                                {device.assetTag}
                              </span>
                              <span className="truncate text-sm font-medium text-fg group-hover:text-accent">
                                {device.hersteller} {device.modell}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-fg-subtle">
                              {trDeviceType(device.typ, lang)} · {device.standort}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-3">
                            <DeviceStatusBadge status={device.status} />
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-primary"
                                  style={{ width: `${progress.percent}%` }}
                                />
                              </div>
                              <span className="tabular-nums w-10 text-right text-xs font-medium text-fg-muted">
                                {progress.done}/{progress.total}
                              </span>
                            </div>
                            <ChevronRight className="hidden h-4 w-4 text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-accent sm:block" />
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {queueTab === 'handover' && (
              <div className="space-y-5">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-xs font-semibold tracking-wider text-fg-muted uppercase">
                      {t('dashboard.readyForPickup')}
                    </h3>
                    <span className="tabular-nums text-xs text-fg-subtle">
                      {readyDevices.length}
                    </span>
                  </div>
                  {readyDevices.length === 0 ? (
                    <p className="py-4 text-sm text-fg-subtle">
                      {t('dashboard.noDevicesAreCurrentlyStaged')}
                    </p>
                  ) : (
                    <ul className="divide-y divide-line-subtle">
                      {readyDevices.map((d) => {
                        const prog = getChecklistProgress(d.checklist);
                        return (
                          <li key={d.id} className="py-2.5 first:pt-0 last:pb-0">
                            <Link
                              to={`/devices/${d.id}`}
                              className="group flex items-center justify-between gap-3 rounded-control focus-visible:outline-2 focus-visible:outline-focus"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono-code text-xs font-semibold text-accent">
                                    {d.assetTag}
                                  </span>
                                  <span className="truncate text-sm font-medium text-fg group-hover:text-accent">
                                    {d.hersteller} {d.modell}
                                  </span>
                                </div>
                                <p className="tabular-nums mt-0.5 text-xs text-fg-subtle">
                                  {d.standort} · {t('dashboard.checklist')}{' '}
                                  {prog.done}/{prog.total}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <DeviceStatusBadge status={d.status} />
                                <ChevronRight className="h-4 w-4 text-fg-subtle group-hover:text-accent" />
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {recentHandovers.length > 0 && (
                  <div className="border-t border-line-subtle pt-4">
                    <h3 className="mb-2 text-xs font-semibold tracking-wider text-fg-muted uppercase">
                      {t('dashboard.recentlyHandedOver')}
                    </h3>
                    <ul className="divide-y divide-line-subtle">
                      {recentHandovers.map((d) => (
                        <li key={d.id} className="py-2.5 first:pt-0 last:pb-0">
                          <Link
                            to={`/devices/${d.id}`}
                            className="group flex items-center justify-between gap-3 rounded-control"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono-code text-xs font-semibold text-accent">
                                  {d.assetTag}
                                </span>
                                <span className="truncate text-sm font-medium text-fg group-hover:text-accent">
                                  {d.handover?.recipientName}
                                </span>
                                {d.handover?.department && (
                                  <span className="truncate text-xs text-fg-subtle">
                                    · {d.handover.department}
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 truncate text-xs text-fg-subtle">
                                {d.hersteller} {d.modell}
                              </p>
                            </div>
                            <span className="tabular-nums shrink-0 text-xs text-fg-subtle">
                              {d.handover?.handedOverAt
                                ? formatLocaleDate(d.handover.handedOverAt, lang)
                                : '—'}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Right: Recent Workshop Activity */}
        <section className="rounded-card border border-line bg-surface shadow-xs lg:col-span-4">
          <div className="flex items-center justify-between border-b border-line-subtle px-5 py-4">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-accent" />
              <h2 className="text-base font-semibold text-fg">
                {t('dashboard.recentActivity')}
              </h2>
            </div>
            <span className="tabular-nums text-xs text-fg-subtle">
              {recentLogs.length}
            </span>
          </div>

          <div className="p-5">
            {recentLogs.length === 0 ? (
              <p className="py-8 text-center text-sm text-fg-subtle">
                {t('dashboard.noActivityRecordedYet')}
              </p>
            ) : (
              <ul className="divide-y divide-line-subtle">
                {recentLogs.map((log) => (
                  <li key={log.id} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <Link
                        to={
                          log.entityType === 'device'
                            ? `/devices/${log.entityId}`
                            : `/tickets/${log.entityId}`
                        }
                        className="font-mono-code font-semibold text-accent hover:underline"
                      >
                        {log.entityLabel}
                      </Link>
                      <span className="tabular-nums text-fg-subtle">
                        {formatLocaleShortDateTime(log.timestamp, lang)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-fg">
                      <span className="font-medium">{trAuditField(log.field, lang)}:</span>{' '}
                      <span className="text-fg-muted">{trAuditValue(log.oldValue, lang)}</span> →{' '}
                      <span>{trAuditValue(log.newValue, lang)}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-fg-subtle">
                      {log.userName}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
