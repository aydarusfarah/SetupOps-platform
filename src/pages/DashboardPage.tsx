import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Database, Laptop, Plus, Ticket as TicketIcon, Wrench } from 'lucide-react';
import { useWorkshopData } from '../hooks/useWorkshopData';
import { useToast } from '../hooks/useToast';
import { useLanguage } from '../hooks/useLanguage';
import { useT } from '../i18n';
import { trDeviceStatus, trDeviceType } from '../i18n/labels';
import {
  getDashboardSummary,
  getDeviceStatusDistribution,
  getDeviceTypeDistribution,
  getWeeklyTicketActivity,
} from '../lib/domain';
import { getSlaSummary } from '../lib/sla';
import { SkeletonBar } from '../components/ui/Skeleton';
import { PageHeader } from '../components/ui/Panel';
import { KpiTile } from '../components/dashboard/KpiTile';
import { TicketVelocityChart } from '../components/dashboard/TicketVelocityChart';
import { FleetBreakdown, type BreakdownEntry } from '../components/dashboard/FleetBreakdown';
import { ActionQueue } from '../components/dashboard/ActionQueue';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { STATUS_COLORS, TYPE_COLORS } from '../components/dashboard/chartColors';

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

function DashboardSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-busy="true">
      <SkeletonBar className="h-12 w-80" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBar key={i} className="h-28 w-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <SkeletonBar className="h-76 w-full lg:col-span-7" />
        <SkeletonBar className="h-76 w-full lg:col-span-5" />
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { devices, tickets, auditLogs, currentUser, dataLoading, seedDemoData } = useWorkshopData();
  const { showToast } = useToast();
  const { lang } = useLanguage();
  const t = useT();
  const [seeding, setSeeding] = useState(false);

  const summary = useMemo(
    () => getDashboardSummary(devices, tickets, currentUser?.uid),
    [devices, tickets, currentUser?.uid],
  );

  const byStatus = useMemo<BreakdownEntry[]>(
    () =>
      getDeviceStatusDistribution(devices).map((item) => ({
        key: item.status,
        label: trDeviceStatus(item.status, lang),
        count: item.count,
        percent: pct(item.count, devices.length),
        color: STATUS_COLORS[item.status],
        to: `/devices?status=${encodeURIComponent(item.status)}`,
      })),
    [devices, lang],
  );

  const byType = useMemo<BreakdownEntry[]>(
    () =>
      getDeviceTypeDistribution(devices).map((item) => ({
        key: item.typ,
        label: trDeviceType(item.typ, lang),
        count: item.count,
        percent: pct(item.count, devices.length),
        color: TYPE_COLORS[item.typ],
        to: `/devices?type=${encodeURIComponent(item.typ)}`,
      })),
    [devices, lang],
  );

  const sla = useMemo(() => getSlaSummary(tickets), [tickets]);
  const weeks = useMemo(() => getWeeklyTicketActivity(tickets, 8, new Date(), lang), [tickets, lang]);
  const recentLogs = useMemo(() => auditLogs.slice(0, 7), [auditLogs]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedDemoData();
      showToast(t('dashboard.demoDataLoaded'), 'success', t('dashboard.n12DevicesAnd8Tickets'));
    } catch (err) {
      showToast(t('dashboard.failedToLoadDemoData'), 'error', err instanceof Error ? err.message : undefined);
    } finally {
      setSeeding(false);
    }
  };

  if (dataLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('dashboard.workshopOperations')}
        subtitle={t('dashboard.totaldevicesDevicesTrackedOpenticketscountOpen', {
          totalDevices: summary.totalDevices,
          openTicketsCount: summary.openTicketsCount,
          readyCount: summary.readyCount,
        })}
        actions={
          <>
            <Link to="/devices/new" className="btn btn-secondary">
              <Plus className="h-4 w-4" />
              {t('dashboard.registerDevice')}
            </Link>
            <Link to="/tickets/new" className="btn btn-primary">
              <Plus className="h-4 w-4" />
              {t('dashboard.newTicket')}
            </Link>
          </>
        }
      />

      {devices.length === 0 && tickets.length === 0 && (
        <div className="flex flex-col items-start justify-between gap-4 rounded-card border border-primary/30 bg-accent-soft p-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <Database className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <div>
              <h2 className="text-sm font-semibold text-fg">{t('dashboard.theWorkshopDatabaseIsCurrently')}</h2>
              <p className="mt-0.5 text-sm text-fg-muted">{t('dashboard.loadSampleData12Devices')}</p>
            </div>
          </div>
          <button type="button" onClick={handleSeed} disabled={seeding} className="btn btn-primary shrink-0">
            {seeding ? t('dashboard.loading') : t('dashboard.loadDemoData')}
          </button>
        </div>
      )}

      <section aria-label={t('dashboard.keyMetrics')} className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiTile
          to="/devices"
          label={t('dashboard.totalFleet')}
          value={summary.totalDevices}
          icon={<Laptop className="h-4 w-4" />}
          segments={byStatus.map((s) => ({ key: s.key, value: s.count, color: s.color }))}
          footnote={t('dashboard.intakecountIntakeDefectivecountDefective', {
            intakeCount: summary.intakeCount,
            defectiveCount: summary.defectiveCount,
          })}
          linkHint={t('dashboard.inventory')}
        />
        <KpiTile
          to="/devices?status=In%20Arbeit"
          label={t('dashboard.onWorkbench')}
          value={summary.inProgressCount}
          icon={<Wrench className="h-4 w-4" />}
          percent={summary.avgChecklistPercent}
          footnote={t('dashboard.avgChecklistProgressAvgchecklistpercent', {
            avgChecklistPercent: summary.avgChecklistPercent,
          })}
          linkHint={t('dashboard.filter')}
        />
        <KpiTile
          to="/devices?status=Bereit"
          label={t('dashboard.readyForIssue')}
          value={summary.readyCount}
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="success"
          percent={pct(summary.readyCount, summary.totalDevices)}
          footnote={t('dashboard.issuedcountHandedOverToStaff', { issuedCount: summary.issuedCount })}
          linkHint={t('dashboard.handover')}
        />
        <KpiTile
          to="/tickets?status=open"
          label={t('dashboard.openTickets')}
          value={summary.openTicketsCount}
          icon={<TicketIcon className="h-4 w-4" />}
          tone="warning"
          percent={pct(summary.criticalHighTicketsCount, summary.openTicketsCount)}
          footnote={t('dashboard.openTicketsFootnote', {
            overdue: sla.overdue,
            high: summary.criticalHighTicketsCount,
            waiting: summary.waitingPartsCount,
          })}
          linkHint={t('dashboard.queue')}
        />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <TicketVelocityChart weeks={weeks} className="lg:col-span-7" />
        <FleetBreakdown byStatus={byStatus} byType={byType} total={devices.length} className="lg:col-span-5" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <ActionQueue devices={devices} tickets={tickets} currentUser={currentUser} className="lg:col-span-8" />
        <ActivityFeed logs={recentLogs} className="lg:col-span-4" />
      </div>
    </div>
  );
}
