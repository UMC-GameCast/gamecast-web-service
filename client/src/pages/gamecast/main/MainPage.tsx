import React from "react";
import { Header } from "../../../components/gamecast/common/Header";
import { Footer } from "../../../components/gamecast/common/Footer";
import { NavigationCard } from "../../../components/gamecast/main/NavigationCard";

interface MainPageProps {
  onNavigate?: (page: 'main' | 'participate' | 'create') => void;
}

export const MainPage = ({ onNavigate }: MainPageProps) => {
  return (
    <div className="h-screen flex flex-col bg-[linear-gradient(180deg,rgba(0,0,0,1)_0%,rgba(0,6,72,1)_100%)]">
      {/* Header 영역 */}
      <Header />
      
      {/* Main Content 영역 - 남은 공간 모두 차지 */}
      <main className="flex-1 flex items-center justify-center">
        <div className="container mx-auto px-4">
          {/* 환영 메시지 */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-white mb-4">
              GAMECAST에 오신 것을 환영합니다
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              게임과 함께하는 특별한 경험을 시작해보세요. 
              방에 참여하거나 새로운 방을 만들어보세요.
            </p>
          </div>
          
          {/* 네비게이션 카드 */}
          <NavigationCard onNavigate={onNavigate} />
        </div>
      </main>
      
      {/* Footer 영역 */}
      <Footer />
    </div>
  );
}; 