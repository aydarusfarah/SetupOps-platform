import test from 'node:test';
import assert from 'node:assert/strict';
import type { AuditLogEntry, Ticket } from '../types';
import { buildDeviceTimeline, classifyAuditField, filterTimeline, groupByDay } from './timeline';

const log = (id: string, field: string, timestamp: string, entityId = 'dev1'): AuditLogEntry => ({
  id,
  entityType: 'device',
  entityId,
  entityLabel: 'WH-0001',
  field,
  oldValue: 'a',
  newValue: 'b',
  userId: 'u',
  userName: 'Lukas Weber',
  timestamp,
});

const ticket = (id: string, createdAt: string, closedAt: string | null, deviceId = 'dev1'): Ticket => ({
  id,
  ticketNr: `TCK-${id}`,
  deviceId,
  deviceAssetTag: 'WH-0001',
  deviceModel: 'Latitude',
  titel: `Ticket ${id}`,
  beschreibung: '',
  kategorie: 'Hardware',
  prioritaet: 'Mittel',
  status: closedAt ? 'Geschlossen' : 'Offen',
  zugewiesenAn: null,
  zugewiesenAnName: 'Hannah Becker',
  loesung: '',
  createdBy: 'u',
  createdAt,
  updatedAt: createdAt,
  closedAt,
});

test('classifyAuditField maps persisted German fields to event kinds', () => {
  assert.equal(classifyAuditField('Gerät erfasst (Serie)'), 'registered');
  assert.equal(classifyAuditField('Status'), 'status');
  assert.equal(classifyAuditField('Übergabe'), 'handover');
  assert.equal(classifyAuditField('Rücknahme'), 'return');
  assert.equal(classifyAuditField('Checkliste: Windows aktiviert'), 'checklist');
  assert.equal(classifyAuditField('Standort'), 'edit');
});

test('timeline merges device logs and tickets newest-first and ignores other devices', () => {
  const events = buildDeviceTimeline(
    'dev1',
    [
      log('1', 'Gerät erfasst', '2026-11-01T08:00:00.000Z'),
      log('2', 'Status', '2026-11-03T08:00:00.000Z'),
      log('x', 'Status', '2026-11-04T08:00:00.000Z', 'dev2'),
    ],
    [ticket('a', '2026-11-02T08:00:00.000Z', '2026-11-05T08:00:00.000Z'), ticket('b', '2026-11-06T08:00:00.000Z', null, 'dev2')],
  );
  assert.deepEqual(
    events.map((e) => e.kind),
    ['ticketResolved', 'status', 'ticketOpened', 'registered'],
  );
  assert.equal(events[0].ticketNr, 'TCK-a');
});

test('filterTimeline and groupByDay', () => {
  const events = buildDeviceTimeline(
    'dev1',
    [log('1', 'Checkliste: X', '2026-11-03T10:00:00.000Z'), log('2', 'Status', '2026-11-03T09:00:00.000Z')],
    [ticket('a', '2026-11-01T08:00:00.000Z', null)],
  );
  assert.deepEqual(
    filterTimeline(events, 'checklist').map((e) => e.id),
    ['log:1'],
  );
  assert.equal(filterTimeline(events, 'all').length, 3);
  const groups = groupByDay(events);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].events.length, 2);
});
