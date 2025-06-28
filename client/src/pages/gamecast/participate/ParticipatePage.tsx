import React from "react";
import { Header } from "../../../components/gamecast/common/Header";
import { ParticipationCodeCard } from "../../../components/gamecast/participate/ParticipationCodeCard";
import { Footer } from "../../../components/gamecast/common/Footer";

export const ParticipatePage = () => {
  return (
    <div className="h-screen flex flex-col bg-[linear-gradient(180deg,rgba(0,0,0,1)_0%,rgba(0,6,72,1)_100%)]">
      {/* Header 영역 */}
      <Header />
      
      {/* Main Content 영역 - 남은 공간 모두 차지 */}
      <main className="flex-1 flex items-center justify-center">
        {/* ParticipationCodeCard를 중앙에 배치 */}
        <ParticipationCodeCard />
      </main>
      
      {/* Footer 영역 */}
      <Footer />
    </div>
  );
}; 