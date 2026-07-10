import { describe, test, expect } from 'bun:test';
import { resumeSchema } from '../../src/content/schema';
import { getResume } from '../../src/content';

describe('resume content', () => {
  test('both locale files satisfy the schema', () => {
    expect(() => getResume('en')).not.toThrow();
    expect(() => getResume('nl')).not.toThrow();
  });

  test('schema rejects invalid content', () => {
    const result = resumeSchema.safeParse({ basics: { name: '' } });
    expect(result.success).toBe(false);
  });

  test('schema rejects malformed email and dates', () => {
    const valid = getResume('en');
    expect(
      resumeSchema.safeParse({
        ...valid,
        basics: { ...valid.basics, email: 'not-an-email' },
      }).success
    ).toBe(false);
    expect(
      resumeSchema.safeParse({
        ...valid,
        experience: [{ ...valid.experience[0], start: 'March 2022' }],
      }).success
    ).toBe(false);
  });

  test('locales have the same shape (same number of jobs and skill groups)', () => {
    const en = getResume('en');
    const nl = getResume('nl');
    expect(nl.experience.length).toBe(en.experience.length);
    expect(nl.skills.length).toBe(en.skills.length);
  });
});
