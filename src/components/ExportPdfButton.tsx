import styles from './ExportPdfButton.module.css'

interface Props {
  disabled?: boolean
}

export default function ExportPdfButton({ disabled }: Props) {
  return (
    <button
      type="button"
      className={styles.btn}
      disabled={disabled}
      onClick={() => window.print()}
      title={disabled ? '請先選擇法條' : '匯出目前條文為 PDF'}
    >
      匯出 PDF
    </button>
  )
}
