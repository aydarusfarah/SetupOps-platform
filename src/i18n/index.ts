import { useMemo } from 'react';
import { useLanguage, type Language } from '../hooks/useLanguage';
import { de } from './de';
import { en, type MessageKey } from './en';

export type { MessageKey } from './en';

type Params = Record<string, string | number | null | undefined>;
export type Translate = (key: MessageKey, params?: Params) => string;

/** BCP 47 locale used for dates, numbers and sorting. */
export const LOCALE: Record<Language, string> = { en: 'en-US', de: 'de-DE' };

const DICTIONARIES: Record<Language, Record<MessageKey, string>> = { en, de };

function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined || value === null ? match : String(value);
  });
}

/** Translator for non-React code (domain helpers, CSV export, …). */
export function getTranslator(lang: Language): Translate {
  const dict = DICTIONARIES[lang];
  return (key, params) => interpolate(dict[key] ?? en[key] ?? key, params);
}

/** Translator bound to the active UI language. */
export function useT(): Translate {
  const { lang } = useLanguage();
  return useMemo(() => getTranslator(lang), [lang]);
}
