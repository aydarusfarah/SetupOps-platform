import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useWorkshopData } from '../hooks/useWorkshopData';
import { useToast } from '../hooks/useToast';
import { useLanguage } from '../hooks/useLanguage';
import {
  trTicketCategory,
  trTicketPriority,
  trTicketStatus,
  trUserRole,
} from '../i18n/labels';
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type TicketFormInput,
} from '../types';
import { validateTicketForm } from '../lib/domain';
import { useT } from '../i18n';

export function TicketFormPage() {
  const [searchParams] = useSearchParams();
  const initialDeviceId = searchParams.get('deviceId') ?? '';
  const navigate = useNavigate();
  const { devices, staff, currentUser, createTicket } = useWorkshopData();
  const { showToast } = useToast();
  const { lang } = useLanguage();
  const t = useT();

  const [deviceQuery, setDeviceQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [form, setForm] = useState<TicketFormInput>({
    deviceId: initialDeviceId,
    titel: '',
    beschreibung: '',
    kategorie: 'Hardware',
    prioritaet: 'Mittel',
    status: 'Offen',
    zugewiesenAn: currentUser?.uid ?? null,
    loesung: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const selectedDevice = devices.find((d) => d.id === form.deviceId);

  const filteredDevices = useMemo(() => {
    const q = deviceQuery.trim().toLowerCase();
    return devices
      .filter((d) => {
        if (!q) return true;
        return (
          d.assetTag.toLowerCase().includes(q) ||
          d.hersteller.toLowerCase().includes(q) ||
          d.modell.toLowerCase().includes(q) ||
          d.seriennummer.toLowerCase().includes(q)
        );
      })
      .slice(0, 12);
  }, [devices, deviceQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateTicketForm(form, lang);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      const id = await createTicket(form);
      showToast(t('ticketForm.ticketCreated'), 'success');
      navigate(`/tickets/${id}`);
    } catch (err) {
      showToast(
        t('ticketForm.failedToCreateTicket'),
        'error',
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    'mt-1.5 w-full rounded-input border border-line bg-field px-3 py-2 text-sm text-fg focus:border-focus focus:outline-none';
  const labelCls = 'block text-xs font-semibold tracking-wider text-fg-muted uppercase ';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-[22px] leading-tight font-semibold tracking-tight text-fg">
          {t('ticketForm.createNewTicket')}
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          {t('ticketForm.linkTheRepairOrSetup')}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-5 rounded-card border border-line bg-surface p-6 shadow-sm"
      >
        {/* Searchable device dropdown */}
        <div className="relative">
          <label htmlFor="ticket-device-search" className={labelCls}>
            {t('ticketForm.linkedDevice')}{' '}
            <span className="text-danger">*</span>
          </label>
          <div className="relative mt-1.5">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-accent" />
            <input
              id="ticket-device-search"
              type="text"
              value={
                selectedDevice && !dropdownOpen
                  ? `${selectedDevice.assetTag} · ${selectedDevice.hersteller} ${selectedDevice.modell} (${selectedDevice.seriennummer})`
                  : deviceQuery
              }
              onFocus={() => {
                setDropdownOpen(true);
                setDeviceQuery('');
              }}
              onChange={(e) => {
                setDeviceQuery(e.target.value);
                setDropdownOpen(true);
              }}
              placeholder={
                t('ticketForm.searchAssetTagModelOr')
              }
              className="w-full rounded-input border border-line bg-field py-2 pr-3 pl-9 text-sm text-fg focus:border-focus focus:outline-none"
            />
          </div>

          {dropdownOpen && (
            <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-input border border-line bg-surface p-1 shadow-lg">
              {filteredDevices.length === 0 ? (
                <div className="px-3 py-3 text-xs text-fg-subtle">
                  {t('ticketForm.noMatchingDevicesFound')}
                </div>
              ) : (
                filteredDevices.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({ ...prev, deviceId: d.id }));
                      setDropdownOpen(false);
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.deviceId;
                        return next;
                      });
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-control px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    <div className="min-w-0 truncate">
                      <span className="font-mono-code mr-2 text-xs font-semibold text-accent">
                        {d.assetTag}
                      </span>
                      <span className="font-medium text-fg">
                        {d.hersteller} {d.modell}
                      </span>
                    </div>
                    <span className="font-mono-code shrink-0 text-xs text-fg-subtle">
                      {d.seriennummer}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
          {errors.deviceId && <p className="mt-1 text-xs text-danger">{errors.deviceId}</p>}
        </div>

        <div>
          <label htmlFor="ticket-titel" className={labelCls}>
            {t('ticketForm.title')} <span className="text-danger">*</span>
          </label>
          <input
            id="ticket-titel"
            type="text"
            value={form.titel}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, titel: e.target.value }));
              if (errors.titel) {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.titel;
                  return next;
                });
              }
            }}
            placeholder={
              t('ticketForm.shortSummaryOfTheIssue')
            }
            className={inputCls}
          />
          {errors.titel && <p className="mt-1 text-xs text-danger">{errors.titel}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ticket-kategorie" className={labelCls}>
              {t('ticketForm.category')}
            </label>
            <select
              id="ticket-kategorie"
              value={form.kategorie}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  kategorie: e.target.value as TicketFormInput['kategorie'],
                }))
              }
              className={inputCls}
            >
              {TICKET_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {trTicketCategory(c, lang)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="ticket-prioritaet" className={labelCls}>
              {t('common.priority')}
            </label>
            <select
              id="ticket-prioritaet"
              value={form.prioritaet}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  prioritaet: e.target.value as TicketFormInput['prioritaet'],
                }))
              }
              className={inputCls}
            >
              {TICKET_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {trTicketPriority(p, lang)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="ticket-status" className={labelCls}>
              Status
            </label>
            <select
              id="ticket-status"
              value={form.status}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  status: e.target.value as TicketFormInput['status'],
                }))
              }
              className={inputCls}
            >
              {TICKET_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {trTicketStatus(s, lang)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="ticket-assignee" className={labelCls}>
              {t('common.assignee')}
            </label>
            <select
              id="ticket-assignee"
              value={form.zugewiesenAn ?? ''}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  zugewiesenAn: e.target.value || null,
                }))
              }
              className={inputCls}
            >
              <option value="">{t('common.unassigned')}</option>
              {staff.map((member) => (
                <option key={member.uid} value={member.uid}>
                  {member.name} ({trUserRole(member.role, lang)})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="ticket-beschreibung" className={labelCls}>
            {t('ticketForm.issueDescription')}{' '}
            <span className="text-danger">*</span>
          </label>
          <textarea
            id="ticket-beschreibung"
            rows={4}
            value={form.beschreibung}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, beschreibung: e.target.value }));
              if (errors.beschreibung) {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.beschreibung;
                  return next;
                });
              }
            }}
            placeholder={
              t('ticketForm.symptomsErrorCodesReproductionSteps')
            }
            className={inputCls}
          />
          {errors.beschreibung && (
            <p className="mt-1 text-xs text-danger">{errors.beschreibung}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-line-subtle pt-5">
          <button
            type="button"
            onClick={() => navigate('/tickets')}
            className="rounded-input border border-line bg-field px-4 py-2 text-sm font-medium text-fg hover:bg-muted"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-input bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60"
          >
            {submitting
              ? t('ticketForm.creating')
              : t('common.createTicket')}
          </button>
        </div>
      </form>
    </div>
  );
}
