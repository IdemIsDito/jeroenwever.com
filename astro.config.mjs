import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://jeroenwever.com',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'nl'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    // /cv/ and /og/ are print/OG source routes, not destination pages
    sitemap({ filter: (page) => !page.includes('/cv/') && !page.includes('/og/') }),
  ],
});
