import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { MainPage } from './pages/gamecast/main/MainPage'
import { ParticipatePage } from './pages/gamecast/participate/ParticipatePage'
import { CreatePage } from './pages/gamecast/create/CreatePage'
import { RoomPage } from './pages/gamecast/room/RoomPage'
import './App.css'

function App() {
  return (
    <div className="h-full w-full">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/participate" element={<ParticipatePage />} />
          <Route path="/create" element={<CreatePage />} />
          <Route path="/room" element={<RoomPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  )
}

export default App
