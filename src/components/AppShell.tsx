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
import { BrandLockup, BrandMark } from './ui/BrandMark';
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

  const navList = (isMobile: boolean) => {
    const iconOnly = !isMobile && collapsed;
    return (
      <nav aria-label={t('shell.mainNavigation')} className="flex flex-col gap-0.5 px-2 py-3">
        {!iconOnly && (
          <p className="px-2.5 pb-1.5 text-[11px] font-semibold tracking-wider text-fg-subtle uppercase">
            {t('shell.workspace')}
          </p>
        )}
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
                `relative flex h-9 items-center gap-3 rounded-input px-2.5 text-sm whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-focus ${
                  iconOnly ? 'justify-center' : ''
                } ${
                  isActive
                    ? 'bg-accent-soft font-semibold text-accent'
                    : 'font-medium text-fg-muted hover:bg-muted hover:text-fg'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute top-1.5 bottom-1.5 -left-2 w-[3px] rounded-r bg-primary"
                    />
                  )}
                  <Icon className="h-4 w-4 shrink-0" />
                  {!iconOnly && <span>{label}</span>}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    );
  };

  return (
    <div className="min-h-screen bg-canvas text-fg">
      {/* Shell bar */}
      <header className="no-print sticky top-0 z-30 flex h-12 items-center gap-3 bg-shell px-3 text-shell-fg sm:px-4">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label={t('shell.openMenu')}
          className="rounded-input p-1.5 text-shell-muted hover:bg-shell-hover hover:text-shell-fg md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link to="/" className="rounded-input focus-visible:outline-2 focus-visible:outline-focus">
          <BrandLockup tagline={t('shell.productTagline')} />
        </Link>

        <div className="flex flex-1 justify-center px-2">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            aria-label={t('shell.openGlobalSearchCtrlK')}
            className="flex h-8 w-full max-w-md items-center gap-2 rounded-input border border-shell-line bg-shell-hover px-3 text-sm text-shell-muted transition-colors hover:border-shell-muted/50 hover:text-shell-fg focus-visible:outline-2 focus-visible:outline-focus"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="hidden truncate sm:inline">{t('shell.searchPlaceholder')}</span>
            <kbd className="font-mono-code ml-auto hidden rounded-control border border-shell-line px-1.5 py-0.5 text-[10px] text-shell-muted sm:inline">
              Ctrl K
            </kbd>
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <div className="hidden sm:block">
            <LanguageSwitch tone="shell" />
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? t('shell.switchToLightTheme') : t('shell.switchToDarkTheme')}
            title={theme === 'dark' ? t('shell.switchToLightTheme') : t('shell.switchToDarkTheme')}
            className="flex h-8 w-8 items-center justify-center rounded-input text-shell-muted hover:bg-shell-hover hover:text-shell-fg focus-visible:outline-2 focus-visible:outline-focus"
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
              className="flex h-8 items-center gap-2 rounded-input px-1.5 text-sm text-shell-fg hover:bg-shell-hover focus-visible:outline-2 focus-visible:outline-focus"
            >
              {avatar('h-6 w-6')}
              <span className="hidden max-w-[140px] truncate font-medium lg:inline">{currentUser?.name}</span>
              <ChevronDown className="hidden h-3.5 w-3.5 text-shell-muted lg:block" />
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
                        {t('shell.role')}: {currentUser ? trUserRole(currentUser.role, lang) : ''}
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

      <div className="flex">
        {/* Side navigation (desktop) */}
        <aside
          className={`no-print sticky top-12 hidden h-[calc(100vh-3rem)] shrink-0 flex-col justify-between border-r border-sidebar-line bg-sidebar transition-[width] duration-200 ease-out md:flex ${
            collapsed ? 'w-14' : 'w-56'
          }`}
        >
          {navList(false)}
          <div className={`border-t border-line-subtle p-2 ${collapsed ? 'flex justify-center' : ''}`}>
            <button
              type="button"
              onClick={() => setCollapsed((prev) => !prev)}
              aria-label={collapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar')}
              title={collapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar')}
              className="flex h-8 items-center gap-2 rounded-input px-2.5 text-xs font-medium text-fg-subtle hover:bg-muted hover:text-fg"
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              {!collapsed && <span>{t('shell.collapseSidebar')}</span>}
            </button>
          </div>
        </aside>

        {/* Side navigation (mobile drawer) */}
        <div
          className={`fixed inset-0 z-40 transition-opacity duration-200 md:hidden ${
            mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
          }`}
          aria-hidden={!mobileOpen}
        >
          <div className="absolute inset-0 bg-shell/60" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <aside
            className={`relative flex h-full w-64 flex-col bg-sidebar shadow-xl transition-transform duration-200 ease-out ${
              mobileOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="flex h-12 items-center justify-between bg-shell px-3">
              <span className="flex items-center gap-2.5 text-[15px] font-semibold text-shell-fg">
                <BrandMark /> SetupOps
              </span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label={t('shell.closeNavigation')}
                className="rounded-input p-1.5 text-shell-muted hover:bg-shell-hover hover:text-shell-fg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {navList(true)}
          </aside>
        </div>

        {/* Content column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="no-print flex h-10 items-center border-b border-line bg-surface px-4 sm:px-6">
            <nav aria-label={t('shell.breadcrumb')} className="flex min-w-0 items-center gap-1.5 text-[13px]">
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />}
                  {crumb.to ? (
                    <Link to={crumb.to} className="truncate whitespace-nowrap text-accent hover:underline">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span aria-current="page" className="truncate font-medium whitespace-nowrap text-fg">
                      {crumb.label}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          </div>

          <main className="mx-auto w-full max-w-[1440px] flex-1 p-4 sm:p-6">
            <div key={pathname} className="animate-page-enter">
              {children}
            </div>
          </main>
        </div>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
