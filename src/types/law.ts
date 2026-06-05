export interface LawArticle {
  /** 法條編號，例如 "第一條" */
  number: string
  /** 法條本文 */
  content: string
  /** 使用者 Markdown 註解（從 .md 檔讀入） */
  annotation?: string
}

export interface Law {
  /** 法律名稱，例如 "民法" */
  name: string
  /** 法律 PCode，全國法規資料庫識別碼 */
  pcode: string
  /** 施行日期 */
  effectiveDate?: string
  articles: LawArticle[]
}

export interface LawIndex {
  /** 所有已匯入的法律清單 */
  laws: Array<{
    name: string
    pcode: string
    file: string
  }>
}
