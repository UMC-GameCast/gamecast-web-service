import { useState, useEffect, useRef } from "react";
import { WebRTCManager } from "../utils/webRTCManager";
import type { ParticipantUpdateEvent } from "../types/room";

// 전역 WebRTC 매니저 인스턴스
let globalWebRTCManager: WebRTCManager | null = null;

export const useVoiceChat = (roomCode: string | null, nickname: string = "사용자", enabled: boolean = true) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [participants, setParticipants] = useState<unknown[]>([]);
  const [joinError, setJoinError] = useState<string | null>(null);
  const webRTCManagerRef = useRef<WebRTCManager | null>(null);

  useEffect(() => {
    if (!roomCode || !enabled) {
      console.log('useVoiceChat: roomCode 또는 enabled가 false, 초기화 건너뜀', { roomCode, enabled });
      return;
    }

    console.log('useVoiceChat: 초기화 시작', { roomCode, nickname });

    let isMounted = true;
    
    // 기존 연결이 있고 같은 방이면 재사용
    if (globalWebRTCManager && globalWebRTCManager.getRoomCode() === roomCode) {
      console.log('기존 WebRTC 매니저 재사용');
      webRTCManagerRef.current = globalWebRTCManager;
      return;
    }
    
    // 새 연결 생성
    let manager: WebRTCManager;
    try {
      console.log('새 WebRTC 매니저 생성:', { roomCode, nickname });
      manager = new WebRTCManager(roomCode, nickname);
      globalWebRTCManager = manager;
      webRTCManagerRef.current = manager;
    } catch (error) {
      console.error('WebRTC 매니저 생성 실패:', error);
      setJoinError('음성 채팅 초기화에 실패했습니다.');
      return;
    }

    // 원격 스트림 처리
    manager.onRemoteStream = (socketId, stream) => {
      if (isMounted) {
        setRemoteStreams(prev => new Map(prev).set(socketId, stream));
      }
    };

    // 사용자 퇴장 처리
    manager.onUserLeft = (socketId) => {
      if (isMounted) {
        setRemoteStreams(prev => {
          const newStreams = new Map(prev);
          newStreams.delete(socketId);
          return newStreams;
        });
      }
    };

    // 참여자 업데이트 처리
    manager.onParticipantUpdate = (event: ParticipantUpdateEvent) => {
      if (isMounted) {
        console.log("Participant update received:", event);
        setParticipants(event.participants);
      }
    };

    // 방 사용자 목록 처리
    manager.onRoomUsers = (users: unknown[]) => {
      if (isMounted) {
        console.log("Room users updated:", users);
        setParticipants(users);
      }
    };

    // 방 참여 에러 처리
    manager.onJoinRoomError = (error: { message: string }) => {
      if (isMounted) {
        console.error("Join room error:", error);
        setJoinError(error.message);
      }
    };

    // 로컬 스트림 시작
    manager.start().then(stream => {
      if (isMounted && stream) {
        setLocalStream(stream);
      }
    }).catch(error => {
      console.error("Failed to start local stream:", error);
      if (isMounted) {
        setJoinError("마이크 권한을 허용해주세요.");
      }
    });

    return () => {
      isMounted = false;
      manager.close();
    };
  }, [roomCode, nickname]);

  // 채팅 메시지 보내기
  const sendChatMessage = (message: string) => {
    webRTCManagerRef.current?.sendChatMessage(message);
  };

  // 녹화 시작
  const startRecording = () => {
    webRTCManagerRef.current?.startRecording();
  };

  // 녹화 중지
  const stopRecording = () => {
    webRTCManagerRef.current?.stopRecording();
  };

  // 준비 상태 업데이트
  const updatePreparationStatus = (characterSetup: boolean, screenSetup: boolean) => {
    webRTCManagerRef.current?.updatePreparationStatus(characterSetup, screenSetup);
  };

  // 방 사용자 목록 요청
  const requestRoomUsers = () => {
    webRTCManagerRef.current?.requestRoomUsers();
  };

  return { 
    localStream, 
    remoteStreams, 
    participants, 
    joinError,
    sendChatMessage,
    startRecording,
    stopRecording,
    updatePreparationStatus,
    requestRoomUsers,
    webRTCManager: webRTCManagerRef.current
  };
}; 