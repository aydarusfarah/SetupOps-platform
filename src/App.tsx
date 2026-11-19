import { lazy, Suspense, type ComponentType } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LanguageProvider } from './hooks/useLanguage';
import { ThemeProvider } from './hooks/useTheme';
import { ToastProvider } from './hooks/useToast';
import { WorkshopProvider, useWorkshopData } from './hooks/useWorkshopData';
import { AppShell } from './components/AppShell';
import { LoginPage } from './pages/LoginPage';
import { useT } from './i18n';
import { PageSkeleton } from './components/ui/Skeleton';

// Route-level code splitting: each page (and heavy deps such as Recharts) loads on demand.
const page = <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) =>
  lazy(() => load().then((m) => ({ default: m[name] })));

const DashboardPage = page(() => import('./pages/DashboardPage'), 'DashboardPage');
const DevicesPage = page(() => import('./pages/DevicesPage'), 'DevicesPage');
const DeviceFormPage = page(() => import('./pages/DeviceFormPage'), 'DeviceFormPage');
const DeviceDetailPage = page(() => import('./pages/DeviceDetailPage'), 'DeviceDetailPage');
const TicketsPage = page(() => import('./pages/TicketsPage'), 'TicketsPage');
const TicketFormPage = page(() => import('./pages/TicketFormPage'), 'TicketFormPage');
const TicketDetailPage = page(() => import('./pages/TicketDetailPage'), 'TicketDetailPage');
const SettingsPage = page(() => import('./pages/SettingsPage'), 'SettingsPage');
const ReportsPage = page(() => import('./pages/ReportsPage'), 'ReportsPage');

function AuthenticatedRoutes() {
  const { authReady, currentUser } = useWorkshopData();
  const t = useT();

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="rounded-card border border-line bg-surface px-5 py-3 text-sm font-medium text-fg-muted shadow-sm">
          {t('app.initializingSetupops')}
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <AppShell>
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/devices" element={<DevicesPage />} />
          <Route path="/devices/new" element={<DeviceFormPage />} />
          <Route path="/devices/:id" element={<DeviceDetailPage />} />
          <Route path="/devices/:id/edit" element={<DeviceFormPage />} />
          <Route path="/tickets" element={<TicketsPage />} />
          <Route path="/tickets/new" element={<TicketFormPage />} />
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <ThemeProvider>
          <ToastProvider>
            <WorkshopProvider>
              <BrowserRouter>
                <AuthenticatedRoutes />
              </BrowserRouter>
            </WorkshopProvider>
          </ToastProvider>
        </ThemeProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
