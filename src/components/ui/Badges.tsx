import { useLanguage } from '../../hooks/useLanguage';
import { trDeviceStatus, trTicketPriority, trTicketStatus } from '../../i18n/labels';
import type { DeviceStatus, TicketPriority, TicketStatus } from '../../types';

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

function StatusChip({ tone, label }: { tone: BadgeTone; label: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium ${tone.bg} ${tone.text} ${tone.border}`}
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
