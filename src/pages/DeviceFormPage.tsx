import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Copy, Layers, Laptop } from 'lucide-react';
import { useWorkshopData } from '../hooks/useWorkshopData';
import { useToast } from '../hooks/useToast';
import { useLanguage } from '../hooks/useLanguage';
import { trDeviceStatus, trDeviceType, trOperatingSystem } from '../i18n/labels';
import {
  DEVICE_STATUSES,
  DEVICE_TYPES,
  OPERATING_SYSTEMS,
  STORAGE_TYPES,
  type DeviceFormInput,
} from '../types';
import {
  getChecklistTemplateForType,
  parseBatchSerialNumbers,
  validateBatchDeviceForm,
  validateDeviceForm,
} from '../lib/domain';
import { useT } from '../i18n';

export function DeviceFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const cloneFromId = searchParams.get('cloneFrom');
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { devices, settings, createDevice, createDevicesBatch, updateDevice } =
    useWorkshopData();
  const { showToast } = useToast();
  const { lang } = useLanguage();
  const t = useT();

  const existingDevice = isEdit ? devices.find((d) => d.id === id) : undefined;
  const clonedSource =
    !isEdit && cloneFromId ? devices.find((d) => d.id === cloneFromId) : undefined;

  const [intakeMode, setIntakeMode] = useState<'single' | 'batch'>('single');
  const [batchSerials, setBatchSerials] = useState('');
  const [form, setForm] = useState<DeviceFormInput>({
    typ: 'Laptop',
    hersteller: '',
    modell: '',
    seriennummer: '',
    cpu: '',
    ramGB: 16,
    speicherTyp: 'NVMe',
    speicherGB: 512,
    betriebssystem: 'Windows 11 Pro',
    status: 'Eingang',
    standort: settings.locations[0] ?? 'Wareneingang',
    notizen: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (existingDevice) {
      setForm({
        typ: existingDevice.typ,
        hersteller: existingDevice.hersteller,
        modell: existingDevice.modell,
        seriennummer: existingDevice.seriennummer,
        cpu: existingDevice.cpu,
        ramGB: existingDevice.ramGB,
        speicherTyp: existingDevice.speicherTyp,
        speicherGB: existingDevice.speicherGB,
        betriebssystem: existingDevice.betriebssystem,
        status: existingDevice.status,
        standort: existingDevice.standort,
        notizen: existingDevice.notizen,
      });
    } else if (clonedSource) {
      setForm({
        typ: clonedSource.typ,
        hersteller: clonedSource.hersteller,
        modell: clonedSource.modell,
        seriennummer: '',
        cpu: clonedSource.cpu,
        ramGB: clonedSource.ramGB,
        speicherTyp: clonedSource.speicherTyp,
        speicherGB: clonedSource.speicherGB,
        betriebssystem: clonedSource.betriebssystem,
        status: 'Eingang',
        standort: settings.locations.includes(clonedSource.standort)
          ? clonedSource.standort
          : settings.locations[0] ?? clonedSource.standort,
        notizen: clonedSource.notizen,
      });
    }
  }, [existingDevice, clonedSource, settings.locations]);

  const parsedBatchSerials = useMemo(
    () => parseBatchSerialNumbers(batchSerials),
    [batchSerials],
  );
  const activeTypeChecklistCount = useMemo(
    () => getChecklistTemplateForType(settings, form.typ).length,
    [settings, form.typ],
  );

  if (isEdit && !existingDevice) {
    return (
      <div className="rounded-card border border-line bg-surface p-6 text-sm text-fg-muted">
        {t('deviceForm.deviceNotFound')}
      </div>
    );
  }

  const updateField = <K extends keyof DeviceFormInput>(key: K, value: DeviceFormInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEdit && intakeMode === 'batch') {
      const { seriennummer: _ignored, ...baseInput } = form;
      const { serials, errors: batchErrors } = validateBatchDeviceForm(
        baseInput,
        batchSerials,
        devices,
        lang,
      );
      if (Object.keys(batchErrors).length > 0) {
        setErrors(batchErrors);
        return;
      }

      setSubmitting(true);
      try {
        const created = await createDevicesBatch(baseInput, serials);
        const firstTag = created[0]?.assetTag ?? '';
        const lastTag = created[created.length - 1]?.assetTag ?? '';
        const rangeLabel =
          created.length > 1 ? `${firstTag} – ${lastTag}` : firstTag;
        showToast(
          t('deviceForm.createdcountDeviceSCreated', { createdCount: created.length }),
          'success',
          rangeLabel,
        );
        navigate(created.length === 1 && created[0] ? `/devices/${created[0].id}` : '/devices');
      } catch (err) {
        showToast(
          t('deviceForm.failedToSaveDevices'),
          'error',
          err instanceof Error ? err.message : undefined,
        );
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const validationErrors = validateDeviceForm(form, devices, id, lang);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit && id) {
        await updateDevice(id, form);
        showToast(t('deviceForm.deviceUpdated'), 'success');
        navigate(`/devices/${id}`);
      } else {
        const newId = await createDevice(form);
        showToast(t('deviceForm.deviceCreated'), 'success');
        navigate(`/devices/${newId}`);
      }
    } catch (err) {
      showToast(
        t('deviceForm.failedToSaveDevice'),
        'error',
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    'mt-1.5 w-full rounded-input border border-line bg-field px-3 py-2 text-sm text-fg focus:border-focus focus:outline-none';
  const labelCls =
    'block text-xs font-semibold tracking-wider text-fg-muted uppercase ';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] leading-tight font-semibold tracking-tight text-fg">
            {isEdit
              ? t('deviceForm.editDeviceAssettag', { assetTag: existingDevice?.assetTag })
              : t('deviceForm.addNewDevice')}
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            {isEdit
              ? t('deviceForm.allChangesAreAutomaticallyRecorded')
              : t('deviceForm.assetTagWhXxxxAnd', { activeTypeChecklistCount, value: trDeviceType(form.typ, lang) })}
          </p>
        </div>

        {!isEdit && (
          <div
            role="group"
            aria-label={t('deviceForm.intakeMode')}
            className="inline-flex rounded-input border border-line bg-surface p-1 shadow-xs"
          >
            <button
              type="button"
              onClick={() => {
                setIntakeMode('single');
                setErrors((prev) => {
                  const copy = { ...prev };
                  delete copy.seriennummer;
                  return copy;
                });
              }}
              className={`inline-flex items-center gap-1.5 rounded-control px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                intakeMode === 'single'
                  ? 'bg-primary text-white'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              <Laptop className="h-3.5 w-3.5" />
              {t('deviceForm.singleDevice')}
            </button>
            <button
              type="button"
              onClick={() => {
                setIntakeMode('batch');
                setErrors((prev) => {
                  const copy = { ...prev };
                  delete copy.seriennummer;
                  return copy;
                });
              }}
              className={`inline-flex items-center gap-1.5 rounded-control px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                intakeMode === 'batch'
                  ? 'bg-primary text-white'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              {t('deviceForm.batchIntake')}
            </button>
          </div>
        )}
      </div>

      {clonedSource && (
        <div className="flex items-center gap-2.5 rounded-card border border-primary/30 bg-accent-soft px-4 py-3 text-sm text-fg">
          <Copy className="h-4 w-4 shrink-0 text-accent" />
          <span>
            {t('deviceForm.specsCopiedFromAssettagHersteller', { assetTag: clonedSource.assetTag, hersteller: clonedSource.hersteller, modell: clonedSource.modell })}
          </span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-6 rounded-card border border-line bg-surface p-6 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="device-typ" className={labelCls}>
              {t('deviceForm.type')} <span className="text-danger">*</span>
            </label>
            <select
              id="device-typ"
              value={form.typ}
              onChange={(e) => updateField('typ', e.target.value as DeviceFormInput['typ'])}
              className={inputCls}
            >
              {DEVICE_TYPES.map((deviceType) => (
                <option key={deviceType} value={deviceType}>
                  {trDeviceType(deviceType, lang)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="device-status" className={labelCls}>
              Status <span className="text-danger">*</span>
            </label>
            <select
              id="device-status"
              value={form.status}
              onChange={(e) => updateField('status', e.target.value as DeviceFormInput['status'])}
              className={inputCls}
            >
              {DEVICE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {trDeviceStatus(s, lang)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="device-hersteller" className={labelCls}>
              {t('deviceForm.manufacturer')} <span className="text-danger">*</span>
            </label>
            <input
              id="device-hersteller"
              type="text"
              value={form.hersteller}
              onChange={(e) => updateField('hersteller', e.target.value)}
              placeholder={t('deviceForm.eGDellLenovoHp')}
              className={inputCls}
            />
            {errors.hersteller && (
              <p className="mt-1 text-xs text-danger">{errors.hersteller}</p>
            )}
          </div>

          <div>
            <label htmlFor="device-modell" className={labelCls}>
              {t('deviceForm.model')} <span className="text-danger">*</span>
            </label>
            <input
              id="device-modell"
              type="text"
              value={form.modell}
              onChange={(e) => updateField('modell', e.target.value)}
              placeholder={t('deviceForm.eGLatitude5540')}
              className={inputCls}
            />
            {errors.modell && <p className="mt-1 text-xs text-danger">{errors.modell}</p>}
          </div>

          {!isEdit && intakeMode === 'batch' ? (
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="device-batch-serials" className={labelCls}>
                  {t('deviceForm.serialNumbers1PerLine')}{' '}
                  <span className="text-danger">*</span>
                </label>
                <span className="tabular-nums rounded bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
                  {t('deviceForm.parsedbatchserialscountUnitSDetected', { parsedBatchSerialsCount: parsedBatchSerials.length })}
                </span>
              </div>
              <textarea
                id="device-batch-serials"
                rows={4}
                value={batchSerials}
                onChange={(e) => {
                  setBatchSerials(e.target.value);
                  if (errors.seriennummer) {
                    setErrors((prev) => {
                      const copy = { ...prev };
                      delete copy.seriennummer;
                      return copy;
                    });
                  }
                }}
                placeholder={
                  t('deviceForm.snLot1001SnLot')
                }
                className={`font-mono-code ${inputCls}`}
              />
              {errors.seriennummer && (
                <p className="mt-1 text-xs text-danger">{errors.seriennummer}</p>
              )}
            </div>
          ) : (
            <div>
              <label htmlFor="device-serial" className={labelCls}>
                {t('deviceForm.serialNumber')} <span className="text-danger">*</span>
              </label>
              <input
                id="device-serial"
                type="text"
                value={form.seriennummer}
                onChange={(e) => updateField('seriennummer', e.target.value)}
                placeholder={t('deviceForm.uniqueManufacturerSerial')}
                className={`font-mono-code ${inputCls}`}
              />
              {errors.seriennummer && (
                <p className="mt-1 text-xs text-danger">{errors.seriennummer}</p>
              )}
            </div>
          )}

          <div className={!isEdit && intakeMode === 'batch' ? 'sm:col-span-2' : ''}>
            <label htmlFor="device-standort" className={labelCls}>
              {t('common.location')} <span className="text-danger">*</span>
            </label>
            <select
              id="device-standort"
              value={form.standort}
              onChange={(e) => updateField('standort', e.target.value)}
              className={inputCls}
            >
              {settings.locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
              {!settings.locations.includes(form.standort) && form.standort && (
                <option value={form.standort}>{form.standort}</option>
              )}
            </select>
            {errors.standort && <p className="mt-1 text-xs text-danger">{errors.standort}</p>}
          </div>

          <div>
            <label htmlFor="device-cpu" className={labelCls}>
              {t('deviceForm.processorCpu')}
            </label>
            <input
              id="device-cpu"
              type="text"
              value={form.cpu}
              onChange={(e) => updateField('cpu', e.target.value)}
              placeholder={t('deviceForm.eGIntelCoreI5')}
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="device-ram" className={labelCls}>
              {t('deviceForm.memoryRamGb')}
            </label>
            <input
              id="device-ram"
              type="number"
              min={0}
              max={4096}
              value={form.ramGB}
              onChange={(e) => updateField('ramGB', Number(e.target.value))}
              className={`tabular-nums ${inputCls}`}
            />
            {errors.ramGB && <p className="mt-1 text-xs text-danger">{errors.ramGB}</p>}
          </div>

          <div>
            <label htmlFor="device-storage-type" className={labelCls}>
              {t('deviceForm.storageType')}
            </label>
            <select
              id="device-storage-type"
              value={form.speicherTyp}
              onChange={(e) =>
                updateField('speicherTyp', e.target.value as DeviceFormInput['speicherTyp'])
              }
              className={inputCls}
            >
              {STORAGE_TYPES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="device-storage-gb" className={labelCls}>
              {t('deviceForm.storageCapacityGb')}
            </label>
            <input
              id="device-storage-gb"
              type="number"
              min={0}
              max={100000}
              value={form.speicherGB}
              onChange={(e) => updateField('speicherGB', Number(e.target.value))}
              className={`tabular-nums ${inputCls}`}
            />
            {errors.speicherGB && (
              <p className="mt-1 text-xs text-danger">{errors.speicherGB}</p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="device-os" className={labelCls}>
              {t('deviceForm.operatingSystem')}
            </label>
            <select
              id="device-os"
              value={form.betriebssystem}
              onChange={(e) =>
                updateField(
                  'betriebssystem',
                  e.target.value as DeviceFormInput['betriebssystem'],
                )
              }
              className={inputCls}
            >
              {OPERATING_SYSTEMS.map((os) => (
                <option key={os} value={os}>
                  {trOperatingSystem(os, lang)}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="device-notizen" className={labelCls}>
              {t('deviceForm.notes')}
            </label>
            <textarea
              id="device-notizen"
              rows={3}
              value={form.notizen}
              onChange={(e) => updateField('notizen', e.target.value)}
              placeholder={
                t('deviceForm.includedAccessoriesIntakeConditionSpecial')
              }
              className={inputCls}
            />
            {errors.notizen && <p className="mt-1 text-xs text-danger">{errors.notizen}</p>}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-line-subtle pt-5">
          <button
            type="button"
            onClick={() => navigate(isEdit && id ? `/devices/${id}` : '/devices')}
            className="rounded-input border border-line bg-field px-4 py-2 text-sm font-medium text-fg hover:bg-muted"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-input bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-60"
          >
            {submitting
              ? t('common.saving')
              : isEdit
                ? t('deviceForm.saveChanges')
                : intakeMode === 'batch'
                  ? t('deviceForm.createBatch', { count: parsedBatchSerials.length || '' })
                  : t('deviceForm.createDevice')}
          </button>
        </div>
      </form>
    </div>
  );
}
