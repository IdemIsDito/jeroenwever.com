import { z } from 'zod';

// Year or year-month, e.g. "2022" or "2022-03"
const yearMonth = z.string().regex(/^\d{4}(-\d{2})?$/);

export const resumeSchema = z.object({
  basics: z.object({
    name: z.string().min(1),
    title: z.string().min(1),
    tagline: z.string().min(1),
    summary: z.string().min(1),
    location: z.string().min(1),
    email: z.email(),
    linkedin: z.url(),
  }),
  experience: z
    .array(
      z.object({
        role: z.string().min(1),
        company: z.string().min(1),
        start: yearMonth,
        end: yearMonth.nullable(), // null = current position
        summary: z.string().min(1),
        highlights: z.array(z.string().min(1)).min(1),
        stack: z.array(z.string().min(1)),
      })
    )
    .min(1),
  skills: z
    .array(
      z.object({
        group: z.string().min(1),
        items: z.array(z.string().min(1)).min(1),
      })
    )
    .min(1),
  education: z
    .array(
      z.object({
        degree: z.string().min(1),
        school: z.string().min(1),
        year: z.string().min(1),
      })
    )
    .default([]),
});

export type Resume = z.infer<typeof resumeSchema>;
