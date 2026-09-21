import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  // Served at the custom domain root (see public/CNAME), not a repo subpath.
  base: '/',
  plugins: [vue()],
})
