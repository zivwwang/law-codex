/**
 * 把 laws/<PCode>/articles/*.md 轉換成 public/laws/<PCode>.json
 * 在 build 前執行：node scripts/build-law-json.js
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dir = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dir, '..')
const LAWS_DIR = join(ROOT, 'laws')
const PUBLIC_LAWS = join(ROOT, 'public', 'laws')

mkdirSync(PUBLIC_LAWS, { recursive: true })

function extractBlock(text, startTag, endTag) {
  const s = text.indexOf(startTag)
  const e = text.indexOf(endTag)
  if (s === -1 || e === -1) return ''
  return text.slice(s + startTag.length, e).trim()
}

function filenameToNumber(file) {
  // 0001.md -> 第 1 條, 1003-1.md -> 第 1003-1 條
  const base = basename(file, '.md')
  const m = base.match(/^(\d+)(?:-(\d+))?$/)
  if (!m) return base
  const main = parseInt(m[1], 10)
  return m[2] ? `第 ${main}-${m[2]} 條` : `第 ${main} 條`
}

const pcodes = readdirSync(LAWS_DIR).filter((n) => /^[A-Z][0-9]{7}$/.test(n))
const index = { laws: [] }

for (const pcode of pcodes) {
  const metaPath = join(LAWS_DIR, pcode, 'meta.json')
  if (!existsSync(metaPath)) continue

  const meta = JSON.parse(readFileSync(metaPath, 'utf-8'))
  const articlesDir = join(LAWS_DIR, pcode, 'articles')
  const articles = []

  if (existsSync(articlesDir)) {
    const files = readdirSync(articlesDir).filter((f) => f.endsWith('.md')).sort()
    for (const file of files) {
      const raw = readFileSync(join(articlesDir, file), 'utf-8')
      const content = extractBlock(raw, '<!-- LAW:START -->', '<!-- LAW:END -->')
      const note = extractBlock(raw, '<!-- NOTE:START -->', '<!-- NOTE:END -->')
      if (!content) continue
      articles.push({ number: filenameToNumber(file), content, ...(note ? { annotation: note } : {}) })
    }
  }

  const law = { name: meta.name, pcode, effectiveDate: meta.effective_date, articles }
  writeFileSync(join(PUBLIC_LAWS, `${pcode}.json`), JSON.stringify(law, null, 2), 'utf-8')
  console.log(`✓ ${meta.name}（${articles.length} 條）-> public/laws/${pcode}.json`)

  index.laws.push({ name: meta.name, pcode, file: `${pcode}.json` })
}

writeFileSync(join(PUBLIC_LAWS, 'index.json'), JSON.stringify(index, null, 2), 'utf-8')
console.log(`✓ index.json（${index.laws.length} 筆）`)
