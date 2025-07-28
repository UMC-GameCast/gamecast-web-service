import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCurrentRoom,
  getCurrentPlayer,
  leaveRoom,
  updateRoom,
} from "../utils/roomManager";
import type { RecodeRoom, Player } from "../types/room";

export const useRoom = () => {
  const navigate = useNavigate();
  const [currentRoom, setCurrentRoom] = useState<RecodeRoom | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);

  const refreshRoomState = () => {
    const room = getCurrentRoom();
    const player = getCurrentPlayer();

    if (room && player) {
      setCurrentRoom(room);
      setCurrentPlayer(player);
    }
  };

  useEffect(() => {
    const room = getCurrentRoom();
    const player = getCurrentPlayer();

    if (!room || !player) {
      navigate("/");
      return;
    }

    setCurrentRoom(room);
    setCurrentPlayer(player);

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
    navigate("/");
  };

  return { currentRoom, currentPlayer, refreshRoomState, handleLeaveRoom };
}; 