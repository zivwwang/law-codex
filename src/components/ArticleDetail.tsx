import { getLaw } from '../data/laws'
import ArticleBody from './ArticleBody'
import AnnotationView from './AnnotationView'
import styles from './ArticleDetail.module.css'

interface Props {
  pcode: string
  articleId: string
}

export default function ArticleDetail({ pcode, articleId }: Props) {
  const law = getLaw(pcode)
  const article = law?.articles.find((a) => a.id === articleId)

  if (!law || !article) {
    return <p className={styles.placeholder}>找不到此法條，請從左側選擇。</p>
  }

  return (
    <article className={styles.root}>
      <header className={styles.header}>
        <h1 className={styles.lawName}>{law.name}</h1>
        <h2 className={styles.articleLabel}>{article.label}</h2>
      </header>

      <section aria-label="法條原文">
        <ArticleBody content={article.content} />
      </section>

      <section className={styles.annotation} aria-label="個人註解">
        <h3 className={styles.annotationLabel}>註解</h3>
        <AnnotationView annotation={article.annotation} emptyText="尚無註解" />
      </section>
    </article>
  )
}
