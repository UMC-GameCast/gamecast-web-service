import { useState, useCallback, useEffect } from "react";
import { Navigation } from "../../../components/gamecast/common/Navigation";
import { Footer } from "../../../components/gamecast/common/Footer";
import { BackButton1 } from "../../../components/gamecast/common/BackButton1";
import { useRoom } from "../../../hooks/useRoom.ts";
import { CharacterCustomizer } from "../../../components/gamecast/character/CharacterCustomizer";
import type { CharacterData } from "../../../types/room";

interface CharacterSetupPageProps {
  onBack?: () => void;
  onCharacterComplete?: (characterData: any) => void;
}

/**
 * 캐릭터 설정 페이지 컴포넌트
 * RoomPage와 동일한 레이아웃을 사용하며, 메인 콘텐츠만 캐릭터 설정으로 변경
 */
const API_BASE_URL = "http://3.37.34.211:8889"; // WebRTC Manager와 동일한 서버 사용

export const CharacterSetupPage = ({ onBack, onCharacterComplete }: CharacterSetupPageProps) => {
  // 모든 Hook을 컴포넌트 최상단에서 항상 같은 순서로 호출
  const { currentRoom, currentPlayer, handleLeaveRoom, refreshRoomState } = useRoom();
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
    if (isLoading) {
      console.log('⏳ [CharacterSetupPage] 이미 처리 중입니다...');
      return;
    }

    if (!currentRoom || !currentPlayer) {
      console.error('❌ [CharacterSetupPage] 방/플레이어 정보 없음');
      return;
    }

    try {
      setIsLoading(true);
      console.log('🎨 [CharacterSetupPage] REST API로 캐릭터 전송 시작');

      // 🎯 서버 검증에 맞춰 null 대신 undefined 사용하여 빈 필드 제거
      const characterSetup: any = {};
      
      // selectedOptions - 값이 있는 경우에만 포함
      const selectedOptions: Record<string, string> = {};
      if (characterData?.selectedOptions?.face) selectedOptions.face = characterData.selectedOptions.face;
      if (characterData?.selectedOptions?.hair) selectedOptions.hair = characterData.selectedOptions.hair;
      if (characterData?.selectedOptions?.top) selectedOptions.top = characterData.selectedOptions.top;
      if (characterData?.selectedOptions?.bottom) selectedOptions.bottom = characterData.selectedOptions.bottom;
      if (characterData?.selectedOptions?.accessory) selectedOptions.accessory = characterData.selectedOptions.accessory;
      
      if (Object.keys(selectedOptions).length > 0) {
        characterSetup.selectedOptions = selectedOptions;
      }
      
      // selectedColors - 값이 있는 경우에만 포함
      const selectedColors: Record<string, string> = {};
      if (characterData?.selectedColors?.face) selectedColors.face = characterData.selectedColors.face;
      if (characterData?.selectedColors?.hair) selectedColors.hair = characterData.selectedColors.hair;
      if (characterData?.selectedColors?.top) selectedColors.top = characterData.selectedColors.top;
      if (characterData?.selectedColors?.bottom) selectedColors.bottom = characterData.selectedColors.bottom;
      if (characterData?.selectedColors?.accessory) selectedColors.accessory = characterData.selectedColors.accessory;
      
      if (Object.keys(selectedColors).length > 0) {
        characterSetup.selectedColors = selectedColors;
      }

      // 🧪 테스트용: 캐릭터 데이터가 없으면 예시 데이터 사용
      if (!characterData || (Object.keys(characterSetup).length === 0)) {
        console.log('📝 [CharacterSetupPage] 캐릭터 데이터 없음 - 예시 데이터 사용');
        characterSetup.selectedOptions = {
          face: 'face2',
          hair: 'hair1', 
          top: 'top2',
          bottom: 'bottom3',
          accessory: 'accessories1'
        };
        characterSetup.selectedColors = {
          face: 'beige',
          hair: 'red',
          top: 'blue', 
          bottom: 'black',
          accessory: 'gold'
        };
      }

      const guestUserId = currentPlayer.guestUserId || currentPlayer.id;
      
      // UUID v4 형식 검증
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(guestUserId)) {
        console.error('❌ [CharacterSetupPage] 잘못된 UUID 형식:', guestUserId);
        throw new Error('잘못된 사용자 ID 형식입니다.');
      }
      
      const requestBody = {
        guestUserId,
        characterSetup
      };

      console.log('📡 [CharacterSetupPage] REST API로 캐릭터 전송:', {
        url: `${API_BASE_URL}/api/rooms/preparation`,
        guestUserId,
        guestUserIdValid: uuidRegex.test(guestUserId),
        realUserNickname: currentPlayer.nickname,
        characterSetup,
        requestBodyString: JSON.stringify(requestBody, null, 2)
      });
      
      // ✨ REST API를 통해 캐릭터 전송 (실제 사용자 신원으로)
      const response = await fetch(`${API_BASE_URL}/api/rooms/preparation`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = await response.text();
        }
        console.error('❌ [CharacterSetupPage] API 응답 에러:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          errorData
        });
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`);
      }
      
      const result = await response.json();
      console.log('✅ [CharacterSetupPage] REST API 캐릭터 전송 완료:', result);
      
      // 🔄 방 정보 새로고침으로 최신 상태 반영
      console.log('🔄 [CharacterSetupPage] 방 정보 새로고침 중...');
      await refreshRoomState();
      console.log('✅ [CharacterSetupPage] 방 정보 새로고침 완료');
      
      // 🔌 Socket.IO로 실시간 캐릭터 업데이트 전송
      if (onCharacterComplete) {
        console.log('🔌 [CharacterSetupPage] Socket으로 캐릭터 업데이트 전송');
        onCharacterComplete(characterSetup);
      }
      
      // 짧은 지연 후 RoomPage로 돌아가기
      setTimeout(() => {
        console.log('🔄 [CharacterSetupPage] RoomPage로 돌아가기');
        onBack?.();
      }, 300);
      
    } catch (error) {
      console.error('❌ [CharacterSetupPage] 캐릭터 설정 중 오류:', error);
      alert(`캐릭터 설정 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsLoading(false);
    }
  }, [characterData, isLoading, onBack, currentRoom, currentPlayer, refreshRoomState]);

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