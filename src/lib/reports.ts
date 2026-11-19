import {
  DEVICE_STATUSES,
  DEVICE_TYPES,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  type AuditLogEntry,
  type Device,
  type DeviceStatus,
  type DeviceType,
  type Ticket,
  type TicketCategory,
  type TicketPriority,
} from '../types';
import { getTicketSla, SLA_TARGET_HOURS } from './sla';

export type ReportPeriod = 30 | 90 | 365 | 'all';

export interface PeriodRange {
  from: Date | null;
  to: Date;
}

export function periodRange(period: ReportPeriod, now: Date = new Date()): PeriodRange {
  if (period === 'all') return { from: null, to: now };
  return { from: new Date(now.getTime() - period * 86_400_000), to: now };
}

const inRange = (iso: string | null | undefined, range: PeriodRange) => {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return (range.from === null || t >= range.from.getTime()) && t <= range.to.getTime();
};

const HOUR = 3_600_000;
const round1 = (n: number) => Math.round(n * 10) / 10;
const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

export interface SlaRow {
  priority: TicketPriority;
  targetHours: number;
  resolved: number;
  met: number;
  compliancePct: number | null;
  avgResolutionHours: number | null;
}

export interface WorkloadRow {
  assignee: string;
  open: number;
  resolved: number;
  avgResolutionHours: number | null;
}

export interface WorkshopReport {
  range: PeriodRange;
  ticketsCreated: number;
  ticketsResolved: number;
  openNow: number;
  overdueNow: number;
  compliancePct: number | null;
  avgResolutionHours: number | null;
  devicesRegistered: number;
  devicesReadied: number;
  devicesHandedOver: number;
  slaByPriority: SlaRow[];
  ticketsByCategory: Array<{ category: TicketCategory; count: number }>;
  workload: WorkloadRow[];
  fleetByStatus: Array<{ status: DeviceStatus; count: number }>;
  fleetByType: Array<{ type: DeviceType; count: number }>;
}

/**
 * Aggregates workshop KPIs for a reporting period. "Created"/"resolved"/
 * throughput figures are period-bound; open, overdue and fleet figures are
 * a snapshot at `now`.
 */
export function buildWorkshopReport(
  devices: Device[],
  tickets: Ticket[],
  auditLogs: AuditLogEntry[],
  period: ReportPeriod,
  now: Date = new Date(),
  unassignedLabel = '—',
): WorkshopReport {
  const range = periodRange(period, now);
  const slas = tickets.map((ticket) => ({ ticket, sla: getTicketSla(ticket, now) }));
  const resolvedInPeriod = slas.filter(({ sla, ticket }) => sla.resolutionMs !== null && inRange(ticket.closedAt ?? ticket.updatedAt, range));
  const open = slas.filter(({ sla }) => sla.resolutionMs === null);

  const slaByPriority: SlaRow[] = TICKET_PRIORITIES.slice()
    .reverse()
    .map((priority) => {
      const rows = resolvedInPeriod.filter(({ ticket }) => ticket.prioritaet === priority);
      const met = rows.filter(({ sla }) => sla.state === 'met').length;
      const mean = avg(rows.map(({ sla }) => (sla.resolutionMs ?? 0) / HOUR));
      return {
        priority,
        targetHours: SLA_TARGET_HOURS[priority],
        resolved: rows.length,
        met,
        compliancePct: rows.length ? Math.round((met / rows.length) * 100) : null,
        avgResolutionHours: mean === null ? null : round1(mean),
      };
    });

  const createdInPeriod = tickets.filter((ticket) => inRange(ticket.createdAt, range));
  const ticketsByCategory = TICKET_CATEGORIES.map((category) => ({
    category,
    count: createdInPeriod.filter((ticket) => ticket.kategorie === category).length,
  })).sort((a, b) => b.count - a.count);

  const assignees = new Map<string, WorkloadRow & { durations: number[] }>();
  const row = (name: string) => {
    if (!assignees.has(name)) assignees.set(name, { assignee: name, open: 0, resolved: 0, avgResolutionHours: null, durations: [] });
    return assignees.get(name)!;
  };
  for (const { ticket } of open) row(ticket.zugewiesenAnName || unassignedLabel).open += 1;
  for (const { ticket, sla } of resolvedInPeriod) {
    const r = row(ticket.zugewiesenAnName || unassignedLabel);
    r.resolved += 1;
    r.durations.push((sla.resolutionMs ?? 0) / HOUR);
  }
  const workload = [...assignees.values()]
    .map(({ durations, ...r }) => {
      const mean = avg(durations);
      return { ...r, avgResolutionHours: mean === null ? null : round1(mean) };
    })
    .sort((a, b) => b.open + b.resolved - (a.open + a.resolved));

  const deviceLogsInPeriod = auditLogs.filter((log) => log.entityType === 'device' && inRange(log.timestamp, range));
  const met = resolvedInPeriod.filter(({ sla }) => sla.state === 'met').length;
  const meanAll = avg(resolvedInPeriod.map(({ sla }) => (sla.resolutionMs ?? 0) / HOUR));

  return {
    range,
    ticketsCreated: createdInPeriod.length,
    ticketsResolved: resolvedInPeriod.length,
    openNow: open.length,
    overdueNow: open.filter(({ sla }) => sla.state === 'overdue').length,
    compliancePct: resolvedInPeriod.length ? Math.round((met / resolvedInPeriod.length) * 100) : null,
    avgResolutionHours: meanAll === null ? null : round1(meanAll),
    devicesRegistered: devices.filter((d) => inRange(d.createdAt, range)).length,
    devicesReadied: deviceLogsInPeriod.filter((log) => log.field === 'Status' && log.newValue === 'Bereit').length,
    devicesHandedOver: devices.filter((d) => inRange(d.handover?.handedOverAt, range)).length,
    slaByPriority,
    ticketsByCategory,
    workload,
    fleetByStatus: DEVICE_STATUSES.map((status) => ({ status, count: devices.filter((d) => d.status === status).length })),
    fleetByType: DEVICE_TYPES.map((type) => ({ type, count: devices.filter((d) => d.typ === type).length })),
  };
}
