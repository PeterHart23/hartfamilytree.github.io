import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  // Served at https://peterhart23.github.io/hartfamilytree.github.io/ (a
  // project site, since the repo name isn't the owner's *.github.io user site).
  base: '/hartfamilytree.github.io/',
  plugins: [vue()],
})
