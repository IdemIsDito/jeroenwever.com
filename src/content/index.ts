import en from './resume.en.json';
import nl from './resume.nl.json';
import { resumeSchema, type Resume } from './schema';

const raw = { en, nl } as const;

export type ResumeLocale = keyof typeof raw;

/** Parse (and thereby validate) a locale's resume. Throws on invalid content, failing the build. */
export function getResume(locale: ResumeLocale): Resume {
  return resumeSchema.parse(raw[locale]);
}
