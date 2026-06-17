import type { LawData } from '../data/laws'
import ArticleBody from './ArticleBody'
import AnnotationView from './AnnotationView'
import styles from './FullLawPrintView.module.css'

interface Props {
  law: LawData
}

export default function FullLawPrintView({ law }: Props) {
  return (
    <div id="print-full-law" className={styles.root}>
      <h1 className={styles.title}>{law.name}</h1>
      {law.articles.map((article) => (
        <section key={article.id} className={styles.article}>
          <h2 className={styles.articleLabel}>{article.label}</h2>
          <ArticleBody content={article.content} />
          {article.annotation && (
            <div className={styles.annotation}>
              <h3 className={styles.annotationLabel}>註解</h3>
              <AnnotationView annotation={article.annotation} />
            </div>
          )}
        </section>
      ))}
    </div>
  )
}
