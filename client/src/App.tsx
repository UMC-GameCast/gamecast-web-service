import React, { useState } from 'react'
import { MainPage } from './pages/gamecast/main/MainPage'
import { ParticipatePage } from './pages/gamecast/participate/ParticipatePage'
import { CreatePage } from './pages/gamecast/create/CreatePage'
import { RoomPage } from './pages/gamecast/room/RoomPage'
import { WatingPage } from './pages/gamecast/waitng/WatingPage'
import './App.css'
import { Routes, Route } from 'react-router-dom'

type PageType = 'main' | 'participate' | 'create' | 'room'

function App() {
  return (
    <div className="h-full w-full">
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/participate" element={<ParticipatePage />} />
        <Route path="/create" element={<CreatePage />} />
        <Route path="/room" element={<RoomPage />} />
        <Route path="/waiting" element={<WatingPage />} />
      </Routes>
    </div>
  )
}

export default App
