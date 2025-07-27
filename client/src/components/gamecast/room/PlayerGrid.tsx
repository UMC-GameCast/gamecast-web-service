import React from "react";
import type { Player, RecodeRoom } from "../../../types/room";
import { PlayerCard } from "./PlayerCard";
import CardBlock from "../../../assets/gamecast/Room/Card_block.svg?react";
import CardEmpty from "../../../assets/gamecast/Room/Card_empty.svg?react";

interface PlayerGridProps {
  currentRoom: RecodeRoom;
  currentPlayer: Player;
}

export const PlayerGrid: React.FC<PlayerGridProps> = ({
  currentRoom,
  currentPlayer,
}) => {
  const otherPlayers = currentRoom.players.filter(
    (p) => p.id !== currentPlayer.id
  );
  const totalSlots = 4;
  const joinableSlots = currentRoom.maxPlayers - 1;

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
              isHost={player.id === currentRoom.hostId}
            />
          );
        }

        return <CardEmpty key={`empty-${index}`} className="w-[230px] h-[288px]" />;
      })}
    </div>
  );
}; 