import React, { useState, useEffect } from "react";
import { Navigation } from "../../../components/gamecast/common/Navigation";
import { Footer } from "../../../components/gamecast/common/Footer";
import { BackButton1 } from "../../../components/gamecast/common/BackButton1";
import { getCurrentRoom, getCurrentPlayer, leaveRoom, updateRoom } from "../../../utils/roomManager";
import type { RecodeRoom, Player } from "../../../types/room";
import { PlayerCard } from "../../../components/gamecast/room/PlayerCard.tsx";
import { ButtonContainer } from "../../../components/gamecast/room/ButtonContainer.tsx";
import CardBlock from "../../../assets/gamecast/Room/Card_block.svg?react";
import CardEmpty from "../../../assets/gamecast/Room/Card_empty.svg?react";
import { RoomInfoContainer } from "../../../components/gamecast/room/RoomInfoContainer";
import { MyCharacterContainer } from "../../../components/gamecast/room/MyCharacterContainer";
import { NicknameContainer } from "../../../components/gamecast/room/NicknameContainer";
import SettingIcon from "../../../assets/gamecast/Room/setting.svg?react";
import { useNavigate } from 'react-router-dom';

/**
 * RoomPage Props 인터페이스
 */
interface Props {
  setPage: (page: "main" | "participate" | "create" | "room") => void;
}

/**
 * 방 정보 표시 페이지 컴포넌트
 * 입장코드, 방이름, 참여자 목록을 표시합니다
 */
export const RoomPage = () => {
  const navigate = useNavigate();
  const [currentRoom, setCurrentRoom] = useState<RecodeRoom | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);

  // 상태 새로고침 함수 임시 테슽트용
  const refreshRoomState = () => {
    const room = getCurrentRoom();
    const player = getCurrentPlayer();
    
    if (room && player) {
      setCurrentRoom(room);
      setCurrentPlayer(player);
    }
  };

  useEffect(() => {
    // 현재 방과 플레이어 정보 로드
    const room = getCurrentRoom();
    const player = getCurrentPlayer();
    
    if (!room || !player) {
      // 방 정보가 없으면 메인 페이지로 이동
      navigate('/');
      return;
    }
    
    setCurrentRoom(room);
    setCurrentPlayer(player);
    
    // 방 정보 주기적 업데이트 (실제로는 서버에서 실시간으로 받아와야 함)
    const interval = setInterval(() => {
      const updatedRoom = updateRoom(room.id);
      if (updatedRoom) {
        setCurrentRoom(updatedRoom);
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [navigate]);

  const handleLeaveRoom = () => {
    leaveRoom();
    navigate('/');
  };

  if (!currentRoom || !currentPlayer) {
    return (
      <div className="h-full flex items-center justify-center bg-[linear-gradient(180deg,rgba(0,0,0,1)_0%,rgba(0,6,72,1)_100%)]">
        <p className="text-white">로딩 중...</p>
      </div>
    );
  }

  const otherPlayers = currentRoom.players.filter(p => p.id !== currentPlayer.id);
  const totalSlots = 4;
  const joinableSlots = currentRoom.maxPlayers - 1;

  // 준비하기 버튼 활성화 조건: 캐릭터 설정과 녹화화면 설정이 모두 완료된 경우
  const isReadyEnabled = !!(currentPlayer.character && currentPlayer.recording);

  return (
    <div className="h-full flex flex-col justify-between bg-[linear-gradient(180deg,rgba(0,0,0,1)_0%,rgba(0,6,72,1)_100%)] relative overflow-hidden" style={{ minWidth: '1821px', minHeight: '1064px' }}>
      
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
        <div 
          className="absolute z-50"
          style={{
            left: '230px', // 더 안쪽으로 이동
            top: '-20px',   // 더 아래쪽으로 이동
          }}
        >
          <BackButton1
            onClick={handleLeaveRoom}
          />
        </div>
        
        {/* 설정 버튼 */}
        <div 
          className="absolute z-50 cursor-pointer"
          style={{
            left: '230px',  // 백버튼과 같은 x값
            bottom: '10px',   // 백버튼과 대칭 y값 (775px + 20px)
            width: '59.7px',
            height: '59.7px'
          }}
          onClick={() => console.log("설정 버튼 클릭")}
        >
          <SettingIcon className="w-full h-full" />
        </div>
        
        {/* 메인 콘텐츠 영역 - 고정 크기 1265x775 */}
        <div 
          className="relative bg-transparent flex gap-[35px]"
          style={{
            width: '1265px',
            height: '775px'
          }}
        >
          {/* 왼쪽 세로 flex 컨테이너 - 세로 중앙 정렬 */}
          <div className="flex flex-col justify-between" style={{width: '609px', height: '775px'}}>
            {/* 방이름&입장코드 컨테이너 */}
            <RoomInfoContainer roomName={currentRoom.roomName} entryCode={currentRoom.entryCode} />
            {/* 내 캐릭터 컨테이너 */}
            <MyCharacterContainer isHost={currentRoom.hostId === currentPlayer.id} />
            {/* 닉네임 표기 컨테이너 */}
            <NicknameContainer nickname={currentPlayer.name} />
          </div>
          
          {/* 오른쪽 세로 flex 컨테이너 - 우측 정렬 */}
          <div className="flex flex-col items-end justify-between" style={{width: '621px', height: '775px'}}>
            {/* 플레이어 목록 컨테이너 */}
            <div className="w-full h-[628px] justify-end items-start gap-[55.98px] inline-flex flex-wrap content-start">
              {Array.from({ length: totalSlots }).map((_, index) => {
                const player = otherPlayers[index];
                const isBlocked = index >= joinableSlots;

                if (isBlocked) {
                  return <CardBlock key={`block-${index}`} className="w-[230px] h-[288px]" />;
                }

                if (player) {
                  return (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      isHost={player.id === currentRoom.hostId}
                    />
                  );
                }

                return <CardEmpty key={`empty-${index}`} className="w-[230px] h-[288px]" />;
              })}
            </div>
            {/* 버튼 컨테이너 */}
            <ButtonContainer 
              isReadyEnabled={isReadyEnabled}
              onStateUpdate={refreshRoomState}
            />
          </div>
        </div>
      </main>
      
      {/* 하단 푸터 영역 */}
      <Footer />
    </div>
  );
}; 