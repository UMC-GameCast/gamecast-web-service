import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "../../../components/gamecast/common/Navigation";
import { Footer } from "../../../components/gamecast/common/Footer";
import { BackButton1 } from "../../../components/gamecast/common/BackButton1";
import { LoadingOverlay } from "../../../components/gamecast/common/LoadingOverlay";
import { FeedbackToast } from "../../../components/gamecast/common/FeedbackToast";
import { CharacterErrorBoundary } from "../../../components/gamecast/common/CharacterErrorBoundary";
import { useUnifiedRoom } from "../../../contexts/UnifiedGamecastContext";
import { CharacterCustomizer } from "../../../components/gamecast/character/CharacterCustomizer";
import { BackupControls } from "../../../components/gamecast/character/BackupControls";
import { saveDualCharacter, type DualSaveResult } from "../../../utils/characterApi";
import { useFeedback } from "../../../hooks/useFeedback";
import { useNetworkStatus } from "../../../hooks/useNetworkStatus";
import { restoreCharacter, hasCharacterBackup, getCharacterBackupStatus } from "../../../utils/characterBackup";
import type { CharacterData } from "../../../types/room";

interface CharacterSetupPageProps {
  onBack?: () => void;
  onCharacterComplete?: (characterData: any) => void;
}

/**
 * 캐릭터 설정 페이지 컴포넌트
 * RoomPage와 동일한 레이아웃을 사용하며, 메인 콘텐츠만 캐릭터 설정으로 변경
 * Socket.IO 실시간 업데이트만 사용 (REST API 사용 안함)
 */

export const CharacterSetupPage = ({ onBack, onCharacterComplete }: CharacterSetupPageProps) => {
  const navigate = useNavigate();
  // 통합 Context 사용
  const { currentRoom, currentPlayer, handleLeaveRoom, refreshRoomState, updateCharacter } = useUnifiedRoom();
  const [characterData, setCharacterData] = useState<CharacterData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const feedback = useFeedback();
  const networkStatus = useNetworkStatus();
  const [hasShownNetworkWarning, setHasShownNetworkWarning] = useState(false);
  const [hasLoadedCharacterData, setHasLoadedCharacterData] = useState(false); // 무한 루프 방지

  // 페이지 로드 시 기존 캐릭터 데이터 불러오기 (서버 데이터만 사용) - 한 번만 실행
  useEffect(() => {
    if (currentPlayer && !hasLoadedCharacterData) {
      // 1. characterInfo에서 조회 (새 서버 응답 기반) - nickname 포함한 완전한 데이터 복원
      if (currentPlayer.characterInfo?.isCustomized) {
        const characterFromInfo: CharacterData = {
          selectedOptions: currentPlayer.characterInfo.selectedOptions!,
          selectedColors: currentPlayer.characterInfo.selectedColors!,
          nickname: currentPlayer.nickname || currentPlayer.guestNickname || '' // 🔧 nickname 필드 추가
        };
        if (import.meta.env.DEV) {
          console.log('🎨 [CharacterSetupPage] characterInfo에서 완전한 캐릭터 데이터 로드:', characterFromInfo);
        }
        setCharacterData(characterFromInfo);
        setHasLoadedCharacterData(true); // 로드 완료 플래그 설정
        return;
      }
      
      // 2. 백업 데이터에서 복원 시도 (서버에 데이터가 없는 경우만)
      if (hasCharacterBackup(currentPlayer.guestUserId)) {
        const backupData = restoreCharacter(currentPlayer.guestUserId);
        if (backupData) {
          if (import.meta.env.DEV) {
            console.log('💾 [CharacterSetupPage] 백업에서 캐릭터 데이터 복원:', backupData);
          }
          setCharacterData(backupData.data);
          setHasLoadedCharacterData(true); // 로드 완료 플래그 설정
          
          // 사용자에게 백업 복원 알림 (서버에 없으므로 중요한 정보)
          feedback.showWarning(
            '백업에서 복원',
            `서버에 캐릭터 데이터가 없어 ${backupData.metadata.source === 'manual' ? '수동' : '자동'} 백업에서 복원했습니다. 설정을 다시 저장해주세요.`,
            0 // 자동으로 사라지지 않음
          );
          return;
        }
      }
      
      if (import.meta.env.DEV) {
        console.log('🎨 [CharacterSetupPage] 서버 및 백업 데이터 모두 없음, 새로운 캐릭터 설정 시작');
      }
      setHasLoadedCharacterData(true); // 로드 시도 완료 플래그 설정
    }
  }, [currentPlayer, hasLoadedCharacterData]); // hasLoadedCharacterData 의존성 추가

  // useCallback도 항상 같은 순서로 호출
  const handleCharacterChange = useCallback((character: CharacterData) => {
    setCharacterData(character);
  }, []);

  const handleCharacterRestore = useCallback((restoredData: CharacterData) => {
    setCharacterData(restoredData);
    feedback.showSuccess('복원 완료', '백업에서 캐릭터 설정을 복원했습니다.');
  }, [feedback]);

  // currentPlayer가 변경되면 로드 플래그 리셋 (방 이동 등의 경우)
  useEffect(() => {
    if (currentPlayer) {
      setHasLoadedCharacterData(false);
    }
  }, [currentPlayer?.guestUserId]); // guestUserId가 변경될 때만 리셋

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
      console.log('🚀 [CharacterSetupPage] 듀얼 저장 방식으로 캐릭터 저장 시작');

      // 캐릭터 데이터 준비
      const selectedOptions: Record<string, string> = {};
      const selectedColors: Record<string, string> = {};
      
      // selectedOptions - 값이 있는 경우에만 포함
      if (characterData?.selectedOptions?.face) selectedOptions.face = characterData.selectedOptions.face;
      if (characterData?.selectedOptions?.hair) selectedOptions.hair = characterData.selectedOptions.hair;
      if (characterData?.selectedOptions?.top) selectedOptions.top = characterData.selectedOptions.top;
      if (characterData?.selectedOptions?.bottom) selectedOptions.bottom = characterData.selectedOptions.bottom;
      if (characterData?.selectedOptions?.accessory) selectedOptions.accessory = characterData.selectedOptions.accessory;
      
      // selectedColors - 값이 있는 경우에만 포함
      if (characterData?.selectedColors?.face) selectedColors.face = characterData.selectedColors.face;
      if (characterData?.selectedColors?.hair) selectedColors.hair = characterData.selectedColors.hair;
      if (characterData?.selectedColors?.top) selectedColors.top = characterData.selectedColors.top;
      if (characterData?.selectedColors?.bottom) selectedColors.bottom = characterData.selectedColors.bottom;
      if (characterData?.selectedColors?.accessory) selectedColors.accessory = characterData.selectedColors.accessory;

      // 🔧 최소한의 캐릭터 설정 확인 (서버 validation 통과용)
      // 아무것도 선택하지 않았다면 최소한 얼굴과 몸 색상만 설정
      if (Object.keys(selectedOptions).length === 0 && Object.keys(selectedColors).length === 0) {
        console.log('📝 [CharacterSetupPage] 최소한의 캐릭터 설정 적용 (얼굴 + 몸 색상만)');
        selectedOptions.face = 'face1';  // 얼굴은 필수
        selectedColors.face = 'beige';   // 몸 색상도 필수
      }

      // 유니코드 문자 정리 함수
      const sanitizeUnicodeString = (str: string): string => {
        if (!str) return str;
        return str.replace(/[\uD800-\uDFFF]/g, '');
      };

      const characterUpdateData: CharacterData = {
        selectedOptions,
        selectedColors,
        nickname: sanitizeUnicodeString(currentPlayer.nickname || '')
      };

      console.log('🚀 [CharacterSetupPage] 듀얼 저장 시작:', {
        guestUserId: currentPlayer.guestUserId,
        characterData: characterUpdateData
      });
      
      // 🎯 듀얼 저장: REST API + Socket.IO
      const result: DualSaveResult = await saveDualCharacter(
        currentPlayer.guestUserId,
        characterUpdateData,
        updateCharacter
      );

      // 결과에 따른 사용자 피드백
      if (result.overall === 'success') {
        console.log('✅ [CharacterSetupPage] 듀얼 저장 완전 성공');
        // 성공 시 바로 이동
      } else if (result.overall === 'partial') {
        console.warn('⚠️ [CharacterSetupPage] 부분적 저장 성공:', result.message);
        // 경고 표시하지만 계속 진행
      } else {
        console.error('❌ [CharacterSetupPage] 저장 실패:', result.message);
        alert(result.message);
        return;
      }
      
      // 콜백 함수 호출 (하위 호환성)
      if (onCharacterComplete) {
        console.log('🔌 [CharacterSetupPage] 추가 콜백 실행');
        onCharacterComplete(characterUpdateData);
      }
      
      // 성공/부분 성공 시 RoomPage로 돌아가기 (SPA 라우팅)
      setTimeout(() => {
        console.log('🔄 [CharacterSetupPage] RoomPage로 돌아가기 (SPA 라우팅)');
        
        // 🚀 SPA 네비게이션 전에 상태 강제 동기화 트리거
        console.log('⚡ [CharacterSetupPage] SPA 네비게이션 전 상태 동기화 트리거');
        
        if (onBack) {
          onBack();
        } else {
          navigate('/room', { 
            replace: true,  // replace로 변경하여 히스토리 스택 정리
            state: { 
              characterUpdated: true,  // 캐릭터 업데이트 플래그
              timestamp: Date.now()    // 타임스탬프로 강제 리렌더링
            }
          });
        }
      }, 300);
      
    } catch (error) {
      console.error('❌ [CharacterSetupPage] 캐릭터 설정 중 예외 오류:', error);
      alert(`캐릭터 설정 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsLoading(false);
    }
  }, [characterData, isLoading, onBack, currentRoom, currentPlayer, updateCharacter, navigate, onCharacterComplete]);

  const handleBackClick = useCallback(() => {
    if (onBack) {
      onBack(); // 부모가 제공한 특별한 돌아가기 로직
    } else {
      // SPA 라우팅으로 RoomPage로 돌아가기
      navigate('/room');
    }
  }, [onBack, navigate]);

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
            initialCharacterData={characterData || undefined} // 로드된 캐릭터 데이터 전달
          />
        </div>
      </main>
      
      {/* 하단 푸터 영역 */}
      <Footer />
    </div>
  );
};