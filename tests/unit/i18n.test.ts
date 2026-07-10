import { describe, test, expect } from 'bun:test';
import en from '../../src/i18n/en';
import nl from '../../src/i18n/nl';
import { useTranslations, altLocale, localePath } from '../../src/i18n';

describe('i18n', () => {
  test('en and nl dictionaries have identical keys', () => {
    expect(Object.keys(nl).sort()).toEqual(Object.keys(en).sort());
  });

  test('no empty translations', () => {
    for (const dict of [en, nl]) {
      for (const [key, value] of Object.entries(dict)) {
        expect(value.trim().length, `empty translation for ${key}`).toBeGreaterThan(0);
      }
    }
  });

  test('useTranslations returns locale-specific strings', () => {
    expect(useTranslations('en')('section.experience')).toBe('Experience');
    expect(useTranslations('nl')('section.experience')).toBe('Werkervaring');
  });

  test('altLocale and localePath', () => {
    expect(altLocale('en')).toBe('nl');
    expect(altLocale('nl')).toBe('en');
    expect(localePath('en')).toBe('/');
    expect(localePath('nl')).toBe('/nl/');
  });
});
