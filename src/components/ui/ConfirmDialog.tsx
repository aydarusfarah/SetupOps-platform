import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useT } from '../../i18n';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const t = useT();
  const resolvedCancelLabel = cancelLabel ?? (t('common.cancel'));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  const confirmClasses =
    variant === 'danger'
      ? 'bg-danger hover:bg-[#B91C1C] text-white'
      : 'bg-primary hover:bg-primary-hover text-white';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#091529]/60 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="w-full max-w-md rounded-card border border-line bg-surface p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {variant === 'danger' && (
              <div className="mt-0.5 rounded-lg bg-danger/10 p-2 text-danger">
                <AlertTriangle className="h-4 w-4" />
              </div>
            )}
            <div>
              <h2
                id="confirm-dialog-title"
                className="text-base font-semibold text-fg"
              >
                {title}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
                {description}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            aria-label={t('confirm.closeDialog')}
            className="rounded-md p-1 text-fg-subtle hover:bg-muted hover:text-fg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-input border border-line bg-field px-4 py-2 text-sm font-medium text-fg hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
          >
            {resolvedCancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-input px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50 ${confirmClasses}`}
          >
            {loading ? (t('confirm.processing')) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
