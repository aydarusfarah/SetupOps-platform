import React, { useEffect, useState } from 'react';
import { UserCheck, X } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import type { Device, HandoverInput } from '../types';
import { useT } from '../i18n';

interface HandoverModalProps {
  open: boolean;
  device: Device;
  loading?: boolean;
  onSubmit: (input: HandoverInput) => Promise<void>;
  onClose: () => void;
}

export function HandoverModal({
  open,
  device,
  loading = false,
  onSubmit,
  onClose,
}: HandoverModalProps) {
  const { lang } = useLanguage();
  const t = useT();

  const [recipientName, setRecipientName] = useState('');
  const [department, setDepartment] = useState('');
  const [accessories, setAccessories] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setRecipientName(device.handover?.recipientName ?? '');
    setDepartment(device.handover?.department ?? '');
    setAccessories(
      device.handover?.accessories ??
        (device.typ === 'Laptop'
          ? t('handover.powerAdapterSleeve')
          : ''),
    );
    setHandoverNotes(device.handover?.handoverNotes ?? '');
    setError('');
  }, [open, device, t]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, loading, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim()) {
      setError(t('handover.recipientNameIsRequired'));
      return;
    }
    setError('');
    await onSubmit({
      recipientName: recipientName.trim(),
      department: department.trim(),
      accessories: accessories.trim(),
      handoverNotes: handoverNotes.trim(),
    });
  };

  const inputCls =
    'mt-1.5 w-full rounded-input border border-line bg-field px-3 py-2 text-sm text-fg focus:border-focus focus:outline-none';
  const labelCls =
    'block text-xs font-semibold tracking-wider text-fg-muted uppercase ';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-shell/60 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="handover-modal-title"
    >
      <div className="w-full max-w-lg rounded-card border border-line bg-surface p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-line-subtle pb-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-accent-soft p-2 text-accent">
              <UserCheck className="h-4 w-4" />
            </div>
            <div>
              <h2
                id="handover-modal-title"
                className="text-base font-semibold text-fg"
              >
                {t('handover.handOutDeviceAssettag', { assetTag: device.assetTag })}
              </h2>
              <p className="mt-0.5 text-xs text-fg-muted">
                {device.hersteller} {device.modell} · SN: {device.seriennummer}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label={t('handover.closeDialog')}
            className="rounded-md p-1 text-fg-subtle hover:bg-muted hover:text-fg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="handover-recipient" className={labelCls}>
              {t('handover.recipientName')}{' '}
              <span className="text-danger">*</span>
            </label>
            <input
              id="handover-recipient"
              type="text"
              value={recipientName}
              onChange={(e) => {
                setRecipientName(e.target.value);
                if (error) setError('');
              }}
              placeholder={t('handover.eGSarahMeyer')}
              className={inputCls}
            />
            {error && <p className="mt-1 text-xs text-danger">{error}</p>}
          </div>

          <div>
            <label htmlFor="handover-department" className={labelCls}>
              {t('handover.departmentTeam')}
            </label>
            <input
              id="handover-department"
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder={t('handover.eGFinanceEngineeringHr')}
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="handover-accessories" className={labelCls}>
              {t('handover.includedAccessories')}
            </label>
            <input
              id="handover-accessories"
              type="text"
              value={accessories}
              onChange={(e) => setAccessories(e.target.value)}
              placeholder={
                t('handover.eG65wUsbC')
              }
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="handover-notes" className={labelCls}>
              {t('handover.handoverNotes')}
            </label>
            <textarea
              id="handover-notes"
              rows={2}
              value={handoverNotes}
              onChange={(e) => setHandoverNotes(e.target.value)}
              placeholder={
                t('handover.initialLoginInstructionsConditionRemarks')
              }
              className={inputCls}
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-line-subtle pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-input border border-line bg-field px-4 py-2 text-sm font-medium text-fg hover:bg-muted disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-input bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
            >
              <UserCheck className="h-4 w-4" />
              {loading
                ? t('handover.saving')
                : t('handover.confirmHandover')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
