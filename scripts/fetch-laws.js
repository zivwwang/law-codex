/**
 * 從全國法規資料庫 Open API 匯入施行中法條
 * 用法：node scripts/fetch-laws.js <PCode> [<PCode> ...]
 * 例：node scripts/fetch-laws.js B0000001 C0000001
 *
 * 文件：https://law.moj.gov.tw/OpenData/
 * API base：https://law.moj.gov.tw/api/ch/
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dir = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dir, '..')
const LAWS_PUBLIC = join(ROOT, 'public', 'laws')
const LAWS_ANNOTATIONS = join(ROOT, 'laws')
const API_BASE = 'https://law.moj.gov.tw/api/ch'

mkdirSync(LAWS_PUBLIC, { recursive: true })
mkdirSync(LAWS_ANNOTATIONS, { recursive: true })

const pcodes = process.argv.slice(2)
if (pcodes.length === 0) {
  console.error('請提供至少一個 PCode，例如：node scripts/fetch-laws.js B0000001')
  process.exit(1)
}

async function fetchLaw(pcode) {
  // 取得法律基本資訊
  const infoUrl = `${API_BASE}/flawdat01?pcode=${pcode}`
  const infoRes = await fetch(infoUrl)
  if (!infoRes.ok) throw new Error(`無法取得 ${pcode} 資訊：${infoRes.status}`)
  const info = await infoRes.json()

  // 取得法條內容
  const articleUrl = `${API_BASE}/flawdat02?pcode=${pcode}`
  const articleRes = await fetch(articleUrl)
  if (!articleRes.ok) throw new Error(`無法取得 ${pcode} 法條：${articleRes.status}`)
  const articleData = await articleRes.json()

  const lawName = info?.LawName ?? pcode
  const effectiveDate = info?.LawEffectiveDate ?? ''

  const articles = (articleData?.LawArticles ?? []).map((a) => {
    const number = a.ArticleNo ?? ''
    const content = a.ArticleContent ?? ''

    // 若已有本地 .md 註解，讀入
    const mdPath = join(LAWS_ANNOTATIONS, pcode, `${number}.md`)
    const annotation = existsSync(mdPath) ? readFileSync(mdPath, 'utf-8') : undefined

    return { number, content, ...(annotation !== undefined ? { annotation } : {}) }
  })

  return { name: lawName, pcode, effectiveDate, articles }
}

// 更新 index.json
function updateIndex(entry) {
  const indexPath = join(LAWS_PUBLIC, 'index.json')
  let index = { laws: [] }
  if (existsSync(indexPath)) {
    index = JSON.parse(readFileSync(indexPath, 'utf-8'))
  }
  const existing = index.laws.findIndex((l) => l.pcode === entry.pcode)
  if (existing >= 0) {
    index.laws[existing] = entry
  } else {
    index.laws.push(entry)
  }
  writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8')
}

for (const pcode of pcodes) {
  console.log(`匯入 ${pcode}…`)
  try {
    const law = await fetchLaw(pcode)
    const outPath = join(LAWS_PUBLIC, `${pcode}.json`)
    writeFileSync(outPath, JSON.stringify(law, null, 2), 'utf-8')
    updateIndex({ name: law.name, pcode, file: `${pcode}.json` })
    console.log(`  ✓ ${law.name}（${law.articles.length} 條）→ public/laws/${pcode}.json`)

    // 為每條建立空白 .md 檔（若尚不存在）
    const annoDir = join(LAWS_ANNOTATIONS, pcode)
    mkdirSync(annoDir, { recursive: true })
    for (const a of law.articles) {
      const mdPath = join(annoDir, `${a.number}.md`)
      if (!existsSync(mdPath)) {
        writeFileSync(mdPath, '', 'utf-8')
      }
    }
    console.log(`  ✓ 已建立 laws/${pcode}/ 註解資料夾`)
  } catch (e) {
    console.error(`  ✗ ${pcode}：${e.message}`)
  }
}
