import { useState } from 'react';
import { Wrench, AlertCircle } from 'lucide-react';
import { useWorkshopData } from '../hooks/useWorkshopData';
import { useLanguage } from '../hooks/useLanguage';
import { useT } from '../i18n';

export function LoginPage() {
  const { signInWithGoogle } = useWorkshopData();
  const { lang, setLang } = useLanguage();
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : t('login.signInFailedPleaseTry');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#0B1F3A] via-[#133563] to-[#1D4ED8] px-4 py-12 dark:from-[#060E1C] dark:via-[#0B1930] dark:to-[#102A4C]">
      <div className="w-full max-w-md rounded-dialog border border-line-strong/40 bg-surface p-8 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-input bg-primary text-white shadow-sm">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-fg">
                SetupOps
              </h1>
              <p className="text-xs font-medium text-accent">
                {t('login.itWorkshopOperations')}
              </p>
            </div>
          </div>

          <div
            role="group"
            aria-label={t('login.language')}
            className="flex items-center rounded-input border border-line bg-subtle p-0.5"
          >
            <button
              type="button"
              onClick={() => setLang('en')}
              aria-pressed={lang === 'en'}
              className={`rounded-control px-2 py-1 text-[11px] font-semibold transition-colors ${
                t('login.bgPrimaryTextWhite')
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
                  ? 'bg-primary text-white'
                  : 'text-fg-muted hover:text-accent'
              }`}
            >
              DE
            </button>
          </div>
        </div>

        <p className="mt-6 text-sm leading-relaxed text-fg-muted">
          {t('login.devicesTicketsSetupInOne')}
        </p>

        {error && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-2.5 rounded-input border border-danger/30 bg-danger/10 p-3 text-xs text-danger-fg"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleLogin}
          disabled={loading}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-input border border-line bg-subtle px-4 py-2.5 text-sm font-medium text-fg shadow-xs transition-colors hover:border-primary/40 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-60"
        >
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
          <span>
            {loading
              ? t('login.signingIn')
              : t('login.signInWithGoogle')}
          </span>
        </button>

        <p className="mt-5 text-xs text-fg-subtle">
          {t('login.internalItWorkshopPortalThe')}
        </p>
      </div>
    </div>
  );
}
