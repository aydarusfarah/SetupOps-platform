import { createContext, useContext } from 'react';
import {
  type AppUser,
  type AuditLogEntry,
  type Device,
  type DeviceFormInput,
  type DeviceStatus,
  type DeviceType,
  type HandoverInput,
  type PublicStaffMember,
  type Ticket,
  type TicketComment,
  type TicketFormInput,
  type UserRole,
  type WorkspaceSettings,
} from '../../types';

export interface WorkshopContextValue {
  currentUser: AppUser | null;
  authReady: boolean;
  dataLoading: boolean;
  isPreviewAutostart: boolean;
  devices: Device[];
  tickets: Ticket[];
  auditLogs: AuditLogEntry[];
  staff: PublicStaffMember[];
  allUsers: AppUser[];
  settings: WorkspaceSettings;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  createDevice: (input: DeviceFormInput) => Promise<string>;
  createDevicesBatch: (
    baseInput: Omit<DeviceFormInput, 'seriennummer'>,
    serials: string[],
  ) => Promise<Array<{ id: string; assetTag: string }>>;
  updateDevice: (deviceId: string, input: DeviceFormInput) => Promise<void>;
  bulkUpdateDeviceStatus: (deviceIds: string[], status: DeviceStatus) => Promise<void>;
  handoverDevice: (deviceId: string, input: HandoverInput) => Promise<void>;
  returnDevice: (deviceId: string, returnLocation: string, notes?: string) => Promise<void>;
  deleteDevice: (deviceId: string) => Promise<void>;
  toggleChecklistItem: (deviceId: string, itemId: string, checked: boolean) => Promise<void>;
  applyChecklistTemplateToDevice: (deviceId: string) => Promise<void>;
  createTicket: (input: TicketFormInput) => Promise<string>;
  updateTicket: (
    ticketId: string,
    patch: Partial<
      Pick<
        Ticket,
        'titel' | 'beschreibung' | 'kategorie' | 'prioritaet' | 'status' | 'zugewiesenAn' | 'zugewiesenAnName' | 'loesung'
      >
    >,
  ) => Promise<void>;
  deleteTicket: (ticketId: string) => Promise<void>;
  subscribeTicketComments: (
    ticketId: string,
    onUpdate: (comments: TicketComment[]) => void,
  ) => () => void;
  addTicketComment: (ticketId: string, text: string) => Promise<void>;
  updateUserRole: (uid: string, role: UserRole) => Promise<void>;
  updateWorkspaceSettings: (patch: {
    locations?: string[];
    checklistTemplate?: string[];
    checklistTemplatesByType?: Partial<Record<DeviceType, string[]>>;
  }) => Promise<void>;
  seedDemoData: () => Promise<void>;
}

export const WorkshopContext = createContext<WorkshopContextValue | null>(null);

export function useWorkshopData() {
  const ctx = useContext(WorkshopContext);
  if (!ctx) throw new Error('useWorkshopData must be used within WorkshopProvider');
  return ctx;
}
