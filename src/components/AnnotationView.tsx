import { useMemo } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Link } from 'react-router-dom'
import { getLaw, resolveWikiToken } from '../data/laws'

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

interface Props {
  annotation: string
  emptyText?: string
}

export default function AnnotationView({ annotation, emptyText }: Props) {
  const md = useMemo(() => (annotation ? renderAnnotation(annotation) : ''), [annotation])

  if (!md) {
    return emptyText ? <p className="annotation-empty">{emptyText}</p> : null
  }

  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {md}
      </ReactMarkdown>
    </div>
  )
}
