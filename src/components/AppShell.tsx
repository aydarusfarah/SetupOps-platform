import React, { useEffect, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Laptop,
  Ticket as TicketIcon,
  Settings,
  BarChart3,
  Search,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  LogOut,
  ChevronRight,
  ChevronDown,
  Info,
} from 'lucide-react';
import { useWorkshopData } from '../hooks/useWorkshopData';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';
import { trUserRole } from '../i18n/labels';
import { CommandPalette } from './CommandPalette';
import { BrandMark } from './ui/BrandMark';
import { LanguageSwitch } from './ui/LanguageSwitch';
import { useT, type MessageKey } from '../i18n';

interface NavItem {
  to: string;
  label: MessageKey;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'shell.navDashboard', icon: LayoutDashboard },
  { to: '/devices', label: 'common.devices', icon: Laptop },
  { to: '/tickets', label: 'shell.navTickets', icon: TicketIcon },
  { to: '/reports', label: 'shell.navReports', icon: BarChart3 },
  { to: '/settings', label: 'shell.navSettings', icon: Settings },
];

function useBreadcrumbs(): Array<{ label: string; to?: string }> {
  const { pathname } = useLocation();
  const { devices, tickets } = useWorkshopData();
  const { lang } = useLanguage();
  const t = useT();

  if (pathname === '/') return [{ label: t('shell.navDashboard') }];
  if (pathname === '/devices') return [{ label: t('common.devices') }];
  if (pathname === '/devices/new') {
    return [
      { label: t('common.devices'), to: '/devices' },
      { label: t('shell.addDevice') },
    ];
  }
  if (pathname.startsWith('/devices/')) {
    const parts = pathname.split('/');
    const id = parts[2];
    const dev = devices.find((d) => d.id === id);
    const label = dev
      ? `${dev.assetTag} · ${dev.modell}`
      : t('shell.deviceDetails');
    if (parts[3] === 'edit') {
      return [
        { label: t('common.devices'), to: '/devices' },
        { label, to: `/devices/${id}` },
        { label: t('shell.edit') },
      ];
    }
    return [{ label: t('common.devices'), to: '/devices' }, { label }];
  }
  if (pathname === '/tickets') return [{ label: t('shell.navTickets') }];
  if (pathname === '/tickets/new') {
    return [
      { label: t('shell.navTickets'), to: '/tickets' },
      { label: t('common.createTicket') },
    ];
  }
  if (pathname.startsWith('/tickets/')) {
    const id = pathname.split('/')[2];
    const tck = tickets.find((ticket) => ticket.id === id);
    return [
      { label: t('shell.navTickets'), to: '/tickets' },
      { label: tck ? tck.ticketNr : t('shell.ticketDetails') },
    ];
  }
  if (pathname === '/reports') return [{ label: t('shell.navReports') }];
  if (pathname === '/settings') return [{ label: t('shell.settings') }];
  return [{ label: 'SetupOps' }];
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { currentUser, signOut, isPreviewAutostart } = useWorkshopData();
  const { theme, toggleTheme } = useTheme();
  const { lang } = useLanguage();
  const t = useT();
  const breadcrumbs = useBreadcrumbs();

  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setMobileOpen(false);
        setUserMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const initials =
    currentUser?.name
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'SO';
  const roleLabel = currentUser ? trUserRole(currentUser.role, lang) : '';

  const avatar = (size: string) =>
    currentUser?.photoURL ? (
      <img
        src={currentUser.photoURL}
        alt=""
        referrerPolicy="no-referrer"
        className={`${size} shrink-0 rounded-full object-cover`}
      />
    ) : (
      <span
        className={`${size} flex shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-on-primary`}
      >
        {initials}
      </span>
    );

  const toggleLabel = collapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar');

  /** Icon-only collapse/expand button with a styled tooltip to its right. */
  const collapseToggle = (
    <button
      type="button"
      onClick={() => setCollapsed((prev) => !prev)}
      aria-label={toggleLabel}
      aria-expanded={!collapsed}
      className="group relative flex h-8 w-8 shrink-0 items-center justify-center rounded-input text-sidebar-muted ring-1 ring-sidebar-line transition-colors hover:bg-sidebar-hover hover:text-white hover:ring-transparent focus-visible:outline-2 focus-visible:outline-white/70"
    >
      {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-full z-50 ml-3 -translate-x-1 -translate-y-1/2 rounded-control bg-slate-950 px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-lg ring-1 ring-white/10 transition-[opacity,transform] duration-150 group-hover:translate-x-0 group-hover:opacity-100 group-hover:delay-200 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
      >
        <span className="absolute top-1/2 -left-1 h-2 w-2 -translate-y-1/2 rotate-45 bg-slate-950" />
        <span className="relative">{toggleLabel}</span>
      </span>
    </button>
  );

  /** Navy side bar content, shared by the desktop rail and the mobile drawer. */
  const sidebar = (isMobile: boolean) => {
    const iconOnly = !isMobile && collapsed;
    return (
      <div className="flex h-full flex-col bg-sidebar text-sidebar-fg">
        {/* Brand */}
        <div
          className={`flex h-16 shrink-0 items-center border-b border-sidebar-line ${
            iconOnly ? 'justify-center px-2' : 'justify-between px-4'
          }`}
        >
          <Link
            to="/"
            title="SetupOps"
            className="flex items-center gap-2.5 rounded-input focus-visible:outline-2 focus-visible:outline-focus"
          >
            <BrandMark className="h-8 w-8" />
            {!iconOnly && <span className="text-[17px] font-semibold tracking-tight text-white">SetupOps</span>}
          </Link>
          {!isMobile && !collapsed && collapseToggle}
          {isMobile && (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label={t('shell.closeNavigation')}
              className="rounded-input p-1.5 text-sidebar-muted hover:bg-sidebar-hover hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Collapsed rail: expand button sits right under the logo */}
        {iconOnly && (
          <div className="flex shrink-0 justify-center border-b border-sidebar-line py-3">{collapseToggle}</div>
        )}

        {/* Navigation */}
        <nav aria-label={t('shell.mainNavigation')} className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const label = t(item.label);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                title={iconOnly ? label : undefined}
                className={({ isActive }) =>
                  `flex h-10 items-center gap-3 rounded-input text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white/70 ${
                    iconOnly ? 'justify-center px-0' : 'px-3'
                  } ${
                    isActive
                      ? 'bg-primary text-white shadow-[0_1px_2px_rgb(0_0_0/0.25)]'
                      : 'text-sidebar-fg/85 hover:bg-sidebar-hover hover:text-white'
                  }`
                }
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {!iconOnly && <span>{label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* User card */}
        <div className={`shrink-0 px-3 pb-3 ${iconOnly ? 'flex justify-center' : ''}`}>
          <div
            title={iconOnly ? `${currentUser?.name ?? ''} · ${roleLabel}` : undefined}
            className={`flex items-center gap-3 rounded-card bg-sidebar-raised ${iconOnly ? 'p-1.5' : 'px-3 py-2.5'}`}
          >
            {avatar('h-9 w-9')}
            {!iconOnly && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{currentUser?.name}</p>
                <p className="truncate text-xs text-sidebar-muted">{roleLabel}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-canvas text-fg">
      {/* Side bar (desktop) */}
      <aside
        className={`no-print sticky top-0 z-40 hidden h-screen shrink-0 transition-[width] duration-200 ease-out md:block ${
          collapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {sidebar(false)}
      </aside>

      {/* Side bar (mobile drawer) */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-200 md:hidden ${
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden={!mobileOpen}
      >
        <div className="absolute inset-0 bg-sidebar/60" onClick={() => setMobileOpen(false)} aria-hidden="true" />
        <aside
          className={`relative h-full w-72 shadow-xl transition-transform duration-200 ease-out ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {sidebar(true)}
        </aside>
      </div>

      {/* Content column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur-sm sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label={t('shell.openMenu')}
            className="rounded-input p-1.5 text-fg-muted hover:bg-muted md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <nav aria-label={t('shell.breadcrumb')} className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />}
                {crumb.to ? (
                  <Link to={crumb.to} className="truncate whitespace-nowrap text-fg-muted hover:text-accent">
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="truncate font-semibold whitespace-nowrap text-fg">
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label={t('shell.openGlobalSearchCtrlK')}
              className="flex h-9 items-center gap-2 rounded-input border border-line bg-subtle px-3 text-sm text-fg-subtle transition-colors hover:border-line-strong hover:text-fg focus-visible:outline-2 focus-visible:outline-focus"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="hidden lg:inline">{t('shell.search')}</span>
              <kbd className="font-mono-code ml-2 hidden rounded-control border border-line bg-surface px-1.5 py-0.5 text-[10px] text-fg-subtle lg:inline">
                Ctrl K
              </kbd>
            </button>

            <div className="hidden sm:block">
              <LanguageSwitch />
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? t('shell.switchToLightTheme') : t('shell.switchToDarkTheme')}
              title={theme === 'dark' ? t('shell.switchToLightTheme') : t('shell.switchToDarkTheme')}
              className="flex h-9 w-9 items-center justify-center rounded-input border border-line bg-surface text-fg-muted hover:bg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-focus"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                aria-label={t('shell.openUserMenu')}
                className="flex h-9 items-center gap-2 rounded-input border border-line bg-surface pr-2.5 pl-1.5 text-sm font-medium text-fg hover:bg-muted focus-visible:outline-2 focus-visible:outline-focus"
              >
                {avatar('h-6 w-6')}
                <span className="hidden max-w-[140px] truncate lg:inline">{currentUser?.name}</span>
                <ChevronDown className="hidden h-3.5 w-3.5 text-fg-subtle lg:block" />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} aria-hidden="true" />
                  <div
                    role="menu"
                    className="absolute right-0 z-50 mt-1.5 w-64 rounded-card border border-line bg-surface text-fg shadow-lg"
                  >
                    <div className="flex items-center gap-3 border-b border-line-subtle p-3">
                      {avatar('h-9 w-9')}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{currentUser?.name}</p>
                        <p className="truncate text-xs text-fg-muted">{currentUser?.email}</p>
                        <p className="mt-0.5 text-[11px] font-medium text-accent">
                          {t('shell.role')}: {roleLabel}
                        </p>
                      </div>
                    </div>
                    <div className="border-b border-line-subtle p-3 sm:hidden">
                      <LanguageSwitch />
                    </div>
                    <div className="p-1.5">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setUserMenuOpen(false);
                          void signOut();
                        }}
                        className="flex w-full items-center gap-2 rounded-input px-2.5 py-2 text-left text-sm text-fg-muted hover:bg-muted hover:text-fg"
                      >
                        <LogOut className="h-4 w-4" />
                        {t('shell.signOut')}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {isPreviewAutostart && (
          <div
            role="note"
            className="no-print flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-primary/20 bg-accent-soft px-4 py-1.5 text-center text-xs text-fg"
          >
            <Info className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
            <span>
              <strong className="font-semibold">{t('shell.demoTitle')}</strong> · {t('shell.demoText')}
            </span>
            <a href="/" className="font-medium text-accent underline-offset-2 hover:underline">
              {t('shell.demoSignIn')}
            </a>
          </div>
        )}

        <main className="mx-auto w-full max-w-[1440px] flex-1 p-4 sm:p-6">
          <div key={pathname} className="animate-page-enter">
            {children}
          </div>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
