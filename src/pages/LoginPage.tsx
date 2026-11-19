import { useState } from 'react';
import { AlertCircle, ArrowRight, ClipboardCheck, Cpu, Laptop, ShieldCheck } from 'lucide-react';
import { useWorkshopData } from '../hooks/useWorkshopData';
import { useT, type MessageKey } from '../i18n';
import { BrandLockup } from '../components/ui/BrandMark';
import { LanguageSwitch } from '../components/ui/LanguageSwitch';

const HIGHLIGHTS: Array<{ icon: typeof Laptop; title: MessageKey; text: MessageKey }> = [
  { icon: Laptop, title: 'login.featureLifecycleTitle', text: 'login.featureLifecycleText' },
  { icon: ClipboardCheck, title: 'login.featureSetupTitle', text: 'login.featureSetupText' },
  { icon: Cpu, title: 'login.featureAiTitle', text: 'login.featureAiText' },
];

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
      />
    </svg>
  );
}

export function LoginPage() {
  const { signInWithGoogle } = useWorkshopData();
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.signInFailedPleaseTry'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-canvas lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]">
      {/* Product panel */}
      <section className="relative hidden flex-col justify-between overflow-hidden bg-shell p-10 text-shell-fg lg:flex xl:p-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative">
          <BrandLockup tagline={t('shell.productTagline')} />
        </div>

        <div className="relative max-w-lg">
          <h1 className="text-3xl leading-tight font-semibold tracking-tight xl:text-4xl">
            {t('login.heroTitle')}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-shell-muted">{t('login.heroText')}</p>

          <ul className="mt-10 space-y-6">
            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-input border border-shell-line bg-shell-hover text-shell-fg">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{t(title)}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-shell-muted">{t(text)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-shell-muted">{t('login.footerNote')}</p>
      </section>

      {/* Sign-in panel */}
      <section className="flex flex-col px-6 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <span className="lg:hidden">
            <BrandLockup tone="light" />
          </span>
          <span className="hidden lg:block" />
          <LanguageSwitch />
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h2 className="text-2xl font-semibold tracking-tight text-fg">{t('login.signInTitle')}</h2>
          <p className="mt-2 text-sm text-fg-muted">{t('login.signInSubtitle')}</p>

          {error && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-2.5 rounded-input border border-danger/30 bg-danger/10 p-3 text-sm text-danger-fg"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="mt-8 flex h-10 w-full items-center justify-center gap-3 rounded-input border border-line-strong bg-surface px-4 text-sm font-medium text-fg shadow-xs transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-60"
          >
            <GoogleIcon />
            <span>{loading ? t('login.signingIn') : t('login.signInWithGoogle')}</span>
          </button>

          <div className="my-6 flex items-center gap-3 text-xs text-fg-subtle">
            <span className="h-px flex-1 bg-line" />
            {t('login.or')}
            <span className="h-px flex-1 bg-line" />
          </div>

          <a
            href="/?autostart=1"
            className="group flex h-10 w-full items-center justify-center gap-2 rounded-input bg-primary px-4 text-sm font-medium text-on-primary transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {t('login.exploreDemo')}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
          <p className="mt-2 text-center text-xs text-fg-subtle">{t('login.exploreDemoHint')}</p>

          <p className="mt-10 flex items-start gap-2 rounded-input border border-line bg-subtle p-3 text-xs leading-relaxed text-fg-muted">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            {t('login.internalItWorkshopPortalThe')}
          </p>
        </div>

        <p className="text-center text-xs text-fg-subtle">© {new Date().getFullYear()} SetupOps</p>
      </section>
    </div>
  );
}
