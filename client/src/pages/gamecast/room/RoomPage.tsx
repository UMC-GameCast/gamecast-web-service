import React, { useState, useEffect } from "react";
import { Navigation } from "../../../components/gamecast/common/Navigation";
import { Footer } from "../../../components/gamecast/common/Footer";
import { BackButton1 } from "../../../components/gamecast/common/BackButton1";
import { getCurrentRoom, getCurrentPlayer, leaveRoom, updateRoom } from "../../../utils/roomManager";
import type { RecodeRoom, Player } from "../../../types/room";

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
export const RoomPage = ({ setPage }: Props) => {
  const [currentRoom, setCurrentRoom] = useState<RecodeRoom | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);

  useEffect(() => {
    // 현재 방과 플레이어 정보 로드
    const room = getCurrentRoom();
    const player = getCurrentPlayer();
    
    if (!room || !player) {
      // 방 정보가 없으면 메인 페이지로 이동
      setPage("main");
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
  }, [setPage]);

  const handleLeaveRoom = () => {
    leaveRoom();
    setPage("main");
  };

  if (!currentRoom || !currentPlayer) {
    return (
      <div className="h-full flex items-center justify-center bg-[linear-gradient(180deg,rgba(0,0,0,1)_0%,rgba(0,6,72,1)_100%)]">
        <p className="text-white">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col justify-between bg-[linear-gradient(180deg,rgba(0,0,0,1)_0%,rgba(0,6,72,1)_100%)] relative overflow-hidden">
      
      {/* 배경 장식 이미지 */}
      <img 
        src="/assets/gamecast/participate/desingBG.png"
        alt="배경 장식"
        className="absolute inset-0 w-full h-full object-fill pointer-events-none z-0 opacity-60"
      />
      
      {/* 상단 네비게이션 영역 */}
      <Navigation>
        <BackButton1
          onClick={handleLeaveRoom}
          className="absolute left-[14%] top-[150px] z-20"
        />
      </Navigation>
      
      {/* 메인 콘텐츠 영역 */}
      <main className="flex-1 flex items-center justify-center relative z-10">
        <div className="w-[560px] h-[480px] bg-[rgba(0,0,0,0.8)] border border-[#6b6bb8] rounded-2xl p-8 text-white">
          
          {/* 방 제목 */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#e8e6fd] mb-2">
              {currentRoom.roomName}
            </h1>
            <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#6b6bb8] to-transparent"></div>
          </div>
          
          {/* 입장코드 */}
          <div className="mb-8">
            <div className="bg-[rgba(107,107,184,0.2)] border border-[#6b6bb8] rounded-lg p-4 text-center">
              <p className="text-[#b0b0b0] text-sm mb-2">입장코드</p>
              <p className="text-2xl font-bold text-[#e8e6fd] tracking-widest">
                {currentRoom.entryCode}
              </p>
            </div>
          </div>
          
          {/* 참여자 정보 */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-[#e8e6fd]">참여자</h3>
              <span className="text-[#b0b0b0]">
                {currentRoom.players.length} / {currentRoom.maxPlayers}
              </span>
            </div>
            
            {/* 참여자 목록 */}
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {currentRoom.players.map((player) => (
                <div 
                  key={player.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    player.id === currentPlayer.id 
                      ? 'bg-[rgba(107,107,184,0.3)] border border-[#6b6bb8]' 
                      : 'bg-[rgba(107,107,184,0.1)]'
                  }`}
                >
                  <span className="text-[#e8e6fd] font-medium">
                    {player.name}
                  </span>
                  <div className="flex items-center gap-2">
                    {player.isHost && (
                      <span className="bg-[#ff6b6b] text-white text-xs px-2 py-1 rounded-full">
                        방장
                      </span>
                    )}
                    {player.id === currentPlayer.id && (
                      <span className="bg-[#4ecdc4] text-white text-xs px-2 py-1 rounded-full">
                        나
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* 게임 시작 버튼 (방장만) */}
          {currentPlayer.isHost && (
            <div className="text-center">
              <button 
                className="bg-[#6b6bb8] hover:bg-[#8a8ac8] text-white font-bold py-3 px-8 rounded-lg transition-colors"
                onClick={() => {
                  alert("게임 시작 기능은 추후 구현 예정입니다!");
                }}
              >
                게임 시작
              </button>
            </div>
          )}
          
        </div>
      </main>
      
      {/* 하단 푸터 영역 */}
      <Footer />
    </div>
  );
}; 