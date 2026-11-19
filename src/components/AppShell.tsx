import React, { useEffect, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Laptop,
  Ticket as TicketIcon,
  Settings,
  Search,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Wrench,
} from 'lucide-react';
import { useWorkshopData } from '../hooks/useWorkshopData';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';
import { trUserRole } from '../i18n/labels';
import { CommandPalette } from './CommandPalette';
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
  if (pathname === '/tickets') return [{ label: 'Tickets' }];
  if (pathname === '/tickets/new') {
    return [
      { label: 'Tickets', to: '/tickets' },
      { label: t('common.createTicket') },
    ];
  }
  if (pathname.startsWith('/tickets/')) {
    const id = pathname.split('/')[2];
    const tck = tickets.find((ticket) => ticket.id === id);
    return [
      { label: 'Tickets', to: '/tickets' },
      { label: tck ? tck.ticketNr : t('shell.ticketDetails') },
    ];
  }
  if (pathname === '/settings') return [{ label: t('shell.settings') }];
  return [{ label: 'SetupOps' }];
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { currentUser, signOut } = useWorkshopData();
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang } = useLanguage();
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

  const sidebarContent = (isMobile: boolean) => (
    <div className="flex h-full flex-col justify-between bg-sidebar text-white">
      <div>
        <div
          className={`flex h-14 items-center border-b border-sidebar-line px-4 ${
            !isMobile && collapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          <Link
            to="/"
            onClick={() => isMobile && setMobileOpen(false)}
            className="flex items-center gap-2.5 overflow-hidden whitespace-nowrap"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-input bg-primary text-white shadow-xs">
              <Wrench className="h-4 w-4" />
            </div>
            {(isMobile || !collapsed) && (
              <span className="text-[16px] font-semibold tracking-tight text-white">
                SetupOps
              </span>
            )}
          </Link>
          {isMobile ? (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label={t('shell.closeNavigation')}
              className="rounded-md p-1.5 text-blue-200 hover:bg-[#193A66] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            !collapsed && (
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                aria-label={t('shell.collapseSidebar')}
                className="rounded-md p-1.5 text-blue-200/80 hover:bg-[#193A66] hover:text-white"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            )
          )}
        </div>

        {!isMobile && collapsed && (
          <div className="flex justify-center pt-3">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              aria-label={t('shell.expandSidebar')}
              className="rounded-md p-1.5 text-blue-200/80 hover:bg-[#193A66] hover:text-white"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </div>
        )}

        <nav
          aria-label={t('shell.mainNavigation')}
          className="space-y-1 p-3"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const label = t(item.label);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => isMobile && setMobileOpen(false)}
                title={!isMobile && collapsed ? label : undefined}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 rounded-input px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-focus ${
                    !isMobile && collapsed ? 'justify-center px-2' : ''
                  } ${
                    isActive
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-[#C7D7EE] hover:bg-[#183862] hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-r bg-focus"
                      />
                    )}
                    <Icon className="h-4 w-4 shrink-0" />
                    {(isMobile || !collapsed) && <span>{label}</span>}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-sidebar-line p-3">
        <div
          className={`flex items-center gap-2.5 rounded-input bg-[#15345C]/80 p-2 ${
            !isMobile && collapsed ? 'justify-center' : ''
          }`}
        >
          {currentUser?.photoURL ? (
            <img
              src={currentUser.photoURL}
              alt={currentUser.name}
              referrerPolicy="no-referrer"
              className="h-8 w-8 shrink-0 rounded-full border border-[#2A528A] object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
              {initials}
            </div>
          )}
          {(isMobile || !collapsed) && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{currentUser?.name}</p>
              <p className="truncate text-xs text-blue-200/80">
                {currentUser ? trUserRole(currentUser.role, lang) : ''}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-canvas text-fg">
      {/* Desktop Sidebar */}
      <aside
        className={`no-print hidden shrink-0 border-r border-sidebar-line bg-sidebar transition-[width] duration-200 ease-out md:block ${
          collapsed ? 'w-[68px]' : 'w-[240px]'
        }`}
      >
        <div className="sticky top-0 h-screen">{sidebarContent(false)}</div>
      </aside>

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-0 z-40 flex transition-opacity duration-200 md:hidden ${
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden={!mobileOpen}
      >
        <div
          className="fixed inset-0 bg-[#091529]/60 backdrop-blur-[1px]"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
        <aside
          className={`relative z-50 h-full w-[240px] border-r border-sidebar-line bg-sidebar shadow-xl transition-transform duration-200 ease-out ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {sidebarContent(true)}
        </aside>
      </div>

      {/* Main Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar */}
        <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-line bg-subtle/95 px-4 backdrop-blur-xs sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label={t('shell.openMenu')}
              className="rounded-input p-1.5 text-fg-muted hover:bg-muted md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />}
                  {crumb.to ? (
                    <Link
                      to={crumb.to}
                      className="truncate whitespace-nowrap text-fg-muted hover:text-accent"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="truncate font-semibold whitespace-nowrap text-fg">
                      {crumb.label}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label={t('shell.openGlobalSearchCtrlK')}
              className="flex items-center gap-2 rounded-input border border-line bg-subtle px-3 py-1.5 text-xs text-fg-muted transition-colors hover:border-line-strong hover:bg-muted focus-visible:outline-2 focus-visible:outline-focus"
            >
              <Search className="h-3.5 w-3.5 text-accent" />
              <span className="hidden whitespace-nowrap sm:inline">
                {t('shell.search')}
              </span>
              <kbd className="font-mono-code hidden rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] text-fg-muted sm:inline">
                Ctrl+K
              </kbd>
            </button>

            {/* Language Switcher (DE / EN) */}
            <div
              role="group"
              aria-label={t('shell.language')}
              className="flex items-center rounded-input border border-line bg-subtle p-0.5"
            >
              <button
                type="button"
                onClick={() => setLang('en')}
                aria-pressed={lang === 'en'}
                className={`rounded-control px-2 py-1 text-[11px] font-semibold transition-colors ${
                  t('shell.bgPrimaryTextWhiteShadow')
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang('de')}
                aria-pressed={lang === 'de'}
                className={`rounded-control px-2 py-1 text-[11px] font-semibold transition-colors ${
                  lang === 'de'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-fg-muted hover:text-accent dark:hover:text-white'
                }`}
              >
                DE
              </button>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={
                theme === 'dark'
                  ? t('shell.switchToLightTheme')
                  : t('shell.switchToDarkTheme')
              }
              className="flex h-8 w-8 items-center justify-center rounded-input border border-line bg-field text-fg-muted hover:bg-muted focus-visible:outline-2 focus-visible:outline-focus"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                aria-expanded={userMenuOpen}
                aria-label={t('shell.openUserMenu')}
                className="flex h-8 items-center gap-2 rounded-input border border-line bg-field px-2 text-xs font-medium text-fg hover:bg-muted focus-visible:outline-2 focus-visible:outline-focus"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-white">
                  {initials}
                </span>
                <span className="hidden max-w-[120px] truncate sm:inline">
                  {currentUser?.name}
                </span>
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 z-50 mt-1.5 w-60 rounded-card border border-line bg-surface p-2 shadow-lg">
                    <div className="border-b border-line-subtle px-2.5 py-2">
                      <p className="truncate text-sm font-semibold text-fg">
                        {currentUser?.name}
                      </p>
                      <p className="truncate text-xs text-fg-muted">
                        {currentUser?.email}
                      </p>
                      <p className="mt-1 text-[11px] font-medium text-accent">
                        {t('shell.role')}:{' '}
                        {currentUser ? trUserRole(currentUser.role, lang) : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        void signOut();
                      }}
                      className="mt-1 flex w-full items-center gap-2 rounded-input px-2.5 py-2 text-left text-sm text-danger hover:bg-danger/10"
                    >
                      <LogOut className="h-4 w-4" />
                      {t('shell.signOut')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main Viewport */}
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
