import React from "react";
import type { Player, Room } from "../../../types/room";
import { PlayerCard } from "./PlayerCard";
import CardBlock from "../../../assets/gamecast/Room/Card_block.svg?react";
import CardEmpty from "../../../assets/gamecast/Room/Card_empty.svg?react";

interface PlayerGridProps {
  currentRoom: Room;
  currentPlayer: Player;
}

export const PlayerGrid: React.FC<PlayerGridProps> = ({
  currentRoom,
  currentPlayer,
}) => {
  // 안전한 배열 처리 및 새로운 데이터 구조 사용
  const participants = currentRoom?.participants || [];
  
  // 서버에서 받은 participants를 클라이언트 형식으로 변환
  const convertedParticipants = participants.map(p => ({
    ...p,
    guestUserId: p.id, // 서버의 id를 guestUserId로 매핑
    preparationStatus: p.preparationStatus || {
      characterSetup: false,
      screenSetup: false
    },
    isHost: p.role === 'host'
  }));
  
  // 현재 플레이어를 제외한 다른 플레이어들 (id로 비교)
  const otherPlayers = convertedParticipants.filter(
    (p) => p.id !== currentPlayer.id
  );
  const totalSlots = 4;
  const joinableSlots = (currentRoom?.maxCapacity || 5) - 1;

  return (
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
              isHost={player.id === currentRoom.hostGuestId || player.role === 'host'}
            />
          );
        }

        return <CardEmpty key={`empty-${index}`} className="w-[230px] h-[288px]" />;
      })}
    </div>
  );
}; 