import React, { createContext, useContext, useEffect, useState } from 'react';

export type Language = 'de' | 'en';

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);
const STORAGE_KEY = 'setupops_lang';

function detectInitialLanguage(): Language {
  // Priority: ?lang= link parameter > saved choice > browser language.
  if (typeof window !== 'undefined') {
    const fromUrl = new URLSearchParams(window.location.search).get('lang');
    if (fromUrl === 'de' || fromUrl === 'en') return fromUrl;
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'de' || saved === 'en') return saved;
  } catch {
    // ignore storage errors
  }
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language.toLowerCase().startsWith('de') ? 'de' : 'en';
  }
  return 'en';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(detectInitialLanguage);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  }, [lang]);

  const setLang = (next: Language) => setLangState(next);
  const toggleLang = () => setLangState((prev) => (prev === 'de' ? 'en' : 'de'));

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
