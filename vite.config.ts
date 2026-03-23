import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub project Pages: https://<user>.github.io/<repo>/
// CI sets GITHUB_PAGES_BASE=/repo-name/; local dev uses /.
const base = process.env.GITHUB_PAGES_BASE?.trim() || '/'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base,
})
