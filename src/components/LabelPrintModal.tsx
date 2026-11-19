import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Printer, X } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import type { Device } from '../types';
import { useT } from '../i18n';

interface LabelPrintModalProps {
  open: boolean;
  device: Device;
  onClose: () => void;
}

type LabelFormat = '62x29' | 'a4';

function SingleAssetLabel({
  device,
  qrDataUrl,
}: {
  device: Device;
  qrDataUrl: string;
}) {
  return (
    <div
      className="flex items-center justify-between gap-2.5 border border-slate-300 bg-white p-2 text-slate-950"
      style={{
        width: '62mm',
        height: '29mm',
        boxSizing: 'border-box',
      }}
    >
      <div className="flex min-w-0 flex-1 flex-col justify-between overflow-hidden">
        <div className="truncate text-[8.5px] font-semibold tracking-wider whitespace-nowrap text-[#1E3A5F] uppercase">
          SetupOps · Asset
        </div>
        <div className="font-mono-code text-[15px] leading-tight font-bold text-slate-950">
          {device.assetTag}
        </div>
        <div className="truncate text-[10px] font-medium text-slate-800">
          {device.hersteller} {device.modell}
        </div>
        <div className="font-mono-code truncate text-[9px] text-slate-600">
          SN: {device.seriennummer}
        </div>
      </div>
      {qrDataUrl && (
        <img
          src={qrDataUrl}
          alt={`QR code for ${device.assetTag}`}
          className="h-[22mm] w-[22mm] shrink-0 object-contain"
        />
      )}
    </div>
  );
}

export function LabelPrintModal({ open, device, onClose }: LabelPrintModalProps) {
  const { lang } = useLanguage();
  const t = useT();
  const [format, setFormat] = useState<LabelFormat>('62x29');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    const deviceUrl = `${window.location.origin}/devices/${device.id}`;
    QRCode.toDataURL(deviceUrl, {
      margin: 1,
      width: 240,
      color: { dark: '#0F172A', light: '#FFFFFF' },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR generation failed:', err));
  }, [open, device.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#091529]/60 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="label-modal-title"
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-card border border-line bg-surface shadow-xl">
        <div className="no-print flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <h2
              id="label-modal-title"
              className="text-base font-semibold text-fg"
            >
              {t('label.printAssetLabel')}
            </h2>
            <p className="mt-0.5 text-xs text-fg-muted">
              {t('label.printReadyLabelWithQr', { assetTag: device.assetTag })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('label.closeLabelDialog')}
            className="rounded-md p-1.5 text-[#94A3B8] hover:bg-muted hover:text-fg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="no-print flex flex-wrap items-center justify-between gap-4 border-b border-line bg-subtle px-6 py-3">
          <div className="flex items-center gap-1 rounded-input border border-line bg-surface p-1">
            <button
              type="button"
              onClick={() => setFormat('62x29')}
              className={`rounded-control px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                format === '62x29'
                  ? 'bg-[#1D4ED8] text-white'
                  : 'text-fg-muted hover:text-[#0F172A] '
              }`}
            >
              {t('label.singleLabel6229Mm')}
            </button>
            <button
              type="button"
              onClick={() => setFormat('a4')}
              className={`rounded-control px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                format === 'a4'
                  ? 'bg-[#1D4ED8] text-white'
                  : 'text-fg-muted hover:text-[#0F172A] '
              }`}
            >
              {t('label.a4Sheet12Up')}
            </button>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-input bg-[#1D4ED8] px-4 py-2 text-sm font-medium text-white hover:bg-[#1E40AF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
          >
            <Printer className="h-4 w-4" />
            {t('label.printNow')}
          </button>
        </div>

        <div className="max-h-[65vh] overflow-auto bg-canvas p-6">
          <div id="print-label-area" className="mx-auto flex justify-center">
            {format === '62x29' ? (
              <div className="rounded bg-white p-4 shadow-sm print:p-0 print:shadow-none">
                <SingleAssetLabel device={device} qrDataUrl={qrDataUrl} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 bg-white p-6 shadow-sm sm:grid-cols-3 print:grid-cols-3 print:gap-2 print:p-4 print:shadow-none">
                {Array.from({ length: 12 }).map((_, i) => (
                  <SingleAssetLabel key={i} device={device} qrDataUrl={qrDataUrl} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
