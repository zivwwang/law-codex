import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { LawData } from '../data/laws'
import FullLawPrintView from './FullLawPrintView'
import styles from './ExportLawButton.module.css'

interface Props {
  law?: LawData
}

export default function ExportLawButton({ law }: Props) {
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    if (!printing || !law) return

    const prevTitle = document.title
    document.title = law.name
    document.body.classList.add('print-mode-law')

    function cleanup() {
      document.body.classList.remove('print-mode-law')
      document.title = prevTitle
      setPrinting(false)
    }

    window.addEventListener('afterprint', cleanup, { once: true })
    window.print()

    return () => window.removeEventListener('afterprint', cleanup)
  }, [printing, law])

  return (
    <>
      <button
        type="button"
        className={styles.btn}
        disabled={!law}
        onClick={() => setPrinting(true)}
        title={law ? `匯出《${law.name}》全部條文（含註解）為 PDF` : '請先選擇法規'}
      >
        匯出整部法典 PDF
      </button>
      {printing && law && createPortal(<FullLawPrintView law={law} />, document.body)}
    </>
  )
}
