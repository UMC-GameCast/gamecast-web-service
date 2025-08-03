import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCurrentRoom,
  getCurrentUserId,
  leaveRoom,
  getRoomInfo,
} from "../utils/roomManager";
import type { Room, Player } from "../types/room";

export const useRoom = () => {
  const navigate = useNavigate();
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isInitializedRef = useRef(false);

  const refreshRoomState = async () => {
    console.log('🔄 방 상태 서버에서 새로고침');
    const room = getCurrentRoom();
    const userId = getCurrentUserId();

    if (room && userId) {
      try {
        const result = await getRoomInfo(room.roomCode);
        if (result.success && result.room) {
          console.log('✅ 방 상태 새로고침 성공:', result.room);
          setCurrentRoom(result.room);
          // 현재 플레이어 찾기 (guestUserId로 비교)
          const serverPlayer = result.room.participants?.find(p => p.guestUserId === userId || p.id === userId);
          if (serverPlayer) {
            // 서버 응답을 클라이언트 형식에 맞게 변환
            const playerInfo: Player = {
              ...serverPlayer,
              guestUserId: serverPlayer.guestUserId || serverPlayer.id,
              preparationStatus: serverPlayer.preparationStatus || {
                characterSetup: false,
                screenSetup: false
              },
              isHost: serverPlayer.role === 'host' || serverPlayer.nickname === '방장'
            };
            setCurrentPlayer(playerInfo);
          } else {
            console.log('⚠️ 서버에서 플레이어 정보 못찾음, 로컬 정보 생성');
            // 서버에서 플레이어를 찾지 못한 경우 로컬 정보 사용
            const fallbackPlayer: Player = {
              id: userId,
              guestUserId: userId,
              nickname: "사용자",
              role: room.hostGuestId === userId ? 'host' : 'guest',
              joinedAt: new Date().toISOString(),
              preparationStatus: {
                characterSetup: false,
                screenSetup: false
              },
              isHost: room.hostGuestId === userId
            };
            setCurrentPlayer(fallbackPlayer);
          }
        } else {
          console.error('❌ 방 상태 새로고침 실패:', result.error);
          setError(result.error || '방 정보를 불러올 수 없습니다.');
        }
      } catch (error) {
        console.error('방 정보 새로고침 실패:', error);
        setError('방 정보 새로고침 중 오류가 발생했습니다.');
      }
    }
  };

  useEffect(() => {
    // 이미 초기화되었다면 중복 실행 방지
    if (isInitializedRef.current) {
      console.log('🚫 useRoom 이미 초기화됨 - 중복 실행 방지');
      return;
    }

    const initializeRoom = async () => {
      console.log('🏠 useRoom 초기화 시작');
      isInitializedRef.current = true;
      
      const room = getCurrentRoom();
      const userId = getCurrentUserId();
      
      console.log('📋 현재 저장된 방 정보:', room);
      console.log('👤 현재 사용자 ID:', userId);

      if (!room || !userId) {
        console.log('❌ 방 정보 또는 사용자 ID가 없음, 메인으로 이동');
        navigate("/");
        return;
      }

      setCurrentRoom(room);
      
      // 서버에서 최신 방 정보 조회
      console.log('🔄 서버에서 방 정보 조회 중...');
      try {
        const result = await getRoomInfo(room.roomCode);
        if (result.success && result.room) {
          console.log('✅ 서버에서 방 정보 조회 성공:', result.room);
          setCurrentRoom(result.room);
          
          // 서버 응답에서 플레이어 정보 찾기 (guestUserId 또는 id로 비교)
          const serverPlayer = result.room.participants?.find(p => p.guestUserId === userId || p.id === userId);
          if (serverPlayer) {
            console.log('👤 서버에서 플레이어 정보 찾음:', serverPlayer);
            console.log('🔍 서버 플레이어 상세 정보:', {
              id: serverPlayer.id,
              guestUserId: serverPlayer.guestUserId,
              nickname: serverPlayer.nickname,
              role: serverPlayer.role,
              isHost: serverPlayer.role === 'host' || serverPlayer.nickname === '방장'
            });
            // 서버 응답을 클라이언트 형식에 맞게 변환
            const playerInfo: Player = {
              ...serverPlayer,
              guestUserId: serverPlayer.guestUserId || serverPlayer.id,
              preparationStatus: serverPlayer.preparationStatus || {
                characterSetup: false,
                screenSetup: false
              },
              isHost: serverPlayer.role === 'host' || serverPlayer.nickname === '방장'
            };
            console.log('✅ 변환된 플레이어 정보:', playerInfo);
            setCurrentPlayer(playerInfo);
          } else {
            console.log('⚠️ 서버에서 플레이어 정보 못찾음, 로컬 정보 생성');
            // 서버에서 플레이어를 찾지 못한 경우 로컬 정보 사용
            const fallbackPlayer: Player = {
              id: userId,
              guestUserId: userId,
              nickname: "사용자",
              role: room.hostGuestId === userId ? 'host' : 'guest',
              joinedAt: new Date().toISOString(),
              preparationStatus: {
                characterSetup: false,
                screenSetup: false
              },
              isHost: room.hostGuestId === userId
            };
            setCurrentPlayer(fallbackPlayer);
          }
        } else {
          console.log('⚠️ 서버 조회 실패, 로컬 정보 사용:', result.error);
          // 서버 조회 실패 시 로컬 정보 사용
          const fallbackPlayer: Player = {
            id: userId,
            guestUserId: userId,
            nickname: "사용자",
            role: room.hostGuestId === userId ? 'host' : 'guest',
            joinedAt: new Date().toISOString(),
            preparationStatus: {
              characterSetup: false,
              screenSetup: false
            },
            isHost: room.hostGuestId === userId
          };
          setCurrentPlayer(fallbackPlayer);
        }
      } catch (error) {
        console.error('🚨 서버 조회 중 오류, 로컬 정보 사용:', error);
        // 서버 조회 실패 시 로컬 정보 사용
        const fallbackPlayer: Player = {
          id: userId,
          guestUserId: userId,
          nickname: "사용자",
          role: room.hostGuestId === userId ? 'host' : 'guest',
          joinedAt: new Date().toISOString(),
          preparationStatus: {
            characterSetup: false,
            screenSetup: false
          },
          isHost: room.hostGuestId === userId
        };
        setCurrentPlayer(fallbackPlayer);
      }
      
      console.log('🏁 useRoom 초기화 완료');
      setLoading(false);
    };

    initializeRoom();
  }, []); // 빈 의존성 배열로 한 번만 실행

  const handleLeaveRoom = async (realtimeLeaveCallback?: () => void) => {
    try {
      // 실시간 연결 정리 (있는 경우)
      if (realtimeLeaveCallback) {
        realtimeLeaveCallback();
      }
      
      await leaveRoom();
      navigate("/");
    } catch (error) {
      console.error('방 나가기 실패:', error);
      // 에러가 발생해도 메인 페이지로 이동
      navigate("/");
    }
  };

  return { 
    currentRoom, 
    currentPlayer, 
    loading, 
    error, 
    refreshRoomState, 
    handleLeaveRoom 
  };
}; 