import { useState, useCallback, useEffect } from "react";
import { Navigation } from "../../../components/gamecast/common/Navigation";
import { Footer } from "../../../components/gamecast/common/Footer";
import { BackButton1 } from "../../../components/gamecast/common/BackButton1";
import { useRoom } from "../../../hooks/useRoom.ts";
import { CharacterCustomizer } from "../../../components/gamecast/character/CharacterCustomizer";
import type { CharacterData } from "../../../types/room";
import userSocketManager, { createUserSocket, sendCharacterStatus } from "../../../utils/userSocketManager";

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
  const [characterData, setCharacterData] = useState<CharacterData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // 🔗 UserSocket 연결 상태 관리
  const [userSocketReady, setUserSocketReady] = useState(false);
  
  // UserSocket 초기화
  useEffect(() => {
    const initializeUserSocket = async () => {
      if (!currentRoom || !currentPlayer) {
        console.log('⏳ [CharacterSetupPage] 방/플레이어 정보 대기 중...');
        return;
      }
      
      const roomCode = currentRoom.roomCode;
      const guestUserId = currentPlayer.guestUserId || currentPlayer.id;
      const nickname = currentPlayer.nickname;
      
      if (!guestUserId || !nickname) {
        console.error('❌ [CharacterSetupPage] 필수 사용자 정보 누락');
        return;
      }
      
      try {
        console.log('🔗 [CharacterSetupPage] UserSocket 초기화 시작:', {
          roomCode, guestUserId, nickname
        });
        
        const socket = await createUserSocket(roomCode, guestUserId, nickname);
        if (socket) {
          console.log('✅ [CharacterSetupPage] UserSocket 초기화 완료');
          setUserSocketReady(true);
        } else {
          console.error('❌ [CharacterSetupPage] UserSocket 초기화 실패');
        }
      } catch (error) {
        console.error('❌ [CharacterSetupPage] UserSocket 초기화 오류:', error);
      }
    };
    
    initializeUserSocket();
    
    // 컴포넌트 언마운트 시 연결 해제
    return () => {
      if (currentRoom && currentPlayer) {
        const roomCode = currentRoom.roomCode;
        const guestUserId = currentPlayer.guestUserId || currentPlayer.id;
        userSocketManager.disconnectUser(roomCode, guestUserId);
      }
    };
  }, [currentRoom, currentPlayer]);

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

    if (!userSocketReady) {
      console.error('❌ [CharacterSetupPage] UserSocket이 준비되지 않음');
      alert('네트워크 연결을 확인해주세요.');
      return;
    }

    if (!currentRoom || !currentPlayer) {
      console.error('❌ [CharacterSetupPage] 방/플레이어 정보 없음');
      return;
    }

    try {
      setIsLoading(true);
      console.log('🎨 [CharacterSetupPage] UserSocket으로 캐릭터 전송 시작');

      // 🎯 캐릭터 데이터를 null 포함하여 정확히 전송 (선택하지 않은 항목은 null)
      const characterPayload = {
        selectedOptions: {
          face: characterData?.selectedOptions?.face || null,
          hair: characterData?.selectedOptions?.hair || null,
          top: characterData?.selectedOptions?.top || null,
          bottom: characterData?.selectedOptions?.bottom || null,
          accessory: characterData?.selectedOptions?.accessory || null
        },
        selectedColors: {
          face: characterData?.selectedColors?.face || null,
          hair: characterData?.selectedColors?.hair || null,
          top: characterData?.selectedColors?.top || null,
          bottom: characterData?.selectedColors?.bottom || null,
          accessory: characterData?.selectedColors?.accessory || null
        }
      };

      // 🧪 테스트용: 캐릭터 데이터가 없으면 예시 데이터 사용
      if (!characterData) {
        console.log('📝 [CharacterSetupPage] 캐릭터 데이터 없음 - 예시 데이터 사용');
        characterPayload.selectedOptions = {
          face: 'face2',
          hair: 'hair1', 
          top: 'top2',
          bottom: 'bottom3',
          accessory: 'accessories1'
        };
        characterPayload.selectedColors = {
          face: 'beige',
          hair: 'red',
          top: 'blue', 
          bottom: 'black',
          accessory: 'gold'
        };
      }

      const roomCode = currentRoom.roomCode;
      const guestUserId = currentPlayer.guestUserId || currentPlayer.id;

      console.log('📡 [CharacterSetupPage] UserSocket으로 캐릭터 전송:', {
        roomCode,
        guestUserId: guestUserId,
        realUserNickname: currentPlayer.nickname,
        characterPayload
      });
      
      // ✨ UserSocket을 통해 캐릭터 전송 (실제 사용자 신원으로)
      const success = await sendCharacterStatus(
        roomCode, 
        guestUserId, 
        characterPayload
      );
      
      if (!success) {
        throw new Error('캐릭터 전송 실패');
      }
      
      console.log('✅ [CharacterSetupPage] UserSocket 캐릭터 전송 완료');
      
      // 🔄 서버가 본인에게는 이벤트를 보내지 않으므로 수동으로 로컬 상태 업데이트
      // useCharacter 훅이나 전역 상태 매니저에 직접 업데이트 알림
      const characterUpdateEvent = new CustomEvent('character-updated-local', {
        detail: {
          guestUserId,
          nickname: currentPlayer.nickname,
          selectedOptions: characterPayload.selectedOptions,
          selectedColors: characterPayload.selectedColors,
          updatedAt: new Date().toISOString()
        }
      });
      window.dispatchEvent(characterUpdateEvent);
      console.log('🔄 [CharacterSetupPage] 로컬 캐릭터 상태 업데이트 이벤트 발송');
      
      // 짧은 지연 후 RoomPage로 돌아가기
      setTimeout(() => {
        console.log('🔄 [CharacterSetupPage] RoomPage로 돌아가기');
        onBack?.();
      }, 300);
      
    } catch (error) {
      console.error('❌ [CharacterSetupPage] 캐릭터 설정 중 오류:', error);
      alert('캐릭터 설정 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  }, [characterData, isLoading, onBack, userSocketReady, currentRoom, currentPlayer]);

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