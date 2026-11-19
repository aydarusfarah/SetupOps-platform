import { Link } from 'react-router-dom';
import { Laptop, Ticket as TicketIcon } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { useT } from '../../i18n';
import { formatLocaleShortDateTime, trAuditField, trAuditValue } from '../../i18n/labels';
import type { AuditLogEntry } from '../../types';
import { Panel } from '../ui/Panel';

/** Latest audit-log entries as a compact timeline. */
export function ActivityFeed({ logs, className = '' }: { logs: AuditLogEntry[]; className?: string }) {
  const t = useT();
  const { lang } = useLanguage();

  return (
    <Panel
      className={className}
      title={t('dashboard.recentActivity')}
      actions={<span className="tabular-nums text-xs text-fg-subtle">{logs.length}</span>}
    >
      {logs.length === 0 ? (
        <p className="py-8 text-center text-sm text-fg-subtle">{t('dashboard.noActivityRecordedYet')}</p>
      ) : (
        <ol className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-px before:bg-line-subtle">
          {logs.map((log) => {
            const Icon = log.entityType === 'device' ? Laptop : TicketIcon;
            return (
              <li key={log.id} className="relative flex gap-3">
                <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-fg-subtle">
                  <Icon className="h-3 w-3" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <Link
                      to={log.entityType === 'device' ? `/devices/${log.entityId}` : `/tickets/${log.entityId}`}
                      className="font-mono-code font-semibold text-accent hover:underline"
                    >
                      {log.entityLabel}
                    </Link>
                    <time dateTime={log.timestamp} className="tabular-nums text-fg-subtle">
                      {formatLocaleShortDateTime(log.timestamp, lang)}
                    </time>
                  </div>
                  <p className="mt-0.5 text-xs text-fg">
                    <span className="font-medium">{trAuditField(log.field, lang)}:</span>{' '}
                    <span className="text-fg-muted">{trAuditValue(log.oldValue, lang)}</span> →{' '}
                    <span>{trAuditValue(log.newValue, lang)}</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-fg-subtle">{log.userName}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}
