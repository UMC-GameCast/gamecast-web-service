import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { MainPage } from './pages/gamecast/main/MainPage'
import { ParticipatePage } from './pages/gamecast/participate/ParticipatePage'
import { CreatePage } from './pages/gamecast/create/CreatePage'
import { RoomPage } from './pages/gamecast/room/RoomPage'
import { SourceExtractionPage } from './pages/gamecast/source-extraction/SourceExtractionPage'
import { SourceSelectionPage } from './pages/gamecast/source-selection/SourceSelectionPage'
import { SubtitleGenerationPage } from './pages/gamecast/subtitle-generation/SubtitleGenerationPage'
import SubtitleEditPage from './pages/gamecast/subtitle-edit/SubtitleEditPage'
import { RenderingPage } from './pages/gamecast/rendering/RenderingPage'
import { HostEvaluationPage } from './pages/gamecast/host-evaluation/HostEvaluationPage'
import { GuestEvaluationPage } from './pages/gamecast/guest-evaluation/GuestEvaluationPage'
import './App.css'

function App() {
  return (
    <div className="h-full w-full">
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/participate" element={<ParticipatePage />} />
        <Route path="/create" element={<CreatePage />} />
        <Route path="/room" element={<RoomPage />} />
        <Route path="/source-extraction" element={<SourceExtractionPage />} />
        <Route path="/source-selection" element={<SourceSelectionPage />} />
        <Route path="/subtitle-generation" element={<SubtitleGenerationPage />} />
        <Route path="/subtitle-edit" element={<SubtitleEditPage />} />
        <Route path="/rendering" element={<RenderingPage />} />
        <Route path="/host-evaluation" element={<HostEvaluationPage />} />
        <Route path="/guest-evaluation" element={<GuestEvaluationPage />} />
      </Routes>
    </div>
  )
}
//
export default App
