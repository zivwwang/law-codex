import { useMemo } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Link } from 'react-router-dom'
import { getLaw, resolveWikiToken } from '../data/laws'
import styles from './ArticleDetail.module.css'

interface Props {
  pcode: string
  articleId: string
}

const WIKILINK_RE = /\[\[([A-Z]\d{7}-[^\]]+)\]\]/g

function renderAnnotation(raw: string): string {
  return raw.replace(WIKILINK_RE, (whole, token: string) => {
    const resolved = resolveWikiToken(token)
    if (!resolved) return whole
    const targetLaw = getLaw(resolved.pcode)
    const targetArticle = targetLaw?.articles.find((a) => a.id === resolved.articleId)
    if (!targetLaw || !targetArticle) return whole
    return `[${targetLaw.name} ${targetArticle.label}](/law/${resolved.pcode}/${resolved.articleId})`
  })
}

const markdownComponents: Components = {
  a({ href, children, ...props }) {
    if (href?.startsWith('/')) {
      return <Link to={href}>{children}</Link>
    }
    return (
      <a href={href} target="_blank" rel="noreferrer" {...props}>
        {children}
      </a>
    )
  },
}

export default function ArticleDetail({ pcode, articleId }: Props) {
  const law = getLaw(pcode)
  const article = law?.articles.find((a) => a.id === articleId)

  const annotationMd = useMemo(
    () => (article?.annotation ? renderAnnotation(article.annotation) : ''),
    [article?.annotation],
  )

  if (!law || !article) {
    return <p className={styles.placeholder}>找不到此法條，請從左側選擇。</p>
  }

  return (
    <article className={styles.root}>
      <header className={styles.header}>
        <h1 className={styles.lawName}>{law.name}</h1>
        <h2 className={styles.articleLabel}>{article.label}</h2>
      </header>

      <section className={styles.lawText} aria-label="法條原文">
        {article.content}
      </section>

      <section className={styles.annotation} aria-label="個人註解">
        <h3 className={styles.annotationLabel}>註解</h3>
        {annotationMd ? (
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {annotationMd}
            </ReactMarkdown>
          </div>
        ) : (
          <p className={styles.empty}>尚無註解</p>
        )}
      </section>
    </article>
  )
}
