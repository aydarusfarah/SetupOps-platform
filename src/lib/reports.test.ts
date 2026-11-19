import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLocalDemoState } from './demoData';
import { buildWorkshopReport, periodRange } from './reports';
import type { Ticket } from '../types';

const NOW = new Date('2026-11-19T12:00:00.000Z');
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();

function ticket(id: string, overrides: Partial<Ticket>): Ticket {
  return {
    id,
    ticketNr: id,
    deviceId: 'd',
    deviceAssetTag: 'WH',
    deviceModel: 'M',
    titel: 'T',
    beschreibung: '',
    kategorie: 'Hardware',
    prioritaet: 'Hoch',
    status: 'Offen',
    zugewiesenAn: null,
    zugewiesenAnName: null,
    loesung: '',
    createdBy: 'u',
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
    closedAt: null,
    ...overrides,
  };
}

test('periodRange: "all" has no lower bound, N days goes back N days', () => {
  assert.equal(periodRange('all', NOW).from, null);
  assert.equal(periodRange(30, NOW).from?.toISOString(), daysAgo(30));
});

test('report separates period-bound and snapshot figures', () => {
  const tickets = [
    ticket('open-overdue', { prioritaet: 'Kritisch', createdAt: daysAgo(2), zugewiesenAnName: 'Anna' }),
    ticket('resolved-met', { status: 'Gelöst', createdAt: daysAgo(5), closedAt: new Date(new Date(daysAgo(5)).getTime() + 10 * 3_600_000).toISOString(), zugewiesenAnName: 'Anna' }),
    ticket('resolved-old', { status: 'Geschlossen', createdAt: daysAgo(200), closedAt: daysAgo(190), kategorie: 'Software' }),
  ];
  const r30 = buildWorkshopReport([], tickets, [], 30, NOW, 'Unassigned');
  assert.equal(r30.ticketsCreated, 2);
  assert.equal(r30.ticketsResolved, 1);
  assert.equal(r30.openNow, 1);
  assert.equal(r30.overdueNow, 1);
  assert.equal(r30.compliancePct, 100);
  assert.equal(r30.avgResolutionHours, 10);
  assert.deepEqual(r30.workload[0], { assignee: 'Anna', open: 1, resolved: 1, avgResolutionHours: 10 });
  assert.equal(r30.slaByPriority[0].priority, 'Kritisch');

  const all = buildWorkshopReport([], tickets, [], 'all', NOW, 'Unassigned');
  assert.equal(all.ticketsResolved, 2);
  assert.equal(all.compliancePct, 50);
  assert.ok(all.workload.some((w) => w.assignee === 'Unassigned'));
});

test('report over demo data is internally consistent', () => {
  const demo = buildLocalDemoState('u', 'Lukas Weber');
  const r = buildWorkshopReport(demo.devices, demo.tickets, demo.auditLogs, 'all');
  assert.equal(r.fleetByStatus.reduce((s, x) => s + x.count, 0), demo.devices.length);
  assert.equal(r.fleetByType.reduce((s, x) => s + x.count, 0), demo.devices.length);
  assert.equal(r.ticketsByCategory.reduce((s, x) => s + x.count, 0), demo.tickets.length);
  assert.equal(r.openNow + r.ticketsResolved, demo.tickets.length);
});
