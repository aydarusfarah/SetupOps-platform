import { useEffect } from 'react';
import { Printer, X } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import { formatLocaleDateTime, trDeviceType, trOperatingSystem } from '../i18n/labels';
import type { Device } from '../types';
import { useT } from '../i18n';

interface HandoverReceiptModalProps {
  open: boolean;
  device: Device;
  onClose: () => void;
}

export function HandoverReceiptModal({
  open,
  device,
  onClose,
}: HandoverReceiptModalProps) {
  const { lang } = useLanguage();
  const t = useT();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !device.handover) return null;

  const h = device.handover;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#091529]/60 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="handover-receipt-title"
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-card border border-line bg-surface shadow-xl">
        <div className="no-print flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <h2
              id="handover-receipt-title"
              className="text-base font-semibold text-fg"
            >
              {t('receipt.handoverProtocolSheet')}
            </h2>
            <p className="mt-0.5 text-xs text-fg-muted">
              {t('receipt.printableIssueReceiptForAssettag', { assetTag: device.assetTag })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-input bg-[#1D4ED8] px-3.5 py-2 text-sm font-medium text-white hover:bg-[#1E40AF]"
            >
              <Printer className="h-4 w-4" />
              {t('receipt.printSheet')}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('receipt.closeHandoverSheet')}
              className="rounded-md p-1.5 text-[#94A3B8] hover:bg-muted hover:text-fg"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="max-h-[75vh] overflow-auto bg-canvas p-6">
          <div
            id="print-handover-area"
            className="mx-auto rounded-input border border-[#C8D7EC] bg-white p-8 text-slate-900 shadow-sm print:border-none print:p-6 print:shadow-none"
          >
            <div className="flex items-start justify-between border-b-2 border-[#0F294A] pb-4">
              <div>
                <p className="text-xs font-bold tracking-widest text-[#1D4ED8] uppercase">
                  SetupOps · IT Workshop
                </p>
                <h3 className="mt-1 text-xl font-bold text-[#0F294A]">
                  {t('receipt.itHardwareHandoverProtocol')}
                </h3>
              </div>
              <div className="text-right">
                <span className="font-mono-code inline-block rounded bg-[#E8F0FE] px-2.5 py-1 text-sm font-bold text-[#1D4ED8]">
                  {device.assetTag}
                </span>
                <p className="tabular-nums mt-1 text-xs text-slate-500">
                  {formatLocaleDateTime(h.handedOverAt, lang)}
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-6 text-sm">
              <div>
                <h4 className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                  {t('receipt.deviceDetails')}
                </h4>
                <dl className="mt-2 space-y-1.5">
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">{t('receipt.model')}</dt>
                    <dd className="font-semibold text-right">
                      {device.hersteller} {device.modell}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">{t('receipt.type')}</dt>
                    <dd className="text-right">{trDeviceType(device.typ, lang)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">{t('receipt.serialNo')}</dt>
                    <dd className="font-mono-code text-xs text-right">{device.seriennummer}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">{t('receipt.os')}</dt>
                    <dd className="text-right">{trOperatingSystem(device.betriebssystem, lang)}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h4 className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                  {t('receipt.recipientIssue')}
                </h4>
                <dl className="mt-2 space-y-1.5">
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">{t('receipt.recipient')}</dt>
                    <dd className="font-semibold text-right">{h.recipientName}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">{t('receipt.department')}</dt>
                    <dd className="text-right">{h.department || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">{t('receipt.issuedBy')}</dt>
                    <dd className="text-right">{h.handedOverByName}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="mt-6 space-y-3 border-t border-slate-200 pt-4 text-sm">
              <div>
                <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                  {t('receipt.includedAccessories')}
                </p>
                <p className="mt-1 text-slate-800">{h.accessories || '—'}</p>
              </div>
              {h.handoverNotes && (
                <div>
                  <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                    {t('receipt.handoverNotes')}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-slate-700">{h.handoverNotes}</p>
                </div>
              )}
            </div>

            <div className="mt-10 grid grid-cols-2 gap-8 border-t border-slate-200 pt-6 text-xs text-slate-500">
              <div>
                <div className="h-10 border-b border-slate-400" />
                <p className="mt-1.5">
                  {t('receipt.itTechnicianHandedoverbyname', { handedOverByName: h.handedOverByName })}
                </p>
              </div>
              <div>
                <div className="h-10 border-b border-slate-400" />
                <p className="mt-1.5">
                  {t('receipt.recipientSignatureRecipientname', { recipientName: h.recipientName })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
