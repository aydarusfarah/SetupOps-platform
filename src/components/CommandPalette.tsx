import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Laptop, Search, Ticket as TicketIcon, ArrowRight, X } from 'lucide-react';
import { useWorkshopData } from '../hooks/useWorkshopData';
import { useLanguage } from '../hooks/useLanguage';
import { DeviceStatusBadge, TicketStatusBadge } from './ui/Badges';
import { useT } from '../i18n';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const { devices, tickets } = useWorkshopData();
  const { lang } = useLanguage();
  const t = useT();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchedDevices = devices
      .filter((d) => {
        if (!q) return true;
        return (
          d.assetTag.toLowerCase().includes(q) ||
          d.seriennummer.toLowerCase().includes(q) ||
          d.hersteller.toLowerCase().includes(q) ||
          d.modell.toLowerCase().includes(q)
        );
      })
      .slice(0, 6);

    const matchedTickets = tickets
      .filter((ticket) => {
        if (!q) return true;
        return (
          ticket.ticketNr.toLowerCase().includes(q) ||
          ticket.titel.toLowerCase().includes(q) ||
          ticket.deviceAssetTag.toLowerCase().includes(q) ||
          ticket.deviceModel.toLowerCase().includes(q)
        );
      })
      .slice(0, 6);

    return { matchedDevices, matchedTickets };
  }, [devices, tickets, query]);

  if (!open) return null;

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-[#091529]/60 px-4 pt-20 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-label={t('palette.globalSearch')}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-card border border-line bg-surface shadow-xl">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-accent" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              t('palette.searchDeviceAssetTagWh')
            }
            aria-label={t('palette.searchDevicesAndTickets')}
            className="w-full bg-transparent text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label={t('palette.closeSearch')}
            className="rounded p-1 text-fg-subtle hover:bg-muted hover:text-fg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[420px] overflow-y-auto p-2">
          {results.matchedDevices.length === 0 && results.matchedTickets.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-fg-muted">
              {t('palette.noMatchingDevicesOrTickets')}
            </div>
          ) : (
            <div className="space-y-3">
              {results.matchedDevices.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wider text-fg-muted uppercase">
                    {t('common.devices')}
                  </div>
                  <div className="space-y-0.5">
                    {results.matchedDevices.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => go(`/devices/${d.id}`)}
                        className="flex w-full items-center justify-between gap-3 rounded-input px-3 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-focus"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <Laptop className="h-4 w-4 shrink-0 text-fg-muted" />
                          <span className="font-mono-code shrink-0 text-xs font-semibold text-accent">
                            {d.assetTag}
                          </span>
                          <span className="truncate font-medium text-fg">
                            {d.hersteller} {d.modell}
                          </span>
                          <span className="font-mono-code hidden truncate text-xs text-fg-subtle sm:inline">
                            {d.seriennummer}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <DeviceStatusBadge status={d.status} />
                          <ArrowRight className="h-3.5 w-3.5 text-fg-subtle" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {results.matchedTickets.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wider text-fg-muted uppercase">
                    Tickets
                  </div>
                  <div className="space-y-0.5">
                    {results.matchedTickets.map((ticket) => (
                      <button
                        key={ticket.id}
                        type="button"
                        onClick={() => go(`/tickets/${ticket.id}`)}
                        className="flex w-full items-center justify-between gap-3 rounded-input px-3 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-focus"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <TicketIcon className="h-4 w-4 shrink-0 text-fg-muted" />
                          <span className="font-mono-code shrink-0 text-xs font-semibold text-accent">
                            {ticket.ticketNr}
                          </span>
                          <span className="truncate font-medium text-fg">
                            {ticket.titel}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <TicketStatusBadge status={ticket.status} />
                          <ArrowRight className="h-3.5 w-3.5 text-fg-subtle" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-line bg-subtle px-4 py-2 text-xs text-fg-muted">
          <span>
            {t('palette.enterOrClickOpensRecord')}
          </span>
          <span className="font-mono-code">{t('palette.escToClose')}</span>
        </div>
      </div>
    </div>
  );
}
