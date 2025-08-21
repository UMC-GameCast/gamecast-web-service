import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { RoomButton } from "./RoomButton";
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
  const [isHoveringHostButton, setIsHoveringHostButton] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
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
  useEffect(() => {
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

  // 서버 자동 녹화 카운트다운 상태 (UI 표시용)
  const [countdown, setCountdown] = useState<number | null>(null);

  // 서버에서 오는 카운트다운 이벤트 수신
  useEffect(() => {
    if (!actions.socket) return;

    const handleCountdownStarted = (data: any) => {
      console.log('⏰ [ButtonContainer] 서버 카운트다운 시작:', data);
      setCountdown(data.countdown);
    };

    const handleCountdown = (data: any) => {
      console.log(`⏰ [ButtonContainer] 서버 카운트다운: ${data.count}초`);
      setCountdown(data.count);
    };

    const handleRecordingStarted = () => {
      console.log('🎬 [ButtonContainer] 서버 녹화 시작');
      setCountdown(null);
    };

    actions.socket.on('recording-countdown-started', handleCountdownStarted);
    actions.socket.on('recording-countdown', handleCountdown);
    actions.socket.on('recording-started', handleRecordingStarted);

    return () => {
      actions.socket?.off('recording-countdown-started', handleCountdownStarted);
      actions.socket?.off('recording-countdown', handleCountdown);
      actions.socket?.off('recording-started', handleRecordingStarted);
    };
  }, [actions.socket]);
  
  // 녹화 시간 계산 (실시간 업데이트)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (recording.isRecording && recording.startTime) {
      interval = setInterval(() => {
        setRecordingDuration(Date.now() - recording.startTime!);
      }, 100);
    } else {
      setRecordingDuration(0);
    }
    return () => clearInterval(interval);
  }, [recording.isRecording, recording.startTime]);
  
  // 시간 포맷팅 함수
  const formatTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
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
  
  // 준비하기/녹화 관련 버튼 핸들러
  const handleReadyOrRecording = () => {
    console.log('🎮 [ButtonContainer] 준비/녹화 버튼 클릭:', {
      isRecording: recording.isRecording,
      uploading: recording.uploading,
      isReadyEnabled,
      isPlayerReady,
      isHost,
      allPlayersReady,
      timestamp: new Date().toISOString()
    });
    
    if (recording.uploading) {
      console.log('⚠️ [ButtonContainer] 업로드 중이므로 버튼 클릭 무시');
      return;
    }
    
    if (recording.isRecording) {
      // 녹화 중 - 호스트만 종료 가능
      if (isHost) {
        console.log('🛑 [ButtonContainer] 호스트가 녹화 종료 요청');
        try {
          actions.stopRecording();
          console.log('✅ [ButtonContainer] 녹화 종료 요청 완료');
        } catch (error) {
          console.error('❌ [ButtonContainer] 녹화 종료 실패:', error);
        }
      } else {
        console.log('⚠️ [ButtonContainer] 게스트는 녹화를 종료할 수 없음');
      }
      return;
    }
    
    if (allPlayersReady) {
      // 자동 녹화 시스템이 활성화된 상태 - 수동 클릭 비활성화
      console.log('⚠️ [ButtonContainer] 모든 플레이어 준비 완료 - 자동 녹화 대기 중, 수동 클릭 무시');
      return;
    } else {
      // 준비 상태 토글
      if (isReadyEnabled) {
        const newReadyState = !isPlayerReady;
        console.log(`🔄 [ButtonContainer] 준비 상태 변경: ${isPlayerReady} → ${newReadyState}`);
        
        // 준비 상태 업데이트 (Context 사용)
        console.log('📤 [ButtonContainer] updatePreparation 호출 데이터:', {
          characterSetup: characterSetupComplete,
          screenSetup: screenSetupComplete,
          isReady: newReadyState,
          timestamp: new Date().toLocaleTimeString()
        });
        
        actions.updatePreparation({
          characterSetup: characterSetupComplete,
          screenSetup: screenSetupComplete,
          isReady: newReadyState
        });
        
        onStateUpdate?.();
        console.log('✅ [ButtonContainer] updatePreparation 호출 완료');
      } else {
        console.warn('⚠️ [ButtonContainer] 준비 버튼이 비활성화 상태');
      }
    }
  };

  // 준비하기 버튼의 텍스트 결정 (새로운 Context 기반) - 우선순위 수정
  const getReadyButtonText = (): string => {
    // 1순위: 업로드 중 (최우선)
    if (recording.uploading) {
      return `업로드 중... ${recording.uploadProgress}%`;
    }
    
    // 2순위: 녹화 중 (자동녹화 곧 시작보다 우선) - 강화된 조건
    if (recording.isRecording && recording.startTime) {
      const timeText = formatTime(recordingDuration);
      console.log('🔍 [ButtonContainer] 녹화 중 상태 감지:', {
        isRecording: recording.isRecording,
        hasStartTime: !!recording.startTime,
        timeText,
        recordingDuration,
        timestamp: new Date().toLocaleTimeString()
      });
      
      if (isHost) {
        // 호스트가 마우스 호버 시 "녹화 종료" 표시
        return isHoveringHostButton ? "녹화 종료" : `녹화중 ${timeText}`;
      } else {
        // 게스트는 항상 시간만 표시
        return `녹화중 ${timeText}`;
      }
    }
    
    // 3순위: 모든 플레이어 준비 완료 (녹화 중이 아닐 때만)
    if (allPlayersReady && !recording.isRecording) {
      if (countdown !== null) {
        return `자동 녹화 시작 ${countdown}초...`;
      }
      
      // 서버 메시지 우선 사용
      if (serverMessage) {
        return isHost ? "자동 녹화 곧 시작!" : serverMessage;
      }
      
      // 서버 준비 상태 기반 메시지
      if (serverAllReady && serverCanStartRecording) {
        return isHost ? "자동 녹화 곧 시작!" : "모든 플레이어 준비 완료! 곧 자동으로 녹화가 시작됩니다...";
      }
      
      // Fallback 메시지
      if (isHost) {
        return "녹화 시작";
      } else {
        return "모든 플레이어 준비 완료! 호스트의 녹화 시작을 기다리는 중...";
      }
    }
    
    // 4순위: 기본 준비 상태 텍스트
    return isPlayerReady ? "준비 취소" : "준비하기";
  };

  // 준비하기 버튼의 활성화 상태 결정 (새로운 Context 기반)
  const getReadyButtonDisabled = (): boolean => {
    // 업로드 중에는 비활성화
    if (recording.uploading) {
      return true;
    }
    
    // 카운트다운 중에는 비활성화
    if (countdown !== null) {
      return true;
    }
    
    // 녹화 중에는 호스트만 종료 가능
    if (recording.isRecording) {
      return !isHost;
    }
    
    // 모든 플레이어 준비 완료 시에는 자동 시스템 활성화 - 수동 클릭 비활성화
    if (allPlayersReady) {
      return true;  // 자동 녹화 대기 중이므로 모든 클릭 비활성화
    }
    
    // 기본적으로 준비 상태 토글은 설정이 완료된 경우에만 가능
    return !isReadyEnabled;
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
      {/* 플레이어 준비 상태 및 녹화 정보 표시 (개발용) */}
      {participants && participants.length > 0 && (
        <div className="mb-2 text-white text-sm bg-black bg-opacity-50 p-2 rounded">
          <div>준비 상태:</div>
          {participants.map(player => (
            <div key={player.guestUserId || player.id}>
              {player.nickname}: {player.preparationStatus?.isReady ? '✅' : '❌'}
              {player.preparationStatus?.characterSetup && ' 🎭'}
              {player.preparationStatus?.screenSetup && ' 🖥️'}
            </div>
          ))}
          <div>모든 플레이어 준비: {allPlayersReady ? '✅' : '❌'}</div>
          <div>서버 준비 상태: {preparation.readyCount}/{preparation.totalCount} {serverAllReady ? '✅' : '❌'}</div>
          {serverMessage && <div>서버 메시지: {serverMessage}</div>}
          <div>녹화 상태: {recording.isRecording ? '🎬 녹화중' : recording.uploading ? '📤 업로드중' : '⏸️ 대기'}</div>
          <div>마이크 권한: {
            recording.microphonePermission === 'granted' ? '✅ 허용' :
            recording.microphonePermission === 'denied' ? '❌ 거부' :
            recording.microphonePermission === 'error' ? '⚠️ 오류' : '⏳ 요청중'
          }</div>
          {recording.isRecording && (
            <div>녹화 시간: {formatTime(recordingDuration)}</div>
          )}
          {recording.uploading && (
            <div>업로드 진행: {recording.uploadProgress}%</div>
          )}
        </div>
      )}
      
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
            // 호스트 버튼 호버 상태 관리
            if (recording.isRecording && isHost) {
              setIsHoveringHostButton(true);
            }
          }}
          onMouseLeave={() => {
            setIsTooltipVisible(false);
            setIsHoveringHostButton(false);
          }}
        >
          <RoomButton 
            onClick={handleReadyOrRecording}
            disabled={getReadyButtonDisabled()}
            isReady={isPlayerReady}
          >
            {getReadyButtonText()}

          </RoomButton>
        </div>
      </div>
    </div>
  );
};