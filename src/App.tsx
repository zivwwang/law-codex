import { Routes, Route } from 'react-router-dom'
import HomePage from './components/HomePage'
import LawPage from './components/LawPage'
import Layout from './components/Layout'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/law/:pcode" element={<LawPage />} />
      </Route>
    </Routes>
  )
}
