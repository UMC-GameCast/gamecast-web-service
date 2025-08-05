import { useState, useCallback, useEffect } from "react";
import { Navigation } from "../../../components/gamecast/common/Navigation";
import { Footer } from "../../../components/gamecast/common/Footer";
import { BackButton1 } from "../../../components/gamecast/common/BackButton1";
import { useRoom } from "../../../hooks/useRoom.ts";
import { CharacterCustomizer } from "../../../components/gamecast/character/CharacterCustomizer";
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
  const { currentRoom, currentPlayer, handleLeaveRoom } = useRoom();
  // 캐릭터 데이터 전송 함수 (직접 구현)
  const sendCharacterStatus = async (characterData: CharacterData): Promise<boolean> => {
    try {
      const manager = globalThis.__webRTCManager__;
      if (!manager) {
        console.error('❌ [CharacterSetupPage] WebRTC Manager를 찾을 수 없음');
        return false;
      }

      // 완전한 데이터 구조로 전송
      const socketData = {
        selectedOptions: characterData.selectedOptions,
        selectedColors: characterData.selectedColors,
        guestUserId: currentPlayer?.guestUserId || currentPlayer?.id || 'unknown',
        nickname: currentPlayer?.nickname || characterData.nickname || 'Unknown',
        updatedAt: new Date().toISOString()
      };

      console.log('🎨 [CharacterSetupPage] 완전한 캐릭터 데이터 전송:', socketData);
      
      // WebRTC Manager를 통해 전송
      manager.emitUpdateCharacterStatus(socketData);
      
      console.log('✅ [CharacterSetupPage] 캐릭터 데이터 전송 완료');
      return true;
    } catch (error) {
      console.error('❌ [CharacterSetupPage] 캐릭터 데이터 전송 실패:', error);
      return false;
    }
  };
  const [characterData, setCharacterData] = useState<CharacterData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 페이지 로드 시 기존 캐릭터 데이터 불러오기 (서버 데이터만 사용)
  useEffect(() => {
    if (currentPlayer) {
      // 1. 서버 데이터에서 조회
      if (currentPlayer.character) {
        console.log('🎨 [CharacterSetupPage] 서버에서 캐릭터 데이터 로드:', currentPlayer.character);
        setCharacterData(currentPlayer.character);
        return;
      }
      
      // 2. characterInfo에서 조회 (서버 응답 기반)
      if (currentPlayer.characterInfo?.isCustomized) {
        const characterFromInfo: CharacterData = {
          selectedOptions: currentPlayer.characterInfo.selectedOptions!,
          selectedColors: currentPlayer.characterInfo.selectedColors!
        };
        console.log('🎨 [CharacterSetupPage] characterInfo에서 캐릭터 데이터 로드:', characterFromInfo);
        setCharacterData(characterFromInfo);
        return;
      }
      
      console.log('🎨 [CharacterSetupPage] 기존 캐릭터 데이터 없음, 기본값 사용');
    }
  }, [currentPlayer]);

  // useCallback도 항상 같은 순서로 호출
  const handleCharacterChange = useCallback((character: CharacterData) => {
    setCharacterData(character);
  }, []);

  const handleConfirmSelection = useCallback(async () => {
    if (!characterData) {
      alert('캐릭터를 선택해주세요.');
      return;
    }

    if (isLoading) {
      console.log('⏳ [CharacterSetupPage] 이미 처리 중입니다...');
      return;
    }

    try {
      setIsLoading(true);
      console.log('🎨 [CharacterSetupPage] 캐릭터 설정 완료 프로세스 시작');

      // 순수 Socket.IO 기반: 서버의 handleCharacterStatusUpdate() 직접 호출
      console.log('📡 [CharacterSetupPage] Socket.IO로 캐릭터 데이터 전송 - 서버 handleCharacterStatusUpdate 처리');
      
      const result = await sendCharacterStatus(characterData);
      
      if (result) {
        console.log('✅ [CharacterSetupPage] Socket.IO 캐릭터 전송 완료');
        
        // 🎯 추가: 캐릭터 설정 완료 상태도 전송 (애니메이션 트리거용)
        console.log('🎯 [CharacterSetupPage] 캐릭터 설정 완료 상태 전송 중...');
        const manager = globalThis.__webRTCManager__;
        if (manager) {
          // 실제 플레이어 ID 확인
          const realPlayerId = manager.getRealPlayerId();
          console.log('🔍 [CharacterSetupPage] ID 확인:', {
            webrtcManagerId: manager.getCurrentGuestUserId(),
            extractedRealPlayerId: realPlayerId
          });
          
          manager.emitSimplePreparationStatus({
            characterSetup: true,  // 캐릭터 설정 완료
            screenSetup: false     // 화면 설정은 기본값
          });
          console.log('📤 [CharacterSetupPage] preparation-status 전송 완료 - 다른 플레이어들이 애니메이션 볼 수 있음');
        } else {
          console.warn('⚠️ [CharacterSetupPage] WebRTC Manager를 찾을 수 없어서 preparation-status 전송 실패');
        }
        
        // 짧은 지연 후 RoomPage로 돌아가기 (Socket.IO 이벤트 처리 시간 확보)
        setTimeout(() => {
          console.log('🔄 [CharacterSetupPage] RoomPage로 돌아가기 - Socket.IO 동기화 완료 대기');
          onBack?.();
        }, 500); // 500ms 지연으로 이벤트 처리 시간 확보
      } else {
        alert('캐릭터 정보 전송에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('❌ [CharacterSetupPage] 캐릭터 설정 완료 중 오류:', error);
      alert('캐릭터 설정 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  }, [characterData, sendCharacterStatus, isLoading, onBack]);

  const handleBackClick = useCallback(() => {
    if (onBack) {
      onBack(); // 부모가 제공한 특별한 돌아가기 로직
    } else {
      handleLeaveRoom(); // 기본: 방 나가기 + 메인페이지 이동
    }
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