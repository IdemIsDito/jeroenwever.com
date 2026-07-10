import en from './en';
import nl from './nl';

export const locales = ['en', 'nl'] as const;
export type Locale = (typeof locales)[number];
export type TranslationKey = keyof typeof en;

const dictionaries: Record<Locale, Record<TranslationKey, string>> = { en, nl };

export function useTranslations(locale: Locale) {
  return (key: TranslationKey): string => dictionaries[locale][key];
}

export function altLocale(locale: Locale): Locale {
  return locale === 'en' ? 'nl' : 'en';
}

export function localePath(locale: Locale): string {
  return locale === 'en' ? '/' : '/nl/';
}
