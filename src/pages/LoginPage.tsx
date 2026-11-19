import { useState } from 'react';
import { AlertCircle, ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { useWorkshopData } from '../hooks/useWorkshopData';
import { useLanguage } from '../hooks/useLanguage';
import { useT, type MessageKey } from '../i18n';
import { BrandMark } from '../components/ui/BrandMark';
import { LanguageSwitch } from '../components/ui/LanguageSwitch';

const REPO_URL = 'https://github.com/aydarusfarah/SetupOps-platform';

const HIGHLIGHTS: Array<{ title: MessageKey; text: MessageKey }> = [
  { title: 'login.featureLifecycleTitle', text: 'login.featureLifecycleText' },
  { title: 'login.featureSetupTitle', text: 'login.featureSetupText' },
  { title: 'login.featureAiTitle', text: 'login.featureAiText' },
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

function GitHubIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

/**
 * Sign-in / entry page. Always rendered with the light palette (`theme-light`):
 * brand-blue story panel on the left, white action panel on the right.
 */
export function LoginPage() {
  const { signInWithGoogle } = useWorkshopData();
  const { lang } = useLanguage();
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
    <div className="theme-light grid min-h-screen bg-surface text-fg [color-scheme:light] lg:h-screen lg:grid-cols-2 lg:overflow-hidden">
      {/* ── Brand panel ─────────────────────────────────────────────── */}
      <section
        aria-label={t('login.productOverview')}
        className="relative flex min-h-0 flex-col overflow-hidden bg-[linear-gradient(150deg,#0b5cb8_0%,#0a4f9e_55%,#083d7c_100%)] text-white"
      >
        {/* subtle dot grid + glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.10] [background-image:radial-gradient(rgb(255_255_255/0.9)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-48 -right-48 h-[28rem] w-[28rem] rounded-full bg-white/10 blur-3xl"
        />

        {/* Content column: capped width, centred on very wide screens */}
        <div className="relative mx-auto flex min-h-0 w-full max-w-[640px] flex-1 flex-col px-6 pt-8 pb-10 sm:px-10 lg:py-12 xl:px-12">
          <div className="flex items-center gap-2.5">
            <span className="rounded-input bg-white p-[3px] shadow-sm">
              <BrandMark className="h-7 w-7" />
            </span>
            <span className="text-[17px] font-semibold tracking-tight">SetupOps</span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col justify-center gap-9 pt-12">
          <div className="shrink-0">
            <p className="text-xs font-semibold tracking-[0.12em] text-white/70 uppercase">
              {t('login.eyebrow')}
            </p>
            <h1 className="mt-3 max-w-[18ch] text-[28px] leading-[1.15] font-semibold tracking-[-0.02em] text-balance sm:text-[32px] xl:text-[36px]">
              {t('login.heroTitle')}
            </h1>
            <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-white/75">{t('login.heroText')}</p>

            <ul className="mt-7 hidden gap-y-4 sm:grid">
              {HIGHLIGHTS.map(({ title, text }) => (
                <li key={title} className="flex gap-3">
                  <span className="mt-[3px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/35">
                    <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{t(title)}</p>
                    <p className="mt-0.5 max-w-[48ch] text-[13px] leading-relaxed text-white/70">{t(text)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Product preview: shrinks with the space left (container units), never cropped; hidden on short screens */}
          <figure className="relative hidden h-[400px] max-h-full min-h-0 shrink [container-type:size] tall:block">
            <div className="absolute top-0 left-0 w-[min(100cqw,calc((100cqh-30px)*1.6529))] [@container(max-height:200px)]:hidden overflow-hidden rounded-dialog bg-white shadow-[0_24px_48px_-12px_rgb(3_20_45/0.55),0_0_0_1px_rgb(255_255_255/0.25)]">
              <div className="flex h-[30px] items-center gap-1.5 border-b border-line bg-subtle px-3" aria-hidden="true">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                <span className="ml-3 truncate rounded-control bg-surface px-2 py-0.5 text-[10px] text-fg-subtle">
                  setupops · {t('shell.navDashboard')}
                </span>
              </div>
              <img
                src={`/img/preview-dashboard-${lang}.webp`}
                alt={t('login.previewAlt')}
                width={1200}
                height={726}
                className="block h-auto w-full"
                loading="eager"
                decoding="async"
              />
            </div>
          </figure>
          </div>
        </div>
      </section>

      {/* ── Action panel ────────────────────────────────────────────── */}
      <section className="flex min-h-0 flex-col overflow-y-auto bg-surface px-6 py-6 sm:px-10">
        <div className="flex justify-end">
          <LanguageSwitch />
        </div>

        <main className="mx-auto flex w-full max-w-[380px] flex-1 flex-col justify-center py-10">
          <h2 className="text-[26px] leading-tight font-semibold tracking-tight text-fg">{t('login.welcomeTitle')}</h2>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">{t('login.welcomeText')}</p>

          {error && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-2.5 rounded-input border border-danger/30 bg-danger/10 p-3 text-sm text-danger-fg"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <a
            href="/?autostart=1"
            className="group mt-8 flex h-11 w-full items-center justify-center gap-2 rounded-input bg-primary px-4 text-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {t('login.exploreDemo')}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
          <p className="mt-2 text-center text-xs text-fg-subtle">{t('login.exploreDemoHint')}</p>

          <div className="my-7 flex items-center gap-3 text-xs text-fg-subtle">
            <span className="h-px flex-1 bg-line" />
            {t('login.orSignIn')}
            <span className="h-px flex-1 bg-line" />
          </div>

          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="flex h-11 w-full items-center justify-center gap-3 rounded-input border border-line-strong bg-surface px-4 text-sm font-medium text-fg transition-colors hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-60"
          >
            <GoogleIcon />
            <span>{loading ? t('login.signingIn') : t('login.signInWithGoogle')}</span>
          </button>

          <p className="mt-8 flex items-start gap-2 text-xs leading-relaxed text-fg-subtle">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
            {t('login.internalItWorkshopPortalThe')}
          </p>
        </main>

        <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-fg-subtle">
          <span>© {new Date().getFullYear()} SetupOps</span>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-fg"
          >
            <GitHubIcon />
            {t('login.viewSource')}
          </a>
        </footer>
      </section>
    </div>
  );
}
