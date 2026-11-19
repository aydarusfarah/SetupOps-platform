import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRightLeft,
  CheckCircle2,
  ListChecks,
  PackagePlus,
  Pencil,
  RotateCcw,
  Ticket as TicketIcon,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { LOCALE, useT, type MessageKey } from '../../i18n';
import { trAuditField, trAuditValue } from '../../i18n/labels';
import {
  buildDeviceTimeline,
  filterTimeline,
  groupByDay,
  type TimelineFilter,
  type TimelineKind,
} from '../../lib/timeline';
import type { AuditLogEntry, Ticket } from '../../types';
import { Panel } from '../ui/Panel';
import { SegmentedControl } from '../ui/SegmentedControl';

const KIND_META: Record<TimelineKind, { icon: LucideIcon; tone: string }> = {
  registered: { icon: PackagePlus, tone: 'text-accent bg-accent-soft' },
  status: { icon: ArrowRightLeft, tone: 'text-accent bg-accent-soft' },
  handover: { icon: UserCheck, tone: 'text-success-fg bg-success-soft' },
  return: { icon: RotateCcw, tone: 'text-warning-fg bg-warning-soft' },
  checklist: { icon: ListChecks, tone: 'text-fg-muted bg-muted' },
  edit: { icon: Pencil, tone: 'text-fg-muted bg-muted' },
  ticketOpened: { icon: TicketIcon, tone: 'text-warning-fg bg-warning-soft' },
  ticketResolved: { icon: CheckCircle2, tone: 'text-success-fg bg-success-soft' },
};

const FILTER_LABEL: Record<TimelineFilter, MessageKey> = {
  all: 'timeline.filterAll',
  lifecycle: 'timeline.filterLifecycle',
  checklist: 'timeline.filterChecklist',
  tickets: 'timeline.filterTickets',
};

/** Device life story: audit events and tickets on one day-grouped timeline. */
export function DeviceTimeline({
  deviceId,
  logs,
  tickets,
}: {
  deviceId: string;
  logs: AuditLogEntry[];
  tickets: Ticket[];
}) {
  const t = useT();
  const { lang } = useLanguage();
  const [filter, setFilter] = useState<TimelineFilter>('all');

  const all = useMemo(() => buildDeviceTimeline(deviceId, logs, tickets), [deviceId, logs, tickets]);
  const groups = useMemo(() => groupByDay(filterTimeline(all, filter)), [all, filter]);

  const dayLabel = (day: string) =>
    new Date(`${day}T12:00:00`).toLocaleDateString(LOCALE[lang], {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString(LOCALE[lang], { hour: '2-digit', minute: '2-digit' });

  return (
    <Panel
      title={t('timeline.title')}
      description={t('timeline.subtitle', { count: all.length })}
      actions={
        <SegmentedControl<TimelineFilter>
          ariaLabel={t('timeline.filterLabel')}
          value={filter}
          onChange={setFilter}
          options={(Object.keys(FILTER_LABEL) as TimelineFilter[]).map((value) => ({
            value,
            label: t(FILTER_LABEL[value]),
          }))}
        />
      }
    >
      {groups.length === 0 ? (
        <p className="py-8 text-center text-sm text-fg-subtle">{t('deviceDetail.noHistoryEntriesYet')}</p>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.day} aria-label={dayLabel(group.day)}>
              <h3 className="tabular-nums mb-3 text-xs font-semibold text-fg-muted">{dayLabel(group.day)}</h3>
              <ol className="relative space-y-4 before:absolute before:top-3 before:bottom-3 before:left-[13px] before:w-px before:bg-line-subtle">
                {group.events.map((event) => {
                  const { icon: Icon, tone } = KIND_META[event.kind];
                  const isTicket = event.kind === 'ticketOpened' || event.kind === 'ticketResolved';
                  return (
                    <li key={event.id} className="relative flex gap-3">
                      <span
                        className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-4 ring-surface ${tone}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <p className="text-sm font-medium text-fg">
                            {isTicket ? (
                              <>
                                {event.kind === 'ticketOpened' ? t('timeline.ticketOpened') : t('timeline.ticketResolved')}{' '}
                                <Link
                                  to={`/tickets/${event.ticketId}`}
                                  className="font-mono-code text-accent hover:underline"
                                >
                                  {event.ticketNr}
                                </Link>
                              </>
                            ) : (
                              trAuditField(event.title, lang)
                            )}
                          </p>
                          <time dateTime={event.timestamp} className="tabular-nums text-xs text-fg-subtle">
                            {time(event.timestamp)}
                          </time>
                        </div>
                        {isTicket ? (
                          <p className="mt-0.5 truncate text-sm text-fg-muted">{event.title}</p>
                        ) : (
                          <p className="mt-0.5 text-sm text-fg-muted">
                            {event.oldValue && event.oldValue !== '—' && (
                              <>
                                <span className="line-through decoration-fg-subtle/60">
                                  {trAuditValue(event.oldValue, lang)}
                                </span>{' '}
                                →{' '}
                              </>
                            )}
                            <span className="text-fg">{trAuditValue(event.newValue ?? '', lang)}</span>
                          </p>
                        )}
                        {event.actor && <p className="mt-0.5 text-xs text-fg-subtle">{event.actor}</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </Panel>
  );
}
