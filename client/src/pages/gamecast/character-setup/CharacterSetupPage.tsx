import React, { useState, useCallback } from "react";
import { Navigation } from "../../../components/gamecast/common/Navigation";
import { Footer } from "../../../components/gamecast/common/Footer";
import { BackButton1 } from "../../../components/gamecast/common/BackButton1";
import { useRoom } from "../../../hooks/useRoom.ts";
import { CharacterCustomizer } from "../../../components/gamecast/character/CharacterCustomizer";
import { updateCurrentPlayer } from "../../../utils/roomManager";
import type { CharacterData } from "../../../types/room";

interface CharacterSetupPageProps {
  onBack?: () => void;
}

/**
 * 캐릭터 설정 페이지 컴포넌트
 * RoomPage와 동일한 레이아웃을 사용하며, 메인 콘텐츠만 캐릭터 설정으로 변경
 */
export const CharacterSetupPage = ({ onBack }: CharacterSetupPageProps) => {
  // 모든 Hook을 컴포넌트 최상단에서 항상 같은 순서로 호출
  const { currentRoom, currentPlayer, handleLeaveRoom, refreshRoomState } = useRoom();
  const [characterData, setCharacterData] = useState<CharacterData | null>(null);

  // useCallback도 항상 같은 순서로 호출
  const handleCharacterChange = useCallback((character: CharacterData) => {
    setCharacterData(character);
  }, []);

  const handleConfirmSelection = useCallback(async () => {
    if (characterData) {
      // 캐릭터 설정을 roomManager에 저장 (새로운 preparationStatus 구조 사용)
      const result = await updateCurrentPlayer({ 
        characterSetup: true // 캐릭터 설정 완료로 표시
      });
      
      if (result.success) {
        // 방 상태 새로고침
        refreshRoomState();
        // RoomPage로 돌아가기
        onBack?.();
      } else {
        alert('캐릭터 설정 저장에 실패했습니다. 다시 시도해주세요.');
      }
    } else {
      alert('캐릭터를 선택해주세요.');
    }
  }, [characterData, refreshRoomState, onBack]);

  const handleBackClick = useCallback(() => {
    onBack?.() || handleLeaveRoom();
  }, [onBack, handleLeaveRoom]);

  // 조건부 렌더링은 모든 Hook 호출 후에
  if (!currentRoom || !currentPlayer) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[linear-gradient(180deg,rgba(0,0,0,1)_0%,rgba(0,6,72,1)_100%)]">
        <p className="text-white">방 정보를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen flex flex-col justify-between bg-[linear-gradient(180deg,rgba(0,0,0,1)_0%,rgba(0,6,72,1)_100%)] relative overflow-hidden">

      {/* 배경 장식 이미지 */}
      <img 
        src="/assets/gamecast/participate/desingBG.png"
        alt="배경 장식"
        className="absolute inset-0 w-full h-full object-fill pointer-events-none z-0 opacity-60"
      />
      
      {/* 상단 네비게이션 영역 */}
      <Navigation />
      
      {/* 메인 콘텐츠 영역 */}
      <main className="flex-1 flex items-center justify-center relative z-10 py-8">
        {/* 백버튼 - 메인 콘텐츠 기준 위치 */}
        <div className="absolute z-50 left-[230px] top-[-20px]">
          <BackButton1
            onClick={handleBackClick}
          />
        </div>
        
        
        {/* 메인 콘텐츠 영역 - 캐릭터 커스터마이저 */}
        <div className="relative bg-transparent w-full">
          <CharacterCustomizer 
            onCharacterChange={handleCharacterChange}
            onComplete={handleConfirmSelection}
          />
        </div>
      </main>
      
      {/* 하단 푸터 영역 */}
      <Footer />
    </div>
  );
};