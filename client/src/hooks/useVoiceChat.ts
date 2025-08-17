import { useState, useEffect, useRef } from "react";
// TODO: WebRTC를 나중에 구현하기 위해 주석 처리
// import { WebRTCManager } from "../utils/webRTCManager";
import type { 
  ParticipantUpdateEvent, 
  VoiceChatState, 
  PeerConnectionState 
} from "../types/room";

// TODO: WebRTC 기능 비활성화 - 나중에 구현 예정
// 현재는 모든 WebRTC 관련 기능이 비활성화되어 있습니다.

// TODO: WebRTC 재구현 시 다음 항목들이 필요합니다:
// - WebRTC 매니저 싱글톤 관리
// - 피어 연결 상태 관리 
// - 글로벌 상태 동기화
// - HMR 및 정리 로직

/*
WebRTC 관련 코드들이 여기에 있었습니다.
나중에 구현할 때 다음과 같은 기능들이 포함되어야 합니다:
- 실시간 음성 채팅
- 피어 투 피어 연결
- 마이크 권한 관리
- 음성 품질 모니터링
- 연결 상태 추적
*/

export const useVoiceChat = (
  roomCode: string | null, 
  nickname: string = "", 
  enabled: boolean = true,
  onStateUpdate?: () => void
) => {
  // TODO: WebRTC 기능 비활성화 - 모든 상태를 기본값으로 반환
  console.log('🚫 [useVoiceChat] WebRTC 기능이 비활성화되어 있습니다.', {
    roomCode,
    nickname,
    enabled
  });
  
  // 기본 상태값들 (WebRTC 없이)
  const [localStream] = useState<MediaStream | null>(null);
  const [remoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [participants] = useState<unknown[]>([]);
  const [joinError] = useState<string | null>(null);
  const [microphoneError] = useState<string | null>(null);

  const [voiceChatState] = useState<VoiceChatState>({
    localStream: null,
    remoteStreams: new Map(),
    peerConnections: new Map(),
    isLocalMuted: false,
    isConnected: false
  });
  
  const [peerStates] = useState<Map<string, PeerConnectionState>>(new Map());
  const [isLocalMutedState] = useState(false);

  // TODO: WebRTC 재구현 시 실제 로직으로 교체할 함수들
  const sendChatMessage = (message: string) => {
    console.log('🚫 [useVoiceChat] sendChatMessage 비활성화됨:', message);
  };

  const startRecording = () => {
    console.log('🚫 [useVoiceChat] startRecording 비활성화됨');
  };

  const stopRecording = () => {
    console.log('🚫 [useVoiceChat] stopRecording 비활성화됨');
  };

  const updatePreparationStatus = (characterSetup: boolean, screenSetup: boolean) => {
    console.log('🚫 [useVoiceChat] updatePreparationStatus 비활성화됨:', { characterSetup, screenSetup });
  };

  const requestRoomUsers = () => {
    console.log('🚫 [useVoiceChat] requestRoomUsers 비활성화됨');
  };

  const muteLocalAudio = () => {
    console.log('🚫 [useVoiceChat] muteLocalAudio 비활성화됨');
    return false;
  };

  const unmuteLocalAudio = () => {
    console.log('🚫 [useVoiceChat] unmuteLocalAudio 비활성화됨');
    return false;
  };

  const toggleLocalAudio = () => {
    console.log('🚫 [useVoiceChat] toggleLocalAudio 비활성화됨');
    return false;
  };

  const getConnectedPeersCount = () => {
    return 0;
  };

  const getActiveSpeakers = () => {
    return [];
  };

  const setOnRealtimeParticipantsUpdate = (callback: (participants: unknown[]) => void) => {
    console.log('🚫 [useVoiceChat] setOnRealtimeParticipantsUpdate 비활성화됨');
  };

  const setOnRealtimeConnectionStateChanged = (callback: (isConnected: boolean) => void) => {
    console.log('🚫 [useVoiceChat] setOnRealtimeConnectionStateChanged 비활성화됨');
  };

  return { 
    localStream, 
    remoteStreams, 
    participants, 
    joinError,
    microphoneError,
    voiceChatState,
    peerStates,
    sendChatMessage,
    startRecording,
    stopRecording,
    updatePreparationStatus,
    requestRoomUsers,
    muteLocalAudio,
    unmuteLocalAudio,
    toggleLocalAudio,
    getConnectedPeersCount,
    getActiveSpeakers,
    isLocalMuted: isLocalMutedState,
    setOnRealtimeParticipantsUpdate,
    setOnRealtimeConnectionStateChanged,
    webRTCManager: null, // TODO: WebRTC 재구현 시 실제 매니저로 교체
    // 디버깅용
    hasWebRTCManager: false,
    hasGlobalManager: false
  };
}; 