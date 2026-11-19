import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight, ClipboardList, PackageCheck, Plus, Ticket as TicketIcon, UserCheck } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { useT } from '../../i18n';
import { formatLocaleDate, trDeviceType, trTicketCategory } from '../../i18n/labels';
import { formatRelativeAge, getChecklistProgress, getUrgentOpenTickets, isTicketOpen } from '../../lib/domain';
import type { AppUser, Device, Ticket } from '../../types';
import { DeviceStatusBadge, SlaBadge, TicketPriorityBadge, TicketStatusBadge } from '../ui/Badges';
import { Panel } from '../ui/Panel';
import { SegmentedControl } from '../ui/SegmentedControl';

type QueueTab = 'tickets' | 'workbench' | 'handover';
type TicketScope = 'all' | 'mine';

function EmptyRow({ children }: { children: ReactNode }) {
  return <p className="py-10 text-center text-sm text-fg-subtle">{children}</p>;
}

function Row({ to, children }: { to: string; children: ReactNode }) {
  return (
    <li>
      <Link
        to={to}
        className="group -mx-5 flex flex-col justify-between gap-2 px-5 py-3 transition-colors hover:bg-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus sm:flex-row sm:items-center"
      >
        {children}
      </Link>
    </li>
  );
}

const rowChevron = (
  <ChevronRight className="hidden h-4 w-4 text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-accent sm:block" />
);

/** Technician work queue: urgent tickets, unfinished setups, devices ready for handover. */
export function ActionQueue({
  devices,
  tickets,
  currentUser,
  className = '',
}: {
  devices: Device[];
  tickets: Ticket[];
  currentUser: AppUser | null;
  className?: string;
}) {
  const t = useT();
  const { lang } = useLanguage();
  const [tab, setTab] = useState<QueueTab>('tickets');
  const [scope, setScope] = useState<TicketScope>('all');

  const openTickets = useMemo(() => tickets.filter((tk) => isTicketOpen(tk.status)), [tickets]);
  const myOpenCount = useMemo(
    () => openTickets.filter((tk) => currentUser && tk.zugewiesenAn === currentUser.uid).length,
    [openTickets, currentUser],
  );
  const scopedTickets = useMemo(() => {
    const base = scope === 'mine' && currentUser ? tickets.filter((tk) => tk.zugewiesenAn === currentUser.uid) : tickets;
    return getUrgentOpenTickets(base, 7);
  }, [tickets, scope, currentUser]);

  const workbench = useMemo(
    () =>
      devices
        .filter((d) => d.status !== 'Entsorgt' && d.status !== 'Ausgegeben')
        .map((d) => ({ device: d, progress: getChecklistProgress(d.checklist) }))
        .filter(({ progress }) => progress.total > 0 && !progress.isComplete)
        .sort((a, b) => b.progress.percent - a.progress.percent)
        .slice(0, 7),
    [devices],
  );

  const ready = useMemo(
    () => devices.filter((d) => d.status === 'Bereit').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [devices],
  );
  const recentHandovers = useMemo(
    () =>
      devices
        .filter((d) => d.status === 'Ausgegeben' && d.handover)
        .sort((a, b) => (b.handover?.handedOverAt ?? '').localeCompare(a.handover?.handedOverAt ?? ''))
        .slice(0, 4),
    [devices],
  );

  const viewAllHref =
    tab === 'tickets'
      ? scope === 'mine'
        ? '/tickets?status=open&mine=1'
        : '/tickets?status=open'
      : tab === 'handover'
        ? '/devices?status=Bereit'
        : '/devices';

  return (
    <Panel
      className={className}
      bodyClassName="px-5 py-1"
      title={
        <SegmentedControl<QueueTab>
          variant="tabs"
          ariaLabel={t('dashboard.technicianQueueViews')}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'tickets', label: t('dashboard.tickets'), icon: <TicketIcon className="h-3.5 w-3.5" />, count: openTickets.length },
            { value: 'workbench', label: t('dashboard.workbench'), icon: <ClipboardList className="h-3.5 w-3.5" />, count: workbench.length },
            { value: 'handover', label: t('dashboard.handovers'), icon: <PackageCheck className="h-3.5 w-3.5" />, count: ready.length },
          ]}
        />
      }
      actions={
        <>
          {tab === 'tickets' && (
            <SegmentedControl<TicketScope>
              ariaLabel={t('dashboard.ticketScope')}
              value={scope}
              onChange={setScope}
              options={[
                { value: 'all', label: t('dashboard.allOpen') },
                {
                  value: 'mine',
                  label: t('dashboard.mineMyopenticketscount', { myOpenTicketsCount: myOpenCount }),
                  icon: <UserCheck className="h-3 w-3" />,
                },
              ]}
            />
          )}
          <Link to={viewAllHref} className="inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap text-accent hover:underline">
            {t('dashboard.viewAll')}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </>
      }
    >
      {tab === 'tickets' &&
        (scopedTickets.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-fg-subtle">
              {scope === 'mine' ? t('dashboard.noOpenTicketsAssignedTo') : t('dashboard.noOpenTicketsInThe')}
            </p>
            <Link to="/tickets/new" className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline">
              <Plus className="h-3.5 w-3.5" />
              {t('common.createTicket')}
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-line-subtle">
            {scopedTickets.map((ticket) => (
              <Row key={ticket.id} to={`/tickets/${ticket.id}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                    <span className="font-mono-code font-semibold text-accent">{ticket.ticketNr}</span>
                    <span className="font-mono-code text-fg-muted">{ticket.deviceAssetTag}</span>
                    <span className="truncate text-fg-subtle">{ticket.deviceModel}</span>
                  </div>
                  <p className="mt-1 truncate text-sm font-medium text-fg group-hover:text-accent">{ticket.titel}</p>
                  <p className="tabular-nums mt-0.5 text-xs text-fg-subtle">
                    {trTicketCategory(ticket.kategorie, lang)} · {ticket.zugewiesenAnName || t('common.unassigned')} ·{' '}
                    {formatRelativeAge(ticket.createdAt, new Date(), lang)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <SlaBadge ticket={ticket} compact />
                  <TicketPriorityBadge priority={ticket.prioritaet} />
                  <TicketStatusBadge status={ticket.status} />
                  {rowChevron}
                </div>
              </Row>
            ))}
          </ul>
        ))}

      {tab === 'workbench' &&
        (workbench.length === 0 ? (
          <EmptyRow>{t('dashboard.allActiveDevicesHaveCompleted')}</EmptyRow>
        ) : (
          <ul className="divide-y divide-line-subtle">
            {workbench.map(({ device, progress }) => (
              <Row key={device.id} to={`/devices/${device.id}?tab=checklist`}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono-code text-xs font-semibold text-accent">{device.assetTag}</span>
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
                  <div className="flex items-center gap-2" title={`${progress.percent}%`}>
                    <div className="h-1 w-20 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${progress.percent}%` }} />
                    </div>
                    <span className="tabular-nums w-10 text-right text-xs font-medium text-fg-muted">
                      {progress.done}/{progress.total}
                    </span>
                  </div>
                  {rowChevron}
                </div>
              </Row>
            ))}
          </ul>
        ))}

      {tab === 'handover' && (
        <div className="py-3">
          <h3 className="mb-1 text-xs font-semibold text-fg-muted">
            {t('dashboard.readyForPickup')} <span className="tabular-nums font-normal text-fg-subtle">({ready.length})</span>
          </h3>
          {ready.length === 0 ? (
            <EmptyRow>{t('dashboard.noDevicesAreCurrentlyStaged')}</EmptyRow>
          ) : (
            <ul className="divide-y divide-line-subtle">
              {ready.slice(0, 5).map((d) => {
                const prog = getChecklistProgress(d.checklist);
                return (
                  <Row key={d.id} to={`/devices/${d.id}`}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono-code text-xs font-semibold text-accent">{d.assetTag}</span>
                        <span className="truncate text-sm font-medium text-fg group-hover:text-accent">
                          {d.hersteller} {d.modell}
                        </span>
                      </div>
                      <p className="tabular-nums mt-0.5 text-xs text-fg-subtle">
                        {d.standort} · {t('dashboard.checklist')} {prog.done}/{prog.total}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <DeviceStatusBadge status={d.status} />
                      {rowChevron}
                    </div>
                  </Row>
                );
              })}
            </ul>
          )}

          {recentHandovers.length > 0 && (
            <>
              <h3 className="mt-4 mb-1 border-t border-line-subtle pt-4 text-xs font-semibold text-fg-muted">
                {t('dashboard.recentlyHandedOver')}
              </h3>
              <ul className="divide-y divide-line-subtle">
                {recentHandovers.map((d) => (
                  <Row key={d.id} to={`/devices/${d.id}`}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono-code text-xs font-semibold text-accent">{d.assetTag}</span>
                        <span className="truncate text-sm font-medium text-fg group-hover:text-accent">
                          {d.handover?.recipientName}
                        </span>
                        {d.handover?.department && (
                          <span className="truncate text-xs text-fg-subtle">· {d.handover.department}</span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-fg-subtle">
                        {d.hersteller} {d.modell}
                      </p>
                    </div>
                    <span className="tabular-nums shrink-0 text-xs text-fg-subtle">
                      {d.handover?.handedOverAt ? formatLocaleDate(d.handover.handedOverAt, lang) : '—'}
                    </span>
                  </Row>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </Panel>
  );
}
