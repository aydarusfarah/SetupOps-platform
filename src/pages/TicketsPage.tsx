import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Table as TableIcon,
  Columns3,
  Ticket as TicketIcon,
  UserCheck,
} from 'lucide-react';
import { useWorkshopData } from '../hooks/useWorkshopData';
import { useToast } from '../hooks/useToast';
import { useLanguage } from '../hooks/useLanguage';
import {
  formatLocaleDate,
  trTicketCategory,
  trTicketPriority,
  trTicketStatus,
} from '../i18n/labels';
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type Ticket,
  type TicketStatus,
} from '../types';
import { isTicketOpen } from '../lib/domain';
import { SlaBadge, TicketPriorityBadge, TicketStatusBadge } from '../components/ui/Badges';
import { EmptyState } from '../components/ui/EmptyState';
import { TableSkeleton } from '../components/ui/Skeleton';
import { useT } from '../i18n';

type ViewMode = 'table' | 'kanban';

export function TicketsPage() {
  const { tickets, currentUser, dataLoading, updateTicket } = useWorkshopData();
  const { showToast } = useToast();
  const { lang } = useLanguage();
  const t = useT();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialStatus = searchParams.get('status');
  const resolvedInitialStatus =
    initialStatus === 'open'
      ? '__open__'
      : initialStatus && (TICKET_STATUSES as string[]).includes(initialStatus)
        ? initialStatus
        : 'Alle';

  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(resolvedInitialStatus);
  const [priorityFilter, setPriorityFilter] = useState('Alle');
  const [categoryFilter, setCategoryFilter] = useState('Alle');
  const [onlyMine, setOnlyMine] = useState(searchParams.get('mine') === '1');
  const [dense, setDense] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TicketStatus | null>(null);

  useEffect(() => {
    const paramStatus = searchParams.get('status');
    const paramMine = searchParams.get('mine');
    if (paramStatus === 'open') {
      setStatusFilter('__open__');
    } else if (paramStatus && (TICKET_STATUSES as string[]).includes(paramStatus)) {
      setStatusFilter(paramStatus);
    }
    if (paramMine === '1') {
      setOnlyMine(true);
    }
  }, [searchParams]);

  const filteredTickets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      if (onlyMine && (!currentUser || ticket.zugewiesenAn !== currentUser.uid)) return false;
      if (statusFilter === '__open__') {
        if (!isTicketOpen(ticket.status)) return false;
      } else if (statusFilter !== 'Alle' && ticket.status !== statusFilter) {
        return false;
      }
      if (priorityFilter !== 'Alle' && ticket.prioritaet !== priorityFilter) return false;
      if (categoryFilter !== 'Alle' && ticket.kategorie !== categoryFilter) return false;
      if (!q) return true;
      return (
        ticket.ticketNr.toLowerCase().includes(q) ||
        ticket.titel.toLowerCase().includes(q) ||
        ticket.deviceAssetTag.toLowerCase().includes(q) ||
        ticket.deviceModel.toLowerCase().includes(q)
      );
    });
  }, [tickets, search, statusFilter, priorityFilter, categoryFilter, onlyMine, currentUser]);

  const handleStatusMove = async (ticket: Ticket, targetStatus: TicketStatus) => {
    if (ticket.status === targetStatus) return;
    if (ticket.status === 'Geschlossen' && currentUser?.role !== 'Admin') {
      showToast(
        t('tickets.closedTicketLocked'),
        'error',
        t('tickets.onlyAdministratorsCanReopenClosed'),
      );
      return;
    }
    try {
      await updateTicket(ticket.id, { status: targetStatus });
      showToast(
        t('tickets.ticketStatusUpdated'),
        'success',
        `${ticket.ticketNr} → ${trTicketStatus(targetStatus, lang)}`,
      );
    } catch (err) {
      showToast(
        t('tickets.failedToUpdateStatus'),
        'error',
        err instanceof Error ? err.message : undefined,
      );
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TicketStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    const id = draggedId || e.dataTransfer.getData('text/plain');
    setDraggedId(null);
    const ticket = tickets.find((ticket) => ticket.id === id);
    if (ticket) {
      await handleStatusMove(ticket, targetStatus);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] leading-tight font-semibold tracking-tight text-fg">
            Tickets
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            {t('tickets.repairJobsSetupTasksAnd', { filteredTicketsCount: filteredTickets.length })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-input border border-line bg-surface p-1">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-pressed={viewMode === 'table'}
              className={`inline-flex items-center gap-1.5 rounded-control px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                viewMode === 'table'
                  ? 'bg-primary text-white'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              <TableIcon className="h-3.5 w-3.5" />
              {t('tickets.table')}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              aria-pressed={viewMode === 'kanban'}
              className={`inline-flex items-center gap-1.5 rounded-control px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-primary text-white'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              <Columns3 className="h-3.5 w-3.5" />
              Kanban
            </button>
          </div>

          <Link
            to="/tickets/new"
            className="inline-flex items-center gap-2 rounded-input bg-primary px-4 py-2 text-sm font-medium text-white whitespace-nowrap shadow-xs transition-colors hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            {t('common.createTicket')}
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface p-3.5 shadow-sm">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-accent" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              t('tickets.searchByTicketNoTitle')
            }
            aria-label={t('tickets.searchTickets')}
            className="w-full rounded-input border border-line bg-subtle py-2 pr-3 pl-9 text-sm text-fg placeholder:text-fg-subtle focus:border-focus focus:bg-white focus:outline-none"
          />
        </div>

        {viewMode === 'table' && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label={t('tickets.filterByTicketStatus')}
            className="rounded-input border border-line bg-field px-3 py-2 text-sm text-fg"
          >
            <option value="Alle">{t('tickets.statusAll')}</option>
            <option value="__open__">{t('tickets.openActive')}</option>
            {TICKET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {trTicketStatus(s, lang)}
              </option>
            ))}
          </select>
        )}

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          aria-label={t('tickets.filterByPriority')}
          className="rounded-input border border-line bg-field px-3 py-2 text-sm text-fg"
        >
          <option value="Alle">{t('tickets.priorityAll')}</option>
          {TICKET_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {trTicketPriority(p, lang)}
            </option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label={t('tickets.filterByCategory')}
          className="rounded-input border border-line bg-field px-3 py-2 text-sm text-fg"
        >
          <option value="Alle">{t('tickets.categoryAll')}</option>
          {TICKET_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {trTicketCategory(c, lang)}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setOnlyMine((prev) => !prev)}
          aria-pressed={onlyMine}
          className={`inline-flex items-center gap-1.5 rounded-input border px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
            onlyMine
              ? 'border-primary bg-accent-soft text-accent'
              : 'border-line bg-subtle text-fg-muted hover:bg-muted'
          }`}
        >
          <UserCheck className="h-3.5 w-3.5" />
          {t('tickets.assignedToMe')}
        </button>

        {viewMode === 'table' && (
          <button
            type="button"
            onClick={() => setDense((prev) => !prev)}
            className="rounded-input border border-line bg-subtle px-3 py-2 text-xs font-medium text-fg-muted whitespace-nowrap hover:bg-muted"
          >
            {t('tickets.density')}:{' '}
            {dense ? (t('tickets.compact')) : 'Standard'}
          </button>
        )}
      </div>

      {dataLoading ? (
        <TableSkeleton />
      ) : filteredTickets.length === 0 ? (
        <EmptyState
          icon={TicketIcon}
          title={t('tickets.noTicketsFound')}
          description={
            tickets.length === 0
              ? t('tickets.createTheFirstRepairOr')
              : t('tickets.noTicketsMatchTheSelected')
          }
          actionLabel={
            tickets.length === 0
              ? t('tickets.createFirstTicket')
              : t('tickets.resetFilters')
          }
          onAction={() => {
            if (tickets.length === 0) {
              navigate('/tickets/new');
            } else {
              setSearch('');
              setStatusFilter('Alle');
              setPriorityFilter('Alle');
              setCategoryFilter('Alle');
              setOnlyMine(false);
              if (searchParams.toString()) setSearchParams({});
            }
          }}
        />
      ) : viewMode === 'table' ? (
        <>
          <div className="hidden overflow-hidden rounded-card border border-line bg-surface shadow-sm md:block">
            <div className="max-h-[620px] overflow-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 bg-subtle text-xs font-semibold text-fg-muted shadow-[inset_0_-1px_0_var(--so-line)]">
                  <tr>
                    <th className="px-4 py-2.5 whitespace-nowrap">{t('tickets.ticketNo')}</th>
                    <th className="px-4 py-2.5 whitespace-nowrap">{t('tickets.titleDevice')}</th>
                    <th className="px-4 py-2.5 whitespace-nowrap">{t('tickets.category')}</th>
                    <th className="px-4 py-2.5 whitespace-nowrap">{t('common.priority')}</th>
                    <th className="px-4 py-2.5 whitespace-nowrap">Status</th>
                    <th className="px-4 py-2.5 whitespace-nowrap">{t('sla.column')}</th>
                    <th className="px-4 py-2.5 whitespace-nowrap">{t('common.assignee')}</th>
                    <th className="px-4 py-2.5 whitespace-nowrap">{t('tickets.created')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle">
                  {filteredTickets.map((ticket) => {
                    const rowPad = dense ? 'py-2' : 'py-3';
                    return (
                      <tr
                        key={ticket.id}
                        className="transition-colors hover:bg-muted"
                      >
                        <td className={`px-4 ${rowPad}`}>
                          <Link
                            to={`/tickets/${ticket.id}`}
                            className="font-mono-code font-semibold whitespace-nowrap text-accent hover:underline"
                          >
                            {ticket.ticketNr}
                          </Link>
                        </td>
                        <td className={`px-4 ${rowPad}`}>
                          <Link to={`/tickets/${ticket.id}`} className="block">
                            <p className="font-medium text-fg">
                              {ticket.titel}
                            </p>
                            <p className="mt-0.5 text-xs text-fg-muted">
                              <span className="font-mono-code">{ticket.deviceAssetTag}</span> ·{' '}
                              {ticket.deviceModel}
                            </p>
                          </Link>
                        </td>
                        <td className={`px-4 text-xs whitespace-nowrap text-fg-muted ${rowPad}`}>
                          {trTicketCategory(ticket.kategorie, lang)}
                        </td>
                        <td className={`px-4 ${rowPad}`}>
                          <TicketPriorityBadge priority={ticket.prioritaet} />
                        </td>
                        <td className={`px-4 ${rowPad}`}>
                          <TicketStatusBadge status={ticket.status} />
                        </td>
                        <td className={`px-4 ${rowPad}`}>
                          <SlaBadge ticket={ticket} />
                        </td>
                        <td className={`px-4 text-xs whitespace-nowrap text-fg-muted ${rowPad}`}>
                          {ticket.zugewiesenAnName || (t('common.unassigned'))}
                        </td>
                        <td className={`tabular-nums px-4 text-xs text-fg-subtle ${rowPad}`}>
                          {formatLocaleDate(ticket.createdAt, lang)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {filteredTickets.map((ticket) => (
              <Link
                key={ticket.id}
                to={`/tickets/${ticket.id}`}
                className="block rounded-card border border-line bg-surface p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono-code text-xs font-semibold text-accent">
                    {ticket.ticketNr}
                  </span>
                  <TicketPriorityBadge priority={ticket.prioritaet} />
                </div>
                <p className="mt-1.5 font-medium text-fg">{ticket.titel}</p>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs text-fg-muted">
                  <span className="font-mono-code">{ticket.deviceAssetTag}</span>
                  <span className="flex items-center gap-1.5">
                    <SlaBadge ticket={ticket} compact />
                    <TicketStatusBadge status={ticket.status} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : (
        /* Kanban Board */
        <div className="grid grid-cols-1 gap-4 pb-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {TICKET_STATUSES.map((colStatus) => {
            const colTickets = filteredTickets.filter((ticket) => ticket.status === colStatus);
            const isDragOver = dragOverCol === colStatus;
            return (
              <div
                key={colStatus}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverCol(colStatus);
                }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={(e) => handleDrop(e, colStatus)}
                className={`flex min-h-[340px] flex-col rounded-card border p-3 transition-colors duration-150 lg:min-h-[420px] ${
                  isDragOver
                    ? 'border-focus bg-accent-soft/70'
                    : 'border-line bg-subtle/80'
                }`}
              >
                <div className="mb-3 flex items-center justify-between px-1">
                  <h2 className="text-xs font-semibold tracking-wider text-fg-muted uppercase">
                    {trTicketStatus(colStatus, lang)}
                  </h2>
                  <span className="tabular-nums rounded bg-surface/80 px-1.5 py-0.5 text-xs font-semibold text-accent">
                    {colTickets.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {colTickets.map((ticket) => {
                    const initials = ticket.zugewiesenAnName
                      ? ticket.zugewiesenAnName
                          .split(' ')
                          .map((p) => p[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()
                      : '—';
                    return (
                      <div
                        key={ticket.id}
                        draggable
                        onDragStart={(e) => {
                          setDraggedId(ticket.id);
                          e.dataTransfer.setData('text/plain', ticket.id);
                        }}
                        className="cursor-grab rounded-input border border-line bg-surface p-3 shadow-xs transition-all duration-150 hover:border-line-strong hover:shadow-sm active:cursor-grabbing"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Link
                            to={`/tickets/${ticket.id}`}
                            className="font-mono-code text-xs font-semibold text-accent hover:underline"
                          >
                            {ticket.ticketNr}
                          </Link>
                          <TicketPriorityBadge priority={ticket.prioritaet} />
                        </div>

                        <Link
                          to={`/tickets/${ticket.id}`}
                          className="mt-2 block text-sm font-medium text-fg hover:text-accent"
                        >
                          {ticket.titel}
                        </Link>
                        <div className="mt-2 empty:hidden">
                          <SlaBadge ticket={ticket} compact />
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-line-subtle pt-2.5">
                          <Link
                            to={`/devices/${ticket.deviceId}`}
                            className="font-mono-code text-xs text-fg-muted hover:text-accent"
                          >
                            {ticket.deviceAssetTag}
                          </Link>
                          <span
                            title={
                              ticket.zugewiesenAnName ?? (t('common.unassigned'))
                            }
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-[10px] font-semibold text-accent"
                          >
                            {initials}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
