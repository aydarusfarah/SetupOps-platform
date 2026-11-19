import { useState } from 'react';
import {
  Download,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Shield,
  MapPin,
  ClipboardList,
  RotateCcw,
} from 'lucide-react';
import { useWorkshopData } from '../hooks/useWorkshopData';
import { useToast } from '../hooks/useToast';
import { useLanguage } from '../hooks/useLanguage';
import { trChecklistLabel, trDeviceType, trUserRole } from '../i18n/labels';
import {
  generateDevicesCsv,
  generateTicketsCsv,
  getChecklistTemplateForType,
} from '../lib/domain';
import {
  DEFAULT_CHECKLIST_TEMPLATES_BY_TYPE,
  DEVICE_TYPES,
  type DeviceType,
  type UserRole,
} from '../types';
import { useT } from '../i18n';

function triggerCsvDownload(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function SettingsPage() {
  const {
    currentUser,
    allUsers,
    settings,
    devices,
    tickets,
    updateUserRole,
    updateWorkspaceSettings,
  } = useWorkshopData();
  const { showToast } = useToast();
  const { lang } = useLanguage();
  const t = useT();

  const isAdmin = currentUser?.role === 'Admin';
  const [newLocation, setNewLocation] = useState('');
  const [selectedChecklistType, setSelectedChecklistType] = useState<DeviceType>('Laptop');
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [saving, setSaving] = useState(false);

  const activeChecklistTemplate = getChecklistTemplateForType(
    settings,
    selectedChecklistType,
  );

  const handleRoleChange = async (uid: string, role: UserRole) => {
    try {
      await updateUserRole(uid, role);
      showToast(t('settings.userRoleUpdated'), 'success');
    } catch (err) {
      showToast(
        t('settings.roleUpdateFailed'),
        'error',
        err instanceof Error ? err.message : undefined,
      );
    }
  };

  const handleAddLocation = async () => {
    const trimmed = newLocation.trim();
    if (!trimmed) return;
    if (settings.locations.includes(trimmed)) {
      showToast(t('settings.locationAlreadyExists'), 'info');
      return;
    }
    setSaving(true);
    try {
      await updateWorkspaceSettings({ locations: [...settings.locations, trimmed] });
      setNewLocation('');
      showToast(t('settings.locationAdded'), 'success');
    } catch (err) {
      showToast(
        t('settings.saveFailed'),
        'error',
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveLocation = async (loc: string) => {
    setSaving(true);
    try {
      await updateWorkspaceSettings({
        locations: settings.locations.filter((l) => l !== loc),
      });
      showToast(t('settings.locationRemoved'), 'success');
    } catch (err) {
      showToast(
        t('settings.removeFailed'),
        'error',
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAddChecklistItem = async () => {
    const trimmed = newChecklistItem.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await updateWorkspaceSettings({
        checklistTemplatesByType: {
          [selectedChecklistType]: [...activeChecklistTemplate, trimmed],
        },
      });
      setNewChecklistItem('');
      showToast(t('settings.checklistStepAdded'), 'success');
    } catch (err) {
      showToast(
        t('settings.saveFailed'),
        'error',
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setSaving(false);
    }
  };

  const handleMoveChecklistItem = async (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= activeChecklistTemplate.length) return;
    const next = [...activeChecklistTemplate];
    const [moved] = next.splice(idx, 1);
    next.splice(target, 0, moved);
    setSaving(true);
    try {
      await updateWorkspaceSettings({
        checklistTemplatesByType: {
          [selectedChecklistType]: next,
        },
      });
    } catch (err) {
      showToast(
        t('settings.couldNotSaveOrder'),
        'error',
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveChecklistItem = async (idx: number) => {
    const next = activeChecklistTemplate.filter((_, i) => i !== idx);
    setSaving(true);
    try {
      await updateWorkspaceSettings({
        checklistTemplatesByType: {
          [selectedChecklistType]: next,
        },
      });
      showToast(t('settings.checklistStepRemoved'), 'success');
    } catch (err) {
      showToast(
        t('settings.removeFailed'),
        'error',
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setSaving(false);
    }
  };

  const handleResetTypeTemplate = async () => {
    setSaving(true);
    try {
      await updateWorkspaceSettings({
        checklistTemplatesByType: {
          [selectedChecklistType]: DEFAULT_CHECKLIST_TEMPLATES_BY_TYPE[selectedChecklistType],
        },
      });
      showToast(
        t('settings.resetValueTemplateToDefault', { value: trDeviceType(selectedChecklistType, lang) }),
        'success',
      );
    } catch (err) {
      showToast(
        t('settings.resetFailed'),
        'error',
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">
          {t('settings.settings')}
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          {t('settings.userRolesWorkshopLocationsChecklist')}
        </p>
      </div>

      {/* Export Section */}
      <section className="rounded-card border border-line bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Download className="h-4 w-4 text-accent" />
          <h2 className="text-base font-semibold text-fg">
            {t('settings.csvExportExcelCompatibleUtf')}
          </h2>
        </div>
        <p className="mt-1.5 text-sm text-fg-muted">
          {t('settings.exportsCurrentWorkshopInventoryWith')}
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              triggerCsvDownload(
                `setupops-devices-${new Date().toISOString().slice(0, 10)}.csv`,
                generateDevicesCsv(devices, lang),
              );
              showToast(
                t('settings.devicesCsvDownloaded'),
                'success',
              );
            }}
            className="inline-flex items-center gap-2 rounded-input bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
          >
            <Download className="h-4 w-4" />
            {t('settings.exportDevicesDevicescount', { devicesCount: devices.length })}
          </button>

          <button
            type="button"
            onClick={() => {
              triggerCsvDownload(
                `setupops-tickets-${new Date().toISOString().slice(0, 10)}.csv`,
                generateTicketsCsv(tickets, lang),
              );
              showToast(
                t('settings.ticketsCsvDownloaded'),
                'success',
              );
            }}
            className="inline-flex items-center gap-2 rounded-input border border-line bg-subtle px-4 py-2 text-sm font-medium text-fg hover:bg-muted"
          >
            <Download className="h-4 w-4 text-accent" />
            {t('settings.exportTicketsTicketscount', { ticketsCount: tickets.length })}
          </button>
        </div>
      </section>

      {/* Users & Roles (Admin only) */}
      <section className="rounded-card border border-line bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-accent" />
          <h2 className="text-base font-semibold text-fg">
            {t('settings.usersRoles')}
          </h2>
        </div>

        {!isAdmin ? (
          <p className="mt-3 text-sm text-fg-muted">
            {t('settings.onlyAdministratorsCanViewAnd')}
            <span className="font-semibold text-fg">
              {currentUser ? trUserRole(currentUser.role, lang) : ''}
            </span>
            .
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b border-line text-xs font-semibold tracking-wider text-fg-muted uppercase">
                <tr>
                  <th className="py-2.5 pr-4">{t('settings.name')}</th>
                  <th className="py-2.5 pr-4">{t('settings.email')}</th>
                  <th className="py-2.5">{t('settings.role')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {allUsers.map((u) => (
                  <tr key={u.uid}>
                    <td className="py-3 pr-4 font-medium text-fg">
                      {u.name}
                    </td>
                    <td className="py-3 pr-4 text-fg-muted">{u.email}</td>
                    <td className="py-3">
                      <select
                        value={u.role}
                        aria-label={t('settings.roleForName', { name: u.name })}
                        onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole)}
                        className="rounded-input border border-line bg-field px-3 py-1.5 text-sm text-fg"
                      >
                        <option value="Admin">Admin</option>
                        <option value="Techniker">{t('settings.technician')}</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Standorte / Locations */}
      <section className="rounded-card border border-line bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-accent" />
          <h2 className="text-base font-semibold text-fg">
            {t('settings.locations')}
          </h2>
        </div>

        <ul className="mt-4 divide-y divide-line-subtle">
          {settings.locations.map((loc) => (
            <li key={loc} className="flex items-center justify-between py-2.5 text-sm">
              <span className="text-fg">{loc}</span>
              {isAdmin && (
                <button
                  type="button"
                  disabled={saving || settings.locations.length <= 1}
                  onClick={() => handleRemoveLocation(loc)}
                  aria-label={t('settings.removeLocationLoc', { loc })}
                  className="rounded p-1 text-fg-subtle hover:bg-muted hover:text-danger disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>

        {isAdmin && (
          <div className="mt-4 flex gap-2.5">
            <input
              type="text"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              placeholder={
                t('settings.newLocationEGRack')
              }
              aria-label={t('settings.enterNewLocation')}
              className="flex-1 rounded-input border border-line bg-field px-3 py-2 text-sm text-fg focus:border-focus focus:outline-none"
            />
            <button
              type="button"
              disabled={saving || !newLocation.trim()}
              onClick={handleAddLocation}
              className="inline-flex items-center gap-1.5 rounded-input bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {t('settings.add')}
            </button>
          </div>
        )}
      </section>

      {/* Checklisten-Vorlagen pro Gerätetyp / Checklist Templates by Device Type */}
      <section className="rounded-card border border-line bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-accent" />
            <h2 className="text-base font-semibold text-fg">
              {t('settings.checklistTemplatesByDeviceType')}
            </h2>
          </div>

          {isAdmin && (
            <button
              type="button"
              disabled={saving}
              onClick={handleResetTypeTemplate}
              className="inline-flex items-center gap-1.5 rounded-input border border-line bg-subtle px-3 py-1.5 text-xs font-medium text-fg-muted hover:bg-muted disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t('settings.resetDefault')}
            </button>
          )}
        </div>

        <div
          role="tablist"
          aria-label={t('settings.checklistTemplateDeviceType')}
          className="mt-4 flex flex-wrap gap-1.5 border-b border-line-subtle pb-3"
        >
          {DEVICE_TYPES.map((typ) => {
            const active = selectedChecklistType === typ;
            const count = getChecklistTemplateForType(settings, typ).length;
            return (
              <button
                key={typ}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedChecklistType(typ)}
                className={`inline-flex items-center gap-1.5 rounded-input px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-primary text-white'
                    : 'bg-subtle text-fg-muted hover:bg-muted hover:text-fg'
                }`}
              >
                <span>{trDeviceType(typ, lang)}</span>
                <span
                  className={`tabular-nums rounded px-1.5 py-0.5 text-[11px] ${
                    active
                      ? 'bg-white/20 text-white'
                      : 'bg-surface text-accent'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <ol className="mt-4 divide-y divide-line-subtle">
          {activeChecklistTemplate.map((item, idx) => (
            <li
              key={`${selectedChecklistType}_${item}_${idx}`}
              className="flex items-center justify-between gap-3 py-2.5 text-sm"
            >
              <div className="flex items-center gap-3">
                <span className="tabular-nums w-6 text-xs font-semibold text-accent">
                  {idx + 1}.
                </span>
                <span className="text-fg">
                  {trChecklistLabel(item, lang)}
                </span>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={saving || idx === 0}
                    onClick={() => handleMoveChecklistItem(idx, -1)}
                    aria-label={t('settings.moveItemUp', { item })}
                    className="rounded p-1 text-fg-subtle hover:bg-muted hover:text-fg disabled:opacity-30"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={saving || idx === activeChecklistTemplate.length - 1}
                    onClick={() => handleMoveChecklistItem(idx, 1)}
                    aria-label={t('settings.moveItemDown', { item })}
                    className="rounded p-1 text-fg-subtle hover:bg-muted hover:text-fg disabled:opacity-30"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={saving || activeChecklistTemplate.length <= 1}
                    onClick={() => handleRemoveChecklistItem(idx)}
                    aria-label={t('settings.removeItem', { item })}
                    className="rounded p-1 text-fg-subtle hover:bg-muted hover:text-danger disabled:opacity-30"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ol>

        {isAdmin && (
          <div className="mt-4 flex gap-2.5">
            <input
              type="text"
              value={newChecklistItem}
              onChange={(e) => setNewChecklistItem(e.target.value)}
              placeholder={
                t('settings.newStepForValue', { value: trDeviceType(selectedChecklistType, lang) })
              }
              aria-label={t('settings.enterNewChecklistStep')}
              className="flex-1 rounded-input border border-line bg-field px-3 py-2 text-sm text-fg focus:border-focus focus:outline-none"
            />
            <button
              type="button"
              disabled={saving || !newChecklistItem.trim()}
              onClick={handleAddChecklistItem}
              className="inline-flex items-center gap-1.5 rounded-input bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {t('settings.addStep')}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
