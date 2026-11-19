import type { Language } from '../hooks/useLanguage';
import { LOCALE } from './index';
import type {
  DeviceStatus,
  DeviceType,
  OperatingSystem,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  UserRole,
} from '../types';

const DEVICE_TYPE_EN: Record<DeviceType, string> = {
  Desktop: 'Desktop',
  Laptop: 'Laptop',
  Monitor: 'Monitor',
  Sonstiges: 'Other',
};

const DEVICE_STATUS_EN: Record<DeviceStatus, string> = {
  Eingang: 'Intake',
  'In Arbeit': 'In Progress',
  Bereit: 'Ready',
  Ausgegeben: 'Issued',
  Defekt: 'Defective',
  Entsorgt: 'Disposed',
};

const OS_EN: Record<OperatingSystem, string> = {
  'Windows 10': 'Windows 10',
  'Windows 11 Pro': 'Windows 11 Pro',
  Ubuntu: 'Ubuntu',
  Keins: 'None',
};

const TICKET_CATEGORY_EN: Record<TicketCategory, string> = {
  Hardware: 'Hardware',
  Software: 'Software',
  Netzwerk: 'Network',
  'Windows-Installation': 'Windows Setup',
};

const TICKET_PRIORITY_EN: Record<TicketPriority, string> = {
  Niedrig: 'Low',
  Mittel: 'Medium',
  Hoch: 'High',
  Kritisch: 'Critical',
};

const TICKET_STATUS_EN: Record<TicketStatus, string> = {
  Offen: 'Open',
  'In Bearbeitung': 'In Progress',
  'Wartet auf Teile': 'Waiting for Parts',
  Gelöst: 'Resolved',
  Geschlossen: 'Closed',
};

const USER_ROLE_EN: Record<UserRole, string> = {
  Admin: 'Admin',
  Techniker: 'Technician',
};

const CHECKLIST_LABEL_EN: Record<string, string> = {
  'BIOS/UEFI geprüft': 'BIOS/UEFI verified',
  'Windows installiert': 'Windows installed',
  'Treiber installiert': 'Drivers installed',
  'Windows-Updates installiert': 'Windows updates installed',
  'Windows aktiviert': 'Windows activated',
  'Standard-Software installiert (Browser, Office, 7-Zip, VLC)':
    'Standard software installed (Browser, Office, 7-Zip, VLC)',
  'Microsoft Defender aktiv': 'Microsoft Defender active',
  'Benutzerkonto eingerichtet': 'User account configured',
  'Funktionstest (USB, Audio, LAN, WLAN, Kamera)':
    'Hardware & I/O test (USB, Audio, LAN, Wi-Fi, Camera)',
  'Funktionstest (USB, Audio, LAN, Display-Ausgänge)':
    'Hardware & I/O test (USB, Audio, LAN, Display outputs)',
  'Gerät gereinigt und etikettiert': 'Device cleaned and labeled',
  'Gehäuse & Standfuß geprüft': 'Chassis & stand inspected',
  'Display auf Pixelfehler & Ausleuchtung getestet':
    'Panel tested for dead pixels & backlight uniformity',
  'Video-Eingänge getestet (HDMI, DisplayPort, USB-C)':
    'Video inputs tested (HDMI, DisplayPort, USB-C)',
  'USB-Hub & Power Delivery geprüft': 'USB hub & Power Delivery verified',
  'OSD-Einstellungen zurückgesetzt': 'OSD settings factory-reset',
  'Netzkabel & Signalkabel beigelegt': 'Power & video cables included',
  'Sichtprüfung & Vollständigkeit geprüft': 'Visual inspection & completeness verified',
  'Firmware / Treiber geprüft': 'Firmware / drivers verified',
  'Funktionstest durchgeführt': 'Functional test passed',
};

export function trDeviceType(val: DeviceType, lang: Language): string {
  return lang === 'en' ? DEVICE_TYPE_EN[val] ?? val : val;
}

export function trDeviceStatus(val: DeviceStatus, lang: Language): string {
  return lang === 'en' ? DEVICE_STATUS_EN[val] ?? val : val;
}

export function trOperatingSystem(val: OperatingSystem, lang: Language): string {
  return lang === 'en' ? OS_EN[val] ?? val : val;
}

export function trTicketCategory(val: TicketCategory, lang: Language): string {
  return lang === 'en' ? TICKET_CATEGORY_EN[val] ?? val : val;
}

export function trTicketPriority(val: TicketPriority, lang: Language): string {
  return lang === 'en' ? TICKET_PRIORITY_EN[val] ?? val : val;
}

export function trTicketStatus(val: TicketStatus, lang: Language): string {
  return lang === 'en' ? TICKET_STATUS_EN[val] ?? val : val;
}

export function trUserRole(val: UserRole, lang: Language): string {
  return lang === 'en' ? USER_ROLE_EN[val] ?? val : val;
}

export function trChecklistLabel(label: string, lang: Language): string {
  return lang === 'en' ? CHECKLIST_LABEL_EN[label] ?? label : label;
}

export function formatLocaleDate(iso: string, lang: Language): string {
  return new Date(iso).toLocaleDateString(LOCALE[lang]);
}

export function formatLocaleDateTime(iso: string, lang: Language): string {
  return new Date(iso).toLocaleString(LOCALE[lang]);
}

export function formatLocaleShortDateTime(iso: string, lang: Language): string {
  return new Date(iso).toLocaleString(LOCALE[lang], {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Audit log display ───────────────────────────────────────────────────────
// Audit entries are persisted in German (the canonical data language). These
// helpers translate them for display only; stored history is never rewritten.

const AUDIT_FIELD_EN: Record<string, string> = {
  'Gerät erfasst': 'Device registered',
  'Gerät erfasst (Serie)': 'Device registered (batch)',
  Übergabe: 'Handover',
  Rücknahme: 'Return',
  'Checklisten-Vorlage': 'Checklist template',
  'Ticket erstellt': 'Ticket created',
  Gerätetyp: 'Device type',
  Hersteller: 'Manufacturer',
  Modell: 'Model',
  Seriennummer: 'Serial number',
  Speichertyp: 'Storage type',
  'Speicher (GB)': 'Storage (GB)',
  Betriebssystem: 'Operating system',
  Standort: 'Location',
  Notizen: 'Notes',
  Titel: 'Title',
  Kategorie: 'Category',
  Priorität: 'Priority',
  'Zugewiesen an': 'Assignee',
  Lösung: 'Resolution',
  Status: 'Status',
};

const AUDIT_VALUE_EN: Record<string, string> = {
  ...DEVICE_STATUS_EN,
  ...TICKET_STATUS_EN,
  ...TICKET_PRIORITY_EN,
  ...TICKET_CATEGORY_EN,
  ...DEVICE_TYPE_EN,
  ...OS_EN,
  Erledigt: 'Done',
};

export function trAuditField(field: string, lang: Language): string {
  if (lang !== 'en') return field;
  if (field.startsWith('Checkliste: ')) {
    return `Checklist: ${trChecklistLabel(field.slice('Checkliste: '.length), 'en')}`;
  }
  return AUDIT_FIELD_EN[field] ?? field;
}

export function trAuditValue(value: string, lang: Language): string {
  if (lang !== 'en') return value;
  if (AUDIT_VALUE_EN[value]) return AUDIT_VALUE_EN[value];
  const issued = /^Ausgegeben an (.+)$/.exec(value);
  if (issued) return `Issued to ${issued[1]}`;
  const intake = /^Eingang · (.+)$/.exec(value);
  if (intake) return `Intake · ${intake[1]}`;
  const template = /^(.+)-Vorlage \((\d+) Punkte\)$/.exec(value);
  if (template) {
    return `${DEVICE_TYPE_EN[template[1] as DeviceType] ?? template[1]} template (${template[2]} items)`;
  }
  return value;
}
