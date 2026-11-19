import { useCallback } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  runTransaction,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import {
  DEFAULT_CHECKLIST_TEMPLATE,
  DEFAULT_CHECKLIST_TEMPLATES_BY_TYPE,
  DEFAULT_LOCATIONS,
  type ChecklistItem,
  type Device,
  type DeviceFormInput,
  type DeviceStatus,
  type HandoverInfo,
  type HandoverInput,
} from '../../types';
import {
  createChecklistFromTemplate,
  diffDeviceChanges,
  formatAssetTag,
  getChecklistProgress,
  getChecklistTemplateForType,
} from '../../lib/domain';
import type { WorkshopCore } from './core';

/** Device lifecycle: intake, edits, status, handover/return, checklists. */
export function useDeviceActions(core: WorkshopCore) {
  const {
    autostart,
    currentUser,
    devices,
    settings,
    setDevices,
    setSettings,
    appendLocalAudit,
  } = core;

  const createDevice = useCallback(
    async (input: DeviceFormInput): Promise<string> => {
      if (!currentUser) throw new Error('Nicht angemeldet');
      const template = getChecklistTemplateForType(settings, input.typ);
      const checklist = createChecklistFromTemplate(template);

      if (autostart) {
        const seq = settings.nextDeviceSeq;
        const assetTag = formatAssetTag(seq);
        const id = `dev_${Date.now()}`;
        const now = new Date().toISOString();
        const created: Device = {
          id,
          assetTag,
          ...input,
          hersteller: input.hersteller.trim(),
          modell: input.modell.trim(),
          seriennummer: input.seriennummer.trim(),
          cpu: input.cpu.trim(),
          standort: input.standort.trim(),
          notizen: input.notizen.trim(),
          checklist,
          handover: null,
          createdAt: now,
          updatedAt: now,
          createdBy: currentUser.uid,
          createdByName: currentUser.name,
        };
        setDevices((prev) => [created, ...prev]);
        setSettings((prev) => ({ ...prev, nextDeviceSeq: seq + 1 }));
        appendLocalAudit({
          entityType: 'device',
          entityId: id,
          entityLabel: assetTag,
          field: 'Gerät erfasst',
          oldValue: '—',
          newValue: `${created.hersteller} ${created.modell}`,
          userId: currentUser.uid,
          userName: currentUser.name,
        });
        return id;
      }

      const wsRef = doc(db, 'settings', 'workspace');
      const devRef = doc(collection(db, 'devices'));
      const logRef = doc(collection(db, 'auditLogs'));
      let generatedAssetTag = '';

      try {
        await runTransaction(db, async (tx) => {
          const wsSnap = await tx.get(wsRef);
          const currentSeq = wsSnap.exists() ? Number(wsSnap.data().nextDeviceSeq ?? 1) : 1;
          generatedAssetTag = formatAssetTag(currentSeq);

          if (wsSnap.exists()) {
            tx.update(wsRef, {
              nextDeviceSeq: currentSeq + 1,
              updatedAt: serverTimestamp(),
            });
          } else {
            tx.set(wsRef, {
              locations: DEFAULT_LOCATIONS,
              checklistTemplate: DEFAULT_CHECKLIST_TEMPLATE,
              checklistTemplatesByType: DEFAULT_CHECKLIST_TEMPLATES_BY_TYPE,
              nextDeviceSeq: currentSeq + 1,
              nextTicketSeq: 1,
              updatedAt: serverTimestamp(),
            });
          }

          tx.set(devRef, {
            assetTag: generatedAssetTag,
            typ: input.typ,
            hersteller: input.hersteller.trim(),
            modell: input.modell.trim(),
            seriennummer: input.seriennummer.trim(),
            cpu: input.cpu.trim(),
            ramGB: Number(input.ramGB),
            speicherTyp: input.speicherTyp,
            speicherGB: Number(input.speicherGB),
            betriebssystem: input.betriebssystem,
            status: input.status,
            standort: input.standort.trim(),
            notizen: input.notizen.trim(),
            checklist,
            handover: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: currentUser.uid,
            createdByName: currentUser.name,
          });

          tx.set(logRef, {
            entityType: 'device',
            entityId: devRef.id,
            entityLabel: generatedAssetTag,
            field: 'Gerät erfasst',
            oldValue: '—',
            newValue: `${input.hersteller.trim()} ${input.modell.trim()}`.slice(0, 500),
            userId: currentUser.uid,
            userName: currentUser.name,
            timestamp: serverTimestamp(),
          });
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'devices');
      }

      return devRef.id;
    },
    [autostart, currentUser, settings, appendLocalAudit],
  );

  const createDevicesBatch = useCallback(
    async (
      baseInput: Omit<DeviceFormInput, 'seriennummer'>,
      serials: string[],
    ): Promise<Array<{ id: string; assetTag: string }>> => {
      if (!currentUser) throw new Error('Nicht angemeldet');
      if (serials.length === 0) return [];
      const template = getChecklistTemplateForType(settings, baseInput.typ);

      if (autostart) {
        const startSeq = settings.nextDeviceSeq;
        const now = new Date().toISOString();
        const createdDevices: Device[] = [];
        const createdRefs: Array<{ id: string; assetTag: string }> = [];

        serials.forEach((sn, idx) => {
          const seq = startSeq + idx;
          const assetTag = formatAssetTag(seq);
          const id = `dev_${Date.now()}_${idx}`;
          createdRefs.push({ id, assetTag });
          createdDevices.push({
            id,
            assetTag,
            ...baseInput,
            hersteller: baseInput.hersteller.trim(),
            modell: baseInput.modell.trim(),
            seriennummer: sn.trim(),
            cpu: baseInput.cpu.trim(),
            standort: baseInput.standort.trim(),
            notizen: baseInput.notizen.trim(),
            checklist: createChecklistFromTemplate(template),
            handover: null,
            createdAt: now,
            updatedAt: now,
            createdBy: currentUser.uid,
            createdByName: currentUser.name,
          });
        });

        setDevices((prev) => [...createdDevices.reverse(), ...prev]);
        setSettings((prev) => ({ ...prev, nextDeviceSeq: startSeq + serials.length }));
        createdDevices.forEach((dev) => {
          appendLocalAudit({
            entityType: 'device',
            entityId: dev.id,
            entityLabel: dev.assetTag,
            field: 'Gerät erfasst (Serie)',
            oldValue: '—',
            newValue: `${dev.hersteller} ${dev.modell} · SN ${dev.seriennummer}`.slice(0, 500),
            userId: currentUser.uid,
            userName: currentUser.name,
          });
        });
        return createdRefs;
      }

      const wsRef = doc(db, 'settings', 'workspace');
      const devRefs = serials.map(() => doc(collection(db, 'devices')));
      const createdRefs: Array<{ id: string; assetTag: string }> = [];

      try {
        await runTransaction(db, async (tx) => {
          const wsSnap = await tx.get(wsRef);
          const startSeq = wsSnap.exists() ? Number(wsSnap.data().nextDeviceSeq ?? 1) : 1;

          if (wsSnap.exists()) {
            tx.update(wsRef, {
              nextDeviceSeq: startSeq + serials.length,
              updatedAt: serverTimestamp(),
            });
          } else {
            tx.set(wsRef, {
              locations: DEFAULT_LOCATIONS,
              checklistTemplate: DEFAULT_CHECKLIST_TEMPLATE,
              checklistTemplatesByType: DEFAULT_CHECKLIST_TEMPLATES_BY_TYPE,
              nextDeviceSeq: startSeq + serials.length,
              nextTicketSeq: 1,
              updatedAt: serverTimestamp(),
            });
          }

          serials.forEach((sn, idx) => {
            const devRef = devRefs[idx];
            const assetTag = formatAssetTag(startSeq + idx);
            createdRefs.push({ id: devRef.id, assetTag });
            tx.set(devRef, {
              assetTag,
              typ: baseInput.typ,
              hersteller: baseInput.hersteller.trim(),
              modell: baseInput.modell.trim(),
              seriennummer: sn.trim(),
              cpu: baseInput.cpu.trim(),
              ramGB: Number(baseInput.ramGB),
              speicherTyp: baseInput.speicherTyp,
              speicherGB: Number(baseInput.speicherGB),
              betriebssystem: baseInput.betriebssystem,
              status: baseInput.status,
              standort: baseInput.standort.trim(),
              notizen: baseInput.notizen.trim(),
              checklist: createChecklistFromTemplate(template),
              handover: null,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              createdBy: currentUser.uid,
              createdByName: currentUser.name,
            });

            tx.set(doc(collection(db, 'auditLogs')), {
              entityType: 'device',
              entityId: devRef.id,
              entityLabel: assetTag,
              field: 'Gerät erfasst (Serie)',
              oldValue: '—',
              newValue: `${baseInput.hersteller.trim()} ${baseInput.modell.trim()} · SN ${sn.trim()}`.slice(0, 500),
              userId: currentUser.uid,
              userName: currentUser.name,
              timestamp: serverTimestamp(),
            });
          });
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'devices');
      }

      return createdRefs;
    },
    [autostart, currentUser, settings, appendLocalAudit],
  );

  const updateDevice = useCallback(
    async (deviceId: string, input: DeviceFormInput): Promise<void> => {
      if (!currentUser) throw new Error('Nicht angemeldet');
      const existing = devices.find((d) => d.id === deviceId);
      if (!existing) throw new Error('Gerät nicht gefunden');

      const prevForm: DeviceFormInput = {
        typ: existing.typ,
        hersteller: existing.hersteller,
        modell: existing.modell,
        seriennummer: existing.seriennummer,
        cpu: existing.cpu,
        ramGB: existing.ramGB,
        speicherTyp: existing.speicherTyp,
        speicherGB: existing.speicherGB,
        betriebssystem: existing.betriebssystem,
        status: existing.status,
        standort: existing.standort,
        notizen: existing.notizen,
      };
      const changes = diffDeviceChanges(prevForm, input);

      if (autostart) {
        const now = new Date().toISOString();
        setDevices((prev) =>
          prev.map((d) =>
            d.id === deviceId
              ? {
                  ...d,
                  ...input,
                  hersteller: input.hersteller.trim(),
                  modell: input.modell.trim(),
                  seriennummer: input.seriennummer.trim(),
                  cpu: input.cpu.trim(),
                  standort: input.standort.trim(),
                  notizen: input.notizen.trim(),
                  updatedAt: now,
                }
              : d,
          ),
        );
        changes.forEach((ch) => {
          appendLocalAudit({
            entityType: 'device',
            entityId: deviceId,
            entityLabel: existing.assetTag,
            field: ch.field,
            oldValue: ch.oldValue,
            newValue: ch.newValue,
            userId: currentUser.uid,
            userName: currentUser.name,
          });
        });
        return;
      }

      const batch = writeBatch(db);
      batch.update(doc(db, 'devices', deviceId), {
        typ: input.typ,
        hersteller: input.hersteller.trim(),
        modell: input.modell.trim(),
        seriennummer: input.seriennummer.trim(),
        cpu: input.cpu.trim(),
        ramGB: Number(input.ramGB),
        speicherTyp: input.speicherTyp,
        speicherGB: Number(input.speicherGB),
        betriebssystem: input.betriebssystem,
        status: input.status,
        standort: input.standort.trim(),
        notizen: input.notizen.trim(),
        updatedAt: serverTimestamp(),
      });

      for (const ch of changes) {
        const logRef = doc(collection(db, 'auditLogs'));
        batch.set(logRef, {
          entityType: 'device',
          entityId: deviceId,
          entityLabel: existing.assetTag,
          field: ch.field,
          oldValue: ch.oldValue,
          newValue: ch.newValue,
          userId: currentUser.uid,
          userName: currentUser.name,
          timestamp: serverTimestamp(),
        });
      }

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `devices/${deviceId}`);
      }
    },
    [autostart, currentUser, devices, appendLocalAudit],
  );

  const bulkUpdateDeviceStatus = useCallback(
    async (deviceIds: string[], status: DeviceStatus): Promise<void> => {
      if (!currentUser || deviceIds.length === 0) return;

      if (autostart) {
        const now = new Date().toISOString();
        setDevices((prev) =>
          prev.map((d) => (deviceIds.includes(d.id) ? { ...d, status, updatedAt: now } : d)),
        );
        deviceIds.forEach((id) => {
          const dev = devices.find((d) => d.id === id);
          if (dev && dev.status !== status) {
            appendLocalAudit({
              entityType: 'device',
              entityId: id,
              entityLabel: dev.assetTag,
              field: 'Status',
              oldValue: dev.status,
              newValue: status,
              userId: currentUser.uid,
              userName: currentUser.name,
            });
          }
        });
        return;
      }

      const batch = writeBatch(db);
      for (const id of deviceIds) {
        const dev = devices.find((d) => d.id === id);
        if (!dev || dev.status === status) continue;
        batch.update(doc(db, 'devices', id), {
          status,
          updatedAt: serverTimestamp(),
        });
        batch.set(doc(collection(db, 'auditLogs')), {
          entityType: 'device',
          entityId: id,
          entityLabel: dev.assetTag,
          field: 'Status',
          oldValue: dev.status,
          newValue: status,
          userId: currentUser.uid,
          userName: currentUser.name,
          timestamp: serverTimestamp(),
        });
      }

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, 'devices');
      }
    },
    [autostart, currentUser, devices, appendLocalAudit],
  );

  const handoverDevice = useCallback(
    async (deviceId: string, input: HandoverInput): Promise<void> => {
      if (!currentUser) throw new Error('Nicht angemeldet');
      const dev = devices.find((d) => d.id === deviceId);
      if (!dev) throw new Error('Gerät nicht gefunden');

      const recipientName = input.recipientName.trim();
      const department = input.department.trim();
      const accessories = input.accessories.trim();
      const handoverNotes = input.handoverNotes.trim();
      if (!recipientName) throw new Error('Empfängername erforderlich');

      const nowIso = new Date().toISOString();
      const handover: HandoverInfo = {
        recipientName,
        department,
        accessories,
        handoverNotes,
        handedOverAt: nowIso,
        handedOverByUid: currentUser.uid,
        handedOverByName: currentUser.name,
      };
      const newSummary = department ? `${recipientName} (${department})` : recipientName;

      if (autostart) {
        setDevices((prev) =>
          prev.map((d) =>
            d.id === deviceId
              ? { ...d, status: 'Ausgegeben', handover, updatedAt: nowIso }
              : d,
          ),
        );
        appendLocalAudit({
          entityType: 'device',
          entityId: deviceId,
          entityLabel: dev.assetTag,
          field: 'Übergabe',
          oldValue: dev.status,
          newValue: `Ausgegeben an ${newSummary}`.slice(0, 500),
          userId: currentUser.uid,
          userName: currentUser.name,
        });
        return;
      }

      const batch = writeBatch(db);
      batch.update(doc(db, 'devices', deviceId), {
        status: 'Ausgegeben',
        handover,
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(collection(db, 'auditLogs')), {
        entityType: 'device',
        entityId: deviceId,
        entityLabel: dev.assetTag,
        field: 'Übergabe',
        oldValue: dev.status,
        newValue: `Ausgegeben an ${newSummary}`.slice(0, 500),
        userId: currentUser.uid,
        userName: currentUser.name,
        timestamp: serverTimestamp(),
      });

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `devices/${deviceId}`);
      }
    },
    [autostart, currentUser, devices, appendLocalAudit],
  );

  const returnDevice = useCallback(
    async (deviceId: string, returnLocation: string, notes?: string): Promise<void> => {
      if (!currentUser) throw new Error('Nicht angemeldet');
      const dev = devices.find((d) => d.id === deviceId);
      if (!dev) throw new Error('Gerät nicht gefunden');

      const nextLoc = returnLocation.trim() || dev.standort;
      const prevRecipient = dev.handover?.recipientName
        ? `${dev.handover.recipientName}${dev.handover.department ? ` (${dev.handover.department})` : ''}`
        : dev.status;
      const noteSuffix = notes?.trim() ? ` · ${notes.trim()}` : '';
      const nowIso = new Date().toISOString();

      if (autostart) {
        setDevices((prev) =>
          prev.map((d) =>
            d.id === deviceId
              ? {
                  ...d,
                  status: 'Eingang',
                  standort: nextLoc,
                  handover: null,
                  updatedAt: nowIso,
                }
              : d,
          ),
        );
        appendLocalAudit({
          entityType: 'device',
          entityId: deviceId,
          entityLabel: dev.assetTag,
          field: 'Rücknahme',
          oldValue: prevRecipient.slice(0, 500),
          newValue: `Eingang · ${nextLoc}${noteSuffix}`.slice(0, 500),
          userId: currentUser.uid,
          userName: currentUser.name,
        });
        return;
      }

      const batch = writeBatch(db);
      batch.update(doc(db, 'devices', deviceId), {
        status: 'Eingang',
        standort: nextLoc,
        handover: null,
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(collection(db, 'auditLogs')), {
        entityType: 'device',
        entityId: deviceId,
        entityLabel: dev.assetTag,
        field: 'Rücknahme',
        oldValue: prevRecipient.slice(0, 500),
        newValue: `Eingang · ${nextLoc}${noteSuffix}`.slice(0, 500),
        userId: currentUser.uid,
        userName: currentUser.name,
        timestamp: serverTimestamp(),
      });

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `devices/${deviceId}`);
      }
    },
    [autostart, currentUser, devices, appendLocalAudit],
  );

  const deleteDevice = useCallback(
    async (deviceId: string): Promise<void> => {
      if (!currentUser || currentUser.role !== 'Admin') {
        throw new Error('Nur Administratoren können Geräte löschen.');
      }
      if (autostart) {
        setDevices((prev) => prev.filter((d) => d.id !== deviceId));
        return;
      }
      try {
        await deleteDoc(doc(db, 'devices', deviceId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `devices/${deviceId}`);
      }
    },
    [autostart, currentUser],
  );

  const toggleChecklistItem = useCallback(
    async (deviceId: string, itemId: string, checked: boolean): Promise<void> => {
      if (!currentUser) throw new Error('Nicht angemeldet');
      const dev = devices.find((d) => d.id === deviceId);
      if (!dev) return;

      const nowIso = new Date().toISOString();
      const targetItem = dev.checklist.find((i) => i.id === itemId);
      const nextChecklist: ChecklistItem[] = dev.checklist.map((item) =>
        item.id === itemId
          ? {
              ...item,
              checked,
              checkedByUid: checked ? currentUser.uid : null,
              checkedByName: checked ? currentUser.name : null,
              checkedAt: checked ? nowIso : null,
            }
          : item,
      );

      if (autostart) {
        setDevices((prev) =>
          prev.map((d) =>
            d.id === deviceId ? { ...d, checklist: nextChecklist, updatedAt: nowIso } : d,
          ),
        );
        if (targetItem) {
          appendLocalAudit({
            entityType: 'device',
            entityId: deviceId,
            entityLabel: dev.assetTag,
            field: `Checkliste: ${targetItem.label}`.slice(0, 80),
            oldValue: targetItem.checked ? 'Erledigt' : 'Offen',
            newValue: checked ? 'Erledigt' : 'Offen',
            userId: currentUser.uid,
            userName: currentUser.name,
          });
        }
        return;
      }

      const batch = writeBatch(db);
      batch.update(doc(db, 'devices', deviceId), {
        checklist: nextChecklist,
        updatedAt: serverTimestamp(),
      });
      if (targetItem) {
        batch.set(doc(collection(db, 'auditLogs')), {
          entityType: 'device',
          entityId: deviceId,
          entityLabel: dev.assetTag,
          field: `Checkliste: ${targetItem.label}`.slice(0, 80),
          oldValue: targetItem.checked ? 'Erledigt' : 'Offen',
          newValue: checked ? 'Erledigt' : 'Offen',
          userId: currentUser.uid,
          userName: currentUser.name,
          timestamp: serverTimestamp(),
        });
      }

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `devices/${deviceId}`);
      }
    },
    [autostart, currentUser, devices, appendLocalAudit],
  );

  const applyChecklistTemplateToDevice = useCallback(
    async (deviceId: string): Promise<void> => {
      if (!currentUser) throw new Error('Nicht angemeldet');
      const dev = devices.find((d) => d.id === deviceId);
      if (!dev) throw new Error('Gerät nicht gefunden');

      const template = getChecklistTemplateForType(settings, dev.typ);
      const nextChecklist = createChecklistFromTemplate(template);
      const prevProg = getChecklistProgress(dev.checklist);
      const nowIso = new Date().toISOString();

      if (autostart) {
        setDevices((prev) =>
          prev.map((d) =>
            d.id === deviceId ? { ...d, checklist: nextChecklist, updatedAt: nowIso } : d,
          ),
        );
        appendLocalAudit({
          entityType: 'device',
          entityId: deviceId,
          entityLabel: dev.assetTag,
          field: 'Checklisten-Vorlage',
          oldValue: `${prevProg.done}/${prevProg.total}`,
          newValue: `${dev.typ}-Vorlage (${nextChecklist.length} Punkte)`,
          userId: currentUser.uid,
          userName: currentUser.name,
        });
        return;
      }

      const batch = writeBatch(db);
      batch.update(doc(db, 'devices', deviceId), {
        checklist: nextChecklist,
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(collection(db, 'auditLogs')), {
        entityType: 'device',
        entityId: deviceId,
        entityLabel: dev.assetTag,
        field: 'Checklisten-Vorlage',
        oldValue: `${prevProg.done}/${prevProg.total}`,
        newValue: `${dev.typ}-Vorlage (${nextChecklist.length} Punkte)`,
        userId: currentUser.uid,
        userName: currentUser.name,
        timestamp: serverTimestamp(),
      });

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `devices/${deviceId}`);
      }
    },
    [autostart, currentUser, devices, settings, appendLocalAudit],
  );

  return {
    createDevice,
    createDevicesBatch,
    updateDevice,
    bulkUpdateDeviceStatus,
    handoverDevice,
    returnDevice,
    deleteDevice,
    toggleChecklistItem,
    applyChecklistTemplateToDevice,
  };
}
