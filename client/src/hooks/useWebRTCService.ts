// WebRTC 서비스 훅 - 음성 채팅 및 실시간 통신 담당

import { useState, useEffect, useCallback, useRef } from 'react';
import { webSocketService } from '../services/websocket';
import { webRTCService } from '../services/webrtc';
import type { VoiceChatState, PeerConnectionState } from '../types/webrtc';

interface UseWebRTCServiceReturn {
  // 연결 상태
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  
  // 음성 스트림
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  
  // 피어 연결
  connectedPeersCount: number;
  peerStates: Map<string, PeerConnectionState>;
  
  // 오디오 제어
  isLocalMuted: boolean;
  toggleLocalAudio: () => boolean;
  muteLocalAudio: () => boolean;
  unmuteLocalAudio: () => boolean;
  
  // 연결 관리
  connect: () => Promise<boolean>;
  disconnect: () => void;
  joinRoom: (roomCode: string, guestUserId: string, nickname: string) => Promise<boolean>;
  leaveRoom: (roomCode?: string) => void;
  
  // 콜백 설정
  onUserJoined: (callback: (data: any) => void) => void;
  onUserLeft: (callback: (data: any) => void) => void;
  onParticipantUpdate: (callback: (data: any) => void) => void;
  
  // 디버깅
  getDiagnostics: () => any;
}

export const useWebRTCService = (): UseWebRTCServiceReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [peerStates, setPeerStates] = useState<Map<string, PeerConnectionState>>(new Map());
  const [isLocalMuted, setIsLocalMuted] = useState(false);

  const currentRoomRef = useRef<string | null>(null);
  const currentUserRef = useRef<{ guestUserId: string; nickname: string } | null>(null);
  const callbacksRef = useRef<{
    onUserJoined?: (data: any) => void;
    onUserLeft?: (data: any) => void;
    onParticipantUpdate?: (data: any) => void;
  }>({});

  // WebSocket 연결
  const connect = useCallback(async (): Promise<boolean> => {
    if (isConnected || isConnecting) return isConnected;

    setIsConnecting(true);
    setConnectionError(null);

    try {
      console.log('🔌 [useWebRTCService] Connecting to WebSocket...');
      await webSocketService.connect();
      setIsConnected(true);
      console.log('✅ [useWebRTCService] WebSocket connected');
      return true;
    } catch (error) {
      console.error('❌ [useWebRTCService] WebSocket connection failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'WebSocket 연결에 실패했습니다.';
      setConnectionError(errorMessage);
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [isConnected, isConnecting]);

  // WebSocket 연결 해제
  const disconnect = useCallback(() => {
    console.log('🔌 [useWebRTCService] Disconnecting...');
    
    if (currentRoomRef.current) {
      webSocketService.leaveRoom(currentRoomRef.current);
    }
    
    webSocketService.disconnect();
    webRTCService.cleanup();
    
    setIsConnected(false);
    setLocalStream(null);
    setRemoteStreams(new Map());
    setPeerStates(new Map());
    setConnectionError(null);
    
    currentRoomRef.current = null;
    currentUserRef.current = null;
  }, []);

  // 방 참여
  const joinRoom = useCallback(async (
    roomCode: string,
    guestUserId: string,
    nickname: string
  ): Promise<boolean> => {
    if (!isConnected) {
      const connected = await connect();
      if (!connected) return false;
    }

    try {
      console.log('🚪 [useWebRTCService] Joining room:', { roomCode, guestUserId, nickname });
      
      // 로컬 스트림 초기화
      try {
        const stream = await webRTCService.initializeLocalStream();
        setLocalStream(stream);
        console.log('🎤 [useWebRTCService] Local stream initialized');
      } catch (streamError) {
        console.warn('⚠️ [useWebRTCService] Local stream initialization failed:', streamError);
        setConnectionError(streamError instanceof Error ? streamError.message : '마이크 접근에 실패했습니다.');
        // 마이크 없이도 방에 참여 가능하도록 계속 진행
      }

      // WebSocket으로 방 참여
      webSocketService.joinRoom(roomCode, guestUserId, nickname);
      
      currentRoomRef.current = roomCode;
      currentUserRef.current = { guestUserId, nickname };
      
      return true;
    } catch (error) {
      console.error('❌ [useWebRTCService] Failed to join room:', error);
      const errorMessage = error instanceof Error ? error.message : '방 참여에 실패했습니다.';
      setConnectionError(errorMessage);
      return false;
    }
  }, [isConnected, connect]);

  // 방 나가기
  const leaveRoom = useCallback((roomCode?: string) => {
    const targetRoomCode = roomCode || currentRoomRef.current;
    if (targetRoomCode) {
      console.log('👋 [useWebRTCService] Leaving room:', targetRoomCode);
      webSocketService.leaveRoom(targetRoomCode);
      webRTCService.cleanup();
      
      setRemoteStreams(new Map());
      setPeerStates(new Map());
      
      currentRoomRef.current = null;
      currentUserRef.current = null;
    }
  }, []);

  // 오디오 제어 함수들
  const toggleLocalAudio = useCallback((): boolean => {
    const success = webRTCService.toggleLocalAudio();
    setIsLocalMuted(!isLocalMuted);
    return success;
  }, [isLocalMuted]);

  const muteLocalAudio = useCallback((): boolean => {
    const success = webRTCService.muteLocalAudio();
    if (success) setIsLocalMuted(true);
    return success;
  }, []);

  const unmuteLocalAudio = useCallback((): boolean => {
    const success = webRTCService.unmuteLocalAudio();
    if (success) setIsLocalMuted(false);
    return success;
  }, []);

  // 콜백 설정 함수들
  const onUserJoined = useCallback((callback: (data: any) => void) => {
    callbacksRef.current.onUserJoined = callback;
  }, []);

  const onUserLeft = useCallback((callback: (data: any) => void) => {
    callbacksRef.current.onUserLeft = callback;
  }, []);

  const onParticipantUpdate = useCallback((callback: (data: any) => void) => {
    callbacksRef.current.onParticipantUpdate = callback;
  }, []);

  // 진단 정보
  const getDiagnostics = useCallback(() => {
    return {
      webSocket: {
        connected: isConnected,
        connecting: isConnecting,
        socketId: webSocketService.socketId,
        error: connectionError
      },
      webRTC: webRTCService.getConnectionDiagnostics(),
      room: {
        current: currentRoomRef.current,
        user: currentUserRef.current
      },
      audio: {
        localStream: !!localStream,
        localStreamTracks: localStream?.getTracks().length || 0,
        remoteStreams: remoteStreams.size,
        isLocalMuted,
        connectedPeers: webRTCService.getConnectedPeersCount()
      }
    };
  }, [isConnected, isConnecting, connectionError, localStream, remoteStreams, isLocalMuted]);

  // WebRTC 서비스 콜백 설정
  useEffect(() => {
    // 원격 스트림 수신
    webRTCService.onRemoteStream = (socketId: string, stream: MediaStream) => {
      console.log('🎵 [useWebRTCService] Remote stream received:', socketId);
      setRemoteStreams(prev => {
        const newStreams = new Map(prev);
        newStreams.set(socketId, stream);
        return newStreams;
      });
    };

    // 피어 연결 상태 변경
    webRTCService.onPeerConnectionStateChanged = (states: Map<string, PeerConnectionState>) => {
      setPeerStates(new Map(states));
    };

    // 로컬 스트림 변경
    webRTCService.onLocalStreamChanged = (stream: MediaStream | null) => {
      setLocalStream(stream);
    };

    // 연결 오류
    webRTCService.onConnectionError = (socketId: string, error: string) => {
      console.error('❌ [useWebRTCService] WebRTC connection error:', { socketId, error });
      setConnectionError(error);
    };

    return () => {
      // 콜백 정리
      webRTCService.onRemoteStream = () => {};
      webRTCService.onPeerConnectionStateChanged = () => {};
      webRTCService.onLocalStreamChanged = () => {};
      webRTCService.onConnectionError = () => {};
    };
  }, []);

  // WebSocket 이벤트 리스너 설정
  useEffect(() => {
    if (!isConnected) return;

    // 사용자 참여 이벤트
    const handleUserJoined = (data: any) => {
      console.log('👋 [useWebRTCService] User joined:', data);
      callbacksRef.current.onUserJoined?.(data);
    };

    // 사용자 나가기 이벤트
    const handleUserLeft = (data: any) => {
      console.log('👋 [useWebRTCService] User left:', data);
      // 원격 스트림 정리
      setRemoteStreams(prev => {
        const newStreams = new Map(prev);
        newStreams.delete(data.socketId);
        return newStreams;
      });
      callbacksRef.current.onUserLeft?.(data);
    };

    // 참여자 업데이트 이벤트
    const handleParticipantUpdate = (data: any) => {
      console.log('👥 [useWebRTCService] Participant update:', data);
      callbacksRef.current.onParticipantUpdate?.(data);
    };

    // WebSocket 이벤트 리스너 등록
    webSocketService.on('user-joined', handleUserJoined);
    webSocketService.on('user-left', handleUserLeft);
    webSocketService.on('participant-update', handleParticipantUpdate);

    return () => {
      // 이벤트 리스너 정리
      webSocketService.off('user-joined', handleUserJoined);
      webSocketService.off('user-left', handleUserLeft);
      webSocketService.off('participant-update', handleParticipantUpdate);
    };
  }, [isConnected]);

  // 페이지 언로드 시 정리
  useEffect(() => {
    const handleUnload = () => {
      disconnect();
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      disconnect();
    };
  }, [disconnect]);

  return {
    // 연결 상태
    isConnected,
    isConnecting,
    connectionError,
    
    // 음성 스트림
    localStream,
    remoteStreams,
    
    // 피어 연결
    connectedPeersCount: webRTCService.getConnectedPeersCount(),
    peerStates,
    
    // 오디오 제어
    isLocalMuted,
    toggleLocalAudio,
    muteLocalAudio,
    unmuteLocalAudio,
    
    // 연결 관리
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    
    // 콜백 설정
    onUserJoined,
    onUserLeft,
    onParticipantUpdate,
    
    // 디버깅
    getDiagnostics
  };
};