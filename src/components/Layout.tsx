import { Outlet, Link } from 'react-router-dom'
import styles from './Layout.module.css'

export default function Layout() {
  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <nav className={styles.nav}>
          <Link to="/" className={styles.logo}>⚖ 個人線上法典</Link>
        </nav>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <p>法條來源：<a href="https://law.moj.gov.tw" target="_blank" rel="noreferrer">全國法規資料庫</a></p>
        <p>網站最後更新：{__LAST_UPDATED__}</p>
      </footer>
    </div>
  )
}
