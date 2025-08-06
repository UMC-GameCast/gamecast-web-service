// 방 관리 서비스 훅 - API 통신 담당

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import type { Room, Player } from '../types/game';
import type { 
  CreateRoomRequest, 
  JoinRoomRequest, 
  RoomInfoResponse 
} from '../types/api';
import { getCurrentUserId } from '../utils/roomManager';

interface UseRoomServiceReturn {
  // 상태
  currentRoom: Room | null;
  currentPlayer: Player | null;
  loading: boolean;
  error: string | null;

  // 액션
  createRoom: (roomName: string, hostNickname: string, maxCapacity?: number) => Promise<boolean>;
  joinRoom: (roomCode: string, nickname: string) => Promise<boolean>;
  leaveRoom: () => Promise<boolean>;
  refreshRoomState: () => Promise<void>;
  
  // 헬퍼
  isHost: boolean;
  isCurrentUser: (player: Player) => boolean;
  clearError: () => void;
}

export const useRoomService = (): UseRoomServiceReturn => {
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 방 생성
  const createRoom = useCallback(async (
    roomName: string,
    hostNickname: string,
    maxCapacity: number = 6
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const sessionId = getCurrentUserId() || `session_${Date.now()}`;
      
      const request: CreateRoomRequest = {
        roomName: roomName.trim(),
        hostNickname: hostNickname.trim(),
        hostSessionId: sessionId,
        maxCapacity,
        roomSettings: {}
      };

      const response = await apiService.createRoom(request);
      
      if (response.success && response.data) {
        // 생성된 방 정보를 바탕으로 방 입장
        const joinSuccess = await joinRoom(response.data.roomCode, hostNickname);
        return joinSuccess;
      } else {
        setError(response.error || '방 생성에 실패했습니다.');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '방 생성 중 오류가 발생했습니다.';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // 방 참여
  const joinRoom = useCallback(async (
    roomCode: string,
    nickname: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const sessionId = getCurrentUserId() || `session_${Date.now()}`;
      
      const request: JoinRoomRequest = {
        roomCode: roomCode.trim().toUpperCase(),
        nickname: nickname.trim(),
        sessionId
      };

      const response = await apiService.joinRoom(request);
      
      if (response.success && response.data) {
        // 방 참여 성공 후 방 정보 조회
        await refreshRoomState(roomCode);
        return true;
      } else {
        setError(response.error || '방 참여에 실패했습니다.');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '방 참여 중 오류가 발생했습니다.';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // 방 나가기
  const leaveRoom = useCallback(async (): Promise<boolean> => {
    if (!currentPlayer) return false;

    setLoading(true);
    setError(null);

    try {
      const response = await apiService.leaveRoom(currentPlayer.guestUserId);
      
      if (response.success) {
        setCurrentRoom(null);
        setCurrentPlayer(null);
        return true;
      } else {
        setError(response.error || '방 나가기에 실패했습니다.');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '방 나가기 중 오류가 발생했습니다.';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentPlayer]);

  // 방 상태 새로고침
  const refreshRoomState = useCallback(async (roomCode?: string): Promise<void> => {
    const targetRoomCode = roomCode || currentRoom?.roomCode;
    if (!targetRoomCode) return;

    try {
      const response = await apiService.getRoomInfo(targetRoomCode);
      
      if (response.success && response.data) {
        const roomData = response.data;
        const userId = getCurrentUserId();
        
        // Room 데이터 변환
        const room: Room = {
          id: roomData.id,
          roomCode: roomData.roomCode,
          roomName: roomData.roomName,
          maxCapacity: roomData.maxCapacity,
          currentCapacity: roomData.currentCapacity,
          roomState: roomData.roomState,
          hostGuestId: roomData.hostGuestId,
          expiresAt: roomData.expiresAt,
          createdAt: roomData.createdAt,
          participants: roomData.participants.map(p => ({
            id: p.guestUserId,
            guestUserId: p.guestUserId,
            nickname: p.nickname,
            role: p.role,
            joinedAt: p.joinedAt,
            characterInfo: p.characterInfo,
            preparationStatus: p.preparationStatus,
            isHost: roomData.hostGuestId === p.guestUserId
          })),
          hostGuest: roomData.hostGuest
        };

        setCurrentRoom(room);

        // 현재 플레이어 찾기
        const currentPlayer = room.participants.find(p => 
          p.guestUserId === userId || p.id === userId
        );
        
        if (currentPlayer) {
          setCurrentPlayer(currentPlayer);
        }

        console.log('✅ [useRoomService] Room state refreshed:', {
          roomCode: room.roomCode,
          participantCount: room.participants.length,
          currentPlayer: currentPlayer?.nickname
        });
      } else {
        setError(response.error || '방 정보를 가져올 수 없습니다.');
      }
    } catch (err) {
      console.error('❌ [useRoomService] Error refreshing room state:', err);
      const errorMessage = err instanceof Error ? err.message : '방 정보 새로고침 중 오류가 발생했습니다.';
      setError(errorMessage);
    }
  }, [currentRoom?.roomCode]);

  // 자동 새로고침 (30초마다)
  useEffect(() => {
    if (!currentRoom) return;

    const interval = setInterval(() => {
      refreshRoomState();
    }, 30000);

    return () => clearInterval(interval);
  }, [currentRoom, refreshRoomState]);

  // 헬퍼 함수들
  const isHost = currentPlayer?.isHost || false;
  
  const isCurrentUser = useCallback((player: Player): boolean => {
    const userId = getCurrentUserId();
    return player.guestUserId === userId || player.id === userId;
  }, []);

  return {
    // 상태
    currentRoom,
    currentPlayer,
    loading,
    error,

    // 액션
    createRoom,
    joinRoom,
    leaveRoom,
    refreshRoomState,

    // 헬퍼
    isHost,
    isCurrentUser,
    clearError
  };
};