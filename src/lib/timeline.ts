import type { AuditLogEntry, Ticket } from '../types';

export type TimelineKind =
  | 'registered'
  | 'status'
  | 'handover'
  | 'return'
  | 'checklist'
  | 'edit'
  | 'ticketOpened'
  | 'ticketResolved';

export type TimelineFilter = 'all' | 'lifecycle' | 'checklist' | 'tickets';

export const TIMELINE_FILTER_KINDS: Record<Exclude<TimelineFilter, 'all'>, TimelineKind[]> = {
  lifecycle: ['registered', 'status', 'handover', 'return', 'edit'],
  checklist: ['checklist'],
  tickets: ['ticketOpened', 'ticketResolved'],
};

export interface TimelineEvent {
  id: string;
  kind: TimelineKind;
  timestamp: string;
  /** Audit field (German canonical) or ticket title. */
  title: string;
  oldValue?: string;
  newValue?: string;
  actor?: string;
  /** Link target for ticket events. */
  ticketId?: string;
  ticketNr?: string;
}

/** Classifies a persisted (German) audit entry. */
export function classifyAuditField(field: string): TimelineKind {
  if (field.startsWith('Gerät erfasst')) return 'registered';
  if (field === 'Status') return 'status';
  if (field === 'Übergabe') return 'handover';
  if (field === 'Rücknahme') return 'return';
  if (field.startsWith('Checkliste') || field === 'Checklisten-Vorlage') return 'checklist';
  return 'edit';
}

/**
 * Merges a device's audit log with its tickets into one newest-first timeline.
 * Audit entries for other entities are ignored.
 */
export function buildDeviceTimeline(deviceId: string, logs: AuditLogEntry[], tickets: Ticket[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const log of logs) {
    if (log.entityType !== 'device' || log.entityId !== deviceId) continue;
    events.push({
      id: `log:${log.id}`,
      kind: classifyAuditField(log.field),
      timestamp: log.timestamp,
      title: log.field,
      oldValue: log.oldValue,
      newValue: log.newValue,
      actor: log.userName,
    });
  }

  for (const ticket of tickets) {
    if (ticket.deviceId !== deviceId) continue;
    events.push({
      id: `ticket-open:${ticket.id}`,
      kind: 'ticketOpened',
      timestamp: ticket.createdAt,
      title: ticket.titel,
      ticketId: ticket.id,
      ticketNr: ticket.ticketNr,
    });
    if (ticket.closedAt) {
      events.push({
        id: `ticket-close:${ticket.id}`,
        kind: 'ticketResolved',
        timestamp: ticket.closedAt,
        title: ticket.titel,
        ticketId: ticket.id,
        ticketNr: ticket.ticketNr,
        actor: ticket.zugewiesenAnName ?? undefined,
      });
    }
  }

  return events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function filterTimeline(events: TimelineEvent[], filter: TimelineFilter): TimelineEvent[] {
  if (filter === 'all') return events;
  const kinds = TIMELINE_FILTER_KINDS[filter];
  return events.filter((e) => kinds.includes(e.kind));
}

/** Groups (already sorted) events by local calendar day, preserving order. */
export function groupByDay(events: TimelineEvent[]): Array<{ day: string; events: TimelineEvent[] }> {
  const groups: Array<{ day: string; events: TimelineEvent[] }> = [];
  for (const event of events) {
    const d = new Date(event.timestamp);
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.events.push(event);
    else groups.push({ day, events: [event] });
  }
  return groups;
}
