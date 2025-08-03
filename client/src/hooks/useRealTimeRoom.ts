import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type { Player, ParticipantUpdateEvent } from "../types/room";

interface RealTimeRoomHookProps {
  roomCode: string | null;
  currentPlayer: Player | null;
  enabled: boolean;
}

interface RealTimeRoomState {
  participants: Player[];
  isConnected: boolean;
  connectionError: string | null;
}

export const useRealTimeRoom = ({ roomCode, currentPlayer, enabled }: RealTimeRoomHookProps) => {
  const [state, setState] = useState<RealTimeRoomState>({
    participants: [],
    isConnected: false,
    connectionError: null
  });
  
  const socketRef = useRef<Socket | null>(null);
  const onParticipantsUpdate = useRef<((participants: Player[]) => void) | null>(null);
  const isConnectingRef = useRef(false);
  const hasJoinedRoomRef = useRef(false);

  // 참여자 업데이트 콜백 설정
  const setOnParticipantsUpdate = useCallback((callback: (participants: Player[]) => void) => {
    onParticipantsUpdate.current = callback;
  }, []);

  useEffect(() => {
    if (!roomCode || !currentPlayer || !enabled) {
      console.log('🔌 실시간 방 기능 비활성화:', { roomCode: !!roomCode, currentPlayer: !!currentPlayer, enabled });
      return;
    }

    // 이미 연결 중이거나 연결된 상태라면 중복 실행 방지
    if (isConnectingRef.current || socketRef.current?.connected) {
      console.log('🚫 이미 연결 중이거나 연결된 상태 - 중복 실행 방지');
      return;
    }

    console.log('🚀 실시간 방 기능 초기화 시작:', { 
      roomCode, 
      nickname: currentPlayer.nickname,
      guestUserId: currentPlayer.guestUserId || currentPlayer.id,
      role: currentPlayer.role,
      isHost: currentPlayer.isHost
    });

    let isMounted = true;
    isConnectingRef.current = true;
    hasJoinedRoomRef.current = false;
    
    // 기존 소켓 연결이 있다면 정리
    if (socketRef.current) {
      console.log('🧹 기존 소켓 연결 정리 중...');
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    // Socket.IO 연결 옵션 추가
    const socket = io('http://3.37.34.211:8889', {
      timeout: 10000,           // 연결 타임아웃 10초
      reconnection: true,       // 자동 재연결 활성화
      reconnectionAttempts: 5,  // 최대 5번 재시도
      reconnectionDelay: 2000,  // 재연결 간격 2초
      transports: ['websocket', 'polling'], // 전송 방식
      forceNew: true // 새로운 연결 강제 생성
    });
    
    console.log('🔗 Socket.IO 연결 시도 중...', {
      url: 'http://3.37.34.211:8889',
      roomCode,
      guestUserId: currentPlayer.guestUserId || currentPlayer.id,
      nickname: currentPlayer.nickname
    });
    
    socketRef.current = socket;

    // 연결 이벤트 - 연결 후 즉시 방 입장
    socket.on('connect', () => {
      if (!isMounted) return;
      console.log('✅ 실시간 방 Socket.IO 연결됨:', socket.id);
      isConnectingRef.current = false;
      
      setState(prev => ({ 
        ...prev, 
        isConnected: true, 
        connectionError: null 
      }));

      // 이미 방에 입장했다면 중복 입장 방지
      if (hasJoinedRoomRef.current) {
        console.log('🚫 이미 방에 입장됨 - 중복 입장 방지');
        return;
      }

      // 방장인 경우 이미 서버에서 방에 추가되어 있으므로 join-room 시도하지 않음
      const isHost = currentPlayer.role === 'host' || currentPlayer.isHost || currentPlayer.nickname === '방장';
      console.log('🔍 방장 체크 상세 정보:', {
        role: currentPlayer.role,
        isHost: currentPlayer.isHost,
        nickname: currentPlayer.nickname,
        guestUserId: currentPlayer.guestUserId || currentPlayer.id,
        roomCode: roomCode,
        isHostResult: isHost
      });
      
      if (isHost) {
        console.log('👑 방장이므로 join-room 시도하지 않음 (이미 서버에서 방에 추가됨):', {
          role: currentPlayer.role,
          isHost: currentPlayer.isHost,
          nickname: currentPlayer.nickname
        });
        hasJoinedRoomRef.current = true;
        return;
      }

      // 연결 후 즉시 방 입장 (실시간 이벤트용) - 게스트만
      const guestUserId = currentPlayer.guestUserId || currentPlayer.id;
      if (guestUserId && roomCode) {
        console.log('📡 방 실시간 이벤트 구독 (연결 후 즉시):', { 
          roomCode, 
          guestUserId, 
          nickname: currentPlayer.nickname 
        });
        hasJoinedRoomRef.current = true;
        socket.emit('join-room', {
          roomCode: roomCode,
          guestUserId: guestUserId,
          nickname: currentPlayer.nickname
        });
      }
    });

    // 연결 에러
    socket.on('connect_error', (error) => {
      if (!isMounted) return;
      console.error('❌ 실시간 방 연결 실패:', {
        error: error.message,
        url: 'http://3.37.34.211:8889',
        timestamp: new Date().toISOString()
      });
      isConnectingRef.current = false;
      hasJoinedRoomRef.current = false;
      setState(prev => ({ 
        ...prev, 
        isConnected: false, 
        connectionError: `연결 실패: ${error.message || '서버 접근 불가'}` 
      }));
    });

    // 연결 해제
    socket.on('disconnect', (reason) => {
      if (!isMounted) return;
      console.log('🔌 실시간 방 연결 해제:', { reason, timestamp: new Date().toISOString() });
      isConnectingRef.current = false;
      hasJoinedRoomRef.current = false;
      setState(prev => ({ 
        ...prev, 
        isConnected: false 
      }));
    });

    // 재연결 시도
    socket.on('reconnect_attempt', (attemptNumber) => {
      if (!isMounted) return;
      console.log('🔄 재연결 시도:', { attempt: attemptNumber, timestamp: new Date().toISOString() });
    });

    // 재연결 성공 - 재연결 후에도 즉시 방 입장
    socket.on('reconnect', (attemptNumber) => {
      if (!isMounted) return;
      console.log('🎉 재연결 성공:', { attempt: attemptNumber, timestamp: new Date().toISOString() });
      setState(prev => ({ 
        ...prev, 
        isConnected: true, 
        connectionError: null 
      }));

      // 재연결 후에도 즉시 방 입장
      const guestUserId = currentPlayer.guestUserId || currentPlayer.id;
      if (guestUserId && roomCode && !hasJoinedRoomRef.current) {
        // 방장인 경우 이미 서버에서 방에 추가되어 있으므로 join-room 시도하지 않음
        const isHost = currentPlayer.role === 'host' || currentPlayer.isHost || currentPlayer.nickname === '방장';
        if (isHost) {
          console.log('👑 재연결 후 방장이므로 join-room 시도하지 않음 (이미 서버에서 방에 추가됨)');
          hasJoinedRoomRef.current = true;
          return;
        }

        console.log('📡 재연결 후 방 재입장:', { 
          roomCode, 
          guestUserId, 
          nickname: currentPlayer.nickname 
        });
        hasJoinedRoomRef.current = true;
        socket.emit('join-room', {
          roomCode: roomCode,
          guestUserId: guestUserId,
          nickname: currentPlayer.nickname
        });
      }
    });

    // 재연결 실패
    socket.on('reconnect_failed', () => {
      if (!isMounted) return;
      console.error('💥 재연결 최종 실패:', { timestamp: new Date().toISOString() });
      isConnectingRef.current = false;
      hasJoinedRoomRef.current = false;
      setState(prev => ({ 
        ...prev, 
        isConnected: false, 
        connectionError: '서버에 연결할 수 없습니다. 재연결에 실패했습니다.' 
      }));
    });

    // 방 입장 성공
    socket.on('joined-room-success', (data: { roomCode: string; roomId: string; users: unknown[] }) => {
      if (!isMounted) return;
      console.log('🎉 방 입장 성공 (실시간):', data);
      hasJoinedRoomRef.current = true;
    });

    // 방 입장 실패
    socket.on('join-room-error', (error: { message: string }) => {
      if (!isMounted) return;
      console.error('❌ 방 입장 실패 (실시간):', error);
      console.log('🔍 방 입장 실패 시 현재 플레이어 정보:', {
        role: currentPlayer.role,
        isHost: currentPlayer.isHost,
        nickname: currentPlayer.nickname,
        guestUserId: currentPlayer.guestUserId || currentPlayer.id,
        roomCode: roomCode
      });
      hasJoinedRoomRef.current = false;
      
      // 닉네임 중복 오류인 경우 재시도하지 않음
      if (error.message.includes('이미 사용 중인 닉네임입니다')) {
        console.log('🚫 닉네임 중복으로 인한 입장 실패 - 재시도하지 않음');
        setState(prev => ({ 
          ...prev, 
          connectionError: `방 입장 실패: ${error.message}` 
        }));
        return;
      }
      
      // 방장인 경우 재시도하지 않음 (이미 서버에서 방에 추가됨)
      const isHost = currentPlayer.role === 'host' || currentPlayer.isHost || currentPlayer.nickname === '방장';
      if (isHost) {
        console.log('👑 방장이므로 입장 실패 시 재시도하지 않음');
        hasJoinedRoomRef.current = true;
        return;
      }
      
      // 다른 오류인 경우 잠시 후 재시도
      console.log('🔄 방 입장 실패 - 3초 후 재시도');
      setTimeout(() => {
        if (isMounted && socket.connected && !hasJoinedRoomRef.current) {
          const guestUserId = currentPlayer.guestUserId || currentPlayer.id;
          if (guestUserId && roomCode) {
            console.log('🔄 방 입장 재시도:', { roomCode, guestUserId, nickname: currentPlayer.nickname });
            hasJoinedRoomRef.current = true;
            socket.emit('join-room', {
              roomCode: roomCode,
              guestUserId: guestUserId,
              nickname: currentPlayer.nickname
            });
          }
        }
      }, 3000);
    });

    // 참여자 업데이트 이벤트
    socket.on('participant-update', (event: ParticipantUpdateEvent) => {
      if (!isMounted) return;
      
      // 방 코드 검증 - 현재 방의 이벤트인지 확인
      if (event.roomCode && event.roomCode !== roomCode) {
        console.log('🚫 다른 방의 참여자 업데이트 무시:', { 
          eventRoomCode: event.roomCode, 
          currentRoomCode: roomCode 
        });
        return;
      }
      
      console.log('👥 참여자 업데이트 수신 (방 검증됨):', { 
        roomCode: event.roomCode || 'unknown',
        currentRoomCode: roomCode,
        participants: event.participants.length 
      });
      
      // 서버에서 받은 participants를 클라이언트 형식으로 변환
      const convertedParticipants = event.participants.map(p => ({
        ...p,
        guestUserId: p.guestUserId || p.id,
        preparationStatus: p.preparationStatus || {
          characterSetup: false,
          screenSetup: false
        },
        isHost: p.role === 'host'
      }));

      setState(prev => ({ 
        ...prev, 
        participants: convertedParticipants 
      }));

      // 외부 콜백 호출
      if (onParticipantsUpdate.current) {
        onParticipantsUpdate.current(convertedParticipants);
      }
    });

    // 사용자 입장 이벤트
    socket.on('user-joined', (data: { socketId: string; guestUserId: string; nickname: string; joinedAt: string; roomCode?: string }) => {
      if (!isMounted) return;
      
      // 방 코드 검증
      if (data.roomCode && data.roomCode !== roomCode) {
        console.log('🚫 다른 방의 사용자 입장 무시:', { 
          eventRoomCode: data.roomCode, 
          currentRoomCode: roomCode 
        });
        return;
      }
      
      console.log('👋 새 사용자 입장 (방 검증됨):', data);
    });

    // 사용자 퇴장 이벤트
    socket.on('user-left', (data: { socketId: string; guestUserId: string; nickname: string; roomCode?: string }) => {
      if (!isMounted) return;
      
      // 방 코드 검증
      if (data.roomCode && data.roomCode !== roomCode) {
        console.log('🚫 다른 방의 사용자 퇴장 무시:', { 
          eventRoomCode: data.roomCode, 
          currentRoomCode: roomCode 
        });
        return;
      }
      
      console.log('👋 사용자 퇴장 (방 검증됨):', data);
    });

    // 방 사용자 목록 업데이트
    socket.on('room-users', (data: { roomCode?: string; users: unknown[] }) => {
      if (!isMounted) return;
      
      // 방 코드 검증
      if (data.roomCode && data.roomCode !== roomCode) {
        console.log('🚫 다른 방의 사용자 목록 무시:', { 
          eventRoomCode: data.roomCode, 
          currentRoomCode: roomCode 
        });
        return;
      }
      
      console.log('📋 방 사용자 목록 업데이트 (방 검증됨):', { 
        roomCode: data.roomCode || 'unknown',
        currentRoomCode: roomCode,
        userCount: data.users.length 
      });
    });

    // 에러 처리
    socket.on('error', (error: { message: string }) => {
      if (!isMounted) return;
      console.error('🚨 실시간 방 소켓 에러:', error);
      setState(prev => ({ 
        ...prev, 
        connectionError: error.message 
      }));
    });

    return () => {
      isMounted = false;
      isConnectingRef.current = false;
      hasJoinedRoomRef.current = false;
      console.log('🧹 실시간 방 기능 정리 - 소켓 연결 해제');
      if (socket) {
        socket.disconnect();
      }
    };
  }, [roomCode, currentPlayer?.guestUserId, currentPlayer?.nickname, enabled]);

  // 방 나가기
  const leaveRoom = useCallback(() => {
    if (socketRef.current && roomCode) {
      console.log('🚪 실시간 방 나가기:', { roomCode });
      hasJoinedRoomRef.current = false;
      socketRef.current.emit('leave-room', {
        roomCode: roomCode
      });
    }
  }, [roomCode]);

  return {
    ...state,
    setOnParticipantsUpdate,
    leaveRoom
  };
};