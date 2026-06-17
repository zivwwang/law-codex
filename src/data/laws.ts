/**
 * 從 laws/<PCode>/{meta.json,articles/*.md} 在 build time 直接載入法規資料。
 * 使用 import.meta.glob 讓 vite 把 laws/ 底下的內容打包進前端，
 * 不再需要額外的 prebuild script 產生 JSON。
 */

interface RawMeta {
  pcode: string
  name: string
  modified_date?: string
  effective_date?: string
}

export interface ArticleData {
  /** 檔名去除副檔名，例如 "0002"、"0015-1" */
  id: string
  /** 顯示用條號，例如 "第 2 條"、"第 15-1 條" */
  label: string
  /** 排序用的數值鍵 */
  sortKey: number
  /** 法條原文 */
  content: string
  /** 使用者 Markdown 註解 */
  annotation: string
}

export interface LawData {
  pcode: string
  name: string
  modifiedDate?: string
  effectiveDate?: string
  articles: ArticleData[]
}

const metaModules = import.meta.glob('/laws/*/meta.json', { eager: true }) as Record<
  string,
  { default: RawMeta }
>
const articleModules = import.meta.glob('/laws/*/articles/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

function extractBlock(text: string, startTag: string, endTag: string): string {
  const s = text.indexOf(startTag)
  const e = text.indexOf(endTag)
  if (s === -1 || e === -1) return ''
  return text.slice(s + startTag.length, e).trim()
}

function parseArticleId(filename: string): { id: string; label: string; sortKey: number } | null {
  const m = filename.match(/^(\d+)(?:-(\d+))?$/)
  if (!m) return null
  const main = parseInt(m[1], 10)
  const sub = m[2] ? parseInt(m[2], 10) : 0
  const id = m[2] ? `${m[1]}-${m[2]}` : m[1]
  const label = m[2] ? `第 ${main}-${sub} 條` : `第 ${main} 條`
  return { id, label, sortKey: main * 10000 + sub }
}

function buildLaws(): Map<string, LawData> {
  const laws = new Map<string, LawData>()

  for (const [path, mod] of Object.entries(metaModules)) {
    const pcode = path.match(/\/laws\/([^/]+)\/meta\.json$/)?.[1]
    if (!pcode) continue
    const meta = mod.default
    laws.set(pcode, {
      pcode,
      name: meta.name,
      modifiedDate: meta.modified_date,
      effectiveDate: meta.effective_date,
      articles: [],
    })
  }

  for (const [path, raw] of Object.entries(articleModules)) {
    const m = path.match(/\/laws\/([^/]+)\/articles\/([^/]+)\.md$/)
    if (!m) continue
    const [, pcode, filename] = m
    const law = laws.get(pcode)
    if (!law) continue

    const parsed = parseArticleId(filename)
    if (!parsed) continue

    const content = extractBlock(raw, '<!-- LAW:START -->', '<!-- LAW:END -->')
    if (!content) continue
    const annotation = extractBlock(raw, '<!-- NOTE:START -->', '<!-- NOTE:END -->')

    law.articles.push({ ...parsed, content, annotation })
  }

  for (const law of laws.values()) {
    law.articles.sort((a, b) => a.sortKey - b.sortKey)
  }

  return laws
}

const lawsByPcode = buildLaws()

export function getAllLaws(): LawData[] {
  return [...lawsByPcode.values()]
}

export function getLaw(pcode: string): LawData | undefined {
  return lawsByPcode.get(pcode)
}

export function getArticle(pcode: string, articleId: string): ArticleData | undefined {
  return lawsByPcode.get(pcode)?.articles.find((a) => a.id === articleId)
}

/**
 * 把 "B0000001-2" 或 "B0000001-15-1" 正規化成 { pcode, articleId }，
 * articleId 對齊檔名格式（例如 "0002"、"0015-1"）以便查表。
 */
export function resolveWikiToken(token: string): { pcode: string; articleId: string } | null {
  const m = token.match(/^([A-Z]\d{7})-(.+)$/)
  if (!m) return null
  const [, pcode, rest] = m
  const parts = rest.split('-')
  const main = parts[0].padStart(4, '0')
  const articleId = parts.length > 1 ? `${main}-${parts.slice(1).join('-')}` : main
  return { pcode, articleId }
}

export interface LawParagraph {
  /** 該項本文 */
  text: string
  /** 該項下的款（原文已含「一、」「二、」… 編號） */
  items: string[]
}

const ITEM_RE = /^[一二三四五六七八九十百千萬零]+(?:之[一二三四五六七八九十百千萬零]+)?、/

/**
 * 全國法規資料庫的條文原文以換行分隔「項」，款則是項內以「一、二、…」
 * 開頭的子行。把原文切成 { 項本文, 款列表 } 的結構供畫面標示項/款。
 */
export function parseLawText(content: string): LawParagraph[] {
  const paragraphs: LawParagraph[] = []

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue

    if (ITEM_RE.test(line)) {
      const current = paragraphs[paragraphs.length - 1]
      if (current) {
        current.items.push(line)
      } else {
        paragraphs.push({ text: '', items: [line] })
      }
    } else {
      paragraphs.push({ text: line, items: [] })
    }
  }

  return paragraphs
}
