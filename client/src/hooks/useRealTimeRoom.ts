import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { getCurrentUserId } from "../utils/roomManager";
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

  // 참여자 업데이트 콜백 설정
  const setOnParticipantsUpdate = useCallback((callback: (participants: Player[]) => void) => {
    onParticipantsUpdate.current = callback;
  }, []);

  useEffect(() => {
    if (!roomCode || !currentPlayer || !enabled) {
      console.log('🔌 실시간 방 기능 비활성화:', { roomCode: !!roomCode, currentPlayer: !!currentPlayer, enabled });
      return;
    }

    // 이미 연결된 Socket이 있으면 재사용 (방 코드가 같은 경우)
    if (socketRef.current && socketRef.current.connected) {
      console.log('♻️ 기존 Socket 연결 재사용:', socketRef.current.id);
      
      // 방 입장만 다시 시도
      const userId = getCurrentUserId();
      if (userId && roomCode && currentPlayer?.nickname) {
        // 닉네임 고유화
        const uniqueNickname = `${currentPlayer.nickname}_${roomCode}_${userId.slice(-8)}`;
        console.log('📡 기존 연결로 방 재입장:', { roomCode, guestUserId: userId, originalNickname: currentPlayer.nickname, uniqueNickname });
        socketRef.current.emit('join-room', {
          roomCode: roomCode,
          guestUserId: userId,
          nickname: uniqueNickname,
          isReconnect: true  // 이미 입장한 상태임을 표시
        });
      }
      return;
    }

    console.log('🚀 새로운 실시간 방 Socket 연결 시작:', { roomCode, nickname: currentPlayer.nickname });

    let isMounted = true;
    
    // Socket.IO 연결 옵션 - 더 안정적인 설정
    const socket = io('http://3.37.34.211:8889', {
      timeout: 15000,           // 연결 타임아웃 15초로 증가
      reconnection: true,       // 자동 재연결 활성화
      reconnectionAttempts: 3,  // 재시도 횟수 줄임 (3번)
      reconnectionDelay: 3000,  // 재연결 간격 3초로 증가
      transports: ['websocket', 'polling'], // 전송 방식
      forceNew: true,           // 새 연결 강제
      autoConnect: true
    });
    
    console.log('🔗 Socket.IO 연결 시도 중...', {
      url: 'http://3.37.34.211:8889',
      roomCode,
      userId: getCurrentUserId()
    });
    
    socketRef.current = socket;

    // 모든 이벤트 수신 로깅 (디버깅용)
    socket.onAny((eventName, ...args) => {
      console.log(`🔔 Socket 이벤트 수신: ${eventName}`, args);
    });

    // 연결 이벤트
    socket.on('connect', () => {
      if (!isMounted) return;
      console.log('✅ 실시간 방 Socket.IO 연결됨:', socket.id);
      
      setState(prev => ({ 
        ...prev, 
        isConnected: true, 
        connectionError: null 
      }));

      // 방 입장 - 즉시 join-room emit
      const userId = getCurrentUserId();
      if (userId && roomCode && currentPlayer?.nickname) {
        // 닉네임 고유화 - 전역 중복 방지를 위해 roomCode와 userId 조합
        const uniqueNickname = `${currentPlayer.nickname}_${roomCode}_${userId.slice(-8)}`;
        
        console.log('📡 방 실시간 이벤트 구독 (즉시 emit):', { 
          roomCode, 
          guestUserId: userId, 
          originalNickname: currentPlayer.nickname,
          uniqueNickname: uniqueNickname,
          isHost: currentPlayer.isHost,
          role: currentPlayer.role
        });
        // 성공 플래그 추가
        let joinSucceeded = false;
        
        // joined-room-success 이벤트 감지
        const handleJoinSuccess = () => {
          joinSucceeded = true;
          console.log('✅ 방 입장 성공 확인됨');
        };
        socket.once('joined-room-success', handleJoinSuccess);
        
        // 대안: 실시간 이벤트 구독만 요청 (방 입장은 REST API로 이미 완료)
        socket.emit('subscribe-room-events', {
          roomCode: roomCode,
          guestUserId: userId
        });
        
        // 만약 서버가 subscribe-room-events를 지원하지 않으면 기존 방식 시도
        setTimeout(() => {
          if (socket.connected && !joinSucceeded) {
            console.log('📡 대안: 기존 join-room 방식으로 재시도 (subscribe-room-events 실패)');
            socket.emit('join-room', {
              roomCode: roomCode,
              guestUserId: userId,
              nickname: uniqueNickname,  // 고유 닉네임 사용
              isReconnect: true  // 이미 REST API로 입장한 상태임을 표시
            });
          } else if (joinSucceeded) {
            console.log('✅ 이미 입장 성공했으므로 재시도 생략');
          }
        }, 2000);
      } else {
        console.warn('⚠️ join-room emit 실패 - 필수 정보 누락:', {
          userId: !!userId,
          roomCode: !!roomCode,
          nickname: !!currentPlayer?.nickname
        });
      }
    });

    // 연결 에러
    socket.on('connect_error', (error) => {
      if (!isMounted) return;
      console.error('❌ 실시간 방 연결 실패:', {
        error: error.message,
        type: error.type,
        description: error.description,
        context: error.context,
        url: 'http://3.37.34.211:8889',
        timestamp: new Date().toISOString()
      });
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

    // 재연결 성공
    socket.on('reconnect', (attemptNumber) => {
      if (!isMounted) return;
      console.log('🎉 재연결 성공:', { attempt: attemptNumber, timestamp: new Date().toISOString() });
      setState(prev => ({ 
        ...prev, 
        isConnected: true, 
        connectionError: null 
      }));
    });

    // 재연결 실패
    socket.on('reconnect_failed', () => {
      if (!isMounted) return;
      console.error('💥 재연결 최종 실패:', { timestamp: new Date().toISOString() });
      setState(prev => ({ 
        ...prev, 
        isConnected: false, 
        connectionError: '서버에 연결할 수 없습니다. 재연결에 실패했습니다.' 
      }));
    });

    // room_status 이벤트 처리 - 서버 요구사항에 따른 방 상태 업데이트
    socket.on('room_status', (userList: Player[]) => {
      if (!isMounted) return;
      console.log('🎉 room_status 이벤트 수신!', {
        userListLength: userList?.length,
        userList: userList,
        currentRoomCode: roomCode,
        timestamp: new Date().toISOString()
      });
      
      // userList를 클라이언트 형식으로 변환
      const convertedParticipants = userList.map(p => ({
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

    // 방 입장 성공 (기존 이벤트 유지)
    socket.on('joined-room-success', (data: { roomCode: string; roomId: string; users: unknown[] }) => {
      if (!isMounted) return;
      console.log('🎉 방 입장 성공 (실시간):', data);
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
        participants: event.participants.length,
        rawParticipants: event.participants
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

      console.log('🔄 상태 업데이트 시작:', {
        convertedParticipants,
        hasCallback: !!onParticipantsUpdate.current
      });

      setState(prev => ({ 
        ...prev, 
        participants: convertedParticipants 
      }));

      // 외부 콜백 호출
      if (onParticipantsUpdate.current) {
        console.log('📞 외부 콜백 호출 중...');
        onParticipantsUpdate.current(convertedParticipants);
      } else {
        console.warn('⚠️ 외부 콜백이 설정되지 않음');
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
      console.log('🧹 실시간 방 기능 정리 시작');
      
      // 방 나가기 emit 후 연결 해제
      if (socket.connected && roomCode) {
        console.log('🚪 방 나가기 이벤트 emit');
        socket.emit('leave-room', { roomCode });
      }
      
      // Socket 연결 정리
      socket.disconnect();
      console.log('✅ Socket.IO 연결 해제 완료');
    };
  }, [roomCode, currentPlayer, enabled]);

  // 방 나가기
  const leaveRoom = useCallback(() => {
    if (socketRef.current && roomCode) {
      console.log('🚪 실시간 방 나가기:', { roomCode });
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