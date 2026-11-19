import type { Ticket, TicketPriority } from '../types';

/**
 * Service-level targets: maximum time from ticket creation to resolution.
 * Wall-clock hours; "Waiting for parts" pauses the open-ticket indicator
 * because the delay is outside the workshop's control.
 */
export const SLA_TARGET_HOURS: Record<TicketPriority, number> = {
  Kritisch: 8,
  Hoch: 24,
  Mittel: 72,
  Niedrig: 168,
};

/** Share of the SLA window left at which an open ticket counts as "at risk". */
export const SLA_AT_RISK_REMAINING = 0.25;

export type SlaState = 'onTrack' | 'atRisk' | 'overdue' | 'paused' | 'met' | 'breached';

export interface TicketSla {
  state: SlaState;
  dueAt: string;
  /** Positive = time left, negative = time past due (open tickets only, else 0). */
  remainingMs: number;
  /** Portion of the SLA window used, 0..∞ (1 = exactly at due). */
  elapsedRatio: number;
  /** Resolution time for closed tickets, else null. */
  resolutionMs: number | null;
}

const HOUR = 3_600_000;

const isResolved = (status: Ticket['status']) => status === 'Gelöst' || status === 'Geschlossen';

export function getTicketSla(
  ticket: Pick<Ticket, 'prioritaet' | 'status' | 'createdAt' | 'closedAt' | 'updatedAt'>,
  now: Date = new Date(),
): TicketSla {
  const created = new Date(ticket.createdAt).getTime();
  const windowMs = SLA_TARGET_HOURS[ticket.prioritaet] * HOUR;
  const due = created + windowMs;
  const dueAt = new Date(due).toISOString();

  if (isResolved(ticket.status)) {
    const resolvedAt = new Date(ticket.closedAt ?? ticket.updatedAt).getTime();
    const resolutionMs = Math.max(0, resolvedAt - created);
    return {
      state: resolvedAt <= due ? 'met' : 'breached',
      dueAt,
      remainingMs: 0,
      elapsedRatio: resolutionMs / windowMs,
      resolutionMs,
    };
  }

  const remainingMs = due - now.getTime();
  const elapsedRatio = Math.max(0, now.getTime() - created) / windowMs;
  let state: SlaState;
  if (ticket.status === 'Wartet auf Teile') state = 'paused';
  else if (remainingMs < 0) state = 'overdue';
  else if (remainingMs <= windowMs * SLA_AT_RISK_REMAINING) state = 'atRisk';
  else state = 'onTrack';

  return { state, dueAt, remainingMs, elapsedRatio, resolutionMs: null };
}

export interface SlaSummary {
  open: number;
  overdue: number;
  atRisk: number;
  paused: number;
  resolved: number;
  met: number;
  /** % of resolved tickets closed within SLA; null when nothing is resolved yet. */
  compliancePct: number | null;
  /** Mean creation→resolution time in hours; null when nothing is resolved yet. */
  avgResolutionHours: number | null;
}

export function getSlaSummary(tickets: Ticket[], now: Date = new Date()): SlaSummary {
  const s: SlaSummary = {
    open: 0,
    overdue: 0,
    atRisk: 0,
    paused: 0,
    resolved: 0,
    met: 0,
    compliancePct: null,
    avgResolutionHours: null,
  };
  let resolutionTotal = 0;
  for (const ticket of tickets) {
    const sla = getTicketSla(ticket, now);
    if (sla.resolutionMs === null) {
      s.open += 1;
      if (sla.state === 'overdue') s.overdue += 1;
      if (sla.state === 'atRisk') s.atRisk += 1;
      if (sla.state === 'paused') s.paused += 1;
    } else {
      s.resolved += 1;
      resolutionTotal += sla.resolutionMs;
      if (sla.state === 'met') s.met += 1;
    }
  }
  if (s.resolved > 0) {
    s.compliancePct = Math.round((s.met / s.resolved) * 100);
    s.avgResolutionHours = Math.round((resolutionTotal / s.resolved / HOUR) * 10) / 10;
  }
  return s;
}

/** Compact duration such as "45m", "5h 20m", "3d 4h". */
export function formatDuration(ms: number): string {
  const abs = Math.abs(ms);
  const minutes = Math.floor(abs / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return minutes % 60 ? `${hours}h ${minutes % 60}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return hours % 24 ? `${days}d ${hours % 24}h` : `${days}d`;
}

/** Open tickets ordered by urgency: overdue first (most overdue on top), then least time left. */
export function sortBySlaUrgency<T extends Ticket>(tickets: T[], now: Date = new Date()): T[] {
  const rank: Record<SlaState, number> = { overdue: 0, atRisk: 1, onTrack: 2, paused: 3, breached: 4, met: 5 };
  return tickets
    .map((ticket) => ({ ticket, sla: getTicketSla(ticket, now) }))
    .sort((a, b) => rank[a.sla.state] - rank[b.sla.state] || a.sla.remainingMs - b.sla.remainingMs)
    .map(({ ticket }) => ticket);
}
