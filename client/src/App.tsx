import React, { useState } from 'react'
import { MainPage } from './pages/gamecast/main/MainPage'
import { ParticipatePage } from './pages/gamecast/participate/ParticipatePage'
import { CreatePage } from './pages/gamecast/create/CreatePage'
import { RoomPage } from './pages/gamecast/room/RoomPage'
import './App.css'

type PageType = 'main' | 'participate' | 'create' | 'room'

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('main')

  console.log("현재 페이지:", currentPage);

  const handleNavigate = (page: PageType) => {
    console.log("페이지 변경 요청:", page);
    setCurrentPage(page);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'main':
        return <MainPage setPage={handleNavigate} />
      case 'participate':
        return <ParticipatePage setPage={handleNavigate} />
      case 'create':
        return <CreatePage setPage={handleNavigate} />
      case 'room':
        return <RoomPage setPage={handleNavigate} />
      default:
        return <MainPage setPage={handleNavigate} />
    }
  }

  return (
    <div className="h-full w-full">
      {renderPage()}
    </div>
  )
}

export default App
