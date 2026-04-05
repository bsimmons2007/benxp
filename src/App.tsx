import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { BottomNav } from './components/layout/BottomNav'
import { Home } from './pages/Home'
import { Log } from './pages/Log'
import { Records } from './pages/Records'
import { Challenges } from './pages/Challenges'
import { More } from './pages/More'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/log" element={<Log />} />
        <Route path="/records" element={<Records />} />
        <Route path="/challenges" element={<Challenges />} />
        <Route path="/more" element={<More />} />
      </Routes>
      <BottomNav />
    </BrowserRouter>
  )
}
