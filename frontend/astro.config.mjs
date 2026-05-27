import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'http://localhost:4321',
  srcDir: './src/presentation',
  outDir: '../generated/frontend/dist',
  cacheDir: '../generated/frontend/astro-cache',
})
