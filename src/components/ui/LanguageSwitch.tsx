import { useLanguage, type Language } from '../../hooks/useLanguage';
import { useT } from '../../i18n';

const OPTIONS: Language[] = ['en', 'de'];

/** EN / DE segmented control. `tone="shell"` is for the dark shell bar. */
export function LanguageSwitch({ tone = 'surface' }: { tone?: 'surface' | 'shell' }) {
  const { lang, setLang } = useLanguage();
  const t = useT();
  const shell = tone === 'shell';

  return (
    <div
      role="group"
      aria-label={t('shell.language')}
      className={`flex items-center rounded-input border p-0.5 ${
        shell ? 'border-shell-line bg-shell' : 'border-line bg-subtle'
      }`}
    >
      {OPTIONS.map((option) => {
        const active = lang === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => setLang(option)}
            aria-pressed={active}
            className={`rounded-control px-2 py-0.5 text-[11px] font-semibold tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-focus ${
              active
                ? 'bg-primary text-on-primary'
                : shell
                  ? 'text-shell-muted hover:text-shell-fg'
                  : 'text-fg-muted hover:text-fg'
            }`}
          >
            {option.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
