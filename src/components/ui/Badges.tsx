import { useLanguage } from '../../hooks/useLanguage';
import { trDeviceStatus, trTicketPriority, trTicketStatus } from '../../i18n/labels';
import type { DeviceStatus, Ticket, TicketPriority, TicketStatus } from '../../types';
import { useT } from '../../i18n';
import { formatLocaleShortDateTime } from '../../i18n/labels';
import { formatDuration, getTicketSla, type SlaState } from '../../lib/sla';

interface BadgeTone {
  bg: string;
  text: string;
  border: string;
  dot: string;
}

const TONES: Record<'success' | 'warning' | 'danger' | 'info' | 'neutral', BadgeTone> = {
  success: {
    bg: 'bg-success/10',
    text: 'text-success-fg',
    border: 'border-success/25',
    dot: 'bg-success',
  },
  warning: {
    bg: 'bg-warning/10',
    text: 'text-warning-fg',
    border: 'border-warning/25',
    dot: 'bg-warning',
  },
  danger: {
    bg: 'bg-danger/10',
    text: 'text-danger-fg',
    border: 'border-danger/25',
    dot: 'bg-danger',
  },
  info: {
    bg: 'bg-primary/10',
    text: 'text-accent',
    border: 'border-primary/25',
    dot: 'bg-primary',
  },
  neutral: {
    bg: 'bg-neutral/10',
    text: 'text-fg-muted',
    border: 'border-neutral/20',
    dot: 'bg-neutral',
  },
};

function StatusChip({ tone, label, title }: { tone: BadgeTone; label: string; title?: string }) {
  return (
    <span
      title={title}
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-control border px-1.5 py-0.5 text-xs font-medium ${tone.bg} ${tone.text} ${tone.border}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

const DEVICE_STATUS_TONE: Record<DeviceStatus, keyof typeof TONES> = {
  Eingang: 'neutral',
  'In Arbeit': 'info',
  Bereit: 'success',
  Ausgegeben: 'neutral',
  Defekt: 'danger',
  Entsorgt: 'neutral',
};

export function DeviceStatusBadge({ status }: { status: DeviceStatus }) {
  const { lang } = useLanguage();
  return <StatusChip tone={TONES[DEVICE_STATUS_TONE[status]]} label={trDeviceStatus(status, lang)} />;
}

const TICKET_STATUS_TONE: Record<TicketStatus, keyof typeof TONES> = {
  Offen: 'danger',
  'In Bearbeitung': 'info',
  'Wartet auf Teile': 'warning',
  Gelöst: 'success',
  Geschlossen: 'neutral',
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const { lang } = useLanguage();
  return <StatusChip tone={TONES[TICKET_STATUS_TONE[status]]} label={trTicketStatus(status, lang)} />;
}

const PRIORITY_TONE: Record<TicketPriority, keyof typeof TONES> = {
  Niedrig: 'neutral',
  Mittel: 'info',
  Hoch: 'warning',
  Kritisch: 'danger',
};

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  const { lang } = useLanguage();
  return <StatusChip tone={TONES[PRIORITY_TONE[priority]]} label={trTicketPriority(priority, lang)} />;
}

const SLA_TONE: Record<SlaState, keyof typeof TONES> = {
  overdue: 'danger',
  atRisk: 'warning',
  onTrack: 'neutral',
  paused: 'neutral',
  met: 'success',
  breached: 'danger',
};

/**
 * SLA indicator for a ticket. `compact` hides the calm states (on track / met)
 * so list views only draw attention where it is needed.
 */
export function SlaBadge({
  ticket,
  compact = false,
  now,
}: {
  ticket: Pick<Ticket, 'prioritaet' | 'status' | 'createdAt' | 'closedAt' | 'updatedAt'>;
  compact?: boolean;
  now?: Date;
}) {
  const t = useT();
  const { lang } = useLanguage();
  const sla = getTicketSla(ticket, now);
  if (compact && (sla.state === 'onTrack' || sla.state === 'met')) return null;

  const duration = formatDuration(sla.remainingMs);
  const label =
    sla.state === 'overdue'
      ? t('sla.overdueBy', { duration })
      : sla.state === 'atRisk' || sla.state === 'onTrack'
        ? t('sla.dueIn', { duration })
        : sla.state === 'paused'
          ? t('sla.paused')
          : sla.state === 'met'
            ? t('sla.met')
            : t('sla.breached');

  return (
    <StatusChip
      tone={TONES[SLA_TONE[sla.state]]}
      label={label}
      title={t('sla.dueAt', { date: formatLocaleShortDateTime(sla.dueAt, lang) })}
    />
  );
}
