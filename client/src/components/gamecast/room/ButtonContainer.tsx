import React, { useState } from "react";
import { RoomButton } from "./RoomButton";
import NoticeIcon from "../../../assets/gamecast/Room/notice.svg?react";
import { updateCurrentPlayer } from "../../../utils/roomManager";
import { useGameRecording } from "../../../hooks/useGameRecording";
import type { Player, Room } from "../../../types/room";


interface ButtonContainerProps {
  isReadyEnabled?: boolean;
  onStateUpdate?: () => void;
  currentRoom: Room | null;
  currentPlayer: Player | null;
  onCharacterSetup?: () => void;
}

/**
 * 게임 방 하단의 버튼들을 담는 컨테이너
 */
export const ButtonContainer = ({ 
  isReadyEnabled = false, 
  onStateUpdate,
  currentRoom,
  currentPlayer,
  onCharacterSetup
}: ButtonContainerProps) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [isHoveringHostButton, setIsHoveringHostButton] = useState(false);
  const [screenSelected, setScreenSelected] = useState(false);
  
  const {
    recordingStatus,
    playersReadyStatus,
    allPlayersReady,
    isHost,
    formatTime,
    setPlayerReady,
    stopRecording,
    getGameRecorder
  } = useGameRecording(currentRoom, currentPlayer);

  // 현재 플레이어의 준비 상태를 서버 데이터에서 가져오기 (통합 ID 사용)
  const unifiedPlayerId = currentPlayer?.guestUserId || currentPlayer?.id;
  const currentPlayerReadyStatus = playersReadyStatus.find(p => 
    p.playerId === unifiedPlayerId || p.playerId === currentPlayer?.id
  );
  const isPlayerReady = currentPlayerReadyStatus?.isReady || false;

  // 통합된 준비 상태 업데이트 함수
  const handleUnifiedReadyUpdate = async () => {
    try {
      // Socket.IO 실시간 업데이트 (주 시스템)
      setPlayerReady(true);
      
      // REST API 백업 저장 (DB 영속성)
      const restResult = await updateCurrentPlayer({ 
        characterSetup: true, 
        screenSetup: true 
      });
      
      if (restResult.success) {
        onStateUpdate?.();
      } else {
        console.warn("REST API 백업 저장 실패:", restResult.error);
      }
      
    } catch (error) {
      console.error("준비 상태 업데이트 오류:", error);
    }
  };
  
  // 캐릭터 설정 페이지로 이동 (현재 비활성화)
  const handleCharacterSettings = () => {
    // TODO: 캐릭터 설정 기능 구현 후 활성화
    console.log('캐릭터 설정 기능은 아직 구현되지 않았습니다.');
    // onCharacterSetup?.();
  };
  
  const handleRecordingSettings = async () => {
    try {
      const gameRecorder = getGameRecorder();
      const result = await gameRecorder.selectScreen();
      
      if (result.success) {
        setScreenSelected(true);
        onStateUpdate?.();
      } else {
        console.error('화면 선택 실패:', result.error);
        alert(result.error || '화면 선택에 실패했습니다.');
      }
    } catch (error) {
      console.error('화면 선택 오류:', error);
      alert('화면 선택 중 오류가 발생했습니다.');
    }
  };
  
  // 준비하기/녹화 관련 버튼 핸들러
  const handleReadyOrRecording = () => {
    switch (recordingStatus.state) {
      case 'idle':
        if (isReadyEnabled && !isPlayerReady) {
          handleUnifiedReadyUpdate();
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

  // 준비하기 버튼의 텍스트 결정
  const getReadyButtonText = (): string => {
    switch (recordingStatus.state) {
      case 'idle':
        return isPlayerReady ? "준비 완료" : "준비하기";
        
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
        return !isReadyEnabled || isPlayerReady;
        
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
              녹화화면 설정이 필요합니다
            </div>

          </div>
        </div>
      )}
      
      {/* 버튼 컨테이너 */}
      <div className="w-full h-[64.6px] justify-between items-center inline-flex">
        <RoomButton 
          onClick={handleCharacterSettings}
          disabled={true}
          style={{ opacity: 0.5, cursor: 'not-allowed' }}
        >
          캐릭터 설정 (준비중)
        </RoomButton>
        <RoomButton onClick={handleRecordingSettings}>녹화화면 설정</RoomButton>
        <div
          onMouseEnter={() => {
            // 툴팁 표시 조건
            if (!isReadyEnabled && recordingStatus.state === 'idle') {
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