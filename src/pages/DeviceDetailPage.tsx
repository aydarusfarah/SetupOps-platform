import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Printer,
  Edit3,
  Trash2,
  AlertTriangle,
  Plus,
  Check,
  UserCheck,
  RotateCcw,
  Copy,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { useWorkshopData } from '../hooks/useWorkshopData';
import { useToast } from '../hooks/useToast';
import { useLanguage } from '../hooks/useLanguage';
import {
  formatLocaleDate,
  formatLocaleDateTime,
  formatLocaleShortDateTime,
  trChecklistLabel,
  trDeviceType,
  trOperatingSystem,
  trTicketCategory,
  trAuditField,
  trAuditValue,
} from '../i18n/labels';
import { getChecklistProgress, hasUrgentOpenTicket } from '../lib/domain';
import {
  DeviceStatusBadge,
  TicketPriorityBadge,
  TicketStatusBadge,
} from '../components/ui/Badges';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { LabelPrintModal } from '../components/LabelPrintModal';
import { HandoverModal } from '../components/HandoverModal';
import { HandoverReceiptModal } from '../components/HandoverReceiptModal';
import type { HandoverInput } from '../types';
import { useT } from '../i18n';
import { OverflowMenu } from '../components/ui/OverflowMenu';

type DetailTab = 'overview' | 'checklist' | 'tickets' | 'history';

export function DeviceDetailPage() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    currentUser,
    devices,
    tickets,
    auditLogs,
    settings,
    toggleChecklistItem,
    applyChecklistTemplateToDevice,
    bulkUpdateDeviceStatus,
    handoverDevice,
    returnDevice,
    deleteDevice,
  } = useWorkshopData();
  const { showToast } = useToast();
  const { lang } = useLanguage();
  const t = useT();

  const initialTab = (searchParams.get('tab') as DetailTab) || 'overview';
  const [activeTab, setActiveTab] = useState<DetailTab>(initialTab);
  const [printOpen, setPrintOpen] = useState(false);
  const [handoverModalOpen, setHandoverModalOpen] = useState(false);
  const [handoverReceiptOpen, setHandoverReceiptOpen] = useState(false);
  const [handoverSaving, setHandoverSaving] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnLocation, setReturnLocation] = useState(
    settings.locations[0] ?? 'Wareneingang',
  );
  const [returnNotes, setReturnNotes] = useState('');
  const [returning, setReturning] = useState(false);
  const [applyTemplateDialogOpen, setApplyTemplateDialogOpen] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [readyPromptOpen, setReadyPromptOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const device = devices.find((d) => d.id === id);

  const deviceTickets = useMemo(
    () => tickets.filter((ticket) => ticket.deviceId === id),
    [tickets, id],
  );
  const deviceLogs = useMemo(
    () => auditLogs.filter((l) => l.entityId === id),
    [auditLogs, id],
  );

  if (!device) {
    return (
      <div className="rounded-card border border-line bg-surface p-8 text-center">
        <p className="text-sm text-fg-muted">
          {t('deviceDetail.deviceNotFoundOrHas')}
        </p>
        <Link
          to="/devices"
          className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
        >
          {t('deviceDetail.backToDeviceList')}
        </Link>
      </div>
    );
  }

  const urgentWarning = hasUrgentOpenTicket(deviceTickets);
  const checklistProgress = getChecklistProgress(device.checklist);
  const isAdmin = currentUser?.role === 'Admin';
  const canHandOut = device.status !== 'Ausgegeben' && device.status !== 'Entsorgt';

  const switchTab = (tab: DetailTab) => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  };

  const handleToggleChecklist = async (itemId: string, nextChecked: boolean) => {
    try {
      await toggleChecklistItem(device.id, itemId, nextChecked);
      if (nextChecked) {
        const updatedDone =
          device.checklist.filter((i) => (i.id === itemId ? nextChecked : i.checked)).length;
        if (
          updatedDone === device.checklist.length &&
          device.checklist.length > 0 &&
          device.status !== 'Bereit'
        ) {
          setReadyPromptOpen(true);
        }
      }
    } catch (err) {
      showToast(
        t('deviceDetail.failedToUpdateChecklist'),
        'error',
        err instanceof Error ? err.message : undefined,
      );
    }
  };

  const handleMarkReady = async () => {
    try {
      await bulkUpdateDeviceStatus([device.id], 'Bereit');
      showToast(
        t('deviceDetail.deviceStatusSetToReady'),
        'success',
      );
    } catch (err) {
      showToast(
        t('deviceDetail.statusUpdateFailed'),
        'error',
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setReadyPromptOpen(false);
    }
  };

  const handleHandoverSubmit = async (input: HandoverInput) => {
    setHandoverSaving(true);
    try {
      await handoverDevice(device.id, input);
      setHandoverModalOpen(false);
      showToast(
        t('deviceDetail.deviceHandedOut'),
        'success',
        input.recipientName,
      );
    } catch (err) {
      showToast(
        t('deviceDetail.handoverFailed'),
        'error',
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setHandoverSaving(false);
    }
  };

  const handleReturnSubmit = async () => {
    setReturning(true);
    try {
      await returnDevice(device.id, returnLocation, returnNotes);
      setReturnModalOpen(false);
      setReturnNotes('');
      showToast(
        t('deviceDetail.deviceReturnedToIntake'),
        'success',
        returnLocation,
      );
    } catch (err) {
      showToast(
        t('deviceDetail.returnFailed'),
        'error',
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setReturning(false);
    }
  };

  const handleApplyTypeTemplate = async () => {
    setApplyingTemplate(true);
    try {
      await applyChecklistTemplateToDevice(device.id);
      setApplyTemplateDialogOpen(false);
      showToast(
        t('deviceDetail.valueChecklistTemplateApplied', { value: trDeviceType(device.typ, lang) }),
        'success',
      );
    } catch (err) {
      showToast(
        t('deviceDetail.failedToApplyTemplate'),
        'error',
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setApplyingTemplate(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteDevice(device.id);
      showToast(t('deviceDetail.deviceDeleted'), 'success');
      navigate('/devices');
    } catch (err) {
      showToast(
        t('deviceDetail.deleteFailed'),
        'error',
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const tabs: Array<{ key: DetailTab; label: string }> = [
    { key: 'overview', label: t('deviceDetail.overview') },
    {
      key: 'checklist',
      label: t('deviceDetail.checklistDoneTotal', { done: checklistProgress.done, total: checklistProgress.total }),
    },
    { key: 'tickets', label: `Tickets (${deviceTickets.length})` },
    { key: 'history', label: t('deviceDetail.historyDevicelogscount', { deviceLogsCount: deviceLogs.length }) },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-card border border-line bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono-code rounded bg-accent-soft px-2.5 py-1 text-sm font-semibold text-accent">
                {device.assetTag}
              </span>
              <DeviceStatusBadge status={device.status} />
              {urgentWarning && (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-danger/30 bg-danger/10 px-2.5 py-0.5 text-xs font-medium text-danger-fg">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {t('deviceDetail.urgentTicketOpen')}
                </span>
              )}
            </div>
            <h1 className="mt-3 text-[22px] leading-tight font-semibold tracking-tight text-fg">
              {device.hersteller} {device.modell}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-fg-muted">
              <span>{trDeviceType(device.typ, lang)}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-code text-xs">SN: {device.seriennummer}</span>
              <span aria-hidden="true">·</span>
              <span>{device.standort}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {canHandOut && (
              <button
                type="button"
                onClick={() => setHandoverModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-input border border-success/35 bg-success/10 px-3.5 py-2 text-sm font-medium text-success-fg whitespace-nowrap hover:bg-success/15"
              >
                <UserCheck className="h-4 w-4" />
                {t('deviceDetail.handOut')}
              </button>
            )}
            {device.status === 'Ausgegeben' && (
              <button
                type="button"
                onClick={() => {
                  setReturnLocation(settings.locations[0] ?? device.standort);
                  setReturnModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-input border border-warning/40 bg-warning/10 px-3.5 py-2 text-sm font-medium text-warning-fg whitespace-nowrap hover:bg-warning/15"
              >
                <RotateCcw className="h-4 w-4" />
                {t('deviceDetail.returnDevice')}
              </button>
            )}
            <button
              type="button"
              onClick={() => setPrintOpen(true)}
              className="btn btn-secondary"
            >
              <Printer className="h-4 w-4" />
              {t('deviceDetail.printLabel')}
            </button>
            <Link to={`/devices/${device.id}/edit`} className="btn btn-primary">
              <Edit3 className="h-4 w-4" />
              {t('deviceDetail.edit')}
            </Link>
            <OverflowMenu
              label={t('common.moreActions')}
              items={[
                {
                  label: t('deviceDetail.cloneSpecs'),
                  icon: <Copy className="h-4 w-4 text-fg-subtle" />,
                  to: `/devices/new?cloneFrom=${device.id}`,
                },
                ...(isAdmin
                  ? [
                      {
                        label: t('deviceDetail.deleteDeviceAssettag', { assetTag: device.assetTag }),
                        icon: <Trash2 className="h-4 w-4" />,
                        tone: 'danger' as const,
                        separated: true,
                        onSelect: () => setDeleteDialogOpen(true),
                      },
                    ]
                  : []),
              ]}
            />
          </div>
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label={t('deviceDetail.deviceSections')}
          className="-mb-6 mt-5 flex gap-6 overflow-x-auto border-t border-line-subtle"
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => switchTab(tab.key)}
              className={`border-b-2 py-3 text-sm whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-focus ${
                activeTab === tab.key
                  ? 'border-primary font-semibold text-fg'
                  : 'border-transparent font-medium text-fg-muted hover:border-line-strong hover:text-fg'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-card border border-line bg-surface p-6 shadow-sm lg:col-span-2">
            <h2 className="text-base font-semibold text-fg">
              {t('deviceDetail.hardwareSystemSpecifications')}
            </h2>
            <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold tracking-wider text-fg-subtle uppercase">
                  {t('deviceDetail.processorCpu')}
                </dt>
                <dd className="mt-1 text-sm text-fg">
                  {device.cpu || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-wider text-fg-subtle uppercase">
                  {t('deviceDetail.memoryRam')}
                </dt>
                <dd className="tabular-nums mt-1 text-sm text-fg">
                  {device.ramGB > 0 ? `${device.ramGB} GB` : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-wider text-fg-subtle uppercase">
                  {t('deviceDetail.storage')}
                </dt>
                <dd className="tabular-nums mt-1 text-sm text-fg">
                  {device.speicherGB > 0
                    ? `${device.speicherGB} GB ${device.speicherTyp}`
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-wider text-fg-subtle uppercase">
                  {t('deviceDetail.operatingSystem')}
                </dt>
                <dd className="mt-1 text-sm text-fg">
                  {trOperatingSystem(device.betriebssystem, lang)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-wider text-fg-subtle uppercase">
                  {t('common.location')}
                </dt>
                <dd className="mt-1 text-sm text-fg">
                  {device.standort}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-wider text-fg-subtle uppercase">
                  {t('deviceDetail.createdByOn')}
                </dt>
                <dd className="tabular-nums mt-1 text-sm text-fg">
                  {device.createdByName} · {formatLocaleDate(device.createdAt, lang)}
                </dd>
              </div>
            </dl>

            <div className="mt-6 border-t border-line-subtle pt-4">
              <h3 className="text-xs font-semibold tracking-wider text-fg-subtle uppercase">
                {t('deviceDetail.notes')}
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-fg-muted">
                {device.notizen || (t('deviceDetail.noNotesRecorded'))}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {(device.handover || device.status === 'Ausgegeben') && (
              <div className="rounded-card border border-success/35 bg-surface p-6 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-success" />
                    <h2 className="text-base font-semibold text-fg">
                      {t('deviceDetail.handoverProtocol')}
                    </h2>
                  </div>
                  {device.handover && (
                    <button
                      type="button"
                      onClick={() => setHandoverModalOpen(true)}
                      className="text-xs font-medium text-accent hover:underline"
                    >
                      {t('deviceDetail.edit2')}
                    </button>
                  )}
                </div>

                {device.handover ? (
                  <div className="mt-4 space-y-2.5 text-sm">
                    <div>
                      <p className="text-xs font-semibold tracking-wider text-fg-subtle uppercase">
                        {t('deviceDetail.recipient')}
                      </p>
                      <p className="mt-0.5 font-semibold text-fg">
                        {device.handover.recipientName}
                        {device.handover.department && (
                          <span className="font-normal text-fg-muted">
                            {' '}
                            · {device.handover.department}
                          </span>
                        )}
                      </p>
                    </div>
                    {device.handover.accessories && (
                      <div>
                        <p className="text-xs font-semibold tracking-wider text-fg-subtle uppercase">
                          {t('deviceDetail.accessories')}
                        </p>
                        <p className="mt-0.5 text-fg-muted">
                          {device.handover.accessories}
                        </p>
                      </div>
                    )}
                    {device.handover.handoverNotes && (
                      <div>
                        <p className="text-xs font-semibold tracking-wider text-fg-subtle uppercase">
                          {t('deviceDetail.notes2')}
                        </p>
                        <p className="mt-0.5 whitespace-pre-wrap text-xs text-fg-muted">
                          {device.handover.handoverNotes}
                        </p>
                      </div>
                    )}
                    <p className="tabular-nums pt-1 text-xs text-fg-subtle">
                      {device.handover.handedOverByName} ·{' '}
                      {formatLocaleDateTime(device.handover.handedOverAt, lang)}
                    </p>
                    <button
                      type="button"
                      onClick={() => setHandoverReceiptOpen(true)}
                      className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-input border border-line bg-subtle px-3.5 py-2 text-sm font-medium text-fg hover:bg-muted"
                    >
                      <FileText className="h-4 w-4 text-accent" />
                      {t('deviceDetail.printHandoverSheet')}
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 space-y-3">
                    <p className="text-xs text-fg-muted">
                      {t('deviceDetail.markedAsIssuedWithoutRecipient')}
                    </p>
                    <button
                      type="button"
                      onClick={() => setHandoverModalOpen(true)}
                      className="w-full rounded-input bg-primary px-3.5 py-2 text-xs font-medium text-white hover:bg-primary-hover"
                    >
                      {t('deviceDetail.recordHandoverDetails')}
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="rounded-card border border-line bg-surface p-6 shadow-sm">
              <h2 className="text-base font-semibold text-fg">
                {t('deviceDetail.setupProgress')}
              </h2>
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-fg-muted">
                    {t('deviceDetail.completed')}
                  </span>
                  <span className="tabular-nums font-semibold text-fg">
                    {checklistProgress.done} / {checklistProgress.total} ({checklistProgress.percent}%)
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${checklistProgress.percent}%` }}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => switchTab('checklist')}
                className="mt-5 w-full rounded-input border border-line bg-subtle px-4 py-2 text-sm font-medium text-fg hover:bg-muted"
              >
                {t('deviceDetail.openSetupChecklist')}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'checklist' && (
        <div className="rounded-card border border-line bg-surface p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-fg">
                {t('deviceDetail.setupChecklist')} ·{' '}
                {trDeviceType(device.typ, lang)}
              </h2>
              <p className="mt-1 text-sm text-fg-muted">
                {t('deviceDetail.everyCompletedCheckRecordsTechnician')}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (checklistProgress.done > 0) {
                    setApplyTemplateDialogOpen(true);
                  } else {
                    void handleApplyTypeTemplate();
                  }
                }}
                disabled={applyingTemplate}
                className="inline-flex items-center gap-1.5 rounded-input border border-line bg-subtle px-3 py-1.5 text-xs font-medium text-fg hover:bg-muted disabled:opacity-50"
              >
                <RefreshCw className="h-3.5 w-3.5 text-accent" />
                {t('deviceDetail.applyValueTemplate', { value: trDeviceType(device.typ, lang) })}
              </button>
              <span className="tabular-nums text-sm font-semibold text-fg">
                {checklistProgress.done}/{checklistProgress.total} {t('deviceDetail.done')}
              </span>
              <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-success transition-all"
                  style={{ width: `${checklistProgress.percent}%` }}
                />
              </div>
            </div>
          </div>

          <ul className="mt-5 divide-y divide-line-subtle">
            {device.checklist.map((item) => {
              const displayLabel = trChecklistLabel(item.label, lang);
              return (
                <li key={item.id} className="flex items-center justify-between gap-4 py-3">
                  <label className="flex flex-1 cursor-pointer items-center gap-3">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={item.checked}
                      aria-label={displayLabel}
                      onClick={() => handleToggleChecklist(item.id, !item.checked)}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                        item.checked
                          ? 'border-primary bg-primary text-white'
                          : 'border-line-strong bg-field hover:border-focus'
                      }`}
                    >
                      {item.checked && <Check className="h-3.5 w-3.5" />}
                    </button>
                    <span
                      className={`text-sm ${
                        item.checked
                          ? 'text-fg-subtle line-through'
                          : 'font-medium text-fg'
                      }`}
                    >
                      {displayLabel}
                    </span>
                  </label>

                  {item.checked && item.checkedByName && (
                    <span className="tabular-nums shrink-0 text-xs text-fg-subtle">
                      {item.checkedByName} ·{' '}
                      {item.checkedAt ? formatLocaleShortDateTime(item.checkedAt, lang) : ''}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {activeTab === 'tickets' && (
        <div className="rounded-card border border-line bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold text-fg">
              {t('deviceDetail.linkedTickets')}
            </h2>
            <Link
              to={`/tickets/new?deviceId=${device.id}`}
              className="inline-flex items-center gap-1.5 rounded-input bg-primary px-3.5 py-2 text-sm font-medium text-white hover:bg-primary-hover"
            >
              <Plus className="h-4 w-4" />
              {t('deviceDetail.createTicketForDevice')}
            </Link>
          </div>

          {deviceTickets.length === 0 ? (
            <p className="mt-6 text-sm text-fg-subtle">
              {t('deviceDetail.noTicketsHaveBeenCreated')}
            </p>
          ) : (
            <div className="mt-4 divide-y divide-line-subtle">
              {deviceTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  to={`/tickets/${ticket.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-3.5 transition-colors hover:bg-muted"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono-code text-xs font-semibold text-accent">
                        {ticket.ticketNr}
                      </span>
                      <span className="text-xs text-fg-subtle">
                        {trTicketCategory(ticket.kategorie, lang)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm font-medium text-fg">
                      {ticket.titel}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <TicketPriorityBadge priority={ticket.prioritaet} />
                    <TicketStatusBadge status={ticket.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="rounded-card border border-line bg-surface p-6 shadow-sm">
          <h2 className="text-base font-semibold text-fg">
            {t('deviceDetail.changeHistoryAuditLog')}
          </h2>
          {deviceLogs.length === 0 ? (
            <p className="mt-6 text-sm text-fg-subtle">
              {t('deviceDetail.noHistoryEntriesYet')}
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="border-b border-line text-xs font-semibold tracking-wider text-fg-muted uppercase">
                  <tr>
                    <th className="py-2.5 pr-4">{t('deviceDetail.timestamp')}</th>
                    <th className="py-2.5 pr-4">{t('deviceDetail.field')}</th>
                    <th className="py-2.5 pr-4">{t('deviceDetail.oldValue')}</th>
                    <th className="py-2.5 pr-4">{t('deviceDetail.newValue')}</th>
                    <th className="py-2.5">{t('deviceDetail.user')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle">
                  {deviceLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="tabular-nums py-2.5 pr-4 text-xs text-fg-muted whitespace-nowrap">
                        {formatLocaleDateTime(log.timestamp, lang)}
                      </td>
                      <td className="py-2.5 pr-4 font-medium text-fg">
                        {trAuditField(log.field, lang)}
                      </td>
                      <td className="py-2.5 pr-4 text-fg-muted">
                        {trAuditValue(log.oldValue, lang)}
                      </td>
                      <td className="py-2.5 pr-4 text-fg">
                        {trAuditValue(log.newValue, lang)}
                      </td>
                      <td className="py-2.5 text-xs text-fg-muted">
                        {log.userName}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <LabelPrintModal open={printOpen} device={device} onClose={() => setPrintOpen(false)} />

      <HandoverModal
        open={handoverModalOpen}
        device={device}
        loading={handoverSaving}
        onSubmit={handleHandoverSubmit}
        onClose={() => setHandoverModalOpen(false)}
      />

      <HandoverReceiptModal
        open={handoverReceiptOpen}
        device={device}
        onClose={() => setHandoverReceiptOpen(false)}
      />

      {returnModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-shell/60 p-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="return-modal-title"
        >
          <div className="w-full max-w-md rounded-card border border-line bg-surface p-6 shadow-xl">
            <h2
              id="return-modal-title"
              className="text-base font-semibold text-fg"
            >
              {t('deviceDetail.returnDeviceAssettag', { assetTag: device.assetTag })}
            </h2>
            <p className="mt-1 text-xs text-fg-muted">
              {t('deviceDetail.clearsTheActiveHandoverAssignment')}
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="return-location"
                  className="block text-xs font-semibold tracking-wider text-fg-muted uppercase"
                >
                  {t('deviceDetail.returnLocation')}
                </label>
                <select
                  id="return-location"
                  value={returnLocation}
                  onChange={(e) => setReturnLocation(e.target.value)}
                  className="mt-1.5 w-full rounded-input border border-line bg-field px-3 py-2 text-sm text-fg"
                >
                  {settings.locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="return-notes"
                  className="block text-xs font-semibold tracking-wider text-fg-muted uppercase"
                >
                  {t('deviceDetail.returnNoteOptional')}
                </label>
                <input
                  id="return-notes"
                  type="text"
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder={
                    t('deviceDetail.eGOffboardingAllAccessories')
                  }
                  className="mt-1.5 w-full rounded-input border border-line bg-field px-3 py-2 text-sm text-fg"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={returning}
                onClick={() => setReturnModalOpen(false)}
                className="rounded-input border border-line bg-field px-4 py-2 text-sm font-medium text-fg hover:bg-muted"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={returning}
                onClick={handleReturnSubmit}
                className="inline-flex items-center gap-2 rounded-input bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                {returning
                  ? t('deviceDetail.returning')
                  : t('deviceDetail.confirmReturn')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={applyTemplateDialogOpen}
        title={
          t('deviceDetail.applyValueChecklistTemplate', { value: trDeviceType(device.typ, lang) })
        }
        description={
          t('deviceDetail.thisReplacesTheCurrentChecklist')
        }
        confirmLabel={t('deviceDetail.applyTemplate')}
        variant="primary"
        loading={applyingTemplate}
        onConfirm={handleApplyTypeTemplate}
        onCancel={() => setApplyTemplateDialogOpen(false)}
      />

      <ConfirmDialog
        open={readyPromptOpen}
        title={t('deviceDetail.checklistCompleted')}
        description={
          t('deviceDetail.allTotalChecksForAssettag', { total: checklistProgress.total, assetTag: device.assetTag })
        }
        confirmLabel={t('deviceDetail.setToReady')}
        cancelLabel={t('deviceDetail.keepCurrentStatus')}
        variant="primary"
        onConfirm={handleMarkReady}
        onCancel={() => setReadyPromptOpen(false)}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        title={t('deviceDetail.deleteDeviceAssettag2', { assetTag: device.assetTag })}
        description={
          t('deviceDetail.thisActionCannotBeUndone')
        }
        confirmLabel={t('deviceDetail.deletePermanently')}
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </div>
  );
}
