import {
  DEFAULT_CHECKLIST_TEMPLATES_BY_TYPE,
  type ChecklistItem,
  type Device,
  type DeviceFormInput,
  type DeviceStatus,
  type DeviceType,
  type Ticket,
  type TicketFormInput,
  type TicketPriority,
  type WorkspaceSettings,
} from '../types';
import { getTranslator, LOCALE } from '../i18n';

export function formatAssetTag(seq: number): string {
  const safe = Math.max(1, Math.floor(seq));
  return `WH-${String(safe).padStart(4, '0')}`;
}

export function formatTicketNumber(seq: number): string {
  const safe = Math.max(1, Math.floor(seq));
  return `TCK-${String(safe).padStart(4, '0')}`;
}

export function normalizeSerial(serial: string): string {
  return serial.trim().toUpperCase();
}

export function isDuplicateSerialNumber(
  devices: Pick<Device, 'id' | 'seriennummer'>[],
  serial: string,
  excludeDeviceId?: string,
): boolean {
  const target = normalizeSerial(serial);
  if (!target) return false;
  return devices.some(
    (d) => d.id !== excludeDeviceId && normalizeSerial(d.seriennummer) === target,
  );
}

export function validateDeviceForm(
  input: DeviceFormInput,
  existingDevices: Pick<Device, 'id' | 'seriennummer'>[],
  excludeDeviceId?: string,
  lang: 'de' | 'en' = 'de',
): Record<string, string> {
  const errors: Record<string, string> = {};
  const t = getTranslator(lang);

  if (!input.hersteller.trim()) {
    errors.hersteller = t('domain.manufacturerIsRequired');
  } else if (input.hersteller.trim().length > 80) {
    errors.hersteller = t('domain.maximum80CharactersAllowed');
  }

  if (!input.modell.trim()) {
    errors.modell = t('domain.modelNameIsRequired');
  } else if (input.modell.trim().length > 120) {
    errors.modell = t('domain.maximum120CharactersAllowed');
  }

  if (!input.seriennummer.trim()) {
    errors.seriennummer = t('domain.serialNumberIsRequired');
  } else if (input.seriennummer.trim().length > 100) {
    errors.seriennummer = t('domain.maximum100CharactersAllowed');
  } else if (isDuplicateSerialNumber(existingDevices, input.seriennummer, excludeDeviceId)) {
    errors.seriennummer = t('domain.thisSerialNumberIsAlready');
  }

  if (!input.standort.trim()) {
    errors.standort = t('domain.locationIsRequired');
  }

  if (Number.isNaN(input.ramGB) || input.ramGB < 0 || input.ramGB > 4096) {
    errors.ramGB = t('domain.ramMustBeBetween0');
  }

  if (Number.isNaN(input.speicherGB) || input.speicherGB < 0 || input.speicherGB > 100000) {
    errors.speicherGB = t('domain.storageCapacityMustBeBetween');
  }

  if (input.notizen.length > 4000) {
    errors.notizen = t('domain.notesMayNotExceed4000');
  }

  return errors;
}

export function validateTicketForm(
  input: TicketFormInput,
  lang: 'de' | 'en' = 'de',
): Record<string, string> {
  const errors: Record<string, string> = {};
  const t = getTranslator(lang);

  if (!input.deviceId.trim()) {
    errors.deviceId = t('domain.pleaseSelectALinkedDevice');
  }

  if (!input.titel.trim()) {
    errors.titel = t('domain.ticketTitleIsRequired');
  } else if (input.titel.trim().length > 200) {
    errors.titel = t('domain.maximum200CharactersAllowed');
  }

  if (!input.beschreibung.trim()) {
    errors.beschreibung = t('domain.issueDescriptionIsRequired');
  } else if (input.beschreibung.trim().length > 5000) {
    errors.beschreibung = t('domain.maximum5000CharactersAllowed');
  }

  return errors;
}

export function parseBatchSerialNumbers(raw: string): string[] {
  return raw
    .split(/[\r\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function validateBatchDeviceForm(
  baseInput: Omit<DeviceFormInput, 'seriennummer'>,
  rawSerials: string,
  existingDevices: Pick<Device, 'id' | 'seriennummer'>[],
  lang: 'de' | 'en' = 'de',
): { serials: string[]; errors: Record<string, string> } {
  const t = getTranslator(lang);
  const serials = parseBatchSerialNumbers(rawSerials);
  const errors = validateDeviceForm(
    { ...baseInput, seriennummer: 'BATCH-PLACEHOLDER' },
    existingDevices,
    undefined,
    lang,
  );
  delete errors.seriennummer;

  if (serials.length === 0) {
    errors.seriennummer = t('domain.enterAtLeastOneSerial');
    return { serials, errors };
  }

  if (serials.length > 50) {
    errors.seriennummer = t('domain.maximum50DevicesPerBatch');
    return { serials, errors };
  }

  const tooLong = serials.find((s) => s.length > 100);
  if (tooLong) {
    errors.seriennummer = t('domain.serialNumberValueExceeds100', { value: tooLong.slice(0, 24) });
    return { serials, errors };
  }

  const seen = new Set<string>();
  const internalDupes: string[] = [];
  for (const s of serials) {
    const norm = normalizeSerial(s);
    if (seen.has(norm)) {
      internalDupes.push(s);
    }
    seen.add(norm);
  }
  if (internalDupes.length > 0) {
    errors.seriennummer = t('domain.duplicateSerialsInBatch', { serials: internalDupes.join(', ') });
    return { serials, errors };
  }

  const existingConflicts = serials.filter((s) => isDuplicateSerialNumber(existingDevices, s));
  if (existingConflicts.length > 0) {
    errors.seriennummer = t('domain.serialsAlreadyRegistered', { serials: existingConflicts.join(', ') });
  }

  return { serials, errors };
}

export function getChecklistTemplateForType(
  settings: Pick<WorkspaceSettings, 'checklistTemplate' | 'checklistTemplatesByType'>,
  typ: DeviceType,
): string[] {
  const customForType = settings.checklistTemplatesByType?.[typ];
  if (Array.isArray(customForType) && customForType.length > 0) {
    return customForType;
  }
  if (typ === 'Laptop' && Array.isArray(settings.checklistTemplate) && settings.checklistTemplate.length > 0) {
    return settings.checklistTemplate;
  }
  return DEFAULT_CHECKLIST_TEMPLATES_BY_TYPE[typ];
}

export function createChecklistFromTemplate(template: string[]): ChecklistItem[] {
  return template.slice(0, 30).map((label, idx) => ({
    id: `chk_${idx + 1}`,
    label,
    checked: false,
    checkedByUid: null,
    checkedByName: null,
    checkedAt: null,
  }));
}

export function syncChecklistWithTemplate(
  existing: ChecklistItem[],
  template: string[],
): ChecklistItem[] {
  const byLabel = new Map<string, ChecklistItem>();
  for (const item of existing) {
    byLabel.set(item.label, item);
  }
  return template.slice(0, 30).map((label, idx) => {
    const prev = byLabel.get(label);
    if (prev) return prev;
    return {
      id: `chk_${idx + 1}_${Date.now()}`,
      label,
      checked: false,
      checkedByUid: null,
      checkedByName: null,
      checkedAt: null,
    };
  });
}

export function getChecklistProgress(checklist: ChecklistItem[]): {
  done: number;
  total: number;
  percent: number;
  isComplete: boolean;
} {
  const total = checklist.length;
  const done = checklist.filter((item) => item.checked).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return {
    done,
    total,
    percent,
    isComplete: total > 0 && done === total,
  };
}

export interface FieldChange {
  field: string;
  oldValue: string;
  newValue: string;
}

const DEVICE_FIELD_LABELS: Record<keyof DeviceFormInput, string> = {
  typ: 'Gerätetyp',
  hersteller: 'Hersteller',
  modell: 'Modell',
  seriennummer: 'Seriennummer',
  cpu: 'CPU',
  ramGB: 'RAM (GB)',
  speicherTyp: 'Speichertyp',
  speicherGB: 'Speicher (GB)',
  betriebssystem: 'Betriebssystem',
  status: 'Status',
  standort: 'Standort',
  notizen: 'Notizen',
};

export function diffDeviceChanges(
  prev: DeviceFormInput,
  next: DeviceFormInput,
): FieldChange[] {
  const changes: FieldChange[] = [];
  (Object.keys(DEVICE_FIELD_LABELS) as (keyof DeviceFormInput)[]).forEach((key) => {
    const oldVal = String(prev[key] ?? '').trim();
    const newVal = String(next[key] ?? '').trim();
    if (oldVal !== newVal) {
      changes.push({
        field: DEVICE_FIELD_LABELS[key],
        oldValue: oldVal ? oldVal.slice(0, 500) : '—',
        newValue: newVal ? newVal.slice(0, 500) : '—',
      });
    }
  });
  return changes;
}

export function diffTicketChanges(
  prev: Partial<Ticket>,
  next: Partial<Ticket>,
): FieldChange[] {
  const tracked: Array<{ key: keyof Ticket; label: string }> = [
    { key: 'titel', label: 'Titel' },
    { key: 'kategorie', label: 'Kategorie' },
    { key: 'prioritaet', label: 'Priorität' },
    { key: 'status', label: 'Status' },
    { key: 'zugewiesenAnName', label: 'Zugewiesen an' },
    { key: 'loesung', label: 'Lösung' },
  ];
  const changes: FieldChange[] = [];
  for (const { key, label } of tracked) {
    if (next[key] === undefined) continue;
    const oldVal = String(prev[key] ?? '').trim();
    const newVal = String(next[key] ?? '').trim();
    if (oldVal !== newVal) {
      changes.push({
        field: label,
        oldValue: oldVal ? oldVal.slice(0, 500) : '—',
        newValue: newVal ? newVal.slice(0, 500) : '—',
      });
    }
  }
  return changes;
}

const PRIORITY_WEIGHT: Record<TicketPriority, number> = {
  Kritisch: 4,
  Hoch: 3,
  Mittel: 2,
  Niedrig: 1,
};

export function isTicketOpen(status: Ticket['status']): boolean {
  return status !== 'Gelöst' && status !== 'Geschlossen';
}

export function hasUrgentOpenTicket(tickets: Ticket[]): boolean {
  return tickets.some(
    (ticket) => isTicketOpen(ticket.status) && (ticket.prioritaet === 'Hoch' || ticket.prioritaet === 'Kritisch'),
  );
}

export function getUrgentOpenTickets(tickets: Ticket[], limit = 5): Ticket[] {
  return tickets
    .filter((ticket) => isTicketOpen(ticket.status))
    .slice()
    .sort((a, b) => {
      const weightDiff = PRIORITY_WEIGHT[b.prioritaet] - PRIORITY_WEIGHT[a.prioritaet];
      if (weightDiff !== 0) return weightDiff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    })
    .slice(0, limit);
}

export function getDeviceStatusDistribution(
  devices: Device[],
): Array<{ status: DeviceStatus; count: number }> {
  const statuses: DeviceStatus[] = [
    'Eingang',
    'In Arbeit',
    'Bereit',
    'Ausgegeben',
    'Defekt',
    'Entsorgt',
  ];
  const counts = new Map<DeviceStatus, number>();
  for (const s of statuses) counts.set(s, 0);
  for (const d of devices) {
    counts.set(d.status, (counts.get(d.status) ?? 0) + 1);
  }
  return statuses
    .map((status) => ({ status, count: counts.get(status) ?? 0 }))
    .filter((item) => item.count > 0);
}

export function getDeviceTypeDistribution(
  devices: Device[],
): Array<{ typ: DeviceType; count: number }> {
  const types: DeviceType[] = ['Laptop', 'Desktop', 'Monitor', 'Sonstiges'];
  const counts = new Map<DeviceType, number>();
  for (const t of types) counts.set(t, 0);
  for (const d of devices) {
    counts.set(d.typ, (counts.get(d.typ) ?? 0) + 1);
  }
  return types
    .map((typ) => ({ typ, count: counts.get(typ) ?? 0 }))
    .filter((item) => item.count > 0);
}

export interface DashboardSummary {
  totalDevices: number;
  activeWorkshopCount: number;
  intakeCount: number;
  inProgressCount: number;
  readyCount: number;
  issuedCount: number;
  defectiveCount: number;
  disposedCount: number;
  avgChecklistPercent: number;
  openTicketsCount: number;
  criticalHighTicketsCount: number;
  waitingPartsCount: number;
  myOpenTicketsCount: number;
  resolvedTicketsCount: number;
}

export function getDashboardSummary(
  devices: Device[],
  tickets: Ticket[],
  currentUserUid?: string | null,
): DashboardSummary {
  let intakeCount = 0;
  let inProgressCount = 0;
  let readyCount = 0;
  let issuedCount = 0;
  let defectiveCount = 0;
  let disposedCount = 0;

  let checklistPercentSum = 0;
  let checklistDeviceCount = 0;

  for (const d of devices) {
    switch (d.status) {
      case 'Eingang':
        intakeCount += 1;
        break;
      case 'In Arbeit':
        inProgressCount += 1;
        break;
      case 'Bereit':
        readyCount += 1;
        break;
      case 'Ausgegeben':
        issuedCount += 1;
        break;
      case 'Defekt':
        defectiveCount += 1;
        break;
      case 'Entsorgt':
        disposedCount += 1;
        break;
    }

    if ((d.status === 'Eingang' || d.status === 'In Arbeit') && d.checklist.length > 0) {
      checklistPercentSum += getChecklistProgress(d.checklist).percent;
      checklistDeviceCount += 1;
    }
  }

  let openTicketsCount = 0;
  let criticalHighTicketsCount = 0;
  let waitingPartsCount = 0;
  let myOpenTicketsCount = 0;
  let resolvedTicketsCount = 0;

  for (const t of tickets) {
    if (isTicketOpen(t.status)) {
      openTicketsCount += 1;
      if (t.prioritaet === 'Kritisch' || t.prioritaet === 'Hoch') {
        criticalHighTicketsCount += 1;
      }
      if (t.status === 'Wartet auf Teile') {
        waitingPartsCount += 1;
      }
      if (currentUserUid && t.zugewiesenAn === currentUserUid) {
        myOpenTicketsCount += 1;
      }
    } else {
      resolvedTicketsCount += 1;
    }
  }

  return {
    totalDevices: devices.length,
    activeWorkshopCount: intakeCount + inProgressCount + defectiveCount,
    intakeCount,
    inProgressCount,
    readyCount,
    issuedCount,
    defectiveCount,
    disposedCount,
    avgChecklistPercent:
      checklistDeviceCount === 0 ? 0 : Math.round(checklistPercentSum / checklistDeviceCount),
    openTicketsCount,
    criticalHighTicketsCount,
    waitingPartsCount,
    myOpenTicketsCount,
    resolvedTicketsCount,
  };
}

export function formatRelativeAge(
  iso: string,
  referenceDate = new Date(),
  lang: 'de' | 'en' = 'de',
): string {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return '—';
  const t = getTranslator(lang);
  const diffMs = Math.max(0, referenceDate.getTime() - ts);
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffHours < 1) {
    return t('domain.justNow');
  }
  if (diffHours < 24) {
    return t('domain.diffhoursHAgo', { diffHours });
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return t('domain.diffdaysDAgo', { diffDays });
  }
  const diffMonths = Math.floor(diffDays / 30);
  return t('domain.diffmonthsMoAgo', { diffMonths });
}

function getMondayStart(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getISOWeekNumber(date: Date): number {
  const temp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = temp.getUTCDay() || 7;
  temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
  return Math.ceil(((temp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function getWeeklyTicketActivity(
  tickets: Ticket[],
  weeksCount = 8,
  referenceDate = new Date(),
  lang: 'de' | 'en' = 'de',
): Array<{ label: string; created: number; resolved: number }> {
  const currentMonday = getMondayStart(referenceDate);
  const buckets: Array<{
    startMs: number;
    endMs: number;
    label: string;
    created: number;
    resolved: number;
  }> = [];
  const prefix = getTranslator(lang)('domain.w');

  for (let i = weeksCount - 1; i >= 0; i--) {
    const start = new Date(currentMonday);
    start.setDate(start.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    buckets.push({
      startMs: start.getTime(),
      endMs: end.getTime(),
      label: `${prefix}${getISOWeekNumber(start)}`,
      created: 0,
      resolved: 0,
    });
  }

  for (const t of tickets) {
    const createdTs = new Date(t.createdAt).getTime();
    if (!Number.isNaN(createdTs)) {
      for (const bucket of buckets) {
        if (createdTs >= bucket.startMs && createdTs < bucket.endMs) {
          bucket.created += 1;
          break;
        }
      }
    }

    if (!isTicketOpen(t.status)) {
      const resolvedIso = t.closedAt || t.updatedAt;
      const resolvedTs = new Date(resolvedIso).getTime();
      if (!Number.isNaN(resolvedTs)) {
        for (const bucket of buckets) {
          if (resolvedTs >= bucket.startMs && resolvedTs < bucket.endMs) {
            bucket.resolved += 1;
            break;
          }
        }
      }
    }
  }

  return buckets.map(({ label, created, resolved }) => ({ label, created, resolved }));
}

export function getWeeklyTicketCounts(
  tickets: Ticket[],
  weeksCount = 8,
  referenceDate = new Date(),
  lang: 'de' | 'en' = 'de',
): Array<{ label: string; count: number }> {
  return getWeeklyTicketActivity(tickets, weeksCount, referenceDate, lang).map(
    ({ label, created }) => ({ label, count: created }),
  );
}

function escapeCsvCell(value: unknown): string {
  const str = String(value ?? '');
  if (/[;"\n\r,]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateDevicesCsv(devices: Device[], lang: 'de' | 'en' = 'de'): string {
  const t = getTranslator(lang);
  const headers = [
    t('csv.assetTag'),
    t('csv.type'),
    t('csv.manufacturer'),
    t('csv.model'),
    t('csv.serialNumber'),
    t('csv.cpu'),
    t('csv.ram'),
    t('csv.storageType'),
    t('csv.storage'),
    t('csv.os'),
    t('csv.status'),
    t('csv.location'),
    t('csv.checklist'),
    t('csv.createdOn'),
    t('csv.notes'),
  ];

  const rows = devices.map((d) => {
    const prog = getChecklistProgress(d.checklist);
    return [
      d.assetTag,
      d.typ,
      d.hersteller,
      d.modell,
      d.seriennummer,
      d.cpu,
      d.ramGB,
      d.speicherTyp,
      d.speicherGB,
      d.betriebssystem,
      d.status,
      d.standort,
      `${prog.done}/${prog.total}`,
      d.createdAt ? new Date(d.createdAt).toLocaleDateString(LOCALE[lang]) : '',
      d.notizen,
    ]
      .map(escapeCsvCell)
      .join(';');
  });

  return '\uFEFF' + [headers.map(escapeCsvCell).join(';'), ...rows].join('\r\n');
}

export function generateTicketsCsv(tickets: Ticket[], lang: 'de' | 'en' = 'de'): string {
  const t = getTranslator(lang);
  const headers = [
    t('csv.ticketNo'),
    t('csv.assetTag'),
    t('csv.device'),
    t('csv.title'),
    t('csv.category'),
    t('csv.priority'),
    t('csv.status'),
    t('csv.assignee'),
    t('csv.resolution'),
    t('csv.createdOn'),
    t('csv.closedOn'),
  ];

  const rows = tickets.map((ticket) =>
    [
      ticket.ticketNr,
      ticket.deviceAssetTag,
      ticket.deviceModel,
      ticket.titel,
      ticket.kategorie,
      ticket.prioritaet,
      ticket.status,
      ticket.zugewiesenAnName ?? (t('common.unassigned')),
      ticket.loesung,
      ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString(LOCALE[lang]) : '',
      ticket.closedAt ? new Date(ticket.closedAt).toLocaleDateString(LOCALE[lang]) : '',
    ]
      .map(escapeCsvCell)
      .join(';'),
  );

  return '\uFEFF' + [headers.map(escapeCsvCell).join(';'), ...rows].join('\r\n');
}
