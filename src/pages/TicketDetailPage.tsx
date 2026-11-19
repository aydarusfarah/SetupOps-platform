import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Cpu,
  Trash2,
  Send,
  AlertCircle,
  Plus,
  X,
  Check,
  Loader2,
  ClipboardPaste,
  MessageSquarePlus,
} from 'lucide-react';
import { useWorkshopData } from '../hooks/useWorkshopData';
import { useToast } from '../hooks/useToast';
import { useLanguage } from '../hooks/useLanguage';
import {
  formatLocaleDate,
  formatLocaleDateTime,
  trChecklistLabel,
  trOperatingSystem,
  trTicketCategory,
  trTicketPriority,
  trTicketStatus,
  trUserRole,
  trAuditField,
  trAuditValue,
} from '../i18n/labels';
import { getChecklistProgress } from '../lib/domain';
import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type DiagnosisResponse,
  type TicketComment,
  type TicketPriority,
  type TicketStatus,
} from '../types';
import { TicketPriorityBadge, TicketStatusBadge } from '../components/ui/Badges';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useT } from '../i18n';
import { OverflowMenu } from '../components/ui/OverflowMenu';

export function TicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    currentUser,
    tickets,
    devices,
    staff,
    auditLogs,
    updateTicket,
    deleteTicket,
    subscribeTicketComments,
    addTicketComment,
  } = useWorkshopData();
  const { showToast } = useToast();
  const { lang } = useLanguage();
  const t = useT();

  const ticket = tickets.find((ticket) => ticket.id === id);
  const linkedDevice = devices.find((d) => d.id === ticket?.deviceId);

  const [solutionDraft, setSolutionDraft] = useState('');
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [savingSolution, setSavingSolution] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // AI Diagnosis Panel state
  const [diagOpen, setDiagOpen] = useState(false);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagError, setDiagError] = useState<string | null>(null);
  const [diagResult, setDiagResult] = useState<DiagnosisResponse | null>(null);
  const [postingDiagComment, setPostingDiagComment] = useState(false);

  useEffect(() => {
    if (ticket) {
      setSolutionDraft(ticket.loesung);
    }
  }, [ticket?.id, ticket?.loesung]);

  useEffect(() => {
    if (!id) return;
    const unsub = subscribeTicketComments(id, setComments);
    return () => unsub();
  }, [id, subscribeTicketComments]);

  const ticketLogs = useMemo(
    () => auditLogs.filter((l) => l.entityId === id),
    [auditLogs, id],
  );
  const linkedDeviceLogs = useMemo(
    () =>
      ticket?.deviceId
        ? auditLogs.filter((l) => l.entityId === ticket.deviceId).slice(0, 5)
        : [],
    [auditLogs, ticket?.deviceId],
  );

  if (!ticket) {
    return (
      <div className="rounded-card border border-line bg-surface p-8 text-center">
        <p className="text-sm text-fg-muted">
          {t('ticketDetail.ticketNotFoundOrHas')}
        </p>
        <Link
          to="/tickets"
          className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
        >
          {t('ticketDetail.backToTickets')}
        </Link>
      </div>
    );
  }

  const isAdmin = currentUser?.role === 'Admin';
  const isLocked = ticket.status === 'Geschlossen' && !isAdmin;

  const handleFieldUpdate = async (
    patch: Parameters<typeof updateTicket>[1],
    toastTitle: string,
  ) => {
    try {
      await updateTicket(ticket.id, patch);
      showToast(toastTitle, 'success');
    } catch (err) {
      showToast(
        t('ticketDetail.updateFailed'),
        'error',
        err instanceof Error ? err.message : undefined,
      );
    }
  };

  const handleSaveSolution = async () => {
    setSavingSolution(true);
    await handleFieldUpdate(
      { loesung: solutionDraft },
      t('ticketDetail.resolutionSaved'),
    );
    setSavingSolution(false);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSendingComment(true);
    try {
      await addTicketComment(ticket.id, commentText);
      setCommentText('');
    } catch (err) {
      showToast(
        t('ticketDetail.failedToPostComment'),
        'error',
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setSendingComment(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteTicket(ticket.id);
      showToast(t('ticketDetail.ticketDeleted'), 'success');
      navigate('/tickets');
    } catch (err) {
      showToast(
        t('ticketDetail.deleteFailed'),
        'error',
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const runDiagnosis = async () => {
    setDiagOpen(true);
    setDiagLoading(true);
    setDiagError(null);
    try {
      const checklistSummary = linkedDevice
        ? (() => {
            const prog = getChecklistProgress(linkedDevice.checklist);
            return {
              done: prog.done,
              total: prog.total,
              completedItems: linkedDevice.checklist
                .filter((i) => i.checked)
                .map((i) => trChecklistLabel(i.label, lang)),
              pendingItems: linkedDevice.checklist
                .filter((i) => !i.checked)
                .map((i) => trChecklistLabel(i.label, lang)),
            };
          })()
        : null;

      const combinedHistory = [...ticketLogs, ...linkedDeviceLogs]
        .slice(0, 8)
        .map((l) => ({
          field: l.field,
          oldValue: l.oldValue,
          newValue: l.newValue,
          userName: l.userName,
        }));

      const response = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lang,
          ticket: {
            ticketNr: ticket.ticketNr,
            titel: ticket.titel,
            beschreibung: ticket.beschreibung,
            kategorie: ticket.kategorie,
            prioritaet: ticket.prioritaet,
          },
          device: linkedDevice
            ? {
                assetTag: linkedDevice.assetTag,
                typ: linkedDevice.typ,
                hersteller: linkedDevice.hersteller,
                modell: linkedDevice.modell,
                seriennummer: linkedDevice.seriennummer,
                cpu: linkedDevice.cpu,
                ramGB: linkedDevice.ramGB,
                speicherTyp: linkedDevice.speicherTyp,
                speicherGB: linkedDevice.speicherGB,
                betriebssystem: linkedDevice.betriebssystem,
                status: linkedDevice.status,
              }
            : null,
          checklistSummary,
          recentComments: comments.slice(-6).map((c) => ({
            authorName: c.authorName,
            text: c.text,
          })),
          recentHistory: combinedHistory,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error || (t('ticketDetail.serverErrorStatus', { status: response.status })),
        );
      }
      setDiagResult(data as DiagnosisResponse);
    } catch (err) {
      setDiagError(
        err instanceof Error
          ? err.message
          : t('ticketDetail.aiDiagnosticsCouldNotBe'),
      );
    } finally {
      setDiagLoading(false);
    }
  };

  const appendStepToSolution = (stepTitle: string, stepDesc: string) => {
    const addition = `- ${stepTitle}: ${stepDesc}`;
    setSolutionDraft((prev) => (prev.trim() ? `${prev.trim()}\n${addition}` : addition));
    showToast(
      t('ticketDetail.stepAddedToResolution'),
      'info',
      t('ticketDetail.rememberToSaveYourResolution'),
    );
  };

  const appendAllStepsToSolution = () => {
    if (!diagResult) return;
    const stepsBlock = diagResult.schritte
      .map((s, idx) => `${idx + 1}. ${s.titel} (${s.ebene}): ${s.beschreibung}`)
      .join('\n');
    setSolutionDraft((prev) => (prev.trim() ? `${prev.trim()}\n\n${stepsBlock}` : stepsBlock));
    showToast(
      t('ticketDetail.allDiagnosticStepsInsertedInto'),
      'info',
      t('ticketDetail.rememberToSaveYourResolution'),
    );
  };

  const postDiagnosisAsComment = async () => {
    if (!diagResult) return;
    const header = t('ticketDetail.aiDiagnosticsSummary');
    const causesLabel = t('ticketDetail.probableCauses');
    const stepsLabel = t('ticketDetail.recommendedSteps');
    const text = [
      `${header}:`,
      `${causesLabel}: ${diagResult.wahrscheinlicheUrsachen.join('; ')}`,
      '',
      `${stepsLabel}:`,
      ...diagResult.schritte.map((s, idx) => `${idx + 1}. ${s.titel} (${s.ebene}) — ${s.beschreibung}`),
    ]
      .join('\n')
      .slice(0, 1950);

    setPostingDiagComment(true);
    try {
      await addTicketComment(ticket.id, text);
      showToast(
        t('ticketDetail.diagnosisPostedToComments'),
        'success',
      );
    } catch (err) {
      showToast(
        t('ticketDetail.failedToPostDiagnosisComment'),
        'error',
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setPostingDiagComment(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-card border border-line bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono-code rounded bg-accent-soft px-2.5 py-1 text-sm font-semibold text-accent">
                {ticket.ticketNr}
              </span>
              <TicketPriorityBadge priority={ticket.prioritaet} />
              <TicketStatusBadge status={ticket.status} />
              <span className="text-xs text-fg-muted">
                {trTicketCategory(ticket.kategorie, lang)}
              </span>
            </div>

            <h1 className="mt-3 text-[22px] leading-tight font-semibold tracking-tight text-fg">
              {ticket.titel}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-fg-muted">
              <span>{t('ticketDetail.device')}</span>
              <Link
                to={`/devices/${ticket.deviceId}`}
                className="font-mono-code font-semibold text-accent hover:underline"
              >
                {ticket.deviceAssetTag}
              </Link>
              <span>· {ticket.deviceModel}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {t('ticketDetail.createdOn')} {formatLocaleDate(ticket.createdAt, lang)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={runDiagnosis}
              disabled={diagLoading}
              className="btn btn-primary"
            >
              <Cpu className="h-4 w-4" />
              {diagLoading
                ? t('ticketDetail.analyzing')
                : t('ticketDetail.aiDiagnostics')}
            </button>
            {isAdmin && (
              <OverflowMenu
                label={t('common.moreActions')}
                items={[
                  {
                    label: t('ticketDetail.deleteTicketTicketnr', { ticketNr: ticket.ticketNr }),
                    icon: <Trash2 className="h-4 w-4" />,
                    tone: 'danger',
                    onSelect: () => setDeleteDialogOpen(true),
                  },
                ]}
              />
            )}
          </div>
        </div>
      </div>

      {/* Main layout + optional AI Diagnosis Side Panel */}
      <div className={`grid grid-cols-1 gap-6 ${diagOpen ? 'xl:grid-cols-12' : 'lg:grid-cols-3'}`}>
        <div className={`space-y-6 ${diagOpen ? 'xl:col-span-8' : 'lg:col-span-2'}`}>
          {/* Description & Solution */}
          <section className="rounded-card border border-line bg-surface p-6 shadow-sm">
            <h2 className="text-base font-semibold text-fg">
              {t('ticketDetail.issueDescription')}
            </h2>
            <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed text-fg-muted">
              {ticket.beschreibung}
            </p>

            <div className="mt-6 border-t border-line-subtle pt-5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="ticket-solution"
                  className="text-base font-semibold text-fg"
                >
                  {t('ticketDetail.resolutionActionsTaken')}
                </label>
              </div>
              <textarea
                id="ticket-solution"
                rows={4}
                disabled={isLocked}
                value={solutionDraft}
                onChange={(e) => setSolutionDraft(e.target.value)}
                placeholder={
                  t('ticketDetail.documentRepairActionsAndFinal')
                }
                className="mt-2.5 w-full rounded-input border border-line bg-field p-3 text-sm text-fg focus:border-focus focus:outline-none disabled:opacity-60"
              />
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  disabled={isLocked || savingSolution}
                  onClick={handleSaveSolution}
                  className="inline-flex items-center gap-2 rounded-input bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  {savingSolution
                    ? t('common.saving')
                    : t('ticketDetail.saveResolution')}
                </button>
              </div>
            </div>
          </section>

          {/* Comments Thread */}
          <section className="rounded-card border border-line bg-surface p-6 shadow-sm">
            <h2 className="text-base font-semibold text-fg">
              {t('ticketDetail.commentsCommentscount', { commentsCount: comments.length })}
            </h2>

            {comments.length === 0 ? (
              <p className="mt-3 text-sm text-fg-subtle">
                {t('ticketDetail.noCommentsYet')}
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {comments.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-input border border-line bg-subtle p-3.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-fg">
                        {c.authorName}
                      </span>
                      <span className="tabular-nums text-fg-subtle">
                        {formatLocaleDateTime(c.createdAt, lang)}
                      </span>
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm text-fg-muted">
                      {c.text}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={handleAddComment} className="mt-4 flex gap-2.5">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={
                  t('ticketDetail.addTechnicianNoteOrFollow')
                }
                aria-label={t('ticketDetail.enterComment')}
                className="flex-1 rounded-input border border-line bg-field px-3 py-2 text-sm text-fg focus:border-focus focus:outline-none"
              />
              <button
                type="submit"
                disabled={sendingComment || !commentText.trim()}
                className="inline-flex items-center gap-1.5 rounded-input bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {t('ticketDetail.send')}
              </button>
            </form>
          </section>

          {/* Activity Timeline */}
          <section className="rounded-card border border-line bg-surface p-6 shadow-sm">
            <h2 className="text-base font-semibold text-fg">
              {t('ticketDetail.activityTimeline')}
            </h2>
            {ticketLogs.length === 0 ? (
              <p className="mt-3 text-sm text-fg-subtle">
                {t('ticketDetail.noStatusChangesRecordedYet')}
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-line-subtle">
                {ticketLogs.map((log) => (
                  <li key={log.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-xs">
                    <div>
                      <span className="font-semibold text-fg">
                        {trAuditField(log.field, lang)}:
                      </span>{' '}
                      <span className="text-fg-muted">{trAuditValue(log.oldValue, lang)}</span> →{' '}
                      <span className="text-fg">{trAuditValue(log.newValue, lang)}</span>
                    </div>
                    <span className="tabular-nums text-fg-subtle">
                      {log.userName} · {formatLocaleDateTime(log.timestamp, lang)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Right column: AI Diagnosis Side Panel + Ticket Properties */}
        <div className={`space-y-6 ${diagOpen ? 'xl:col-span-4' : 'lg:col-span-1'}`}>
          {diagOpen && (
            <aside
              aria-label={t('ticketDetail.aiDiagnostics')}
              className="rounded-card border border-primary/40 bg-surface p-5 shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-line-subtle pb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-accent" />
                  <h2 className="text-base font-semibold text-fg">
                    {t('ticketDetail.aiDiagnostics')}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setDiagOpen(false)}
                  aria-label={t('ticketDetail.closeDiagnosticsPanel')}
                  className="rounded p-1 text-fg-subtle hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {diagLoading && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-accent" />
                  <p className="mt-3 text-sm font-medium text-fg">
                    {t('ticketDetail.generatingDiagnostics')}
                  </p>
                  <p className="mt-1 text-xs text-fg-muted">
                    {t('ticketDetail.evaluatingTicketContextAndDevice')}
                  </p>
                </div>
              )}

              {!diagLoading && diagError && (
                <div
                  role="alert"
                  className="mt-4 rounded-input border border-danger/30 bg-danger/10 p-3.5 text-xs text-danger-fg"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-semibold">
                        {t('ticketDetail.diagnosticsFailed')}
                      </p>
                      <p className="mt-1">{diagError}</p>
                    </div>
                  </div>
                </div>
              )}

              {!diagLoading && !diagError && diagResult && (
                <div className="mt-4 space-y-5">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={appendAllStepsToSolution}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-input border border-line bg-subtle px-3 py-1.5 text-xs font-medium whitespace-nowrap text-accent hover:bg-muted disabled:opacity-50"
                    >
                      <ClipboardPaste className="h-3.5 w-3.5 shrink-0" />
                      {t('ticketDetail.insertAll')}
                    </button>
                    <button
                      type="button"
                      disabled={postingDiagComment}
                      onClick={postDiagnosisAsComment}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-input bg-primary px-3 py-1.5 text-xs font-medium whitespace-nowrap text-white hover:bg-primary-hover disabled:opacity-50"
                    >
                      <MessageSquarePlus className="h-3.5 w-3.5 shrink-0" />
                      {postingDiagComment
                        ? t('ticketDetail.posting')
                        : t('ticketDetail.postComment')}
                    </button>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold tracking-wider text-fg-muted uppercase">
                      {t('ticketDetail.probableRootCauses')}
                    </h3>
                    <ul className="mt-2 space-y-1.5 text-sm text-fg">
                      {diagResult.wahrscheinlicheUrsachen.map((cause, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="tabular-nums font-semibold text-accent">
                            {idx + 1}.
                          </span>
                          <span>{cause}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="border-t border-line-subtle pt-4">
                    <h3 className="text-xs font-semibold tracking-wider text-fg-muted uppercase">
                      {t('ticketDetail.troubleshootingStepsHardwareSoftware')}
                    </h3>
                    <div className="mt-2.5 space-y-3">
                      {diagResult.schritte.map((step, idx) => (
                        <div
                          key={idx}
                          className="rounded-input border border-line bg-subtle p-3"
                        >
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-fg">
                              {t('ticketDetail.step')} {idx + 1}: {step.titel}
                            </span>
                            <span className="text-[11px] font-medium text-accent">
                              {step.ebene}
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-fg-muted">
                            {step.beschreibung}
                          </p>
                          <button
                            type="button"
                            disabled={isLocked}
                            onClick={() =>
                              appendStepToSolution(step.titel, step.beschreibung)
                            }
                            className="mt-2.5 inline-flex items-center gap-1 rounded-control border border-line bg-surface px-2.5 py-1 text-xs font-medium text-accent hover:bg-muted disabled:opacity-50"
                          >
                            <Plus className="h-3 w-3" />
                            {t('ticketDetail.addToResolution')}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </aside>
          )}

          <section className="space-y-4 rounded-card border border-line bg-surface p-5 shadow-sm">
            <h2 className="text-base font-semibold text-fg">
              {t('ticketDetail.ticketProperties')}
            </h2>

            {isLocked && (
              <p className="rounded-input border border-warning/30 bg-warning/10 p-2.5 text-xs text-warning-fg">
                {t('ticketDetail.thisTicketIsClosedOnly')}
              </p>
            )}

            <div>
              <label
                htmlFor="detail-status"
                className="block text-xs font-semibold tracking-wider text-fg-muted uppercase"
              >
                Status
              </label>
              <select
                id="detail-status"
                disabled={isLocked}
                value={ticket.status}
                onChange={(e) =>
                  handleFieldUpdate(
                    { status: e.target.value as TicketStatus },
                    t('ticketDetail.statusUpdated'),
                  )
                }
                className="mt-1.5 w-full rounded-input border border-line bg-field px-3 py-2 text-sm text-fg disabled:opacity-60"
              >
                {TICKET_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {trTicketStatus(s, lang)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="detail-priority"
                className="block text-xs font-semibold tracking-wider text-fg-muted uppercase"
              >
                {t('common.priority')}
              </label>
              <select
                id="detail-priority"
                disabled={isLocked}
                value={ticket.prioritaet}
                onChange={(e) =>
                  handleFieldUpdate(
                    { prioritaet: e.target.value as TicketPriority },
                    t('ticketDetail.priorityUpdated'),
                  )
                }
                className="mt-1.5 w-full rounded-input border border-line bg-field px-3 py-2 text-sm text-fg disabled:opacity-60"
              >
                {TICKET_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {trTicketPriority(p, lang)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="detail-assignee"
                className="block text-xs font-semibold tracking-wider text-fg-muted uppercase"
              >
                {t('common.assignee')}
              </label>
              <select
                id="detail-assignee"
                disabled={isLocked}
                value={ticket.zugewiesenAn ?? ''}
                onChange={(e) => {
                  const uid = e.target.value || null;
                  const member = staff.find((s) => s.uid === uid) ?? null;
                  void handleFieldUpdate(
                    {
                      zugewiesenAn: uid,
                      zugewiesenAnName: member ? member.name : null,
                    },
                    t('ticketDetail.assigneeUpdated'),
                  );
                }}
                className="mt-1.5 w-full rounded-input border border-line bg-field px-3 py-2 text-sm text-fg disabled:opacity-60"
              >
                <option value="">{t('common.unassigned')}</option>
                {staff.map((m) => (
                  <option key={m.uid} value={m.uid}>
                    {m.name} ({trUserRole(m.role, lang)})
                  </option>
                ))}
              </select>
            </div>

            {linkedDevice && (
              <div className="border-t border-line-subtle pt-4 text-xs">
                <p className="font-semibold tracking-wider text-fg-muted uppercase">
                  {t('ticketDetail.deviceSpecs')}
                </p>
                <div className="mt-2 space-y-1 text-fg-muted">
                  <p>
                    <span className="font-medium text-fg">
                      {t('ticketDetail.model')}
                    </span>{' '}
                    {linkedDevice.hersteller} {linkedDevice.modell}
                  </p>
                  <p>
                    <span className="font-medium text-fg">CPU:</span>{' '}
                    {linkedDevice.cpu || '—'}
                  </p>
                  <p>
                    <span className="font-medium text-fg">
                      {t('ticketDetail.ramStorage')}
                    </span>{' '}
                    {linkedDevice.ramGB} GB · {linkedDevice.speicherGB} GB{' '}
                    {linkedDevice.speicherTyp}
                  </p>
                  <p>
                    <span className="font-medium text-fg">OS:</span>{' '}
                    {trOperatingSystem(linkedDevice.betriebssystem, lang)}
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        title={t('ticketDetail.deleteTicketTicketnr2', { ticketNr: ticket.ticketNr })}
        description={
          t('ticketDetail.thisTicketAndAllAssociated')
        }
        confirmLabel={t('ticketDetail.deletePermanently')}
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </div>
  );
}
