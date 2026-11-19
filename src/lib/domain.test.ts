import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatAssetTag,
  formatTicketNumber,
  isDuplicateSerialNumber,
  validateDeviceForm,
  validateTicketForm,
  createChecklistFromTemplate,
  getChecklistProgress,
  diffDeviceChanges,
  getUrgentOpenTickets,
  getWeeklyTicketCounts,
  generateDevicesCsv,
  generateTicketsCsv,
  parseBatchSerialNumbers,
  validateBatchDeviceForm,
  getChecklistTemplateForType,
  getDeviceTypeDistribution,
  getDashboardSummary,
  getWeeklyTicketActivity,
  formatRelativeAge,
} from './domain';
import { DEFAULT_CHECKLIST_TEMPLATES_BY_TYPE, type Device, type Ticket } from '../types';

test('sequence formatting produces WH-XXXX and TCK-XXXX', () => {
  assert.equal(formatAssetTag(1), 'WH-0001');
  assert.equal(formatAssetTag(42), 'WH-0042');
  assert.equal(formatAssetTag(12345), 'WH-12345');
  assert.equal(formatTicketNumber(7), 'TCK-0007');
});

test('duplicate serial number check is case-insensitive and supports excludeId', () => {
  const existing = [
    { id: 'dev-1', seriennummer: 'SN-ABC-123' },
    { id: 'dev-2', seriennummer: 'SN-XYZ-999' },
  ];
  assert.equal(isDuplicateSerialNumber(existing, ' sn-abc-123 '), true);
  assert.equal(isDuplicateSerialNumber(existing, 'sn-abc-123', 'dev-1'), false);
  assert.equal(isDuplicateSerialNumber(existing, 'SN-NEW-001'), false);
});

test('validateDeviceForm catches required fields and duplicate serial numbers', () => {
  const errs = validateDeviceForm(
    {
      typ: 'Laptop',
      hersteller: '',
      modell: '',
      seriennummer: 'SN-1',
      cpu: '',
      ramGB: -4,
      speicherTyp: 'NVMe',
      speicherGB: 512,
      betriebssystem: 'Windows 11 Pro',
      status: 'Eingang',
      standort: '',
      notizen: '',
    },
    [{ id: 'd1', seriennummer: 'sn-1' }],
  );
  assert.ok(errs.hersteller);
  assert.ok(errs.modell);
  assert.ok(errs.seriennummer);
  assert.ok(errs.ramGB);
  assert.ok(errs.standort);
});

test('validateTicketForm requires deviceId, titel, and beschreibung', () => {
  const errs = validateTicketForm({
    deviceId: '',
    titel: ' ',
    beschreibung: '',
    kategorie: 'Hardware',
    prioritaet: 'Hoch',
    status: 'Offen',
    zugewiesenAn: null,
    loesung: '',
  });
  assert.ok(errs.deviceId);
  assert.ok(errs.titel);
  assert.ok(errs.beschreibung);
});

test('checklist creation and progress calculation work accurately', () => {
  const list = createChecklistFromTemplate(['Step A', 'Step B', 'Step C', 'Step D']);
  assert.equal(list.length, 4);
  assert.equal(getChecklistProgress(list).done, 0);
  assert.equal(getChecklistProgress(list).isComplete, false);

  list[0].checked = true;
  list[1].checked = true;
  assert.equal(getChecklistProgress(list).percent, 50);

  list[2].checked = true;
  list[3].checked = true;
  assert.equal(getChecklistProgress(list).isComplete, true);
  assert.equal(getChecklistProgress(list).percent, 100);
});

test('diffDeviceChanges emits audit entries only for modified fields', () => {
  const base = {
    typ: 'Laptop' as const,
    hersteller: 'Dell',
    modell: 'Latitude 5540',
    seriennummer: 'SN-1',
    cpu: 'i5-1345U',
    ramGB: 16,
    speicherTyp: 'NVMe' as const,
    speicherGB: 512,
    betriebssystem: 'Windows 11 Pro' as const,
    status: 'Eingang' as const,
    standort: 'Wareneingang',
    notizen: '',
  };
  const updated = { ...base, status: 'In Arbeit' as const, ramGB: 32 };
  const changes = diffDeviceChanges(base, updated);
  assert.equal(changes.length, 2);
  assert.deepEqual(changes[0], { field: 'RAM (GB)', oldValue: '16', newValue: '32' });
  assert.deepEqual(changes[1], { field: 'Status', oldValue: 'Eingang', newValue: 'In Arbeit' });
});

test('getUrgentOpenTickets sorts by priority then oldest createdAt and excludes closed', () => {
  const makeTicket = (
    id: string,
    prioritaet: Ticket['prioritaet'],
    status: Ticket['status'],
    createdAt: string,
  ): Ticket => ({
    id,
    ticketNr: id,
    deviceId: 'd1',
    deviceAssetTag: 'WH-0001',
    deviceModel: 'Dell Latitude',
    titel: id,
    beschreibung: 'desc',
    kategorie: 'Hardware',
    prioritaet,
    status,
    zugewiesenAn: null,
    zugewiesenAnName: null,
    loesung: '',
    createdBy: 'u1',
    createdAt,
    updatedAt: createdAt,
    closedAt: null,
  });

  const sorted = getUrgentOpenTickets([
    makeTicket('t1', 'Niedrig', 'Offen', '2026-10-01T10:00:00Z'),
    makeTicket('t2', 'Kritisch', 'Geschlossen', '2026-10-01T10:00:00Z'),
    makeTicket('t3', 'Hoch', 'In Bearbeitung', '2026-10-02T10:00:00Z'),
    makeTicket('t4', 'Kritisch', 'Offen', '2026-10-05T10:00:00Z'),
    makeTicket('t5', 'Hoch', 'Offen', '2026-10-01T10:00:00Z'),
  ]);

  assert.deepEqual(
    sorted.map((t) => t.id),
    ['t4', 't5', 't3', 't1'],
  );
});

test('getWeeklyTicketCounts aggregates last 8 weeks accurately', () => {
  const ref = new Date('2026-11-18T12:00:00Z');
  const tickets: Ticket[] = [
    {
      id: '1',
      ticketNr: 'TCK-0001',
      deviceId: 'd1',
      deviceAssetTag: 'WH-0001',
      deviceModel: 'Dell',
      titel: 'A',
      beschreibung: 'B',
      kategorie: 'Hardware',
      prioritaet: 'Mittel',
      status: 'Offen',
      zugewiesenAn: null,
      zugewiesenAnName: null,
      loesung: '',
      createdBy: 'u1',
      createdAt: '2026-11-17T09:00:00Z',
      updatedAt: '2026-11-17T09:00:00Z',
      closedAt: null,
    },
  ];
  const result = getWeeklyTicketCounts(tickets, 8, ref);
  assert.equal(result.length, 8);
  assert.equal(result[7].count, 1);
});

test('CSV exports include UTF-8 BOM and German headers', () => {
  const device: Device = {
    id: 'd1',
    assetTag: 'WH-0001',
    typ: 'Laptop',
    hersteller: 'Lenovo',
    modell: 'ThinkPad T14',
    seriennummer: 'PF4A9912',
    cpu: 'Ryzen 7',
    ramGB: 16,
    speicherTyp: 'NVMe',
    speicherGB: 512,
    betriebssystem: 'Windows 11 Pro',
    status: 'Bereit',
    standort: 'Büro Geräteausgabe',
    notizen: 'Prüfung abgeschlossen; bereit',
    checklist: [],
    createdAt: '2026-11-10T10:00:00Z',
    updatedAt: '2026-11-10T10:00:00Z',
    createdBy: 'u1',
    createdByName: 'Max',
  };
  const csv = generateDevicesCsv([device]);
  assert.equal(csv.startsWith('\uFEFF'), true);
  assert.ok(csv.includes('Asset-Tag;Typ;Hersteller'));
  assert.ok(csv.includes('"Prüfung abgeschlossen; bereit"'));

  const ticketCsv = generateTicketsCsv([]);
  assert.equal(ticketCsv.startsWith('\uFEFF'), true);
  assert.ok(ticketCsv.includes('Priorität;Status'));
});

test('English localization mode returns English validation errors, week labels, and CSV headers', () => {
  const devErrs = validateDeviceForm(
    {
      typ: 'Laptop',
      hersteller: '',
      modell: '',
      seriennummer: '',
      cpu: '',
      ramGB: 16,
      speicherTyp: 'NVMe',
      speicherGB: 512,
      betriebssystem: 'Windows 11 Pro',
      status: 'Eingang',
      standort: '',
      notizen: '',
    },
    [],
    undefined,
    'en',
  );
  assert.equal(devErrs.hersteller, 'Manufacturer is required.');
  assert.equal(devErrs.standort, 'Location is required.');

  const tckErrs = validateTicketForm(
    {
      deviceId: '',
      titel: '',
      beschreibung: '',
      kategorie: 'Hardware',
      prioritaet: 'Hoch',
      status: 'Offen',
      zugewiesenAn: null,
      loesung: '',
    },
    'en',
  );
  assert.equal(tckErrs.deviceId, 'Please select a linked device.');

  const weekly = getWeeklyTicketCounts([], 4, new Date('2026-11-18T12:00:00Z'), 'en');
  assert.equal(weekly.length, 4);
  assert.equal(weekly[3].label.startsWith('W'), true);

  const devCsvEn = generateDevicesCsv([], 'en');
  assert.ok(devCsvEn.includes('Asset Tag;Type;Manufacturer'));
  const tckCsvEn = generateTicketsCsv([], 'en');
  assert.ok(tckCsvEn.includes('Priority;Status'));
});

test('parseBatchSerialNumbers and validateBatchDeviceForm handle batch intake and conflicts', () => {
  const parsed = parseBatchSerialNumbers('SN-001\n SN-002 , SN-003;SN-004\n');
  assert.deepEqual(parsed, ['SN-001', 'SN-002', 'SN-003', 'SN-004']);

  const base = {
    typ: 'Laptop' as const,
    hersteller: 'Dell',
    modell: 'Latitude 5540',
    cpu: 'i5-1345U',
    ramGB: 16,
    speicherTyp: 'NVMe' as const,
    speicherGB: 512,
    betriebssystem: 'Windows 11 Pro' as const,
    status: 'Eingang' as const,
    standort: 'Wareneingang',
    notizen: '',
  };

  const dupeInBatch = validateBatchDeviceForm(base, 'SN-A\nsn-a', [], 'en');
  assert.ok(dupeInBatch.errors.seriennummer?.includes('Duplicate serial numbers'));

  const conflictExisting = validateBatchDeviceForm(
    base,
    'SN-NEW\nSN-OLD',
    [{ id: 'd1', seriennummer: 'sn-old' }],
    'en',
  );
  assert.ok(conflictExisting.errors.seriennummer?.includes('Already registered'));

  const valid = validateBatchDeviceForm(base, 'SN-NEW-1\nSN-NEW-2', [{ id: 'd1', seriennummer: 'SN-OLD' }], 'en');
  assert.deepEqual(valid.errors, {});
  assert.deepEqual(valid.serials, ['SN-NEW-1', 'SN-NEW-2']);
});

test('getChecklistTemplateForType resolves custom per-type profiles and falls back safely', () => {
  const settings = {
    checklistTemplate: ['Custom Laptop Step'],
    checklistTemplatesByType: {
      Monitor: ['Monitor Step 1', 'Monitor Step 2'],
    },
  };
  assert.deepEqual(getChecklistTemplateForType(settings, 'Monitor'), ['Monitor Step 1', 'Monitor Step 2']);
  assert.deepEqual(getChecklistTemplateForType(settings, 'Laptop'), ['Custom Laptop Step']);
  assert.deepEqual(
    getChecklistTemplateForType(settings, 'Sonstiges'),
    DEFAULT_CHECKLIST_TEMPLATES_BY_TYPE.Sonstiges,
  );
});

test('getDashboardSummary, getDeviceTypeDistribution, and getWeeklyTicketActivity compute accurate ops metrics', () => {
  const mkDevice = (
    id: string,
    typ: Device['typ'],
    status: Device['status'],
    checkedCount: number,
  ): Device => ({
    id,
    assetTag: `WH-${id}`,
    typ,
    hersteller: 'Dell',
    modell: 'Latitude',
    seriennummer: `SN-${id}`,
    cpu: 'i5',
    ramGB: 16,
    speicherTyp: 'NVMe',
    speicherGB: 512,
    betriebssystem: 'Windows 11 Pro',
    status,
    standort: 'Werkstatt Platz 1',
    notizen: '',
    checklist: Array.from({ length: 4 }, (_, i) => ({
      id: `c${i}`,
      label: `Step ${i}`,
      checked: i < checkedCount,
      checkedByUid: null,
      checkedByName: null,
      checkedAt: null,
    })),
    createdAt: '2026-11-10T10:00:00Z',
    updatedAt: '2026-11-10T10:00:00Z',
    createdBy: 'u1',
    createdByName: 'Alex',
  });

  const devices: Device[] = [
    mkDevice('1', 'Laptop', 'In Arbeit', 2), // 50%
    mkDevice('2', 'Desktop', 'Eingang', 0), // 0%
    mkDevice('3', 'Monitor', 'Bereit', 4),
    mkDevice('4', 'Laptop', 'Ausgegeben', 4),
    mkDevice('5', 'Laptop', 'Defekt', 1),
  ];

  const tickets: Ticket[] = [
    {
      id: 't1',
      ticketNr: 'TCK-0001',
      deviceId: '1',
      deviceAssetTag: 'WH-1',
      deviceModel: 'Dell Latitude',
      titel: 'Issue 1',
      beschreibung: 'desc',
      kategorie: 'Hardware',
      prioritaet: 'Kritisch',
      status: 'Wartet auf Teile',
      zugewiesenAn: 'tech-1',
      zugewiesenAnName: 'Tech One',
      loesung: '',
      createdBy: 'tech-1',
      createdAt: '2026-11-17T09:00:00Z',
      updatedAt: '2026-11-17T09:00:00Z',
      closedAt: null,
    },
    {
      id: 't2',
      ticketNr: 'TCK-0002',
      deviceId: '3',
      deviceAssetTag: 'WH-3',
      deviceModel: 'Monitor',
      titel: 'Issue 2',
      beschreibung: 'desc',
      kategorie: 'Software',
      prioritaet: 'Niedrig',
      status: 'Gelöst',
      zugewiesenAn: 'tech-2',
      zugewiesenAnName: 'Tech Two',
      loesung: 'Done',
      createdBy: 'tech-1',
      createdAt: '2026-11-16T09:00:00Z',
      updatedAt: '2026-11-17T11:00:00Z',
      closedAt: null,
    },
  ];

  const summary = getDashboardSummary(devices, tickets, 'tech-1');
  assert.equal(summary.totalDevices, 5);
  assert.equal(summary.activeWorkshopCount, 3);
  assert.equal(summary.inProgressCount, 1);
  assert.equal(summary.intakeCount, 1);
  assert.equal(summary.readyCount, 1);
  assert.equal(summary.issuedCount, 1);
  assert.equal(summary.defectiveCount, 1);
  assert.equal(summary.avgChecklistPercent, 25); // (50 + 0) / 2
  assert.equal(summary.openTicketsCount, 1);
  assert.equal(summary.criticalHighTicketsCount, 1);
  assert.equal(summary.waitingPartsCount, 1);
  assert.equal(summary.myOpenTicketsCount, 1);
  assert.equal(summary.resolvedTicketsCount, 1);

  const typeDist = getDeviceTypeDistribution(devices);
  assert.deepEqual(typeDist, [
    { typ: 'Laptop', count: 3 },
    { typ: 'Desktop', count: 1 },
    { typ: 'Monitor', count: 1 },
  ]);

  const activity = getWeeklyTicketActivity(tickets, 4, new Date('2026-11-18T12:00:00Z'), 'en');
  assert.equal(activity.length, 4);
  assert.equal(activity[3].created, 2);
  assert.equal(activity[3].resolved, 1);

  assert.equal(
    formatRelativeAge('2026-11-16T12:00:00Z', new Date('2026-11-18T12:00:00Z'), 'en'),
    '2d ago',
  );
  assert.equal(
    formatRelativeAge('2026-11-18T09:00:00Z', new Date('2026-11-18T12:00:00Z'), 'de'),
    'vor 3 Std.',
  );
});
