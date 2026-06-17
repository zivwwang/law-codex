import { parseLawText } from '../data/laws'
import styles from './ArticleBody.module.css'

const CN_DIGITS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九']

function toChineseOrdinal(n: number): string {
  if (n < 10) return CN_DIGITS[n]
  if (n < 20) return `十${CN_DIGITS[n - 10]}`
  const tens = Math.floor(n / 10)
  const ones = n % 10
  return `${CN_DIGITS[tens]}十${ones ? CN_DIGITS[ones] : ''}`
}

interface Props {
  content: string
}

export default function ArticleBody({ content }: Props) {
  const paragraphs = parseLawText(content)
  const showParagraphLabel = paragraphs.length > 1

  return (
    <div className={styles.root}>
      {paragraphs.map((p, i) => (
        <div key={i} className={styles.paragraph}>
          <p className={styles.paragraphText}>
            {showParagraphLabel && (
              <span className={styles.paragraphLabel}>第{toChineseOrdinal(i + 1)}項</span>
            )}
            {p.text}
          </p>
          {p.items.length > 0 && (
            <div className={styles.items}>
              {p.items.map((item, j) => (
                <p key={j} className={styles.item}>
                  {item}
                </p>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
