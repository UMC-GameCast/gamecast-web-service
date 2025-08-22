import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { UnifiedGamecastProvider } from './contexts/UnifiedGamecastContext'
import { MainPage } from './pages/gamecast/main/MainPage'
import { ParticipatePage } from './pages/gamecast/participate/ParticipatePage'
import { CreatePage } from './pages/gamecast/create/CreatePage'
import { RoomPage } from './pages/gamecast/room/RoomPage'
import { CharacterSetupPage } from './pages/gamecast/character-setup/CharacterSetupPage'
import { SourceExtractionPage } from './pages/gamecast/source-extraction/SourceExtractionPage'
import { SourceSelectionPage } from './pages/gamecast/source-selection/SourceSelectionPage'
import { SubtitleGenerationPage } from './pages/gamecast/subtitle-generation/SubtitleGenerationPage'
import SubtitleEditPage from './pages/gamecast/subtitle-edit/SubtitleEditPage'
import { RenderingPage } from './pages/gamecast/rendering/RenderingPage'
import { HostEvaluationPage } from './pages/gamecast/host-evaluation/HostEvaluationPage'
import { GuestEvaluationPage } from './pages/gamecast/guest-evaluation/GuestEvaluationPage'
import './App.css'

function App() {
  const location = useLocation();
  
  return (
    <UnifiedGamecastProvider>
      <div className="h-full w-full bg-black">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<MainPage />} />
            <Route path="/participate" element={<ParticipatePage />} />
            <Route path="/create" element={<CreatePage />} />
            <Route path="/room" element={<RoomPage />} />
            <Route path="/character-setup" element={<CharacterSetupPage />} />
            <Route path="/source-extraction" element={<SourceExtractionPage />} />
            <Route path="/source-selection" element={<SourceSelectionPage />} />
            <Route path="/gamecast/source-selection" element={<SourceSelectionPage />} />
            <Route path="/subtitle-generation" element={<SubtitleGenerationPage />} />
            <Route path="/gamecast/subtitle-edit" element={<SubtitleEditPage />} />
            <Route path="/rendering" element={<RenderingPage />} />
            <Route path="/host-evaluation" element={<HostEvaluationPage />} />
            <Route path="/guest-evaluation" element={<GuestEvaluationPage />} />
          </Routes>
        </AnimatePresence>
      </div>
    </UnifiedGamecastProvider>
  )
}
//
export default App
