import test from 'node:test';
import assert from 'node:assert/strict';
import type { Ticket } from '../types';
import { formatDuration, getSlaSummary, getTicketSla, sortBySlaUrgency } from './sla';

const NOW = new Date('2026-11-19T12:00:00.000Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

function ticket(overrides: Partial<Ticket>): Ticket {
  return {
    id: overrides.id ?? 't',
    ticketNr: 'TCK-0001',
    deviceId: 'd',
    deviceAssetTag: 'WH-0001',
    deviceModel: 'Model',
    titel: 'Title',
    beschreibung: 'Description',
    kategorie: 'Hardware',
    prioritaet: 'Hoch',
    status: 'Offen',
    zugewiesenAn: null,
    zugewiesenAnName: null,
    loesung: '',
    createdBy: 'u',
    createdAt: hoursAgo(1),
    updatedAt: hoursAgo(1),
    closedAt: null,
    ...overrides,
  };
}

test('open ticket inside its window is on track, near the end at risk, past it overdue', () => {
  assert.equal(getTicketSla(ticket({ prioritaet: 'Hoch', createdAt: hoursAgo(2) }), NOW).state, 'onTrack');
  assert.equal(getTicketSla(ticket({ prioritaet: 'Hoch', createdAt: hoursAgo(20) }), NOW).state, 'atRisk');
  const overdue = getTicketSla(ticket({ prioritaet: 'Kritisch', createdAt: hoursAgo(10) }), NOW);
  assert.equal(overdue.state, 'overdue');
  assert.equal(overdue.remainingMs, -2 * 3_600_000);
});

test('waiting for parts pauses the indicator even when past due', () => {
  const sla = getTicketSla(ticket({ status: 'Wartet auf Teile', prioritaet: 'Kritisch', createdAt: hoursAgo(48) }), NOW);
  assert.equal(sla.state, 'paused');
});

test('resolved tickets are judged by closedAt against the due date', () => {
  const met = getTicketSla(
    ticket({ status: 'Gelöst', prioritaet: 'Mittel', createdAt: hoursAgo(100), closedAt: hoursAgo(50) }),
    NOW,
  );
  assert.equal(met.state, 'met');
  assert.equal(met.resolutionMs, 50 * 3_600_000);
  const breached = getTicketSla(
    ticket({ status: 'Geschlossen', prioritaet: 'Kritisch', createdAt: hoursAgo(30), closedAt: hoursAgo(1) }),
    NOW,
  );
  assert.equal(breached.state, 'breached');
});

test('summary counts open states and computes compliance and mean resolution time', () => {
  const summary = getSlaSummary(
    [
      ticket({ id: 'a', prioritaet: 'Kritisch', createdAt: hoursAgo(10) }),
      ticket({ id: 'b', prioritaet: 'Hoch', createdAt: hoursAgo(20) }),
      ticket({ id: 'c', status: 'Wartet auf Teile' }),
      ticket({ id: 'd', status: 'Gelöst', prioritaet: 'Hoch', createdAt: hoursAgo(30), closedAt: hoursAgo(20) }),
      ticket({ id: 'e', status: 'Gelöst', prioritaet: 'Kritisch', createdAt: hoursAgo(40), closedAt: hoursAgo(10) }),
    ],
    NOW,
  );
  assert.deepEqual(
    { open: summary.open, overdue: summary.overdue, atRisk: summary.atRisk, paused: summary.paused },
    { open: 3, overdue: 1, atRisk: 1, paused: 1 },
  );
  assert.equal(summary.compliancePct, 50);
  assert.equal(summary.avgResolutionHours, 20);
  assert.equal(getSlaSummary([], NOW).compliancePct, null);
});

test('sortBySlaUrgency puts the most overdue ticket first', () => {
  const sorted = sortBySlaUrgency(
    [
      ticket({ id: 'fresh', prioritaet: 'Niedrig', createdAt: hoursAgo(1) }),
      ticket({ id: 'late', prioritaet: 'Kritisch', createdAt: hoursAgo(9) }),
      ticket({ id: 'later', prioritaet: 'Kritisch', createdAt: hoursAgo(30) }),
      ticket({ id: 'risk', prioritaet: 'Hoch', createdAt: hoursAgo(20) }),
    ],
    NOW,
  );
  assert.deepEqual(
    sorted.map((t) => t.id),
    ['later', 'late', 'risk', 'fresh'],
  );
});

test('formatDuration renders compact units', () => {
  assert.equal(formatDuration(45 * 60_000), '45m');
  assert.equal(formatDuration(5 * 3_600_000 + 20 * 60_000), '5h 20m');
  assert.equal(formatDuration(-(76 * 3_600_000)), '3d 4h');
  assert.equal(formatDuration(48 * 3_600_000), '2d');
});
