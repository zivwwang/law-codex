import { Link } from 'react-router-dom'
import styles from './HomePage.module.css'

// 這份清單會由 scripts/fetch-laws.js 產生並寫入 public/laws/index.json
// 這裡先放範例資料以便開發時使用
const EXAMPLE_LAWS = [
  { name: '中華民國憲法', pcode: 'A0000001' },
  { name: '民法', pcode: 'B0000001' },
  { name: '刑法', pcode: 'C0000001' },
]

export default function HomePage() {
  return (
    <div className={styles.root}>
      <h1 className={styles.title}>我的法典</h1>
      <p className={styles.subtitle}>點選法律進入閱讀，可在每條法條下方新增個人 Markdown 註解。</p>
      <ul className={styles.list}>
        {EXAMPLE_LAWS.map((law) => (
          <li key={law.pcode}>
            <Link to={`/law/${law.pcode}`} className={styles.item}>
              <span className={styles.name}>{law.name}</span>
              <span className={styles.pcode}>{law.pcode}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
