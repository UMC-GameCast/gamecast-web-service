import { useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../config/server.config';
import type { Player } from '../types/room';

interface UseRoomSocketProps {
  roomCode: string;
  currentPlayer: Player | null;
  onParticipantJoined?: (participant: Player) => void;
  onParticipantLeft?: (guestUserId: string) => void;
  onParticipantsUpdate?: (participants: Player[]) => void;
  onCharacterUpdate?: (guestUserId: string, characterData: any) => void;
  onPreparationUpdate?: (guestUserId: string, preparationStatus: any) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
}

let globalSocket: Socket | null = null;

export function useRoomSocket({
  roomCode,
  currentPlayer,
  onParticipantJoined,
  onParticipantLeft,
  onParticipantsUpdate,
  onCharacterUpdate,
  onPreparationUpdate,
  onRecordingStart,
  onRecordingStop
}: UseRoomSocketProps) {

  // 소켓 연결 및 초기화
  useEffect(() => {
    if (!roomCode || !currentPlayer) return;

    console.log('🔌 [useRoomSocket] Socket 연결 시작:', { roomCode, currentPlayer: currentPlayer.nickname });

    // 전역 소켓이 있으면 재사용, 없으면 새로 생성
    if (!globalSocket || globalSocket.disconnected) {
      globalSocket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
    }

    const socket = globalSocket;

    // 연결 이벤트
    const handleConnect = () => {
      console.log('✅ [useRoomSocket] Socket 연결됨:', socket.id);
      
      // 방에 조인
      socket.emit('join-room', {
        roomCode,
        guestUserId: currentPlayer.guestUserId,
        nickname: currentPlayer.nickname
      });
    };

    const handleDisconnect = (reason: string) => {
      console.log('❌ [useRoomSocket] Socket 연결 해제:', reason);
    };

    // 방 관련 이벤트들
    const handleRoomJoined = (data: any) => {
      console.log('🎉 [useRoomSocket] 방 참여 성공:', data);
    };

    const handleUserJoined = (data: { user: Player }) => {
      console.log('👋 [useRoomSocket] 새 사용자 참여:', data.user);
      onParticipantJoined?.(data.user);
    };

    const handleUserLeft = (data: { guestUserId: string; nickname: string }) => {
      console.log('👋 [useRoomSocket] 사용자 퇴장:', data);
      onParticipantLeft?.(data.guestUserId);
    };

    const handleParticipantsUpdate = (data: { participants: Player[] }) => {
      console.log('👥 [useRoomSocket] 참여자 목록 업데이트:', data.participants.length);
      onParticipantsUpdate?.(data.participants);
    };

    const handleCharacterUpdate = (data: { guestUserId: string; characterInfo: any }) => {
      console.log('🎨 [useRoomSocket] 캐릭터 업데이트:', data);
      onCharacterUpdate?.(data.guestUserId, data.characterInfo);
    };

    const handlePreparationUpdate = (data: { guestUserId: string; preparationStatus: any }) => {
      console.log('✅ [useRoomSocket] 준비 상태 업데이트:', data);
      onPreparationUpdate?.(data.guestUserId, data.preparationStatus);
    };

    const handleRecordingStart = () => {
      console.log('🎬 [useRoomSocket] 녹화 시작 신호 수신');
      onRecordingStart?.();
    };

    const handleRecordingStop = () => {
      console.log('⏹️ [useRoomSocket] 녹화 종료 신호 수신');
      onRecordingStop?.();
    };

    // 이벤트 리스너 등록
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('room-joined', handleRoomJoined);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('participants-update', handleParticipantsUpdate);
    socket.on('character-update', handleCharacterUpdate);
    socket.on('preparation-update', handlePreparationUpdate);
    socket.on('recording-start', handleRecordingStart);
    socket.on('recording-stop', handleRecordingStop);

    // 이미 연결되어 있다면 바로 방 조인
    if (socket.connected) {
      handleConnect();
    }

    // cleanup 함수
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('room-joined', handleRoomJoined);
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
      socket.off('participants-update', handleParticipantsUpdate);
      socket.off('character-update', handleCharacterUpdate);
      socket.off('preparation-update', handlePreparationUpdate);
      socket.off('recording-start', handleRecordingStart);
      socket.off('recording-stop', handleRecordingStop);
    };
  }, [roomCode, currentPlayer?.guestUserId, currentPlayer?.nickname]);

  // 캐릭터 업데이트 전송
  const updateCharacter = useCallback((characterData: any) => {
    if (globalSocket && currentPlayer) {
      console.log('🎨 [useRoomSocket] 캐릭터 업데이트 전송:', characterData);
      globalSocket.emit('update-character', {
        roomCode,
        guestUserId: currentPlayer.guestUserId,
        characterInfo: characterData
      });
    }
  }, [roomCode, currentPlayer?.guestUserId]);

  // 준비 상태 업데이트 전송
  const updatePreparation = useCallback((preparationStatus: any) => {
    if (globalSocket && currentPlayer) {
      console.log('✅ [useRoomSocket] 준비 상태 업데이트 전송:', preparationStatus);
      globalSocket.emit('update-preparation', {
        roomCode,
        guestUserId: currentPlayer.guestUserId,
        preparationStatus
      });
    }
  }, [roomCode, currentPlayer?.guestUserId]);

  // 녹화 시작 신호 전송 (호스트만)
  const startRecording = useCallback(() => {
    if (globalSocket && currentPlayer?.role === 'host') {
      console.log('🎬 [useRoomSocket] 녹화 시작 신호 전송');
      globalSocket.emit('start-recording', { roomCode });
    }
  }, [roomCode, currentPlayer?.role]);

  // 녹화 종료 신호 전송 (호스트만)
  const stopRecording = useCallback(() => {
    if (globalSocket && currentPlayer?.role === 'host') {
      console.log('⏹️ [useRoomSocket] 녹화 종료 신호 전송');
      globalSocket.emit('stop-recording', { roomCode });
    }
  }, [roomCode, currentPlayer?.role]);

  return {
    socket: globalSocket,
    updateCharacter,
    updatePreparation,
    startRecording,
    stopRecording
  };
}