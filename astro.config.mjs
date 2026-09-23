// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://elleu.ch',
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      // Code blocks are dark in both themes (terminal feel) with real syntax colors.
      theme: 'github-dark',
      wrap: false,
    },
  },
});
