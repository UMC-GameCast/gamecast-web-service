import { useState } from "react";
import { RoomButton } from "./RoomButton";
import NoticeIcon from "../../../assets/gamecast/Room/notice.svg?react";
// updateCurrentPlayer 제거 - Socket.IO 단일 소스 사용
import { useGameRecording } from "../../../hooks/useGameRecording";
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
  onCharacterSetupClick
  // 준비 상태 관리 - 현재 사용하지 않음
  // onReadyToggle,
  // allPlayersReady: allPlayersReadyProp,
  // 녹화 관련 - 현재 사용하지 않음
  // isRecording = false,
  // recordingTime = 0,
  // onRecordingStart,
  // onRecordingStop
}: ButtonContainerProps) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [isHoveringHostButton, setIsHoveringHostButton] = useState(false);
  
  const {
    recordingStatus,
    playersReadyStatus,
    allPlayersReady,
    isHost,
    formatTime,
    setPlayerReady,
    stopRecording,
    getGameRecorder,
    cancelAutoStart
  } = useGameRecording(currentRoom, currentPlayer);

  // 현재 플레이어의 준비 상태를 서버 데이터에서 가져오기 (통합 ID 사용)
  const unifiedPlayerId = currentPlayer?.guestUserId || currentPlayer?.id;
  const currentPlayerReadyStatus = Array.isArray(playersReadyStatus) 
    ? playersReadyStatus.find(p => p.playerId === unifiedPlayerId || p.playerId === currentPlayer?.id)
    : null;
  const isPlayerReady = currentPlayerReadyStatus?.isReady || false;

  // 서버 중심 준비 상태 업데이트 (Socket.IO 단일 소스) - 현재 미사용
  // const handleServerFirstReadyUpdate = () => {
  //   // Socket.IO를 통해 서버에서 모든 검증 및 상태 관리
  //   setPlayerReady(true);
  //   onStateUpdate?.();
  // };
  
  // 캐릭터 설정 페이지로 이동
  const handleCharacterSettings = () => {
    console.log('🎭 [ButtonContainer] 캐릭터 설정 페이지로 이동');
    
    if (onCharacterSetupClick) {
      onCharacterSetupClick();
    } else {
      console.warn('⚠️ [ButtonContainer] onCharacterSetupClick 콜백이 제공되지 않음');
      // 임시로 설정 완료 상태 토글 (fallback)
      if (setCharacterSetup) {
        const newState = !characterSetupComplete;
        console.log('🎭 [ButtonContainer] 캐릭터 설정 상태 변경 (fallback):', newState);
        setCharacterSetup(newState);
      }
    }
  };
  
  const handleRecordingSettings = async () => {
    console.log('🎬 [ButtonContainer] 화면 설정 시작');
    
    try {
      const gameRecorder = getGameRecorder();
      console.log('🎬 [ButtonContainer] GameRecorder 인스턴스:', !!gameRecorder);
      
      console.log('🎬 [ButtonContainer] selectScreen() 호출 중...');
      const result = await gameRecorder.selectScreen();
      
      console.log('🎬 [ButtonContainer] selectScreen() 결과:', {
        success: result?.success,
        error: result?.error,
        fullResult: result
      });
      
      if (result && result.success) {
        console.log('✅ [ButtonContainer] 화면 선택 성공! setScreenSetup(true) 호출');
        if (setScreenSetup) {
          setScreenSetup(true); // 화면 설정 완료 상태 업데이트
          console.log('🖥️ [ButtonContainer] 화면 설정 상태 변경: true');
        }
        console.log('🔄 [ButtonContainer] onStateUpdate 호출');
        onStateUpdate?.();
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
    // 중요 로그는 localStorage에도 백업
    const logData = {
      recordingState: recordingStatus.state,
      isReadyEnabled,
      isPlayerReady,
      isHost,
      autoStartCountdown: recordingStatus.autoStartCountdown,
      timestamp: new Date().toISOString()
    };
    
    console.log('🎮 [ButtonContainer] 준비/녹화 버튼 클릭:', logData);
    
    // localStorage 백업
    try {
      const existingLogs = JSON.parse(localStorage.getItem('gamecast_button_clicks') || '[]');
      existingLogs.push({ type: 'button_click', ...logData });
      if (existingLogs.length > 20) existingLogs.shift();
      localStorage.setItem('gamecast_button_clicks', JSON.stringify(existingLogs));
    } catch {
      // 무시 - localStorage 에러는 중요하지 않음
    }
    
    switch (recordingStatus.state) {
      case 'idle':
        // 카운트다운 중 호스트 취소 처리
        if (recordingStatus.autoStartCountdown !== undefined) {
          if (isHost) {
            console.log('🛑 [ButtonContainer] 호스트가 카운트다운 취소 요청');
            cancelAutoStart();
            console.log('🛑 [ButtonContainer] 호스트가 자동 시작 취소');
          }
          return;
        }
        
        if (isReadyEnabled) {
          // 준비 상태 토글 (준비 완료 ↔ 준비 취소)
          const newReadyState = !isPlayerReady;
          console.log(`🔄 [ButtonContainer] 준비 상태 변경: ${isPlayerReady} → ${newReadyState}`);
          console.log(`🔄 [ButtonContainer] Setup 상태 전달: characterSetup=${characterSetupComplete}, screenSetup=${screenSetupComplete}`);
          
          // setup 상태를 함께 전달하여 서버에 정확한 데이터 전송
          setPlayerReady(newReadyState, characterSetupComplete, screenSetupComplete);
          onStateUpdate?.();
          
          console.log('✅ [ButtonContainer] setPlayerReady 호출 완료');
        } else {
          console.warn('⚠️ [ButtonContainer] 준비 버튼이 비활성화 상태');
        }
        break;
        
      case 'preparing':
      case 'starting':
        // 녹화 시작 중에는 버튼 비활성화
        break;
        
      case 'recording':
        if (isHost) {
          stopRecording();
        }
        break;
    }
  };

  // 준비하기 버튼의 텍스트 결정 (단순화된 버전)
  const getReadyButtonText = (): string => {
    switch (recordingStatus.state) {
      case 'idle':
        if (recordingStatus.autoStartCountdown !== undefined) {
          // 자동 시작 카운트다운 중 - 호스트만 취소 가능
          if (isHost) {
            return `자동 시작 취소 (${recordingStatus.autoStartCountdown}초)`;
          } else {
            return `모든 플레이어 준비 완료! ${recordingStatus.autoStartCountdown}초 후 녹화 시작`;
          }
        }
        // 준비 상태에 따른 간단한 텍스트
        return isPlayerReady ? "준비 취소" : "준비하기";
        
      case 'preparing':
        return "녹화를 시작중입니다";
        
      case 'starting':
        return "녹화를 시작중입니다";
        
      case 'recording': {
        const timeText = formatTime(recordingStatus.duration);
        if (isHost) {
          // 호스트가 마우스 호버 시 "녹화 종료" 표시
          return isHoveringHostButton ? "녹화 종료" : `녹화중 ${timeText}`;
        } else {
          // 게스트는 항상 시간만 표시
          return `녹화중 ${timeText}`;
        }
      }
        
      case 'stopping':
        return "녹화를 종료중입니다";
        
      case 'completed':
        return "녹화 완료";
        
      default:
        return "준비하기";
    }
  };

  // 준비하기 버튼의 활성화 상태 결정
  const getReadyButtonDisabled = (): boolean => {
    switch (recordingStatus.state) {
      case 'idle':
        // 카운트다운 중이아니면 기존 로직 사용
        if (recordingStatus.autoStartCountdown === undefined) {
          return !isReadyEnabled; // 준비 완료 후에도 토글 가능
        }
        // 카운트다운 중: 호스트만 취소 가능, 게스트는 비활성화
        return !isHost;
        
      case 'preparing':
      case 'starting':
        return true; // 녹화 자동 시작 중일 때는 모든 플레이어 비활성화
        
      case 'stopping':
        return true; // 종료 중일 때는 비활성화
        
      case 'recording':
        return !isHost; // 녹화 중에는 호스트만 종료 가능
        
      case 'completed':
        return true; // 완료된 후에는 비활성화
        
      default:
        return true;
    }
  };

  // 툴팁 표시 조건
  const shouldShowTooltip = (): boolean => {
    if (recordingStatus.state !== 'idle') return false;
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
      {/* 플레이어 준비 상태 표시 (개발용) */}
      {playersReadyStatus.length > 0 && (
        <div className="mb-2 text-white text-sm bg-black bg-opacity-50 p-2 rounded">
          <div>준비 상태:</div>
          {playersReadyStatus.map(player => (
            <div key={player.playerId}>
              {player.playerName}: {player.isReady ? '✅' : '❌'}
            </div>
          ))}
          <div>모든 플레이어 준비: {allPlayersReady ? '✅' : '❌'}</div>
          <div>녹화 상태: {recordingStatus.state}</div>
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
            // 툴팁 표시 조건 (카운트다운 중에는 비활성화)
            if (!isReadyEnabled && recordingStatus.state === 'idle' && recordingStatus.autoStartCountdown === undefined) {
              setIsTooltipVisible(true);
            }
            // 호스트 버튼 호버 상태 관리
            if (recordingStatus.state === 'recording' && isHost) {
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
          >
            {getReadyButtonText()}

          </RoomButton>
        </div>
      </div>
    </div>
  );
};