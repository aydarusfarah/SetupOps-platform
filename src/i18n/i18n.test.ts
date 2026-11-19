import test from 'node:test';
import assert from 'node:assert/strict';
import { en, type MessageKey } from './en';
import { de } from './de';
import { getTranslator } from './index';
import { trAuditField, trAuditValue } from './labels';

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test('every English key has a German translation and vice versa', () => {
  assert.deepEqual(Object.keys(de).sort(), Object.keys(en).sort());
});

test('EN and DE messages use the same {placeholders}', () => {
  for (const key of Object.keys(en) as MessageKey[]) {
    assert.deepEqual(placeholders(de[key]), placeholders(en[key]), `placeholder mismatch in ${key}`);
  }
});

test('no message is empty', () => {
  for (const [key, value] of [...Object.entries(en), ...Object.entries(de)]) {
    assert.ok(value.trim().length > 0, `empty message ${key}`);
  }
});

test('getTranslator interpolates params and leaves unknown placeholders intact', () => {
  const t = getTranslator('en');
  assert.equal(t('domain.duplicateSerialsInBatch', { serials: 'A, B' }), 'Duplicate serial numbers in batch: A, B');
  assert.equal(t('domain.duplicateSerialsInBatch'), 'Duplicate serial numbers in batch: {serials}');
  assert.equal(getTranslator('de')('common.devices'), de['common.devices']);
});

test('audit entries stored in German are translated for English display only', () => {
  assert.equal(trAuditField('Status', 'en'), 'Status');
  assert.equal(trAuditField('Gerät erfasst', 'en'), 'Device registered');
  assert.equal(trAuditField('Checkliste: Windows aktiviert', 'en'), 'Checklist: Windows activated');
  assert.equal(trAuditValue('Eingang', 'en'), 'Intake');
  assert.equal(trAuditValue('In Arbeit', 'en'), 'In Progress');
  assert.equal(trAuditValue('Wartet auf Teile', 'en'), 'Waiting for Parts');
  assert.equal(trAuditValue('Ausgegeben an M. Schulz', 'en'), 'Issued to M. Schulz');
  assert.equal(trAuditValue('Laptop-Vorlage (10 Punkte)', 'en'), 'Laptop template (10 items)');
  assert.equal(trAuditValue('Dell Latitude 5540', 'en'), 'Dell Latitude 5540');
  assert.equal(trAuditValue('Eingang', 'de'), 'Eingang');
});
