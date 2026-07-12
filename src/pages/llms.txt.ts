import type { APIRoute } from 'astro';
import { getResume } from '../content';

export const GET: APIRoute = ({ site }) => {
  const resume = getResume('en');
  const { basics } = resume;

  const lines = [
    `# ${basics.name}`,
    '',
    `> ${basics.title}. ${basics.tagline} ${basics.summary}`,
    '',
    `${basics.name} operates as Sugar Rush Development ("coding with the speed of sweet") and is based in ${basics.location}.`,
    '',
    '## Site',
    '',
    `- [Resume (English)](${new URL('/', site)})`,
    `- [Resume (Dutch)](${new URL('/nl/', site)})`,
    `- [CV as PDF, English](${new URL('/cv-en.pdf', site)})`,
    `- [CV as PDF, Dutch](${new URL('/cv-nl.pdf', site)})`,
    '',
    '## Experience',
    '',
    ...resume.experience.map(
      (job) =>
        `- ${job.role} at ${job.company} (${job.start} – ${job.end ?? 'present'}): ${job.summary}`
    ),
    '',
    '## Contact',
    '',
    `- Email: ${basics.email}`,
    `- LinkedIn: ${basics.linkedin}`,
    `- GitHub: ${basics.github}`,
  ];

  return new Response(lines.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
