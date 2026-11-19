import type React from 'react';
import type {
  AppUser,
  AuditLogEntry,
  Device,
  PublicStaffMember,
  Ticket,
  TicketComment,
  WorkspaceSettings,
} from '../../types';
import type { OperationType } from '../../lib/firebase';

type Setter<T> = React.Dispatch<React.SetStateAction<T>>;

/**
 * Shared state handed from the provider to the domain action hooks.
 * `autostart` = local demo session (`?autostart=1`) with no Firestore access.
 */
export interface WorkshopCore {
  autostart: boolean;
  currentUser: AppUser | null;
  devices: Device[];
  tickets: Ticket[];
  staff: PublicStaffMember[];
  settings: WorkspaceSettings;
  setCurrentUser: Setter<AppUser | null>;
  setDevices: Setter<Device[]>;
  setTickets: Setter<Ticket[]>;
  setStaff: Setter<PublicStaffMember[]>;
  setAllUsers: Setter<AppUser[]>;
  setSettings: Setter<WorkspaceSettings>;
  setAuditLogs: Setter<AuditLogEntry[]>;
  setLocalComments: Setter<Record<string, TicketComment[]>>;
  localCommentsRef: React.MutableRefObject<Record<string, TicketComment[]>>;
  localCommentListenersRef: React.MutableRefObject<Map<string, Set<(comments: TicketComment[]) => void>>>;
  appendLocalAudit: (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => void;
  reportSnapshotError: (err: unknown, op: OperationType, path: string) => void;
}
