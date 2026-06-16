import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import type { LawData } from '../data/laws'
import styles from './LawTree.module.css'

interface Props {
  laws: LawData[]
  activePcode?: string
}

export default function LawTree({ laws, activePcode }: Props) {
  const [openPcodes, setOpenPcodes] = useState<Set<string>>(
    () => new Set(activePcode ? [activePcode] : []),
  )

  useEffect(() => {
    if (!activePcode) return
    setOpenPcodes((prev) => (prev.has(activePcode) ? prev : new Set(prev).add(activePcode)))
  }, [activePcode])

  function toggle(pcode: string) {
    setOpenPcodes((prev) => {
      const next = new Set(prev)
      if (next.has(pcode)) next.delete(pcode)
      else next.add(pcode)
      return next
    })
  }

  return (
    <nav className={styles.tree} aria-label="法規目錄">
      {laws.map((law) => {
        const isOpen = openPcodes.has(law.pcode)
        return (
          <div key={law.pcode} className={styles.lawGroup}>
            <button
              type="button"
              className={styles.lawHeader}
              onClick={() => toggle(law.pcode)}
              aria-expanded={isOpen}
            >
              <span className={styles.caret}>{isOpen ? '▾' : '▸'}</span>
              <span className={styles.lawName}>{law.name}</span>
            </button>
            {isOpen && (
              <ul className={styles.articleList}>
                {law.articles.map((article) => (
                  <li key={article.id}>
                    <NavLink
                      to={`/law/${law.pcode}/${article.id}`}
                      className={({ isActive }) =>
                        isActive ? `${styles.articleLink} ${styles.active}` : styles.articleLink
                      }
                    >
                      {article.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </nav>
  )
}
