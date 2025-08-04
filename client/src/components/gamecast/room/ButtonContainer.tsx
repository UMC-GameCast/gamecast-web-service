import React, { useState } from "react";
import { RoomButton } from "./RoomButton";
import NoticeIcon from "../../../assets/gamecast/Room/notice.svg?react";
import { updateCurrentPlayer } from "../../../utils/roomManager";
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
  
  // 준비하기 버튼 핸들러
  const handleReady = () => {
    console.log("준비하기 클릭");
    // 기본 준비 상태 토글 (로컬 상태로 관리)
    const result = updateCurrentPlayer({ character: "default" });
    if (result.success) {
      console.log("준비 상태 변경 완료");
      onStateUpdate?.();
    } else {
      console.error("준비 상태 변경 실패:", result.error);
    }
  };

  // 준비하기 버튼의 텍스트 결정
  const getReadyButtonText = (): string => {
    return "준비하기";
  };

  // 준비하기 버튼의 활성화 상태 결정
  const getReadyButtonDisabled = (): boolean => {
    return !isReadyEnabled;
  };

  // 툴팁 표시 조건
  const shouldShowTooltip = (): boolean => {
    return !isReadyEnabled && isTooltipVisible;
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
            if (!isReadyEnabled) {
              setIsTooltipVisible(true);
            }
          }}
          onMouseLeave={() => {
            setIsTooltipVisible(false);
          }}
        >
          <RoomButton 
            onClick={handleReady}
            disabled={getReadyButtonDisabled()}
          >
            {getReadyButtonText()}
          </RoomButton>
        </div>
      </div>
    </div>
  );
};