import { useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Law } from '../types/law'
import styles from './LawPage.module.css'

export default function LawPage() {
  const { pcode } = useParams<{ pcode: string }>()
  const [law, setLaw] = useState<Law | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!pcode) return
    // 法條 JSON 放在 public/laws/{pcode}.json
    fetch(`/law-codex/laws/${pcode}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`找不到法律 ${pcode}`)
        return r.json() as Promise<Law>
      })
      .then(setLaw)
      .catch((e: Error) => setError(e.message))
  }, [pcode])

  if (error) return <p className={styles.error}>{error}</p>
  if (!law) return <p className={styles.loading}>載入中…</p>

  return (
    <article className={styles.root}>
      <h1 className={styles.lawName}>{law.name}</h1>
      {law.effectiveDate && (
        <p className={styles.meta}>施行日期：{law.effectiveDate}</p>
      )}
      <ol className={styles.articles}>
        {law.articles.map((article) => (
          <li key={article.number} id={article.number} className={styles.article}>
            <h3 className={styles.articleNumber}>{article.number}</h3>
            <p className={styles.articleContent}>{article.content}</p>
            {article.annotation && (
              <div className={styles.annotation}>
                <span className={styles.annotationLabel}>個人註解</span>
                <div className="markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {article.annotation}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>
    </article>
  )
}
