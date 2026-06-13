import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'

export default defineConfig({
  site: 'https://atuscode.atuscode.com',
  trailingSlash: 'always',
  integrations: [sitemap()],
})
