import type {
  AuditLogEntry,
  ChecklistItem,
  Device,
  Ticket,
  TicketComment,
} from '../types';
import {
  DEFAULT_CHECKLIST_TEMPLATES_BY_TYPE,
  type DeviceType,
  type HandoverInfo,
} from '../types';

function buildDemoChecklist(
  typ: DeviceType,
  completedCount: number,
  userId: string,
  userName: string,
  baseIso: string,
): ChecklistItem[] {
  const template = DEFAULT_CHECKLIST_TEMPLATES_BY_TYPE[typ];
  return template.map((label, idx) => {
    const checked = idx < completedCount;
    return {
      id: `chk_${idx + 1}`,
      label,
      checked,
      checkedByUid: checked ? userId : null,
      checkedByName: checked ? userName : null,
      checkedAt: checked ? baseIso : null,
    };
  });
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export function buildDemoSeedPayload(actorUid: string, actorName: string): {
  devices: Omit<Device, 'createdAt' | 'updatedAt'>[];
  deviceDates: Array<{ createdAt: string; updatedAt: string }>;
  tickets: Omit<Ticket, 'createdAt' | 'updatedAt' | 'closedAt'>[];
  ticketDates: Array<{ createdAt: string; updatedAt: string; closedAt: string | null }>;
  comments: Array<{ ticketId: string; text: string; createdAt: string }>;
  auditLogs: Omit<AuditLogEntry, 'id'>[];
} {
  const devicesRaw: Array<{
    id: string;
    assetTag: string;
    typ: Device['typ'];
    hersteller: string;
    modell: string;
    seriennummer: string;
    cpu: string;
    ramGB: number;
    speicherTyp: Device['speicherTyp'];
    speicherGB: number;
    betriebssystem: Device['betriebssystem'];
    status: Device['status'];
    standort: string;
    notizen: string;
    doneCount: number;
    daysAgo: number;
  }> = [
    {
      id: 'demo_dev_01',
      assetTag: 'WH-0001',
      typ: 'Laptop',
      hersteller: 'Dell',
      modell: 'Latitude 5540',
      seriennummer: 'DL5540-9821A',
      cpu: 'Intel Core i5-1345U',
      ramGB: 16,
      speicherTyp: 'NVMe',
      speicherGB: 512,
      betriebssystem: 'Windows 11 Pro',
      status: 'In Arbeit',
      standort: 'Werkstatt Platz 1',
      notizen: 'Gerät für Vertriebsaußendienst vorbereitet, Docking-Test ausstehend.',
      doneCount: 7,
      daysAgo: 12,
    },
    {
      id: 'demo_dev_02',
      assetTag: 'WH-0002',
      typ: 'Laptop',
      hersteller: 'Lenovo',
      modell: 'ThinkPad T14 Gen 4',
      seriennummer: 'PF4K8821',
      cpu: 'AMD Ryzen 7 PRO 7840U',
      ramGB: 32,
      speicherTyp: 'NVMe',
      speicherGB: 1000,
      betriebssystem: 'Windows 11 Pro',
      status: 'Bereit',
      standort: 'Ausgabe-Regal A',
      notizen: 'Vollständig eingerichtet und inventarisiert.',
      doneCount: 10,
      daysAgo: 10,
    },
    {
      id: 'demo_dev_03',
      assetTag: 'WH-0003',
      typ: 'Desktop',
      hersteller: 'HP',
      modell: 'EliteDesk 800 G9 SFF',
      seriennummer: 'CZC319044B',
      cpu: 'Intel Core i7-13700',
      ramGB: 32,
      speicherTyp: 'NVMe',
      speicherGB: 1000,
      betriebssystem: 'Windows 11 Pro',
      status: 'In Arbeit',
      standort: 'Werkstatt Platz 2',
      notizen: 'CAD-Workstation, Treiberpaket für Nvidia T1000 prüfen.',
      doneCount: 4,
      daysAgo: 9,
    },
    {
      id: 'demo_dev_04',
      assetTag: 'WH-0004',
      typ: 'Desktop',
      hersteller: 'Fujitsu',
      modell: 'ESPRIMO P9012',
      seriennummer: 'YMNA044192',
      cpu: 'Intel Core i5-12500',
      ramGB: 16,
      speicherTyp: 'NVMe',
      speicherGB: 512,
      betriebssystem: 'Windows 11 Pro',
      status: 'Bereit',
      standort: 'Ausgabe-Regal A',
      notizen: 'Standard-Büroarbeitsplatz, Abholung am Donnerstag.',
      doneCount: 10,
      daysAgo: 18,
    },
    {
      id: 'demo_dev_05',
      assetTag: 'WH-0005',
      typ: 'Monitor',
      hersteller: 'Dell',
      modell: 'UltraSharp U2723QE',
      seriennummer: 'CN08K21-DELL',
      cpu: '',
      ramGB: 0,
      speicherTyp: 'SSD',
      speicherGB: 0,
      betriebssystem: 'Keins',
      status: 'Bereit',
      standort: 'Ausgabe-Regal B',
      notizen: '27" 4K USB-C Hub Monitor, Pixelfehlertest bestanden.',
      doneCount: 10,
      daysAgo: 7,
    },
    {
      id: 'demo_dev_06',
      assetTag: 'WH-0006',
      typ: 'Laptop',
      hersteller: 'HP',
      modell: 'EliteBook 840 G10',
      seriennummer: '5CG34109LK',
      cpu: 'Intel Core i5-1335U',
      ramGB: 16,
      speicherTyp: 'NVMe',
      speicherGB: 512,
      betriebssystem: 'Windows 11 Pro',
      status: 'Defekt',
      standort: 'Ersatzteillager',
      notizen: 'Lüfter macht schleifende Geräusche, Ersatzlüfter bestellt.',
      doneCount: 3,
      daysAgo: 6,
    },
    {
      id: 'demo_dev_07',
      assetTag: 'WH-0007',
      typ: 'Laptop',
      hersteller: 'Lenovo',
      modell: 'ThinkPad X1 Carbon Gen 11',
      seriennummer: 'PF4N1092',
      cpu: 'Intel Core i7-1365U',
      ramGB: 16,
      speicherTyp: 'NVMe',
      speicherGB: 512,
      betriebssystem: 'Windows 11 Pro',
      status: 'Eingang',
      standort: 'Wareneingang',
      notizen: 'Neugerät aus Lieferung #408, Erstinbetriebnahme ausstehend.',
      doneCount: 0,
      daysAgo: 2,
    },
    {
      id: 'demo_dev_08',
      assetTag: 'WH-0008',
      typ: 'Desktop',
      hersteller: 'Dell',
      modell: 'OptiPlex 7010 Micro',
      seriennummer: 'OPT7010-7741',
      cpu: 'Intel Core i5-13500T',
      ramGB: 16,
      speicherTyp: 'NVMe',
      speicherGB: 256,
      betriebssystem: 'Ubuntu',
      status: 'Ausgegeben',
      standort: 'Ausgabe-Regal A',
      notizen: 'An Empfangsterminal übergeben.',
      doneCount: 10,
      daysAgo: 25,
    },
    {
      id: 'demo_dev_09',
      assetTag: 'WH-0009',
      typ: 'Monitor',
      hersteller: 'HP',
      modell: 'E24 G5 FHD',
      seriennummer: 'CNK312088M',
      cpu: '',
      ramGB: 0,
      speicherTyp: 'SSD',
      speicherGB: 0,
      betriebssystem: 'Keins',
      status: 'Eingang',
      standort: 'Wareneingang',
      notizen: 'Rückläufer aus Buchhaltung, DisplayPort-Eingang prüfen.',
      doneCount: 1,
      daysAgo: 3,
    },
    {
      id: 'demo_dev_10',
      assetTag: 'WH-0010',
      typ: 'Laptop',
      hersteller: 'Fujitsu',
      modell: 'LIFEBOOK U7412',
      seriennummer: 'YLSA019283',
      cpu: 'Intel Core i5-1245U',
      ramGB: 16,
      speicherTyp: 'SSD',
      speicherGB: 512,
      betriebssystem: 'Windows 10',
      status: 'In Arbeit',
      standort: 'Werkstatt Platz 3',
      notizen: 'In-Place-Upgrade auf Windows 11 Pro geplant.',
      doneCount: 5,
      daysAgo: 5,
    },
    {
      id: 'demo_dev_11',
      assetTag: 'WH-0011',
      typ: 'Desktop',
      hersteller: 'Lenovo',
      modell: 'ThinkCentre M75q Gen 2',
      seriennummer: 'MJ0F9210',
      cpu: 'AMD Ryzen 5 PRO 5650GE',
      ramGB: 8,
      speicherTyp: 'NVMe',
      speicherGB: 256,
      betriebssystem: 'Windows 10',
      status: 'Entsorgt',
      standort: 'Ersatzteillager',
      notizen: 'Mainboard-Defekt außerhalb Garantie, Datenträger vernichtet.',
      doneCount: 2,
      daysAgo: 34,
    },
    {
      id: 'demo_dev_12',
      assetTag: 'WH-0012',
      typ: 'Sonstiges',
      hersteller: 'Dell',
      modell: 'WD22TB4 Thunderbolt Dock',
      seriennummer: 'WD22-661209',
      cpu: '',
      ramGB: 0,
      speicherTyp: 'SSD',
      speicherGB: 0,
      betriebssystem: 'Keins',
      status: 'Bereit',
      standort: 'Ausgabe-Regal B',
      notizen: 'Firmware aktualisiert, Netzteil 180W beigelegt.',
      doneCount: 10,
      daysAgo: 4,
    },
  ];

  const devices = devicesRaw.map((d) => {
    const baseIso = daysAgoIso(d.daysAgo);
    const handover: HandoverInfo | null =
      d.status === 'Ausgegeben'
        ? {
            recipientName: 'Empfang / Front Desk',
            department: 'Operations',
            accessories: 'Netzteil 65W, DisplayPort-Kabel',
            handoverNotes: 'Kiosk-Terminal eingerichtet und vor Ort angeschlossen.',
            handedOverAt: daysAgoIso(Math.max(0, d.daysAgo - 1)),
            handedOverByUid: actorUid,
            handedOverByName: actorName,
          }
        : null;
    return {
      id: d.id,
      assetTag: d.assetTag,
      typ: d.typ,
      hersteller: d.hersteller,
      modell: d.modell,
      seriennummer: d.seriennummer,
      cpu: d.cpu,
      ramGB: d.ramGB,
      speicherTyp: d.speicherTyp,
      speicherGB: d.speicherGB,
      betriebssystem: d.betriebssystem,
      status: d.status,
      standort: d.standort,
      notizen: d.notizen,
      checklist: buildDemoChecklist(d.typ, d.doneCount, actorUid, actorName, baseIso),
      handover,
      createdBy: actorUid,
      createdByName: actorName,
    };
  });

  const deviceDates = devicesRaw.map((d) => ({
    createdAt: daysAgoIso(d.daysAgo),
    updatedAt: daysAgoIso(Math.max(0, d.daysAgo - 1)),
  }));

  const ticketsRaw: Array<{
    id: string;
    ticketNr: string;
    deviceId: string;
    deviceAssetTag: string;
    deviceModel: string;
    titel: string;
    beschreibung: string;
    kategorie: Ticket['kategorie'];
    prioritaet: Ticket['prioritaet'];
    status: Ticket['status'];
    loesung: string;
    daysAgo: number;
    closed: boolean;
  }> = [
    {
      id: 'demo_tck_01',
      ticketNr: 'TCK-0001',
      deviceId: 'demo_dev_06',
      deviceAssetTag: 'WH-0006',
      deviceModel: 'HP EliteBook 840 G10',
      titel: 'CPU-Lüfter rattert unter Last und löst Thermal Throttling aus',
      beschreibung:
        'Nach ca. 5 Minuten Laufzeit steigt das Lüftergeräusch deutlich an, CPU taktet auf 800 MHz herunter. BIOS-Diagnose meldet Fan Error 90B.',
      kategorie: 'Hardware',
      prioritaet: 'Kritisch',
      status: 'Wartet auf Teile',
      loesung: 'Ersatzlüfter (SPS-M36190-001) bei HP bestellt.',
      daysAgo: 5,
      closed: false,
    },
    {
      id: 'demo_tck_02',
      ticketNr: 'TCK-0002',
      deviceId: 'demo_dev_01',
      deviceAssetTag: 'WH-0001',
      deviceModel: 'Dell Latitude 5540',
      titel: 'LAN-Adapter über USB-C Dock verliert periodisch DHCP-Lease',
      beschreibung:
        'Bei Anschluss an das WD22TB4 Dock bricht alle 20 Minuten die Ethernet-Verbindung für 10 Sekunden ab. Energiesparmodus oder Realtek-Treiber vermutet.',
      kategorie: 'Netzwerk',
      prioritaet: 'Hoch',
      status: 'In Bearbeitung',
      loesung: '',
      daysAgo: 3,
      closed: false,
    },
    {
      id: 'demo_tck_03',
      ticketNr: 'TCK-0003',
      deviceId: 'demo_dev_03',
      deviceAssetTag: 'WH-0003',
      deviceModel: 'HP EliteDesk 800 G9 SFF',
      titel: 'BitLocker-Wiederherstellung nach BIOS-Update',
      beschreibung:
        'Nach Update auf BIOS v02.11 verlangt das System beim Booten den BitLocker-Key. TPM 2.0 Status prüfen und Key neu verknüpfen.',
      kategorie: 'Windows-Installation',
      prioritaet: 'Hoch',
      status: 'Offen',
      loesung: '',
      daysAgo: 2,
      closed: false,
    },
    {
      id: 'demo_tck_04',
      ticketNr: 'TCK-0004',
      deviceId: 'demo_dev_10',
      deviceAssetTag: 'WH-0010',
      deviceModel: 'Fujitsu LIFEBOOK U7412',
      titel: 'Windows 11 Feature-Update bricht mit Fehler 0x8007001F ab',
      beschreibung:
        'Upgrade von Windows 10 22H2 auf Windows 11 Pro 24H2 rollt bei 72% zurück. Verdacht auf alten Audio-/Smartcard-Treiber.',
      kategorie: 'Windows-Installation',
      prioritaet: 'Mittel',
      status: 'Offen',
      loesung: '',
      daysAgo: 4,
      closed: false,
    },
    {
      id: 'demo_tck_05',
      ticketNr: 'TCK-0005',
      deviceId: 'demo_dev_09',
      deviceAssetTag: 'WH-0009',
      deviceModel: 'HP E24 G5 FHD',
      titel: 'Sporadisches Flackern über DisplayPort-Eingang',
      beschreibung:
        'Bildschirm wird für 1–2 Sekunden schwarz bei 60 Hz. HDMI funktioniert stabil. Kabel und DP-Buchse testen.',
      kategorie: 'Hardware',
      prioritaet: 'Mittel',
      status: 'Offen',
      loesung: '',
      daysAgo: 1,
      closed: false,
    },
    {
      id: 'demo_tck_06',
      ticketNr: 'TCK-0006',
      deviceId: 'demo_dev_02',
      deviceAssetTag: 'WH-0002',
      deviceModel: 'Lenovo ThinkPad T14 Gen 4',
      titel: 'Microsoft 365 Apps Aktivierung im Tenant verifizieren',
      beschreibung:
        'Office-Paket installiert, Lizenzaktivierung mit Testkonto prüfen.',
      kategorie: 'Software',
      prioritaet: 'Niedrig',
      status: 'Gelöst',
      loesung: 'Shared Computer Activation geprüft und Testanmeldung erfolgreich.',
      daysAgo: 8,
      closed: false,
    },
    {
      id: 'demo_tck_07',
      ticketNr: 'TCK-0007',
      deviceId: 'demo_dev_04',
      deviceAssetTag: 'WH-0004',
      deviceModel: 'Fujitsu ESPRIMO P9012',
      titel: 'Erstinbetriebnahme und Treiberpaket einspielen',
      beschreibung: 'Komplette Einrichtung nach Standard-Checkliste durchführen.',
      kategorie: 'Windows-Installation',
      prioritaet: 'Niedrig',
      status: 'Geschlossen',
      loesung: 'Windows 11 Pro 24H2 installiert, alle 10 Prüfpunkte abgeschlossen.',
      daysAgo: 16,
      closed: true,
    },
    {
      id: 'demo_tck_08',
      ticketNr: 'TCK-0008',
      deviceId: 'demo_dev_07',
      deviceAssetTag: 'WH-0007',
      deviceModel: 'Lenovo ThinkPad X1 Carbon Gen 11',
      titel: 'Standard-Image und Domänenbeitritt vorbereiten',
      beschreibung:
        'Gerät frisch aus Wareneingang; PXE-Boot testen und Basis-Softwarepaket installieren.',
      kategorie: 'Software',
      prioritaet: 'Mittel',
      status: 'In Bearbeitung',
      loesung: '',
      daysAgo: 14,
      closed: false,
    },
  ];

  const tickets = ticketsRaw.map((ticket) => ({
    id: ticket.id,
    ticketNr: ticket.ticketNr,
    deviceId: ticket.deviceId,
    deviceAssetTag: ticket.deviceAssetTag,
    deviceModel: ticket.deviceModel,
    titel: ticket.titel,
    beschreibung: ticket.beschreibung,
    kategorie: ticket.kategorie,
    prioritaet: ticket.prioritaet,
    status: ticket.status,
    zugewiesenAn: actorUid,
    zugewiesenAnName: actorName,
    loesung: ticket.loesung,
    createdBy: actorUid,
  }));

  const ticketDates = ticketsRaw.map((ticket) => ({
    createdAt: daysAgoIso(ticket.daysAgo),
    updatedAt: daysAgoIso(Math.max(0, ticket.daysAgo - 1)),
    closedAt: ticket.closed ? daysAgoIso(Math.max(0, ticket.daysAgo - 2)) : null,
  }));

  const comments: Array<{ ticketId: string; text: string; createdAt: string }> = [
    {
      ticketId: 'demo_tck_01',
      text: 'Gehäuseboden geöffnet und Staubfreiheit geprüft — Lager des Radiallüfters ist ausgeschlagen.',
      createdAt: daysAgoIso(4),
    },
    {
      ticketId: 'demo_tck_02',
      text: 'Firmware der WD22TB4 Dockingstation auf Version 1.0.22 aktualisiert, Langzeittest läuft.',
      createdAt: daysAgoIso(1),
    },
  ];

  const auditLogs: Omit<AuditLogEntry, 'id'>[] = [
    {
      entityType: 'device',
      entityId: 'demo_dev_01',
      entityLabel: 'WH-0001',
      field: 'Status',
      oldValue: 'Eingang',
      newValue: 'In Arbeit',
      userId: actorUid,
      userName: actorName,
      timestamp: daysAgoIso(2),
    },
    {
      entityType: 'device',
      entityId: 'demo_dev_02',
      entityLabel: 'WH-0002',
      field: 'Status',
      oldValue: 'In Arbeit',
      newValue: 'Bereit',
      userId: actorUid,
      userName: actorName,
      timestamp: daysAgoIso(1),
    },
    {
      entityType: 'ticket',
      entityId: 'demo_tck_01',
      entityLabel: 'TCK-0001',
      field: 'Status',
      oldValue: 'In Bearbeitung',
      newValue: 'Wartet auf Teile',
      userId: actorUid,
      userName: actorName,
      timestamp: daysAgoIso(3),
    },
    {
      entityType: 'device',
      entityId: 'demo_dev_07',
      entityLabel: 'WH-0007',
      field: 'Gerät erfasst',
      oldValue: '—',
      newValue: 'Lenovo ThinkPad X1 Carbon Gen 11',
      userId: actorUid,
      userName: actorName,
      timestamp: daysAgoIso(2),
    },
  ];

  return { devices, deviceDates, tickets, ticketDates, comments, auditLogs };
}

export function buildLocalDemoState(actorUid: string, actorName: string): {
  devices: Device[];
  tickets: Ticket[];
  commentsByTicket: Record<string, TicketComment[]>;
  auditLogs: AuditLogEntry[];
} {
  const seed = buildDemoSeedPayload(actorUid, actorName);
  const devices: Device[] = seed.devices.map((d, i) => ({
    ...d,
    createdAt: seed.deviceDates[i].createdAt,
    updatedAt: seed.deviceDates[i].updatedAt,
  }));
  const tickets: Ticket[] = seed.tickets.map((ticket, i) => ({
    ...ticket,
    createdAt: seed.ticketDates[i].createdAt,
    updatedAt: seed.ticketDates[i].updatedAt,
    closedAt: seed.ticketDates[i].closedAt,
  }));
  const commentsByTicket: Record<string, TicketComment[]> = {};
  seed.comments.forEach((c, idx) => {
    if (!commentsByTicket[c.ticketId]) commentsByTicket[c.ticketId] = [];
    commentsByTicket[c.ticketId].push({
      id: `demo_cmt_${idx + 1}`,
      ticketId: c.ticketId,
      authorId: actorUid,
      authorName: actorName,
      text: c.text,
      createdAt: c.createdAt,
    });
  });
  const auditLogs: AuditLogEntry[] = seed.auditLogs.map((l, idx) => ({
    ...l,
    id: `demo_log_${idx + 1}`,
  }));
  return { devices, tickets, commentsByTicket, auditLogs };
}
