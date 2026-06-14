import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
//
// `base: './'` emits relative asset URLs so the build works when served from a
// sub-path such as https://<user>.github.io/<repo>/ (GitHub Pages project site).
// This app has no client-side router, so a relative base needs no extra config.
export default defineConfig({
  base: './',
  plugins: [react()],
})
