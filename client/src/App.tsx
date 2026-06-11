import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PublicPage from './pages/PublicPage'
import ModeratorPage from './pages/ModeratorPage'
import AdminPage from './pages/AdminPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicPage />} />
        <Route path="/moderator" element={<ModeratorPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  )
}
