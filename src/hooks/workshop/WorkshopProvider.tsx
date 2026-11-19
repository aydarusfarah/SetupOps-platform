import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  testConnection,
  timestampToIso,
} from '../../lib/firebase';
import {
  DEFAULT_CHECKLIST_TEMPLATE,
  DEFAULT_CHECKLIST_TEMPLATES_BY_TYPE,
  DEFAULT_LOCATIONS,
  type AppUser,
  type AuditLogEntry,
  type Device,
  type DeviceType,
  type PublicStaffMember,
  type Ticket,
  type TicketComment,
  type UserRole,
  type WorkspaceSettings,
} from '../../types';
import { buildLocalDemoState } from '../../lib/demoData';
import { WorkshopContext, type WorkshopContextValue } from './context';
import type { WorkshopCore } from './core';
import { useAdminActions } from './useAdminActions';
import { useDeviceActions } from './useDeviceActions';
import { useTicketActions } from './useTicketActions';

const DEFAULT_SETTINGS: WorkspaceSettings = {
  locations: DEFAULT_LOCATIONS,
  checklistTemplate: DEFAULT_CHECKLIST_TEMPLATE,
  checklistTemplatesByType: DEFAULT_CHECKLIST_TEMPLATES_BY_TYPE,
  nextDeviceSeq: 1,
  nextTicketSeq: 1,
  updatedAt: new Date().toISOString(),
};

function isAutostartMode(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('autostart') === '1';
}

function isAutostartEmptyMode(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('empty') === '1';
}

/** Owns workshop state: auth session, Firestore subscriptions (or the local demo session). */
export function WorkshopProvider({ children }: { children: React.ReactNode }) {
  const autostart = useMemo(() => isAutostartMode(), []);
  const autostartEmpty = useMemo(() => isAutostartEmptyMode(), []);

  const [authReady, setAuthReady] = useState(autostart);
  const [dataLoading, setDataLoading] = useState(!autostart);
  const [firestoreError, setFirestoreError] = useState<Error | null>(null);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    if (!autostart) return null;
    return {
      uid: 'demo_admin_uid',
      name: 'Lukas Weber',
      email: 'lukas.weber@setupops.local',
      role: 'Admin',
      photoURL: null,
      createdAt: new Date().toISOString(),
    };
  });

  const [devices, setDevices] = useState<Device[]>(() => {
    if (!autostart || autostartEmpty) return [];
    return buildLocalDemoState('demo_admin_uid', 'Lukas Weber').devices;
  });
  const [tickets, setTickets] = useState<Ticket[]>(() => {
    if (!autostart || autostartEmpty) return [];
    return buildLocalDemoState('demo_admin_uid', 'Lukas Weber').tickets;
  });
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    if (!autostart || autostartEmpty) return [];
    return buildLocalDemoState('demo_admin_uid', 'Lukas Weber').auditLogs;
  });
  const [localComments, setLocalComments] = useState<Record<string, TicketComment[]>>(() => {
    if (!autostart || autostartEmpty) return {};
    return buildLocalDemoState('demo_admin_uid', 'Lukas Weber').commentsByTicket;
  });
  const localCommentsRef = useRef(localComments);
  localCommentsRef.current = localComments;
  const localCommentListenersRef = useRef<Map<string, Set<(comments: TicketComment[]) => void>>>(
    new Map(),
  );

  const reportSnapshotError = useCallback(
    (err: unknown, op: OperationType, path: string) => {
      setDataLoading(false);
      try {
        handleFirestoreError(err, op, path);
      } catch (wrapped) {
        setFirestoreError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    },
    [],
  );
  const [staff, setStaff] = useState<PublicStaffMember[]>(() => {
    if (!autostart) return [];
    return [
      {
        uid: 'demo_admin_uid',
        name: 'Lukas Weber',
        role: 'Admin',
        photoURL: null,
        createdAt: new Date().toISOString(),
      },
      {
        uid: 'demo_tech_uid',
        name: 'Hannah Becker',
        role: 'Techniker',
        photoURL: null,
        createdAt: new Date().toISOString(),
      },
    ];
  });
  const [allUsers, setAllUsers] = useState<AppUser[]>(() => {
    if (!autostart) return [];
    return [
      {
        uid: 'demo_admin_uid',
        name: 'Lukas Weber',
        email: 'lukas.weber@setupops.local',
        role: 'Admin',
        photoURL: null,
        createdAt: new Date().toISOString(),
      },
      {
        uid: 'demo_tech_uid',
        name: 'Hannah Becker',
        email: 'hannah.becker@setupops.local',
        role: 'Techniker',
        photoURL: null,
        createdAt: new Date().toISOString(),
      },
    ];
  });
  const [settings, setSettings] = useState<WorkspaceSettings>(() => {
    if (!autostart || autostartEmpty) return DEFAULT_SETTINGS;
    return {
      ...DEFAULT_SETTINGS,
      nextDeviceSeq: 13,
      nextTicketSeq: 9,
    };
  });

  useEffect(() => {
    if (autostart) return;
    void testConnection();
  }, [autostart]);

  const ensureUserProfile = useCallback(async (fbUser: FirebaseUser): Promise<AppUser> => {
    const userRef = doc(db, 'users', fbUser.uid);
    let existingSnap;
    try {
      existingSnap = await getDoc(userRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${fbUser.uid}`);
    }

    if (existingSnap && existingSnap.exists()) {
      const d = existingSnap.data();
      return {
        uid: d.uid,
        name: d.name,
        email: d.email,
        role: d.role,
        photoURL: d.photoURL ?? null,
        createdAt: timestampToIso(d.createdAt),
      };
    }

    const bootstrapRef = doc(db, 'settings', 'bootstrap');
    let bootstrapExists = false;
    try {
      const bootSnap = await getDoc(bootstrapRef);
      bootstrapExists = bootSnap.exists();
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'settings/bootstrap');
    }

    const tokenResult = await fbUser.getIdTokenResult();
    const hasAdminClaim = tokenResult.claims.admin === true;
    const assignedRole: UserRole = !bootstrapExists || hasAdminClaim ? 'Admin' : 'Techniker';
    const displayName = fbUser.displayName?.trim() || fbUser.email?.split('@')[0] || 'Techniker';
    const email = fbUser.email || '';

    const batch = writeBatch(db);
    if (!bootstrapExists) {
      batch.set(bootstrapRef, {
        adminUid: fbUser.uid,
        initializedAt: serverTimestamp(),
      });
    }
    batch.set(userRef, {
      uid: fbUser.uid,
      name: displayName,
      email,
      role: assignedRole,
      photoURL: fbUser.photoURL ?? null,
      createdAt: serverTimestamp(),
    });
    batch.set(doc(db, 'users_public', fbUser.uid), {
      uid: fbUser.uid,
      name: displayName,
      role: assignedRole,
      photoURL: fbUser.photoURL ?? null,
      createdAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${fbUser.uid}`);
    }

    // Ensure workspace settings exist for the very first user
    try {
      const wsRef = doc(db, 'settings', 'workspace');
      const wsSnap = await getDoc(wsRef);
      if (!wsSnap.exists()) {
        await setDoc(wsRef, {
          locations: DEFAULT_LOCATIONS,
          checklistTemplate: DEFAULT_CHECKLIST_TEMPLATE,
          nextDeviceSeq: 1,
          nextTicketSeq: 1,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/workspace');
    }

    return {
      uid: fbUser.uid,
      name: displayName,
      email,
      role: assignedRole,
      photoURL: fbUser.photoURL ?? null,
      createdAt: new Date().toISOString(),
    };
  }, []);

  useEffect(() => {
    if (autostart) return;

    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setCurrentUser(null);
        setDevices([]);
        setTickets([]);
        setAuditLogs([]);
        setStaff([]);
        setAllUsers([]);
        setAuthReady(true);
        setDataLoading(false);
        return;
      }

      try {
        const profile = await ensureUserProfile(fbUser);
        setCurrentUser(profile);
      } catch (err) {
        console.error('Failed to ensure user profile:', err);
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsubAuth();
  }, [autostart, ensureUserProfile]);

  useEffect(() => {
    if (autostart || !authReady || !currentUser) return;

    setFirestoreError(null);
    setDataLoading(true);
    const unsubs: Unsubscribe[] = [];

    // 1. Current user live role updates
    unsubs.push(
      onSnapshot(
        doc(db, 'users', currentUser.uid),
        (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            const nextPhoto = d.photoURL ?? null;
            setCurrentUser((prev) => {
              if (
                prev &&
                prev.uid === d.uid &&
                prev.name === d.name &&
                prev.email === d.email &&
                prev.role === d.role &&
                prev.photoURL === nextPhoto
              ) {
                return prev;
              }
              return {
                uid: d.uid,
                name: d.name,
                email: d.email,
                role: d.role,
                photoURL: nextPhoto,
                createdAt: timestampToIso(d.createdAt),
              };
            });
          }
        },
        (err) => reportSnapshotError(err, OperationType.GET, `users/${currentUser.uid}`),
      ),
    );

    // 2. Devices
    unsubs.push(
      onSnapshot(
        query(collection(db, 'devices'), orderBy('createdAt', 'desc')),
        (snap) => {
          const list: Device[] = snap.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              assetTag: d.assetTag,
              typ: d.typ,
              hersteller: d.hersteller,
              modell: d.modell,
              seriennummer: d.seriennummer,
              cpu: d.cpu ?? '',
              ramGB: Number(d.ramGB ?? 0),
              speicherTyp: d.speicherTyp,
              speicherGB: Number(d.speicherGB ?? 0),
              betriebssystem: d.betriebssystem,
              status: d.status,
              standort: d.standort,
              notizen: d.notizen ?? '',
              checklist: Array.isArray(d.checklist) ? d.checklist : [],
              handover: d.handover ?? null,
              createdAt: timestampToIso(d.createdAt),
              updatedAt: timestampToIso(d.updatedAt),
              createdBy: d.createdBy,
              createdByName: d.createdByName,
            };
          });
          setDevices(list);
          setDataLoading(false);
        },
        (err) => reportSnapshotError(err, OperationType.LIST, 'devices'),
      ),
    );

    // 3. Tickets
    unsubs.push(
      onSnapshot(
        query(collection(db, 'tickets'), orderBy('createdAt', 'desc')),
        (snap) => {
          const list: Ticket[] = snap.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              ticketNr: d.ticketNr,
              deviceId: d.deviceId,
              deviceAssetTag: d.deviceAssetTag,
              deviceModel: d.deviceModel,
              titel: d.titel,
              beschreibung: d.beschreibung,
              kategorie: d.kategorie,
              prioritaet: d.prioritaet,
              status: d.status,
              zugewiesenAn: d.zugewiesenAn ?? null,
              zugewiesenAnName: d.zugewiesenAnName ?? null,
              loesung: d.loesung ?? '',
              createdBy: d.createdBy,
              createdAt: timestampToIso(d.createdAt),
              updatedAt: timestampToIso(d.updatedAt),
              closedAt: d.closedAt ? timestampToIso(d.closedAt) : null,
            };
          });
          setTickets(list);
        },
        (err) => reportSnapshotError(err, OperationType.LIST, 'tickets'),
      ),
    );

    // 4. Audit logs
    unsubs.push(
      onSnapshot(
        query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(200)),
        (snap) => {
          const list: AuditLogEntry[] = snap.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              entityType: d.entityType,
              entityId: d.entityId,
              entityLabel: d.entityLabel,
              field: d.field,
              oldValue: d.oldValue,
              newValue: d.newValue,
              userId: d.userId,
              userName: d.userName,
              timestamp: timestampToIso(d.timestamp),
            };
          });
          setAuditLogs(list);
        },
        (err) => reportSnapshotError(err, OperationType.LIST, 'auditLogs'),
      ),
    );

    // 5. Public staff directory
    unsubs.push(
      onSnapshot(
        collection(db, 'users_public'),
        (snap) => {
          const list: PublicStaffMember[] = snap.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              uid: d.uid,
              name: d.name,
              role: d.role,
              photoURL: d.photoURL ?? null,
              createdAt: timestampToIso(d.createdAt),
            };
          });
          setStaff(list);
        },
        (err) => reportSnapshotError(err, OperationType.LIST, 'users_public'),
      ),
    );

    // 6. Workspace settings
    unsubs.push(
      onSnapshot(
        doc(db, 'settings', 'workspace'),
        (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            const baseChecklist = Array.isArray(d.checklistTemplate)
              ? d.checklistTemplate
              : DEFAULT_CHECKLIST_TEMPLATE;
            const byTypeRaw =
              d.checklistTemplatesByType && typeof d.checklistTemplatesByType === 'object'
                ? (d.checklistTemplatesByType as Partial<Record<DeviceType, string[]>>)
                : {};
            setSettings({
              locations: Array.isArray(d.locations) ? d.locations : DEFAULT_LOCATIONS,
              checklistTemplate: baseChecklist,
              checklistTemplatesByType: {
                ...DEFAULT_CHECKLIST_TEMPLATES_BY_TYPE,
                Laptop: baseChecklist,
                ...byTypeRaw,
              },
              nextDeviceSeq: Number(d.nextDeviceSeq ?? 1),
              nextTicketSeq: Number(d.nextTicketSeq ?? 1),
              updatedAt: timestampToIso(d.updatedAt),
            });
          }
        },
        (err) => reportSnapshotError(err, OperationType.GET, 'settings/workspace'),
      ),
    );

    // 7. Full user list with emails (Admin only)
    if (currentUser.role === 'Admin') {
      unsubs.push(
        onSnapshot(
          collection(db, 'users'),
          (snap) => {
            const list: AppUser[] = snap.docs.map((docSnap) => {
              const d = docSnap.data();
              return {
                uid: d.uid,
                name: d.name,
                email: d.email,
                role: d.role,
                photoURL: d.photoURL ?? null,
                createdAt: timestampToIso(d.createdAt),
              };
            });
            setAllUsers(list);
          },
          (err) => reportSnapshotError(err, OperationType.LIST, 'users'),
        ),
      );
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [autostart, authReady, currentUser?.uid, currentUser?.role, reportSnapshotError]);

  const signInWithGoogle = useCallback(async () => {
    if (autostart) return;
    await signInWithPopup(auth, googleProvider);
  }, [autostart]);

  const signOut = useCallback(async () => {
    if (autostart) {
      setCurrentUser(null);
      return;
    }
    await firebaseSignOut(auth);
  }, [autostart]);

  const appendLocalAudit = useCallback(
    (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => {
      const full: AuditLogEntry = {
        ...entry,
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
      };
      setAuditLogs((prev) => [full, ...prev]);
    },
    [],
  );

  const core: WorkshopCore = {
    autostart,
    currentUser,
    devices,
    tickets,
    staff,
    settings,
    setCurrentUser,
    setDevices,
    setTickets,
    setStaff,
    setAllUsers,
    setSettings,
    setAuditLogs,
    setLocalComments,
    localCommentsRef,
    localCommentListenersRef,
    appendLocalAudit,
    reportSnapshotError,
  };
  const {
    createDevice,
    createDevicesBatch,
    updateDevice,
    bulkUpdateDeviceStatus,
    handoverDevice,
    returnDevice,
    deleteDevice,
    toggleChecklistItem,
    applyChecklistTemplateToDevice,
  } = useDeviceActions(core);
  const {
    createTicket,
    updateTicket,
    deleteTicket,
    subscribeTicketComments,
    addTicketComment,
  } = useTicketActions(core);
  const {
    updateUserRole,
    updateWorkspaceSettings,
    seedDemoData,
  } = useAdminActions(core);

  const value: WorkshopContextValue = useMemo(
    () => ({
      currentUser,
      authReady,
      dataLoading,
      isPreviewAutostart: autostart,
      devices,
      tickets,
      auditLogs,
      staff,
      allUsers,
      settings,
      signInWithGoogle,
      signOut,
      createDevice,
      createDevicesBatch,
      updateDevice,
      bulkUpdateDeviceStatus,
      handoverDevice,
      returnDevice,
      deleteDevice,
      toggleChecklistItem,
      applyChecklistTemplateToDevice,
      createTicket,
      updateTicket,
      deleteTicket,
      subscribeTicketComments,
      addTicketComment,
      updateUserRole,
      updateWorkspaceSettings,
      seedDemoData,
    }),
    [
      currentUser,
      authReady,
      dataLoading,
      autostart,
      devices,
      tickets,
      auditLogs,
      staff,
      allUsers,
      settings,
      signInWithGoogle,
      signOut,
      createDevice,
      createDevicesBatch,
      updateDevice,
      bulkUpdateDeviceStatus,
      handoverDevice,
      returnDevice,
      deleteDevice,
      toggleChecklistItem,
      applyChecklistTemplateToDevice,
      createTicket,
      updateTicket,
      deleteTicket,
      subscribeTicketComments,
      addTicketComment,
      updateUserRole,
      updateWorkspaceSettings,
      seedDemoData,
    ],
  );

  if (firestoreError) {
    throw firestoreError;
  }

  return <WorkshopContext.Provider value={value}>{children}</WorkshopContext.Provider>;
}
