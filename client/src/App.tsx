import React, { useState } from 'react'
import { MainPage } from './pages/gamecast/main/MainPage'
import { ParticipatePage } from './pages/gamecast/participate/ParticipatePage'
import './App.css'

type PageType = 'main' | 'participate' | 'create'

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
        return <MainPage onNavigate={handleNavigate} />
      case 'participate':
        return <ParticipatePage />
      case 'create':
        return (
          <div className="h-screen flex flex-col bg-[linear-gradient(180deg,rgba(0,0,0,1)_0%,rgba(0,6,72,1)_100%)]">
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-white">
                <h1 className="text-4xl font-bold mb-4">방 만들기 페이지</h1>
                <p className="text-gray-300 mb-8">아직 개발 중입니다...</p>
                <button 
                  onClick={() => handleNavigate('main')}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  메인으로 돌아가기
                </button>
              </div>
            </div>
          </div>
        )
      default:
        return <MainPage onNavigate={handleNavigate} />
    }
  }

  return (
    <div className="h-screen w-screen overflow-hidden">
      {renderPage()}
    </div>
  )
}

export default App
