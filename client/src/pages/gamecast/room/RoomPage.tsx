import React, { useMemo } from "react";
import { Navigation } from "../../../components/gamecast/common/Navigation";
import { Footer } from "../../../components/gamecast/common/Footer";
import { BackButton1 } from "../../../components/gamecast/common/BackButton1";
import { ButtonContainer } from "../../../components/gamecast/room/ButtonContainer.tsx";
import { RoomInfoContainer } from "../../../components/gamecast/room/RoomInfoContainer";
import { MyCharacterContainer } from "../../../components/gamecast/room/MyCharacterContainer";
import { NicknameContainer } from "../../../components/gamecast/room/NicknameContainer";
import SettingIcon from "../../../assets/gamecast/Room/setting.svg?react";
import { useRoom } from "../../../hooks/useRoom.ts";
import { PlayerGrid } from "../../../components/gamecast/room/PlayerGrid.tsx";
// import { useVoiceChat } from "../../../hooks/useVoiceChat.ts";
// import { VoiceStatusOverlay } from "../../../components/gamecast/room/VoiceStatusOverlay.tsx";
// import type { PlayerWithStream } from "../../../components/gamecast/room/VoiceStatusOverlay.tsx";

/**
 * 방 정보 표시 페이지 컴포넌트
 * 입장코드, 방이름, 참여자 목록을 표시합니다
 */
export const RoomPage = () => {
  const { currentRoom, currentPlayer, refreshRoomState, handleLeaveRoom } = useRoom();

  if (!currentRoom || !currentPlayer) {
    return (
      <div className="h-full flex items-center justify-center bg-[linear-gradient(180deg,rgba(0,0,0,1)_0%,rgba(0,6,72,1)_100%)]">
        <p className="text-white">로딩 중...</p>
      </div>
    );
  }


  // 준비하기 버튼 활성화 조건: 캐릭터 설정과 녹화화면 설정이 모두 완료된 경우
  const isReadyEnabled = !!(currentPlayer.character && currentPlayer.recording);

  return (
    <React.Fragment>
      <div className="h-full flex flex-col justify-between bg-[linear-gradient(180deg,rgba(0,0,0,1)_0%,rgba(0,6,72,1)_100%)] relative overflow-hidden min-w-[1821px] min-h-[1064px]">

        {/* 배경 장식 이미지 */}
        <img 
          src="/assets/gamecast/participate/desingBG.png"
          alt="배경 장식"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none z-0 opacity-60"
        />
        
        {/* 상단 네비게이션 영역 */}
        <Navigation />
        
        {/* 메인 콘텐츠 영역 */}
        <main className="flex-1 flex items-center justify-center relative z-10">
          {/* 백버튼 - 메인 콘텐츠 기준 위치 */}
          <div className="absolute z-50 left-[230px] top-[-20px]">
            <BackButton1
              onClick={handleLeaveRoom}
            />
          </div>
          
          {/* 설정 버튼 */}
          <div 
            className="absolute z-50 cursor-pointer left-[230px] bottom-[10px] w-[59.7px] h-[59.7px]"
            onClick={() => console.log("설정 버튼 클릭")}
          >
            <SettingIcon className="w-full h-full" />
          </div>
          
          {/* 메인 콘텐츠 영역 - 고정 크기 1265x775 */}
          <div className="relative bg-transparent flex gap-[35px] w-[1265px] h-[775px]">
            {/* 왼쪽 세로 flex 컨테이너 - 세로 중앙 정렬 */}
            <div className="flex flex-col justify-between w-[609px] h-[775px]">
              {/* 방이름&입장코드 컨테이너 */}
              <RoomInfoContainer roomName={currentRoom.roomName} entryCode={currentRoom.entryCode} />
              {/* 내 캐릭터 컨테이너 */}
              <MyCharacterContainer 
                isHost={currentRoom.hostId === currentPlayer.id} 
                currentPlayer={currentPlayer}
              />
              {/* 닉네임 표기 컨테이너 */}
              <NicknameContainer nickname={currentPlayer.name} />
            </div>
            
            {/* 오른쪽 세로 flex 컨테이너 - 우측 정렬 */}
            <div className="flex flex-col items-end justify-between w-[621px] h-[775px]">
              {/* 플레이어 목록 컨테이너 */}
              <PlayerGrid 
                currentRoom={currentRoom} 
                currentPlayer={currentPlayer}
              />
              {/* 버튼 컨테이너 */}
              <ButtonContainer 
                isReadyEnabled={isReadyEnabled}
                onStateUpdate={refreshRoomState}
                currentRoom={currentRoom}
                currentPlayer={currentPlayer}
              />

            </div>

          </div>
        </main>
        
        {/* 하단 푸터 영역 */}
        <Footer />
      </div>
    </React.Fragment>

  );
}; 