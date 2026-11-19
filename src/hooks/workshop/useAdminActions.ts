import { useCallback } from 'react';
import {
  collection,
  doc,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { DEFAULT_CHECKLIST_TEMPLATES_BY_TYPE, type DeviceType, type UserRole } from '../../types';
import { buildDemoSeedPayload, buildLocalDemoState } from '../../lib/demoData';
import type { WorkshopCore } from './core';

/** Admin-only operations: roles, workspace settings, demo seeding. */
export function useAdminActions(core: WorkshopCore) {
  const {
    autostart,
    currentUser,
    devices,
    tickets,
    settings,
    setCurrentUser,
    setDevices,
    setTickets,
    setStaff,
    setAllUsers,
    setSettings,
    setAuditLogs,
    setLocalComments,
  } = core;

  const updateUserRole = useCallback(
    async (uid: string, role: UserRole): Promise<void> => {
      if (!currentUser || currentUser.role !== 'Admin') {
        throw new Error('Nur Administratoren dürfen Rollen ändern.');
      }
      if (autostart) {
        setAllUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, role } : u)));
        setStaff((prev) => prev.map((u) => (u.uid === uid ? { ...u, role } : u)));
        if (currentUser.uid === uid) {
          setCurrentUser((prev) => (prev ? { ...prev, role } : prev));
        }
        return;
      }

      const batch = writeBatch(db);
      batch.update(doc(db, 'users', uid), { role });
      batch.update(doc(db, 'users_public', uid), { role });
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
      }
    },
    [autostart, currentUser],
  );

  const updateWorkspaceSettings = useCallback(
    async (patch: {
      locations?: string[];
      checklistTemplate?: string[];
      checklistTemplatesByType?: Partial<Record<DeviceType, string[]>>;
    }): Promise<void> => {
      if (!currentUser || currentUser.role !== 'Admin') {
        throw new Error('Nur Administratoren können Werkstatteinstellungen bearbeiten.');
      }
      const nextByType = patch.checklistTemplatesByType
        ? {
            ...(settings.checklistTemplatesByType ?? DEFAULT_CHECKLIST_TEMPLATES_BY_TYPE),
            ...patch.checklistTemplatesByType,
          }
        : undefined;
      const syncedLaptopTemplate =
        patch.checklistTemplate ?? nextByType?.Laptop ?? undefined;

      if (autostart) {
        setSettings((prev) => ({
          ...prev,
          locations: patch.locations ?? prev.locations,
          checklistTemplate: syncedLaptopTemplate ?? prev.checklistTemplate,
          checklistTemplatesByType: nextByType ?? prev.checklistTemplatesByType,
          updatedAt: new Date().toISOString(),
        }));
        return;
      }

      try {
        await updateDoc(doc(db, 'settings', 'workspace'), {
          ...(patch.locations ? { locations: patch.locations } : {}),
          ...(syncedLaptopTemplate ? { checklistTemplate: syncedLaptopTemplate } : {}),
          ...(nextByType ? { checklistTemplatesByType: nextByType } : {}),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, 'settings/workspace');
      }
    },
    [autostart, currentUser, settings.checklistTemplatesByType],
  );

  const seedDemoData = useCallback(async (): Promise<void> => {
    if (!currentUser) throw new Error('Nicht angemeldet');
    if (devices.length > 0) return;

    if (autostart) {
      const demo = buildLocalDemoState(currentUser.uid, currentUser.name);
      setDevices(demo.devices);
      setTickets(demo.tickets);
      setLocalComments(demo.commentsByTicket);
      setAuditLogs(demo.auditLogs);
      setSettings((prev) => ({
        ...prev,
        nextDeviceSeq: 13,
        nextTicketSeq: 9,
      }));
      return;
    }

    const seed = buildDemoSeedPayload(currentUser.uid, currentUser.name);

    // Batch 1: devices + workspace counter update (must commit before tickets so rules exists(/devices/...) succeeds)
    const batch1 = writeBatch(db);
    for (const d of seed.devices) {
      batch1.set(doc(db, 'devices', d.id), {
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
        checklist: d.checklist,
        handover: d.handover ?? null,
        createdBy: currentUser.uid,
        createdByName: currentUser.name,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    batch1.set(doc(db, 'settings', 'workspace'), {
      locations: settings.locations,
      checklistTemplate: settings.checklistTemplate,
      checklistTemplatesByType:
        settings.checklistTemplatesByType ?? DEFAULT_CHECKLIST_TEMPLATES_BY_TYPE,
      nextDeviceSeq: 13,
      nextTicketSeq: 9,
      updatedAt: serverTimestamp(),
    });

    try {
      await batch1.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'devices');
    }

    // Batch 2: tickets + audit logs
    const batch2 = writeBatch(db);
    for (const t of seed.tickets) {
      batch2.set(doc(db, 'tickets', t.id), {
        ticketNr: t.ticketNr,
        deviceId: t.deviceId,
        deviceAssetTag: t.deviceAssetTag,
        deviceModel: t.deviceModel,
        titel: t.titel,
        beschreibung: t.beschreibung,
        kategorie: t.kategorie,
        prioritaet: t.prioritaet,
        status: t.status,
        zugewiesenAn: currentUser.uid,
        zugewiesenAnName: currentUser.name,
        loesung: t.loesung,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        closedAt: t.status === 'Geschlossen' ? serverTimestamp() : null,
      });
    }
    for (const log of seed.auditLogs) {
      batch2.set(doc(collection(db, 'auditLogs')), {
        ...log,
        userId: currentUser.uid,
        userName: currentUser.name,
        timestamp: serverTimestamp(),
      });
    }

    try {
      await batch2.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'tickets');
    }

    // Batch 3: comments
    const batch3 = writeBatch(db);
    for (const c of seed.comments) {
      batch3.set(doc(collection(db, 'tickets', c.ticketId, 'comments')), {
        ticketId: c.ticketId,
        authorId: currentUser.uid,
        authorName: currentUser.name,
        text: c.text,
        createdAt: serverTimestamp(),
      });
    }
    try {
      await batch3.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'tickets/comments');
    }
  }, [
    autostart,
    currentUser,
    devices.length,
    settings.locations,
    settings.checklistTemplate,
    settings.checklistTemplatesByType,
  ]);

  return {
    updateUserRole,
    updateWorkspaceSettings,
    seedDemoData,
  };
}
