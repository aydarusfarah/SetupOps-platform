import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Laptop,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Copy,
} from 'lucide-react';
import { useWorkshopData } from '../hooks/useWorkshopData';
import { useToast } from '../hooks/useToast';
import { useLanguage } from '../hooks/useLanguage';
import { trDeviceStatus, trDeviceType, trOperatingSystem } from '../i18n/labels';
import {
  DEVICE_STATUSES,
  DEVICE_TYPES,
  type Device,
  type DeviceStatus,
} from '../types';
import { getChecklistProgress, hasUrgentOpenTicket } from '../lib/domain';
import { DeviceStatusBadge } from '../components/ui/Badges';
import { EmptyState } from '../components/ui/EmptyState';
import { TableSkeleton } from '../components/ui/Skeleton';
import { LOCALE, useT } from '../i18n';

type SortKey = 'assetTag' | 'modell' | 'status' | 'standort' | 'createdAt';

export function DevicesPage() {
  const { devices, tickets, settings, dataLoading, bulkUpdateDeviceStatus } =
    useWorkshopData();
  const { showToast } = useToast();
  const { lang } = useLanguage();
  const t = useT();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialStatus = searchParams.get('status');
  const initialType = searchParams.get('type');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(
    initialStatus && (DEVICE_STATUSES as string[]).includes(initialStatus) ? initialStatus : 'Alle',
  );
  const [typeFilter, setTypeFilter] = useState<string>(
    initialType && (DEVICE_TYPES as string[]).includes(initialType) ? initialType : 'Alle',
  );
  const [locationFilter, setLocationFilter] = useState<string>('Alle');

  useEffect(() => {
    const paramStatus = searchParams.get('status');
    const paramType = searchParams.get('type');
    if (paramStatus && (DEVICE_STATUSES as string[]).includes(paramStatus)) {
      setStatusFilter(paramStatus);
    }
    if (paramType && (DEVICE_TYPES as string[]).includes(paramType)) {
      setTypeFilter(paramType);
    }
  }, [searchParams]);
  const [dense, setDense] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<DeviceStatus>('Bereit');
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const pageSize = 10;

  const urgentDeviceIds = useMemo(() => {
    const set = new Set<string>();
    const byDevice = new Map<string, typeof tickets>();
    for (const t of tickets) {
      const list = byDevice.get(t.deviceId) ?? [];
      list.push(t);
      byDevice.set(t.deviceId, list);
    }
    byDevice.forEach((list, devId) => {
      if (hasUrgentOpenTicket(list)) set.add(devId);
    });
    return set;
  }, [tickets]);

  const filteredDevices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return devices
      .filter((d) => {
        if (statusFilter !== 'Alle' && d.status !== statusFilter) return false;
        if (typeFilter !== 'Alle' && d.typ !== typeFilter) return false;
        if (locationFilter !== 'Alle' && d.standort !== locationFilter) return false;
        if (!q) return true;
        return (
          d.assetTag.toLowerCase().includes(q) ||
          d.seriennummer.toLowerCase().includes(q) ||
          d.modell.toLowerCase().includes(q) ||
          d.hersteller.toLowerCase().includes(q)
        );
      })
      .slice()
      .sort((a, b) => {
        const valA = a[sortKey] ?? '';
        const valB = b[sortKey] ?? '';
        const cmp = String(valA).localeCompare(String(valB), LOCALE[lang]);
        return sortAsc ? cmp : -cmp;
      });
  }, [devices, search, statusFilter, typeFilter, locationFilter, sortKey, sortAsc, lang]);

  const totalPages = Math.max(1, Math.ceil(filteredDevices.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedDevices = filteredDevices.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const toggleSelectAllPage = () => {
    const pageIds = paginatedDevices.map((d) => d.id);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleBulkStatusApply = async () => {
    if (selectedIds.length === 0) return;
    setBulkUpdating(true);
    try {
      await bulkUpdateDeviceStatus(selectedIds, bulkStatus);
      const statusLabel = trDeviceStatus(bulkStatus, lang);
      showToast(
        t('devices.statusUpdated'),
        'success',
        t('devices.selectedidscountDeviceSSetTo', { selectedIdsCount: selectedIds.length, statusLabel }),
      );
      setSelectedIds([]);
    } catch (err) {
      showToast(
        t('devices.bulkUpdateFailed'),
        'error',
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setBulkUpdating(false);
    }
  };

  const locationOptions = useMemo(() => {
    const set = new Set<string>(settings.locations);
    devices.forEach((d) => {
      if (d.standort) set.add(d.standort);
    });
    return Array.from(set);
  }, [settings.locations, devices]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] leading-tight font-semibold tracking-tight text-fg">
            {t('common.devices')}
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            {t('devices.allItHardwareFromIntake', { filteredDevicesCount: filteredDevices.length })}
          </p>
        </div>

        <Link
          to="/devices/new"
          className="inline-flex items-center gap-2 rounded-input bg-primary px-4 py-2 text-sm font-medium text-white whitespace-nowrap shadow-xs transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <Plus className="h-4 w-4" />
          {t('devices.addDevice')}
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface p-3.5 shadow-sm">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-accent" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={
              t('devices.searchByAssetTagSerial')
            }
            aria-label={t('devices.searchDevices')}
            className="w-full rounded-input border border-line bg-subtle py-2 pr-3 pl-9 text-sm text-fg placeholder:text-fg-subtle focus:border-focus focus:bg-field focus:outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          aria-label={t('devices.filterByStatus')}
          className="rounded-input border border-line bg-field px-3 py-2 text-sm text-fg focus:border-focus focus:outline-none"
        >
          <option value="Alle">{t('devices.statusAll')}</option>
          {DEVICE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {trDeviceStatus(s, lang)}
            </option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          aria-label={t('devices.filterByType')}
          className="rounded-input border border-line bg-field px-3 py-2 text-sm text-fg focus:border-focus focus:outline-none"
        >
          <option value="Alle">{t('devices.typeAll')}</option>
          {DEVICE_TYPES.map((deviceType) => (
            <option key={deviceType} value={deviceType}>
              {trDeviceType(deviceType, lang)}
            </option>
          ))}
        </select>

        <select
          value={locationFilter}
          onChange={(e) => {
            setLocationFilter(e.target.value);
            setPage(1);
          }}
          aria-label={t('devices.filterByLocation')}
          className="rounded-input border border-line bg-field px-3 py-2 text-sm text-fg focus:border-focus focus:outline-none"
        >
          <option value="Alle">{t('devices.locationAll')}</option>
          {locationOptions.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setDense((prev) => !prev)}
          className="rounded-input border border-line bg-subtle px-3 py-2 text-xs font-medium text-fg-muted whitespace-nowrap hover:bg-muted"
        >
          {t('devices.density')}:{' '}
          {dense ? (t('devices.compact')) : 'Standard'}
        </button>
      </div>

      {/* Bulk action bar */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-primary/35 bg-accent-soft px-4 py-2.5">
          <span className="tabular-nums text-sm font-medium text-fg">
            {t('devices.selectedidscountDeviceSSelected', { selectedIdsCount: selectedIds.length })}
          </span>
          <div className="flex items-center gap-2">
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value as DeviceStatus)}
              aria-label={t('devices.selectNewStatusForSelection')}
              className="rounded-input border border-line bg-surface px-3 py-1.5 text-sm text-fg"
            >
              {DEVICE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {trDeviceStatus(s, lang)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleBulkStatusApply}
              disabled={bulkUpdating}
              className="rounded-input bg-primary px-3.5 py-1.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60"
            >
              {bulkUpdating
                ? t('common.saving')
                : t('devices.applyStatus')}
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="rounded-input px-2.5 py-1.5 text-xs font-medium text-fg-muted hover:text-fg"
            >
              {t('devices.clearSelection')}
            </button>
          </div>
        </div>
      )}

      {dataLoading ? (
        <TableSkeleton />
      ) : filteredDevices.length === 0 ? (
        <EmptyState
          icon={Laptop}
          title={t('devices.noDevicesFound')}
          description={
            devices.length === 0
              ? t('devices.registerYourFirstItDevice')
              : t('devices.adjustYourSearchOrFilter')
          }
          actionLabel={
            devices.length === 0
              ? t('devices.addFirstDevice')
              : t('devices.resetFilters')
          }
          onAction={() => {
            if (devices.length === 0) {
              navigate('/devices/new');
            } else {
              setSearch('');
              setStatusFilter('Alle');
              setTypeFilter('Alle');
              setLocationFilter('Alle');
              if (searchParams.toString()) setSearchParams({});
            }
          }}
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden overflow-hidden rounded-card border border-line bg-surface shadow-sm md:block">
            <div className="max-h-[620px] overflow-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 bg-subtle text-xs font-semibold text-fg-muted shadow-[inset_0_-1px_0_var(--so-line)]">
                  <tr>
                    <th className="w-10 px-4 py-2.5">
                      <input
                        type="checkbox"
                        aria-label={t('devices.selectAllDevicesOnPage')}
                        checked={
                          paginatedDevices.length > 0 &&
                          paginatedDevices.every((d) => selectedIds.includes(d.id))
                        }
                        onChange={toggleSelectAllPage}
                        className="h-4 w-4 rounded border-line-strong text-accent"
                      />
                    </th>
                    <th className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => toggleSort('assetTag')}
                        className="inline-flex items-center gap-1 hover:text-fg"
                      >
                        {t('devices.assetTag')}
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => toggleSort('modell')}
                        className="inline-flex items-center gap-1 hover:text-fg"
                      >
                        {t('devices.deviceModel')}
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="px-4 py-2.5">{t('devices.serialNumber')}</th>
                    <th className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => toggleSort('status')}
                        className="inline-flex items-center gap-1 hover:text-fg"
                      >
                        Status
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="px-4 py-2.5">{t('devices.checklist')}</th>
                    <th className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => toggleSort('standort')}
                        className="inline-flex items-center gap-1 hover:text-fg"
                      >
                        {t('common.location')}
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="w-12 px-3 py-2.5 text-right">
                      <span className="sr-only">{t('devices.actions')}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle">
                  {paginatedDevices.map((d: Device) => {
                    const prog = getChecklistProgress(d.checklist);
                    const hasUrgent = urgentDeviceIds.has(d.id);
                    const rowPad = dense ? 'py-2' : 'py-3';
                    return (
                      <tr
                        key={d.id}
                        className="transition-colors hover:bg-muted"
                      >
                        <td className={`px-4 ${rowPad}`}>
                          <input
                            type="checkbox"
                            aria-label={`${d.assetTag}`}
                            checked={selectedIds.includes(d.id)}
                            onChange={() => toggleSelectOne(d.id)}
                            className="h-4 w-4 rounded border-line-strong text-accent"
                          />
                        </td>
                        <td className={`px-4 ${rowPad}`}>
                          <Link
                            to={`/devices/${d.id}`}
                            className="font-mono-code font-semibold text-accent hover:underline"
                          >
                            {d.assetTag}
                          </Link>
                        </td>
                        <td className={`px-4 ${rowPad}`}>
                          <Link to={`/devices/${d.id}`} className="block">
                            <div className="flex items-center gap-2 font-medium text-fg">
                              <span>
                                {d.hersteller} {d.modell}
                              </span>
                              {hasUrgent && (
                                <span
                                  title={
                                    t('devices.openHighOrCriticalTicket')
                                  }
                                  className="inline-flex items-center gap-1 text-xs font-medium text-danger"
                                >
                                  <AlertCircle className="h-3.5 w-3.5" />
                                  Ticket
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-fg-muted">
                              {trDeviceType(d.typ, lang)} · {trOperatingSystem(d.betriebssystem, lang)}
                            </div>
                          </Link>
                        </td>
                        <td className={`font-mono-code px-4 text-xs text-fg-muted ${rowPad}`}>
                          {d.seriennummer}
                        </td>
                        <td className={`px-4 ${rowPad}`}>
                          <DeviceStatusBadge status={d.status} />
                          {d.status === 'Ausgegeben' && d.handover?.recipientName && (
                            <div className="mt-1 truncate text-xs text-fg-muted">
                              → {d.handover.recipientName}
                            </div>
                          )}
                        </td>
                        <td className={`px-4 ${rowPad}`}>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${prog.percent}%` }}
                              />
                            </div>
                            <span className="tabular-nums text-xs text-fg-muted">
                              {prog.done}/{prog.total}
                            </span>
                          </div>
                        </td>
                        <td className={`px-4 text-fg-muted ${rowPad}`}>
                          {d.standort}
                        </td>
                        <td className={`px-3 text-right ${rowPad}`}>
                          <Link
                            to={`/devices/new?cloneFrom=${d.id}`}
                            title={
                              t('devices.cloneSpecsFromAssettag', { assetTag: d.assetTag })
                            }
                            aria-label={
                              t('devices.cloneSpecsFromAssettag', { assetTag: d.assetTag })
                            }
                            className="inline-flex rounded-control p-1.5 text-fg-subtle hover:bg-muted hover:text-accent"
                          >
                            <Copy className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="space-y-3 md:hidden">
            {paginatedDevices.map((d) => {
              const prog = getChecklistProgress(d.checklist);
              return (
                <Link
                  key={d.id}
                  to={`/devices/${d.id}`}
                  className="block rounded-card border border-line bg-surface p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono-code text-sm font-semibold text-accent">
                      {d.assetTag}
                    </span>
                    <DeviceStatusBadge status={d.status} />
                  </div>
                  <p className="mt-1.5 font-medium text-fg">
                    {d.hersteller} {d.modell}
                  </p>
                  <p className="mt-0.5 text-xs text-fg-muted">
                    {trDeviceType(d.typ, lang)} · <span className="font-mono-code">{d.seriennummer}</span>
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs text-fg-muted">
                    <span>{d.standort}</span>
                    <span className="tabular-nums">
                      {t('devices.checklist')}: {prog.done}/{prog.total}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between rounded-card border border-line bg-surface px-4 py-2.5 text-sm">
              <span className="tabular-nums text-xs text-fg-muted">
                {t('devices.pageSafepageOfTotalpagesFiltereddevicescount', { safePage, totalPages, filteredDevicesCount: filteredDevices.length })}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label={t('devices.previousPage')}
                  className="rounded-control border border-line p-1.5 text-fg-muted hover:bg-muted disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-label={t('devices.nextPage')}
                  className="rounded-control border border-line p-1.5 text-fg-muted hover:bg-muted disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
