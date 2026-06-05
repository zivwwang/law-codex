import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 部署到 GitHub Pages 時改成 '/law-codex/'（你的 repo 名稱）
  base: '/law-codex/',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
