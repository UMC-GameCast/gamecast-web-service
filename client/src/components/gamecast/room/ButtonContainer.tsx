import React, { useState } from "react";
import { RoomButton } from "./RoomButton";
import NoticeIcon from "../../../assets/gamecast/Room/notice.svg?react";
import { updateCurrentPlayer } from "../../../utils/roomManager";
import { useRecording } from "../../../hooks/useRecording";
import type { Player, RecodeRoom } from "../../../types/room";


interface ButtonContainerProps {
  isReadyEnabled?: boolean;
  onStateUpdate?: () => void;
  currentRoom: RecodeRoom | null;
  currentPlayer: Player | null;
}

/**
 * 게임 방 하단의 버튼들을 담는 컨테이너
 */
export const ButtonContainer = ({ 
  isReadyEnabled = false, 
  onStateUpdate,
  currentRoom,
  currentPlayer 
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
    stopRecording
    // startRecording은 자동 녹화로 변경되어 사용하지 않음
  } = useRecording(currentRoom, currentPlayer);

  // 현재 플레이어의 준비 상태를 서버 데이터에서 가져오기
  const currentPlayerReadyStatus = playersReadyStatus.find(p => p.playerId === currentPlayer?.id);
  const isPlayerReady = currentPlayerReadyStatus?.isReady || false;
  
  // TODO: 각 버튼에 실제 동작하는 onClick 핸들러를 연결해야 합니다.
  const handleCharacterSettings = () => {
    console.log("캐릭터 설정 클릭");
    // 캐릭터 설정 완료로 변경
    const result = updateCurrentPlayer({ character: "default" });
    if (result.success) {
      console.log("캐릭터 설정 완료");
      // 상태 업데이트 함수 호출
      onStateUpdate?.();
    } else {
      console.error("캐릭터 설정 실패:", result.error);
    }
  };
  
  const handleRecordingSettings = () => {
    console.log("녹화화면 설정 클릭");
    // 녹화화면 설정 완료로 변경
    const result = updateCurrentPlayer({ recording: true });
    if (result.success) {
      console.log("녹화화면 설정 완료");
      // 상태 업데이트 함수 호출
      onStateUpdate?.();
    } else {
      console.error("녹화화면 설정 실패:", result.error);
    }
  };
  
  // 준비하기/녹화 관련 버튼 핸들러
  const handleReadyOrRecording = () => {
    switch (recordingStatus.state) {
      case 'idle':
        if (isReadyEnabled && !isPlayerReady) {
          console.log("준비하기 클릭");
          setPlayerReady(true);
        }
        break;
        
      case 'preparing':
        // "녹화를 시작중입니다" 상태에서는 아무도 클릭할 수 없음 (3초 자동 시작 대기)
        console.log("녹화 자동 시작 대기 중... 3초만 기다려주세요");
        break;
        
      case 'recording':
        if (isHost) {
          console.log("녹화 종료 클릭 (호스트)");
          stopRecording();
        }
        break;
        
      default:
        console.log("현재 상태에서는 클릭할 수 없습니다:", recordingStatus.state);
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
              캐릭터 설정과 녹화화면 설정이 필요합니다
            </div>

          </div>
        </div>
      )}
      
      {/* 버튼 컨테이너 */}
      <div className="w-full h-[64.6px] justify-between items-center inline-flex">
        <RoomButton onClick={handleCharacterSettings}>캐릭터 설정</RoomButton>
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