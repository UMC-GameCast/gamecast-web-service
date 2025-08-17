// TODO: WebRTC Manager 기능 비활성화 - 나중에 구현 예정
// 원본 파일은 webRTCManager.ts.backup으로 백업되어 있습니다.

import { io, Socket } from "socket.io-client";
import { getCurrentUserId } from './roomManager';
import { SOCKET_URL } from '../config/server.config';
import type { 
  ParticipantUpdateEvent, 
  WebRTCOffer, 
  WebRTCIceCandidate,
  PeerConnectionState,
  VoiceChatState
} from '../types/room';

/**
 * WebRTC Manager (비활성화됨)
 * TODO: WebRTC 기능을 나중에 구현하기 위한 스텁 클래스
 * 
 * 원래 기능:
 * - Socket.IO 기반 시그널링
 * - RTCPeerConnection 관리
 * - 오디오 스트림 처리
 * - 참여자 상태 동기화
 * - 연결 품질 모니터링
 */
export class WebRTCManager {
  private socket: Socket | null = null;
  private roomCode: string;
  private nickname: string;
  private guestUserId: string | null = null;

  // 기본 상태값들 (WebRTC 없이)
  public localStream: MediaStream | null = null;
  public remoteStreams: Map<string, MediaStream> = new Map();

  // 콜백 함수들 (비활성화됨)
  public onRemoteStream: (sid: string, stream: MediaStream) => void = () => {};
  public onUserLeft: (sid: string) => void = () => {};
  public onParticipantUpdate: (event: ParticipantUpdateEvent) => void = () => {};
  public onRoomUsers: (users: unknown[]) => void = () => {};
  public onJoinRoomError: (error: { message: string }) => void = () => {};
  public onConnectionStateChanged: (state: VoiceChatState) => void = () => {};
  public onPeerConnectionStateChanged: (peerStates: Map<string, PeerConnectionState>) => void = () => {};
  
  // 실시간 참가자 업데이트 콜백들
  public onRealtimeParticipantsUpdate: (participants: unknown[]) => void = () => {};
  public onRealtimeConnectionStateChanged: (isConnected: boolean, error?: string) => void = () => {};
  
  // 녹화 시스템 콜백들
  public onRecordingStatusUpdate: (data: any) => void = () => {};
  public onPlayersReadyStatus: (players: any[]) => void = () => {};
  public onAllPlayersReady: () => void = () => {};
  public onRecordingStartCountdown: (data: any) => void = () => {};
  public onRecordingStarted: () => void = () => {};
  public onRecordingStopped: () => void = () => {};
  public onPreparationStatusUpdated: (data: any) => void = () => {};
  
  // 캐릭터 시스템 콜백들
  public onCharacterStatusUpdated: (data: any) => void = () => {};
  
  // 연결 품질 알림 콜백
  public onConnectionQualityChanged: (socketId: string, quality: 'good' | 'poor' | 'bad') => void = () => {};

  constructor(roomCode: string, nickname: string) {
    this.roomCode = roomCode;
    this.nickname = nickname;
    this.guestUserId = getCurrentUserId();
    
    console.log('🚫 [WebRTCManager] WebRTC 기능이 비활성화되어 있습니다.', {
      roomCode: this.roomCode,
      nickname: this.nickname,
      guestUserId: this.guestUserId
    });
  }

  // TODO: WebRTC 재구현 시 실제 로직으로 교체할 메서드들
  
  async start(): Promise<MediaStream | null> {
    console.log('🚫 [WebRTCManager] start() 비활성화됨');
    return null;
  }

  close(): void {
    console.log('🚫 [WebRTCManager] close() 비활성화됨');
  }

  sendChatMessage(message: string): void {
    console.log('🚫 [WebRTCManager] sendChatMessage() 비활성화됨:', message);
  }

  startRecording(): void {
    console.log('🚫 [WebRTCManager] startRecording() 비활성화됨');
  }

  stopRecording(): void {
    console.log('🚫 [WebRTCManager] stopRecording() 비활성화됨');
  }

  updatePreparationStatus(characterSetup: boolean, screenSetup: boolean): void {
    console.log('🚫 [WebRTCManager] updatePreparationStatus() 비활성화됨:', { characterSetup, screenSetup });
  }

  requestRoomUsers(): void {
    console.log('🚫 [WebRTCManager] requestRoomUsers() 비활성화됨');
  }

  muteLocalAudio(): boolean {
    console.log('🚫 [WebRTCManager] muteLocalAudio() 비활성화됨');
    return false;
  }

  unmuteLocalAudio(): boolean {
    console.log('🚫 [WebRTCManager] unmuteLocalAudio() 비활성화됨');
    return false;
  }

  toggleLocalAudio(): boolean {
    console.log('🚫 [WebRTCManager] toggleLocalAudio() 비활성화됨');
    return false;
  }

  getIsLocalMuted(): boolean {
    return false;
  }

  getConnectedPeersCount(): number {
    return 0;
  }

  getActiveSpeakers(): string[] {
    return [];
  }

  getSocket(): Socket | null {
    return null;
  }

  // TODO: WebRTC 재구현 시 필요한 추가 메서드들
  /*
  원래 구현에 포함되어야 할 기능들:
  - createPeerConnection(): RTCPeerConnection 생성
  - handleOffer(): WebRTC Offer 처리
  - handleAnswer(): WebRTC Answer 처리  
  - handleIceCandidate(): ICE Candidate 처리
  - setupSocketListeners(): Socket 이벤트 리스너 설정
  - connectSocket(): Socket 연결
  - disconnectSocket(): Socket 연결 해제
  - handleUserJoined(): 새 사용자 참여 처리
  - handleUserLeft(): 사용자 퇴장 처리
  - monitorConnectionQuality(): 연결 품질 모니터링
  - handleReconnection(): 재연결 처리
  */
}

/*
TODO: WebRTC 전체 아키텍처 재구현 계획

1. 시그널링 서버 (Socket.IO)
   - 방 참여/퇴장 관리
   - WebRTC Offer/Answer 교환
   - ICE Candidate 교환
   - 참여자 상태 동기화

2. 피어 투 피어 연결 (RTCPeerConnection)
   - 오디오 스트림 교환
   - 연결 상태 모니터링
   - 품질 최적화

3. 미디어 처리
   - 마이크 권한 요청
   - 오디오 트랙 관리
   - Mute/Unmute 기능
   - 볼륨 조절

4. 상태 관리
   - 로컬/원격 스트림 추적
   - 참여자 목록 동기화
   - 연결 품질 표시
   - 에러 처리

5. UI 통합
   - VoiceIndicator 연동
   - PlayerCard 스트림 표시
   - 실시간 상태 업데이트
*/