import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { WebRTCManager } from "../utils/webRTCManager";
import { 
  getCurrentRoom,
  getCurrentUserId,
  leaveRoom,
  getRoomInfo,
} from "../utils/roomManager";
import type { Room, Player } from "../types/room";

/**
 * 통합 방 상태 관리 훅
 * 모든 플레이어 정보를 단일 상태로 관리하고 실시간 업데이트
 */
export const useUnifiedRoom = () => {
  const navigate = useNavigate();
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [participants, setParticipants] = useState<Player[]>([]); // 🎯 통합 참여자 상태
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // WebRTC Manager 참조
  const [webRTCManager, setWebRTCManager] = useState<WebRTCManager | null>(null);

  /**
   * 서버에서 받은 참여자 데이터를 통합 Player 형태로 변환
   */
  const transformServerPlayerData = useCallback((serverPlayer: any): Player => {
    return {
      // 🎯 guestUserId 중심 정보 (통합 정책)
      id: serverPlayer.guestUserId, // guestUserId를 기본 id로 통일
      guestUserId: serverPlayer.guestUserId,
      nickname: serverPlayer.nickname || serverPlayer.guestUser?.nickname,
      role: serverPlayer.role || (serverPlayer.isHost ? 'host' : 'participant'),
      joinedAt: serverPlayer.joinedAt || new Date().toISOString(),
      isHost: serverPlayer.isHost || serverPlayer.role === 'host',
      
      // Socket.IO 연결 정보
      socketId: serverPlayer.socketId || null,
      isConnected: !!serverPlayer.socketId,
      
      // WebRTC 정보 (초기값)
      hasWebRTCConnection: false,
      remoteStream: null,
      
      // 캐릭터 정보
      characterInfo: serverPlayer.characterInfo || null,
      
      // 준비 상태
      preparationStatus: {
        characterSetup: serverPlayer.preparationStatus?.characterSetup || false,
        screenSetup: serverPlayer.preparationStatus?.screenSetup || false,
        isReady: serverPlayer.preparationStatus?.isReady || false
      },
      
      // UI/오디오 상태 (초기값)
      isMuted: false,
      hasAudio: false
    };
  }, []);

  /**
   * 특정 참여자의 정보를 업데이트 (부분 업데이트)
   */
  const updateParticipant = useCallback((guestUserId: string, updates: Partial<Player>) => {
    setParticipants(prev => prev.map(participant => {
      if (participant.guestUserId === guestUserId) {
        const updated = { ...participant, ...updates };
        // 참여자 업데이트 로그 제거 (준비 상태와 무관)
        return updated;
      }
      return participant;
    }));
  }, []);

  /**
   * WebRTC 스트림 업데이트
   */
  const updateParticipantStream = useCallback((guestUserId: string, stream: MediaStream | null) => {
    updateParticipant(guestUserId, {
      remoteStream: stream,
      hasWebRTCConnection: !!stream,
      hasAudio: stream ? stream.getAudioTracks().length > 0 : false
    });
  }, [updateParticipant]);

  /**
   * 참여자 연결 상태 업데이트
   */
  const updateParticipantConnection = useCallback((guestUserId: string, socketId: string | null, isConnected: boolean) => {
    updateParticipant(guestUserId, {
      socketId,
      isConnected
    });
  }, [updateParticipant]);

  /**
   * 서버에서 방 정보 새로고침 및 참여자 동기화
   */
  const refreshRoomState = useCallback(async () => {
    const room = getCurrentRoom();
    const userId = getCurrentUserId();

    if (!room || !userId) {
      console.warn('⚠️ [UnifiedRoom] 방 정보 또는 사용자 ID 없음');
      return;
    }

    try {
      const result = await getRoomInfo(room.roomCode);
      if (result.success && result.room) {
        console.log('📡 [UnifiedRoom] 서버에서 방 정보 새로고침:', {
          roomCode: room.roomCode,
          participantCount: result.room.participants?.length || 0
        });

        setCurrentRoom(result.room);

        // 🎯 서버 응답을 통합 참여자 상태로 변환
        if (result.room.participants) {
          const unifiedParticipants = result.room.participants.map(transformServerPlayerData);
          
          // 기존 WebRTC 연결 정보 보존하면서 업데이트
          setParticipants(prev => {
            return unifiedParticipants.map(newParticipant => {
              const existing = prev.find(p => p.guestUserId === newParticipant.guestUserId);
              if (existing) {
                // 기존 WebRTC/스트림 정보는 유지하면서 서버 데이터로 업데이트
                return {
                  ...newParticipant,
                  socketId: newParticipant.socketId || existing.socketId, // 서버 socketId 우선
                  isConnected: !!newParticipant.socketId || existing.isConnected,
                  hasWebRTCConnection: existing.hasWebRTCConnection,
                  remoteStream: existing.remoteStream,
                  hasAudio: existing.hasAudio,
                  isMuted: existing.isMuted
                };
              }
              return newParticipant;
            });
          });
        }

        // 🎯 guestUserId를 주 식별자로 사용 (통합 정책)
        const serverPlayer = result.room.participants?.find(p => p.guestUserId === userId);
        if (serverPlayer) {
          const unifiedCurrentPlayer = transformServerPlayerData(serverPlayer);
          setCurrentPlayer(unifiedCurrentPlayer);
        }

      } else {
        setError(result.error || '방 정보를 불러올 수 없습니다.');
      }
    } catch (error) {
      console.error('❌ [UnifiedRoom] 방 정보 새로고침 실패:', error);
      setError('방 정보 새로고침 중 오류가 발생했습니다.');
    }
  }, [transformServerPlayerData]);

  /**
   * WebRTC Manager 초기화 및 이벤트 바인딩
   */
  const initializeWebRTC = useCallback(async (roomCode: string, nickname: string) => {
    if (webRTCManager) {
      console.log('✅ [UnifiedRoom] WebRTC Manager 이미 존재, 재사용');
      return webRTCManager;
    }

    try {
      console.log('🚀 [UnifiedRoom] WebRTC Manager 초기화:', { roomCode, nickname });
      const manager = new WebRTCManager(roomCode, nickname);
      
      // 🎯 WebRTC 이벤트를 통합 상태와 연결
      manager.onRemoteStream = (guestUserId: string, stream: MediaStream) => {
        console.log('🎵 [UnifiedRoom] Remote stream 수신:', { guestUserId, streamId: stream.id });
        updateParticipantStream(guestUserId, stream);
      };

      manager.onUserLeft = (guestUserId: string) => {
        console.log('👋 [UnifiedRoom] 사용자 퇴장:', { guestUserId });
        updateParticipantStream(guestUserId, null);
      };

      manager.onRealtimeParticipantsUpdate = (updatedParticipants: any[]) => {
        console.log('👥 [UnifiedRoom] 실시간 참여자 업데이트:', updatedParticipants.length);
        
        // 🚀 실시간 로컬 상태 업데이트 (서버 요청 없이)
        if (updatedParticipants && updatedParticipants.length > 0) {
          const transformedParticipants = updatedParticipants.map(transformServerPlayerData);
          setParticipants(transformedParticipants);
          
          console.log('🔄 [UnifiedRoom] participants 로컬 상태 즉시 업데이트:', {
            count: transformedParticipants.length,
            participantsPreparationStatus: transformedParticipants.map(p => ({
              guestUserId: p.guestUserId,
              nickname: p.nickname,
              preparationStatus: p.preparationStatus
            }))
          });
        } else {
          // fallback: 서버에서 다시 가져오기
          refreshRoomState();
        }
      };

      // 로컬 스트림 시작
      const localStream = await manager.start();
      if (localStream) {
        console.log('✅ [UnifiedRoom] 로컬 스트림 시작 완료');
      }

      setWebRTCManager(manager);
      return manager;

    } catch (error) {
      console.error('❌ [UnifiedRoom] WebRTC Manager 초기화 실패:', error);
      throw error;
    }
  }, [webRTCManager, updateParticipantStream, refreshRoomState]);

  /**
   * 방 나가기
   */
  const handleLeaveRoom = useCallback(async () => {
    try {
      if (webRTCManager) {
        webRTCManager.close();
        setWebRTCManager(null);
      }
      
      await leaveRoom();
      navigate("/");
    } catch (error) {
      console.error('❌ [UnifiedRoom] 방 나가기 실패:', error);
      navigate("/");
    }
  }, [webRTCManager, navigate]);

  // 초기화 Effect
  useEffect(() => {
    const initializeRoom = async () => {
      const room = getCurrentRoom();
      const userId = getCurrentUserId();

      if (!room || !userId) {
        navigate("/");
        return;
      }

      console.log('🏠 [UnifiedRoom] 방 초기화 시작:', { roomCode: room.roomCode, userId });

      try {
        // 서버에서 초기 방 정보 로드
        await refreshRoomState();

        // 현재 플레이어 정보가 있으면 WebRTC Manager 초기화
        // 잠시 후에 currentPlayer가 설정되므로 별도 effect에서 처리
        
      } catch (error) {
        console.error('❌ [UnifiedRoom] 방 초기화 실패:', error);
        setError('방 초기화에 실패했습니다.');
      }
      
      setLoading(false);
    };

    initializeRoom();
  }, [navigate, refreshRoomState]);

  // WebRTC Manager 자동 초기화 (currentPlayer 설정 후)
  useEffect(() => {
    const autoInitWebRTC = async () => {
      if (!currentPlayer || webRTCManager) return;
      
      const room = getCurrentRoom();
      if (!room) return;

      try {
        console.log('🚀 [UnifiedRoom] 자동 WebRTC Manager 초기화:', {
          nickname: currentPlayer.nickname,
          roomCode: room.roomCode
        });
        
        await initializeWebRTC(room.roomCode, currentPlayer.nickname || 'Unknown');
      } catch (error) {
        console.error('❌ [UnifiedRoom] WebRTC 자동 초기화 실패:', error);
        setError('음성 채팅 초기화에 실패했습니다.');
      }
    };

    autoInitWebRTC();
  }, [currentPlayer, webRTCManager, initializeWebRTC]);

  return {
    // 기본 방/플레이어 정보
    currentRoom,
    currentPlayer,
    participants, // 🎯 통합 참여자 상태
    loading,
    error,

    // 상태 업데이트 함수들
    refreshRoomState,
    updateParticipant,
    updateParticipantStream,
    updateParticipantConnection,

    // WebRTC 관련
    webRTCManager,
    initializeWebRTC,

    // 액션
    handleLeaveRoom
  };
};