import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { RoomButton } from "./RoomButton";
import { RecordingButton } from "./RecordingButton";
import NoticeIcon from "../../../assets/gamecast/Room/notice.svg?react";
import { useUnifiedGamecast } from "../../../contexts/UnifiedGamecastContext";
import type { Player, Room } from "../../../types/room";


interface ButtonContainerProps {
  isReadyEnabled?: boolean;
  onStateUpdate?: () => void;
  currentRoom: Room | null;
  currentPlayer: Player | null;
  // 설정 상태 props 추가
  characterSetupComplete?: boolean;
  screenSetupComplete?: boolean;
  setCharacterSetup?: (completed: boolean) => void;
  setScreenSetup?: (completed: boolean) => void;
  // 캐릭터 설정 페이지 이동 콜백
  onCharacterSetupClick?: () => void;
  // 준비 상태 관리 (현재 ButtonContainer 내부에서 직접 처리)
  onReadyToggle?: (isReady: boolean) => void;
  allPlayersReady?: boolean;
  // 녹화 관련 (현재 useGameRecording으로 처리)
  isRecording?: boolean;
  recordingTime?: number;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
}

/**
 * 게임 방 하단의 버튼들을 담는 컨테이너
 */
export const ButtonContainer = ({ 
  isReadyEnabled = false, 
  onStateUpdate,
  currentRoom,
  currentPlayer,
  // 설정 상태 props
  characterSetupComplete = false,
  screenSetupComplete = false,
  setCharacterSetup,
  setScreenSetup,
  // 캐릭터 설정 페이지 이동 콜백
  onCharacterSetupClick,
  // 준비 상태 관리 - 현재 사용하지 않음
  onReadyToggle,
  allPlayersReady: allPlayersReadyProp,
  // 녹화 관련 - 현재 사용하지 않음
  isRecording = false,
  recordingTime = 0,
  onRecordingStart,
  onRecordingStop
}: ButtonContainerProps) => {
  const navigate = useNavigate();
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  
  // UnifiedGamecastContext 사용
  const context = useUnifiedGamecast();
  if (!context) {
    console.error('❌ ButtonContainer: UnifiedGamecastContext not found');
    return null;
  }
  
  const { state, actions } = context;
  const { 
    participants, 
    currentPlayer: contextPlayer, 
    preparation,
    recording
  } = state;
  
  
  // 기본값 설정
  const activeCurrentPlayer = currentPlayer || contextPlayer;
  const isHost = activeCurrentPlayer?.role === 'host' || activeCurrentPlayer?.isHost;
  
  // 현재 플레이어의 guestUserId 찾기
  const currentPlayerGuestId = activeCurrentPlayer?.guestUserId;
  
  // 현재 플레이어 데이터 찾기
  const currentPlayerData = participants?.find(p => 
    p.guestUserId === currentPlayerGuestId || p.id === currentPlayerGuestId
  );
  
  // 현재 플레이어의 준비 상태 확인 (캐릭터 그라데이션과 동일한 단순 조건)
  const currentPlayerStatus = currentPlayerData?.preparationStatus;
  const isPlayerReady = currentPlayerStatus?.isReady || false;

  // 🔍 준비 상태 변경 시 상세 디버깅 (안전한 의존성으로 수정)
  React.useEffect(() => {
    if (Math.random() < 0.1) { // 10% 확률로만 로깅하여 스팸 방지
      console.log('🎮 [ButtonContainer] isPlayerReady 상태 변경:', {
        isPlayerReady,
        currentPlayerGuestId,
        currentPlayerData: !!currentPlayerData,
        currentPlayerStatus: {
          characterSetup: currentPlayerStatus?.characterSetup,
          screenSetup: currentPlayerStatus?.screenSetup,
          isReady: currentPlayerStatus?.isReady,
        },
        participantsCount: participants?.length || 0,
        timestamp: new Date().toLocaleTimeString()
      });
    }
  }, [isPlayerReady]); // 의존성을 isPlayerReady만으로 제한
  
  // 서버 기반 모든 플레이어 준비 상태 우선 사용
  const serverAllReady = preparation.allPlayersReady;
  const serverCanStartRecording = preparation.canStartRecording;
  const serverMessage = preparation.serverMessage;
  
  // Fallback: 클라이언트 기반 3단계 준비 상태 확인 (서버와 동일한 로직)
  const clientAllReady = participants?.every(p => {
    const status = p.preparationStatus;
    if (!status) return false;
    
    // 서버와 동일한 3단계 검증: characterSetup + screenSetup + isReady
    return status.characterSetup === true &&
           status.screenSetup === true &&
           status.isReady === true;
  }) || false;
  
  // 최종 준비 상태: 서버 우선, 클라이언트 fallback
  const allPlayersReady = serverAllReady || clientAllReady;
  
  // 🔍 준비 상태 디버깅 (확률적 로깅으로 스팸 방지)
  if (Math.random() < 0.01) {
    console.log('🔍 [ButtonContainer] 준비 상태 비교 (1% 샘플링):', {
      serverBased: {
        allReady: serverAllReady,
        canStartRecording: serverCanStartRecording,
        readyCount: preparation.readyCount,
        totalCount: preparation.totalCount,
        message: serverMessage
      },
      clientBased: {
        allReady: clientAllReady,
        participantsCount: participants?.length || 0
      },
      final: { allPlayersReady },
      isHost,
      timestamp: new Date().toLocaleTimeString()
    });
  }

  
  // 🔍 준비 상태 디버깅 (확률적 로깅으로 스팸 방지)
  if (Math.random() < 0.005) {
    console.log('🔍 [ButtonContainer] 준비 상태 디버깅 (0.5% 샘플링):', {
      currentPlayerGuestId,
      isPlayerReady,
      participantsCount: participants?.length,
      recordingState: {
        isRecording: recording.isRecording,
        startTime: recording.startTime,
        duration: recordingDuration,
        uploading: recording.uploading
      },
      timestamp: new Date().toLocaleTimeString()
    });
  }

  // 서버 자동 녹화 카운트다운 상태 (Context에서 가져옴)
  const countdown = preparation.countdown;
  
  // 디버깅용 준비 상태 로그
  React.useEffect(() => {
    if (Math.random() < 0.05) { // 5% 확률로만 로깅
      console.log('🔍 [ButtonContainer] 준비 상태 확인:', {
        allPlayersReady,
        isRecording: recording.isRecording,
        timestamp: new Date().toLocaleTimeString()
      });
    }
  }, [allPlayersReady, recording.isRecording]);
  
  // 렌더링 상태 로그 제거 (준비 상태와 무관)

  // 서버 중심 준비 상태 업데이트 (Socket.IO 단일 소스) - 현재 미사용
  // const handleServerFirstReadyUpdate = () => {
  //   // Socket.IO를 통해 서버에서 모든 검증 및 상태 관리
  //   setPlayerReady(true);
  //   onStateUpdate?.();
  // };
  
  // 캐릭터 설정 페이지로 이동 (SPA 라우팅)
  const handleCharacterSettings = () => {
    // 캐릭터 설정 페이지 이동 로그 제거 (준비 상태와 무관)
    navigate('/character-setup');
  };
  
  const handleRecordingSettings = async () => {
    console.log('🎬 [ButtonContainer] 화면 설정 시작');
    
    try {
      const gameRecorder = actions.gameRecorder;
      console.log('🎬 [ButtonContainer] GameRecorder 인스턴스:', !!gameRecorder);
      
      if (!gameRecorder) {
        throw new Error('GameRecorder instance not available');
      }
      
      console.log('🎬 [ButtonContainer] selectScreen() 호출 중...');
      const result = await gameRecorder.selectScreen();
      
      console.log('🎬 [ButtonContainer] selectScreen() 결과:', {
        success: result?.success,
        error: result?.error,
        fullResult: result
      });
      
      if (result && result.success) {
        console.log('✅ [ButtonContainer] 화면 선택 성공!', {
          gameRecorderInstance: !!gameRecorder,
          isScreenSelected: gameRecorder?.isScreenSelected?.(),
          timestamp: new Date().toLocaleTimeString()
        });
        
        if (setScreenSetup) {
          // 비동기 상태 업데이트를 기다린 후 onStateUpdate 호출
          try {
            await setScreenSetup(true); // 화면 설정 완료 상태 업데이트 (비동기 처리)
            console.log('🖥️ [ButtonContainer] 화면 설정 상태 변경 완료: true');
            
            // 약간의 지연 후 onStateUpdate 호출 (상태 업데이트 완료 보장)
            setTimeout(() => {
              console.log('🔄 [ButtonContainer] onStateUpdate 호출 (지연)');
              onStateUpdate?.();
            }, 100);
            
          } catch (error) {
            console.error('❌ [ButtonContainer] setScreenSetup 실패:', error);
            console.log('🔄 [ButtonContainer] 실패 시에도 onStateUpdate 호출');
            onStateUpdate?.(); // 실패해도 UI 업데이트 시도
          }
        } else {
          console.log('🔄 [ButtonContainer] setScreenSetup 없음, onStateUpdate 호출');
          onStateUpdate?.();
        }
      } else {
        console.error('❌ [ButtonContainer] 화면 선택 실패:', result?.error);
        alert(result?.error || '화면 선택에 실패했습니다.');
      }
    } catch (error) {
      console.error('💥 [ButtonContainer] 화면 선택 예외:', error);
      alert('화면 선택 중 오류가 발생했습니다.');
    }
  };
  
  // 준비 상태 업데이트 핸들러
  const handleReadyToggle = () => {
    console.log('🔄 [ButtonContainer] 준비 상태 토글 호출');
    onStateUpdate?.();
  };

  // 툴팁 표시 조건
  const shouldShowTooltip = (): boolean => {
    if (recording.isRecording || recording.uploading || allPlayersReady) return false;
    return !isReadyEnabled && isTooltipVisible;
  };

  // 툴팁 메시지 결정
  const getTooltipMessage = (): string => {
    if (!characterSetupComplete && !screenSetupComplete) {
      return "캐릭터 설정과 녹화화면 설정이 필요합니다";
    } else if (!characterSetupComplete) {
      return "캐릭터 설정이 필요합니다";
    } else if (!screenSetupComplete) {
      return "녹화화면 설정이 필요합니다";
    }
    return "설정을 완료해주세요";
  };

  return (
    <div className="w-full flex flex-col items-end">
      
      {/* 툴팁 - 말풍선 형태 */}
      {shouldShowTooltip() && (
        <div className="relative mb-2 transform translate-y-[8px] translate-x-[40px]">
          <div className="relative">
            {/* 말풍선 배경 */}
            <NoticeIcon className="w-[275px] h-[55px]" />
            {/* 텍스트 */}
            <div 
              className="absolute inset-0 flex items-center justify-center text-[14px] font-medium transform translate-x-[23px] -translate-y-[46px]"
              style={{ color: '#ffffff', zIndex: 10 }}
            >
              {getTooltipMessage()}
            </div>

          </div>
        </div>
      )}
      
      {/* 버튼 컨테이너 */}
      <div className="w-full h-[64.6px] justify-between items-center inline-flex">
        <RoomButton 
          onClick={handleCharacterSettings}
          disabled={false}
        >
          {characterSetupComplete ? "캐릭터 설정 완료 ✓" : "캐릭터 설정"}
        </RoomButton>
        <RoomButton onClick={handleRecordingSettings}>
          {screenSetupComplete ? "녹화화면 설정 완료 ✓" : "녹화화면 설정"}
        </RoomButton>
        <div
          onMouseEnter={() => {
            // 툴팁 표시 조건
            if (!isReadyEnabled && !recording.isRecording && !recording.uploading && !allPlayersReady) {
              setIsTooltipVisible(true);
            }
          }}
          onMouseLeave={() => {
            setIsTooltipVisible(false);
          }}
        >
          <RecordingButton
            isHost={isHost}
            isPlayerReady={isPlayerReady}
            allPlayersReady={allPlayersReady}
            isReadyEnabled={isReadyEnabled}
            characterSetupComplete={characterSetupComplete}
            screenSetupComplete={screenSetupComplete}
            onReadyToggle={handleReadyToggle}
          />
        </div>
      </div>
    </div>
  );
};