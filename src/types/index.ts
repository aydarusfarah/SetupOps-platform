export type UserRole = 'Admin' | 'Techniker';

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  photoURL?: string | null;
  createdAt: string;
}

export interface PublicStaffMember {
  uid: string;
  name: string;
  role: UserRole;
  photoURL?: string | null;
  createdAt: string;
}

export type DeviceType = 'Desktop' | 'Laptop' | 'Monitor' | 'Sonstiges';
export type StorageType = 'HDD' | 'SSD' | 'NVMe';
export type OperatingSystem = 'Windows 10' | 'Windows 11 Pro' | 'Ubuntu' | 'Keins';
export type DeviceStatus =
  | 'Eingang'
  | 'In Arbeit'
  | 'Bereit'
  | 'Ausgegeben'
  | 'Defekt'
  | 'Entsorgt';

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  checkedByUid: string | null;
  checkedByName: string | null;
  checkedAt: string | null;
}

export interface HandoverInfo {
  recipientName: string;
  department: string;
  accessories: string;
  handoverNotes: string;
  handedOverAt: string;
  handedOverByUid: string;
  handedOverByName: string;
}

export interface HandoverInput {
  recipientName: string;
  department: string;
  accessories: string;
  handoverNotes: string;
}

export interface Device {
  id: string;
  assetTag: string;
  typ: DeviceType;
  hersteller: string;
  modell: string;
  seriennummer: string;
  cpu: string;
  ramGB: number;
  speicherTyp: StorageType;
  speicherGB: number;
  betriebssystem: OperatingSystem;
  status: DeviceStatus;
  standort: string;
  notizen: string;
  checklist: ChecklistItem[];
  handover?: HandoverInfo | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
}

export interface DeviceFormInput {
  typ: DeviceType;
  hersteller: string;
  modell: string;
  seriennummer: string;
  cpu: string;
  ramGB: number;
  speicherTyp: StorageType;
  speicherGB: number;
  betriebssystem: OperatingSystem;
  status: DeviceStatus;
  standort: string;
  notizen: string;
}

export type TicketCategory =
  | 'Hardware'
  | 'Software'
  | 'Netzwerk'
  | 'Windows-Installation';
export type TicketPriority = 'Niedrig' | 'Mittel' | 'Hoch' | 'Kritisch';
export type TicketStatus =
  | 'Offen'
  | 'In Bearbeitung'
  | 'Wartet auf Teile'
  | 'Gelöst'
  | 'Geschlossen';

export interface Ticket {
  id: string;
  ticketNr: string;
  deviceId: string;
  deviceAssetTag: string;
  deviceModel: string;
  titel: string;
  beschreibung: string;
  kategorie: TicketCategory;
  prioritaet: TicketPriority;
  status: TicketStatus;
  zugewiesenAn: string | null;
  zugewiesenAnName: string | null;
  loesung: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export interface TicketFormInput {
  deviceId: string;
  titel: string;
  beschreibung: string;
  kategorie: TicketCategory;
  prioritaet: TicketPriority;
  status: TicketStatus;
  zugewiesenAn: string | null;
  loesung: string;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  entityType: 'device' | 'ticket';
  entityId: string;
  entityLabel: string;
  field: string;
  oldValue: string;
  newValue: string;
  userId: string;
  userName: string;
  timestamp: string;
}

export interface WorkspaceSettings {
  locations: string[];
  checklistTemplate: string[];
  checklistTemplatesByType?: Partial<Record<DeviceType, string[]>>;
  nextDeviceSeq: number;
  nextTicketSeq: number;
  updatedAt: string;
}

export interface DiagnosisStep {
  titel: string;
  beschreibung: string;
  ebene: string;
}

export interface DiagnosisResponse {
  wahrscheinlicheUrsachen: string[];
  schritte: DiagnosisStep[];
}

export const DEVICE_TYPES: DeviceType[] = ['Desktop', 'Laptop', 'Monitor', 'Sonstiges'];
export const STORAGE_TYPES: StorageType[] = ['NVMe', 'SSD', 'HDD'];
export const OPERATING_SYSTEMS: OperatingSystem[] = [
  'Windows 11 Pro',
  'Windows 10',
  'Ubuntu',
  'Keins',
];
export const DEVICE_STATUSES: DeviceStatus[] = [
  'Eingang',
  'In Arbeit',
  'Bereit',
  'Ausgegeben',
  'Defekt',
  'Entsorgt',
];

export const TICKET_CATEGORIES: TicketCategory[] = [
  'Hardware',
  'Software',
  'Netzwerk',
  'Windows-Installation',
];
export const TICKET_PRIORITIES: TicketPriority[] = [
  'Niedrig',
  'Mittel',
  'Hoch',
  'Kritisch',
];
export const TICKET_STATUSES: TicketStatus[] = [
  'Offen',
  'In Bearbeitung',
  'Wartet auf Teile',
  'Gelöst',
  'Geschlossen',
];

export const DEFAULT_CHECKLIST_TEMPLATE: string[] = [
  'BIOS/UEFI geprüft',
  'Windows installiert',
  'Treiber installiert',
  'Windows-Updates installiert',
  'Windows aktiviert',
  'Standard-Software installiert (Browser, Office, 7-Zip, VLC)',
  'Microsoft Defender aktiv',
  'Benutzerkonto eingerichtet',
  'Funktionstest (USB, Audio, LAN, WLAN, Kamera)',
  'Gerät gereinigt und etikettiert',
];

export const DEFAULT_CHECKLIST_TEMPLATES_BY_TYPE: Record<DeviceType, string[]> = {
  Laptop: DEFAULT_CHECKLIST_TEMPLATE,
  Desktop: [
    'BIOS/UEFI geprüft',
    'Windows installiert',
    'Treiber installiert',
    'Windows-Updates installiert',
    'Windows aktiviert',
    'Standard-Software installiert (Browser, Office, 7-Zip, VLC)',
    'Microsoft Defender aktiv',
    'Benutzerkonto eingerichtet',
    'Funktionstest (USB, Audio, LAN, Display-Ausgänge)',
    'Gerät gereinigt und etikettiert',
  ],
  Monitor: [
    'Gehäuse & Standfuß geprüft',
    'Display auf Pixelfehler & Ausleuchtung getestet',
    'Video-Eingänge getestet (HDMI, DisplayPort, USB-C)',
    'USB-Hub & Power Delivery geprüft',
    'OSD-Einstellungen zurückgesetzt',
    'Netzkabel & Signalkabel beigelegt',
    'Gerät gereinigt und etikettiert',
  ],
  Sonstiges: [
    'Sichtprüfung & Vollständigkeit geprüft',
    'Firmware / Treiber geprüft',
    'Funktionstest durchgeführt',
    'Gerät gereinigt und etikettiert',
  ],
};

export const DEFAULT_LOCATIONS: string[] = [
  'Werkstatt Platz 1',
  'Werkstatt Platz 2',
  'Werkstatt Platz 3',
  'Wareneingang',
  'Ausgabe-Regal A',
  'Ausgabe-Regal B',
  'Ersatzteillager',
];
