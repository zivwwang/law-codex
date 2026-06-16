import { useState } from 'react'
import styles from './UpdateButton.module.css'

const OWNER    = 'zivwwang'
const REPO     = 'law-codex'
const WORKFLOW = 'update-laws.yml'
const TOKEN_KEY = 'gh_pat'

type Status = 'idle' | 'prompt' | 'loading' | 'ok' | 'error'

export default function UpdateButton() {
  const [status, setStatus]   = useState<Status>('idle')
  const [tokenInput, setToken] = useState('')
  const [errorMsg, setError]  = useState('')

  async function dispatch(token: string) {
    setStatus('loading')
    try {
      const res = await fetch(
        `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW}/dispatches`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ref: 'master' }),
        },
      )
      if (res.status === 204) {
        setStatus('ok')
        setTimeout(() => setStatus('idle'), 6000)
      } else if (res.status === 401) {
        localStorage.removeItem(TOKEN_KEY)
        setError('Token 無效或已過期，請重新輸入。')
        setStatus('prompt')
      } else {
        const body = await res.text()
        setError(`GitHub API 錯誤 ${res.status}：${body}`)
        setStatus('error')
      }
    } catch (e) {
      setError(`網路錯誤：${e instanceof Error ? e.message : String(e)}`)
      setStatus('error')
    }
  }

  function handleClick() {
    const saved = sessionStorage.getItem(TOKEN_KEY)
    if (saved) {
      dispatch(saved)
    } else {
      setToken('')
      setStatus('prompt')
    }
  }

  function handleSubmitToken(e: React.FormEvent) {
    e.preventDefault()
    const t = tokenInput.trim()
    if (!t) return
    sessionStorage.setItem(TOKEN_KEY, t)
    dispatch(t)
  }

  function handleReset() {
    sessionStorage.removeItem(TOKEN_KEY)
    setStatus('idle')
  }

  if (status === 'ok') {
    return (
      <span className={styles.ok}>
        已觸發 ✓{' '}
        <a
          href={`https://github.com/${OWNER}/${REPO}/actions/workflows/${WORKFLOW}`}
          target="_blank"
          rel="noreferrer"
        >
          查看進度
        </a>
      </span>
    )
  }

  if (status === 'error') {
    return (
      <span className={styles.err}>
        {errorMsg}{' '}
        <button className={styles.link} onClick={() => setStatus('idle')}>關閉</button>
      </span>
    )
  }

  if (status === 'prompt') {
    return (
      <form className={styles.tokenForm} onSubmit={handleSubmitToken}>
        <input
          className={styles.tokenInput}
          type="password"
          placeholder="GitHub PAT（需 actions:write）"
          value={tokenInput}
          onChange={e => setToken(e.target.value)}
          autoFocus
        />
        <button className={styles.btn} type="submit" disabled={!tokenInput.trim()}>
          確認
        </button>
        <button className={styles.link} type="button" onClick={() => setStatus('idle')}>
          取消
        </button>
      </form>
    )
  }

  return (
    <span className={styles.wrap}>
      <button
        className={styles.btn}
        onClick={handleClick}
        disabled={status === 'loading'}
      >
        {status === 'loading' ? '觸發中…' : '更新法規'}
      </button>
      {sessionStorage.getItem(TOKEN_KEY) && (
        <button className={styles.link} onClick={handleReset} title="清除已儲存的 Token">
          ×
        </button>
      )}
    </span>
  )
}
