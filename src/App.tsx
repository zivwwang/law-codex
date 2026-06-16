import { Routes, Route } from 'react-router-dom'
import CodexPage from './components/CodexPage'
import Layout from './components/Layout'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<CodexPage />} />
        <Route path="/law/:pcode" element={<CodexPage />} />
        <Route path="/law/:pcode/:articleId" element={<CodexPage />} />
      </Route>
    </Routes>
  )
}
