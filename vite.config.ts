import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'

function getLastUpdated(): string {
  try {
    const iso = execSync('git log -1 --format=%cI', { encoding: 'utf-8' }).trim()
    if (iso) return iso.slice(0, 10)
  } catch {
    // 非 git 環境或尚無 commit，改用建置當下日期
  }
  return new Date().toISOString().slice(0, 10)
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 部署到 GitHub Pages 時改成 '/law-codex/'（你的 repo 名稱）
  base: '/law-codex/',
  define: {
    __LAST_UPDATED__: JSON.stringify(getLastUpdated()),
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
