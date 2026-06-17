import { useParams } from 'react-router-dom'
import { getAllLaws, getLaw } from '../data/laws'
import LawTree from './LawTree'
import ArticleDetail from './ArticleDetail'
import UpdateButton from './UpdateButton'
import ExportPdfButton from './ExportPdfButton'
import ExportLawButton from './ExportLawButton'
import styles from './CodexPage.module.css'

export default function CodexPage() {
  const { pcode, articleId } = useParams<{ pcode?: string; articleId?: string }>()
  const laws = getAllLaws()

  const law = pcode ? getLaw(pcode) : undefined
  const article = law && articleId ? law.articles.find((a) => a.id === articleId) : undefined

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <span className={styles.breadcrumb}>
          {law && article ? `${law.name} ${article.label}` : '請從左側選擇法規條文'}
        </span>
        <div className={styles.toolbarActions}>
          <UpdateButton />
          <ExportPdfButton disabled={!law || !article} />
          <ExportLawButton law={law} />
        </div>
      </div>
      <div className={styles.body}>
        <aside className={styles.sidebar}>
          <LawTree laws={laws} activePcode={pcode} />
        </aside>
        <main className={styles.detail} id="print-area">
          {pcode && articleId ? (
            <ArticleDetail pcode={pcode} articleId={articleId} />
          ) : (
            <p className={styles.placeholder}>請從左側選擇法規條文。</p>
          )}
        </main>
      </div>
    </div>
  )
}
