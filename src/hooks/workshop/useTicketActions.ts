import { useCallback } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  db,
  handleFirestoreError,
  OperationType,
  timestampToIso,
} from '../../lib/firebase';
import {
  DEFAULT_CHECKLIST_TEMPLATE,
  DEFAULT_LOCATIONS,
  type Ticket,
  type TicketComment,
  type TicketFormInput,
} from '../../types';
import { diffTicketChanges, formatTicketNumber } from '../../lib/domain';
import type { WorkshopCore } from './core';

/** Repair tickets and their comment threads. */
export function useTicketActions(core: WorkshopCore) {
  const {
    autostart,
    currentUser,
    devices,
    tickets,
    staff,
    settings,
    setTickets,
    setSettings,
    setLocalComments,
    localCommentsRef,
    localCommentListenersRef,
    appendLocalAudit,
    reportSnapshotError,
  } = core;

  const createTicket = useCallback(
    async (input: TicketFormInput): Promise<string> => {
      if (!currentUser) throw new Error('Nicht angemeldet');
      const linkedDevice = devices.find((d) => d.id === input.deviceId);
      if (!linkedDevice) throw new Error('Verknüpftes Gerät nicht gefunden.');

      const assignee = staff.find((s) => s.uid === input.zugewiesenAn) ?? null;

      if (autostart) {
        const seq = settings.nextTicketSeq;
        const ticketNr = formatTicketNumber(seq);
        const id = `tck_${Date.now()}`;
        const now = new Date().toISOString();
        const created: Ticket = {
          id,
          ticketNr,
          deviceId: linkedDevice.id,
          deviceAssetTag: linkedDevice.assetTag,
          deviceModel: `${linkedDevice.hersteller} ${linkedDevice.modell}`,
          titel: input.titel.trim(),
          beschreibung: input.beschreibung.trim(),
          kategorie: input.kategorie,
          prioritaet: input.prioritaet,
          status: input.status,
          zugewiesenAn: assignee ? assignee.uid : null,
          zugewiesenAnName: assignee ? assignee.name : null,
          loesung: input.loesung.trim(),
          createdBy: currentUser.uid,
          createdAt: now,
          updatedAt: now,
          closedAt: input.status === 'Geschlossen' ? now : null,
        };
        setTickets((prev) => [created, ...prev]);
        setSettings((prev) => ({ ...prev, nextTicketSeq: seq + 1 }));
        appendLocalAudit({
          entityType: 'ticket',
          entityId: id,
          entityLabel: ticketNr,
          field: 'Ticket erstellt',
          oldValue: '—',
          newValue: `${created.titel} (${linkedDevice.assetTag})`.slice(0, 500),
          userId: currentUser.uid,
          userName: currentUser.name,
        });
        return id;
      }

      const wsRef = doc(db, 'settings', 'workspace');
      const ticketRef = doc(collection(db, 'tickets'));
      const logRef = doc(collection(db, 'auditLogs'));

      try {
        await runTransaction(db, async (tx) => {
          const wsSnap = await tx.get(wsRef);
          const currentSeq = wsSnap.exists() ? Number(wsSnap.data().nextTicketSeq ?? 1) : 1;
          const ticketNr = formatTicketNumber(currentSeq);

          if (wsSnap.exists()) {
            tx.update(wsRef, {
              nextTicketSeq: currentSeq + 1,
              updatedAt: serverTimestamp(),
            });
          } else {
            tx.set(wsRef, {
              locations: DEFAULT_LOCATIONS,
              checklistTemplate: DEFAULT_CHECKLIST_TEMPLATE,
              nextDeviceSeq: 1,
              nextTicketSeq: currentSeq + 1,
              updatedAt: serverTimestamp(),
            });
          }

          tx.set(ticketRef, {
            ticketNr,
            deviceId: linkedDevice.id,
            deviceAssetTag: linkedDevice.assetTag,
            deviceModel: `${linkedDevice.hersteller} ${linkedDevice.modell}`.slice(0, 160),
            titel: input.titel.trim(),
            beschreibung: input.beschreibung.trim(),
            kategorie: input.kategorie,
            prioritaet: input.prioritaet,
            status: input.status,
            zugewiesenAn: assignee ? assignee.uid : null,
            zugewiesenAnName: assignee ? assignee.name : null,
            loesung: input.loesung.trim(),
            createdBy: currentUser.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            closedAt: input.status === 'Geschlossen' ? serverTimestamp() : null,
          });

          tx.set(logRef, {
            entityType: 'ticket',
            entityId: ticketRef.id,
            entityLabel: ticketNr,
            field: 'Ticket erstellt',
            oldValue: '—',
            newValue: `${input.titel.trim()} (${linkedDevice.assetTag})`.slice(0, 500),
            userId: currentUser.uid,
            userName: currentUser.name,
            timestamp: serverTimestamp(),
          });
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'tickets');
      }

      return ticketRef.id;
    },
    [autostart, currentUser, devices, staff, settings.nextTicketSeq, appendLocalAudit],
  );

  const updateTicket = useCallback(
    async (
      ticketId: string,
      patch: Partial<
        Pick<
          Ticket,
          | 'titel'
          | 'beschreibung'
          | 'kategorie'
          | 'prioritaet'
          | 'status'
          | 'zugewiesenAn'
          | 'zugewiesenAnName'
          | 'loesung'
        >
      >,
    ): Promise<void> => {
      if (!currentUser) throw new Error('Nicht angemeldet');
      const existing = tickets.find((ticket) => ticket.id === ticketId);
      if (!existing) throw new Error('Ticket nicht gefunden');

      const nextStatus = patch.status ?? existing.status;
      const isClosing = nextStatus === 'Geschlossen' && existing.status !== 'Geschlossen';
      const isReopening = nextStatus !== 'Geschlossen' && existing.status === 'Geschlossen';

      const changes = diffTicketChanges(existing, patch);

      if (autostart) {
        const now = new Date().toISOString();
        setTickets((prev) =>
          prev.map((ticket) =>
            ticket.id === ticketId
              ? {
                  ...ticket,
                  ...patch,
                  updatedAt: now,
                  closedAt: isClosing ? now : isReopening ? null : ticket.closedAt,
                }
              : ticket,
          ),
        );
        changes.forEach((ch) => {
          appendLocalAudit({
            entityType: 'ticket',
            entityId: ticketId,
            entityLabel: existing.ticketNr,
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
      const updatePayload: Record<string, unknown> = {
        ...patch,
        updatedAt: serverTimestamp(),
      };
      if (isClosing) {
        updatePayload.closedAt = serverTimestamp();
      } else if (isReopening) {
        updatePayload.closedAt = null;
      }

      batch.update(doc(db, 'tickets', ticketId), updatePayload);
      for (const ch of changes) {
        batch.set(doc(collection(db, 'auditLogs')), {
          entityType: 'ticket',
          entityId: ticketId,
          entityLabel: existing.ticketNr,
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
        handleFirestoreError(err, OperationType.UPDATE, `tickets/${ticketId}`);
      }
    },
    [autostart, currentUser, tickets, appendLocalAudit],
  );

  const deleteTicket = useCallback(
    async (ticketId: string): Promise<void> => {
      if (!currentUser || currentUser.role !== 'Admin') {
        throw new Error('Nur Administratoren können Tickets löschen.');
      }
      if (autostart) {
        setTickets((prev) => prev.filter((ticket) => ticket.id !== ticketId));
        return;
      }
      try {
        await deleteDoc(doc(db, 'tickets', ticketId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `tickets/${ticketId}`);
      }
    },
    [autostart, currentUser],
  );

  const subscribeTicketComments = useCallback(
    (ticketId: string, onUpdate: (comments: TicketComment[]) => void) => {
      if (autostart) {
        let listeners = localCommentListenersRef.current.get(ticketId);
        if (!listeners) {
          listeners = new Set();
          localCommentListenersRef.current.set(ticketId, listeners);
        }
        listeners.add(onUpdate);
        onUpdate(localCommentsRef.current[ticketId] ?? []);
        return () => {
          listeners?.delete(onUpdate);
        };
      }
      const q = query(
        collection(db, 'tickets', ticketId, 'comments'),
        orderBy('createdAt', 'asc'),
      );
      return onSnapshot(
        q,
        (snap) => {
          const list: TicketComment[] = snap.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              ticketId: d.ticketId,
              authorId: d.authorId,
              authorName: d.authorName,
              text: d.text,
              createdAt: timestampToIso(d.createdAt),
            };
          });
          onUpdate(list);
        },
        (err) => reportSnapshotError(err, OperationType.LIST, `tickets/${ticketId}/comments`),
      );
    },
    [autostart, reportSnapshotError],
  );

  const addTicketComment = useCallback(
    async (ticketId: string, text: string): Promise<void> => {
      if (!currentUser) throw new Error('Nicht angemeldet');
      const trimmed = text.trim();
      if (!trimmed) return;

      if (autostart) {
        const comment: TicketComment = {
          id: `cmt_${Date.now()}`,
          ticketId,
          authorId: currentUser.uid,
          authorName: currentUser.name,
          text: trimmed,
          createdAt: new Date().toISOString(),
        };
        const nextList = [...(localCommentsRef.current[ticketId] ?? []), comment];
        localCommentsRef.current = {
          ...localCommentsRef.current,
          [ticketId]: nextList,
        };
        setLocalComments(localCommentsRef.current);
        localCommentListenersRef.current.get(ticketId)?.forEach((cb) => cb(nextList));
        return;
      }

      try {
        const cRef = doc(collection(db, 'tickets', ticketId, 'comments'));
        await setDoc(cRef, {
          ticketId,
          authorId: currentUser.uid,
          authorName: currentUser.name,
          text: trimmed,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `tickets/${ticketId}/comments`);
      }
    },
    [autostart, currentUser],
  );

  return {
    createTicket,
    updateTicket,
    deleteTicket,
    subscribeTicketComments,
    addTicketComment,
  };
}
