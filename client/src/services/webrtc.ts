// WebRTC 서비스 레이어 - P2P 연결 및 미디어 스트림 담당

import type { 
  PeerConnectionState, 
  VoiceChatState, 
  ConnectionDiagnostics,
  WebRTCConfig 
} from '../types/webrtc';
import { webSocketService } from './websocket';

export class WebRTCService {
  private peerConnections = new Map<string, RTCPeerConnection>();
  private peerStates = new Map<string, PeerConnectionState>();
  private localStream: MediaStream | null = null;
  private isLocalMuted = false;
  private config: WebRTCConfig;

  // 콜백 함수들
  public onRemoteStream: (socketId: string, stream: MediaStream) => void = () => {};
  public onPeerConnectionStateChanged: (states: Map<string, PeerConnectionState>) => void = () => {};
  public onLocalStreamChanged: (stream: MediaStream | null) => void = () => {};
  public onConnectionError: (socketId: string, error: string) => void = () => {};

  constructor(config?: Partial<WebRTCConfig>) {
    this.config = {
      serverUrl: 'http://3.37.34.211:8889',
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ],
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      ...config,
    };

    this.setupWebSocketListeners();
  }

  // WebSocket 이벤트 리스너 설정
  private setupWebSocketListeners(): void {
    // 새 사용자 참여 시 P2P 연결 생성
    webSocketService.on('user-joined', async (data) => {
      if (data.socketId !== webSocketService.socketId) {
        console.log('🔗 [WebRTC] Creating peer connection for new user:', data.nickname);
        await this.createPeerConnection(data.socketId, true, data.nickname);
      }
    });

    // 사용자 퇴장 시 P2P 연결 정리
    webSocketService.on('user-left', (data) => {
      console.log('👋 [WebRTC] User left, cleaning up peer connection:', data.nickname);
      this.closePeerConnection(data.socketId);
    });

    // WebRTC 시그널링 이벤트들
    webSocketService.on('offer', async (data) => {
      await this.handleOffer(data.fromSocketId, data.fromNickname, data.offer);
    });

    webSocketService.on('answer', async (data) => {
      await this.handleAnswer(data.fromSocketId, data.answer);
    });

    webSocketService.on('ice-candidate', async (data) => {
      await this.handleIceCandidate(data.fromSocketId, data.candidate);
    });
  }

  // 로컬 미디어 스트림 초기화
  async initializeLocalStream(): Promise<MediaStream | null> {
    if (this.localStream) {
      return this.localStream;
    }

    try {
      console.log('🎤 [WebRTC] Initializing local media stream...');
      
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
        },
        video: false,
      });

      console.log('✅ [WebRTC] Local stream initialized:', {
        id: this.localStream.id,
        audioTracks: this.localStream.getAudioTracks().length,
      });

      this.onLocalStreamChanged(this.localStream);
      return this.localStream;

    } catch (error) {
      console.error('❌ [WebRTC] Failed to initialize local stream:', error);
      
      let errorMessage = '마이크 접근에 실패했습니다.';
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = '마이크 권한이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = '마이크 장치를 찾을 수 없습니다.';
        } else if (error.name === 'NotReadableError') {
          errorMessage = '다른 애플리케이션에서 마이크를 사용 중입니다.';
        }
      }
      
      throw new Error(errorMessage);
    }
  }

  // P2P 연결 생성
  async createPeerConnection(socketId: string, isOfferer: boolean, nickname: string): Promise<void> {
    if (this.peerConnections.has(socketId)) {
      console.warn('⚠️ [WebRTC] Peer connection already exists:', socketId);
      return;
    }

    try {
      const pc = new RTCPeerConnection({
        iceServers: this.config.iceServers,
        iceCandidatePoolSize: 10,
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
      });

      // 피어 상태 초기화
      const peerState: PeerConnectionState = {
        socketId,
        nickname,
        connectionState: 'new',
        hasAudio: false,
        isMuted: false,
      };
      this.peerStates.set(socketId, peerState);

      // 이벤트 리스너 설정
      pc.onconnectionstatechange = () => {
        peerState.connectionState = pc.connectionState;
        console.log('🔄 [WebRTC] Connection state changed:', nickname, pc.connectionState);
        this.notifyStateChanged();
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          webSocketService.sendIceCandidate(socketId, event.candidate);
        }
      };

      pc.ontrack = (event) => {
        console.log('🎵 [WebRTC] Remote stream received from:', nickname);
        peerState.hasAudio = event.streams[0].getAudioTracks().length > 0;
        this.onRemoteStream(socketId, event.streams[0]);
        this.notifyStateChanged();
      };

      pc.oniceconnectionstatechange = () => {
        console.log('❄️ [WebRTC] ICE connection state:', pc.iceConnectionState);
        
        if (pc.iceConnectionState === 'failed') {
          console.error('❌ [WebRTC] ICE connection failed for:', nickname);
          this.onConnectionError(socketId, `${nickname}와의 연결이 실패했습니다.`);
        }
      };

      // 로컬 스트림 추가
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          pc.addTrack(track, this.localStream!);
        });
      }

      this.peerConnections.set(socketId, pc);

      // Offer 생성 (연결 시작자인 경우)
      if (isOfferer) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        webSocketService.sendOffer(socketId, offer);
        console.log('📤 [WebRTC] Offer sent to:', nickname);
      }

    } catch (error) {
      console.error('❌ [WebRTC] Failed to create peer connection:', error);
      this.peerConnections.delete(socketId);
      this.peerStates.delete(socketId);
      this.onConnectionError(socketId, `${nickname}와의 연결 생성에 실패했습니다.`);
    }
  }

  // Offer 처리
  private async handleOffer(fromSocketId: string, fromNickname: string, offer: RTCSessionDescriptionInit): Promise<void> {
    try {
      console.log('📞 [WebRTC] Offer received from:', fromNickname);
      
      await this.createPeerConnection(fromSocketId, false, fromNickname);
      const pc = this.peerConnections.get(fromSocketId);
      
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        webSocketService.sendAnswer(fromSocketId, answer);
        console.log('📤 [WebRTC] Answer sent to:', fromNickname);
      }
    } catch (error) {
      console.error('❌ [WebRTC] Error handling offer:', error);
      this.onConnectionError(fromSocketId, `${fromNickname}의 연결 요청 처리에 실패했습니다.`);
    }
  }

  // Answer 처리
  private async handleAnswer(fromSocketId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    try {
      const pc = this.peerConnections.get(fromSocketId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log('✅ [WebRTC] Answer processed');
      }
    } catch (error) {
      console.error('❌ [WebRTC] Error handling answer:', error);
      this.onConnectionError(fromSocketId, 'Answer 처리에 실패했습니다.');
    }
  }

  // ICE Candidate 처리
  private async handleIceCandidate(fromSocketId: string, candidate: RTCIceCandidateInit): Promise<void> {
    try {
      const pc = this.peerConnections.get(fromSocketId);
      if (pc && candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('❌ [WebRTC] Error adding ICE candidate:', error);
    }
  }

  // P2P 연결 종료
  private closePeerConnection(socketId: string): void {
    const pc = this.peerConnections.get(socketId);
    const state = this.peerStates.get(socketId);
    
    if (pc) {
      pc.close();
      this.peerConnections.delete(socketId);
    }
    
    if (state) {
      this.peerStates.delete(socketId);
      this.notifyStateChanged();
    }
    
    console.log('🔌 [WebRTC] Peer connection closed:', socketId);
  }

  // 상태 변경 알림
  private notifyStateChanged(): void {
    this.onPeerConnectionStateChanged(new Map(this.peerStates));
  }

  // 오디오 음소거/해제
  muteLocalAudio(): boolean {
    if (!this.localStream) return false;

    this.localStream.getAudioTracks().forEach(track => {
      track.enabled = false;
    });
    this.isLocalMuted = true;
    console.log('🔇 [WebRTC] Local audio muted');
    return true;
  }

  unmuteLocalAudio(): boolean {
    if (!this.localStream) return false;

    this.localStream.getAudioTracks().forEach(track => {
      track.enabled = true;
    });
    this.isLocalMuted = false;
    console.log('🔊 [WebRTC] Local audio unmuted');
    return true;
  }

  toggleLocalAudio(): boolean {
    return this.isLocalMuted ? this.unmuteLocalAudio() : this.muteLocalAudio();
  }

  // 상태 정보 조회
  getVoiceChatState(): VoiceChatState {
    return {
      localStream: this.localStream,
      remoteStreams: new Map(), // 이건 상위에서 관리
      peerConnections: new Map(this.peerStates),
      isLocalMuted: this.isLocalMuted,
      isConnected: webSocketService.isConnected,
    };
  }

  getConnectedPeersCount(): number {
    return Array.from(this.peerStates.values())
      .filter(state => state.connectionState === 'connected').length;
  }

  getActiveSpeakers(): string[] {
    return Array.from(this.peerStates.values())
      .filter(state => state.hasAudio && !state.isMuted)
      .map(state => state.nickname);
  }

  getConnectionDiagnostics(): ConnectionDiagnostics {
    return {
      socketConnected: webSocketService.isConnected,
      socketId: webSocketService.socketId || '',
      localStreamActive: !!this.localStream,
      localStreamTracks: this.localStream?.getTracks().length || 0,
      totalPeerConnections: this.peerConnections.size,
      connectedPeers: this.getConnectedPeersCount(),
      roomCode: '', // 상위에서 관리
      guestUserId: null, // 상위에서 관리
      nickname: '', // 상위에서 관리
      isJoining: false, // 상위에서 관리
      lastJoinAttempt: '', // 상위에서 관리
      reconnectionAttempts: {}, // 상위에서 관리
      peerStates: Array.from(this.peerStates.values()).map(state => ({
        socketId: state.socketId,
        nickname: state.nickname,
        connectionState: state.connectionState,
        hasAudio: state.hasAudio,
        isMuted: state.isMuted,
      })),
    };
  }

  // 리소스 정리
  cleanup(): void {
    console.log('🧹 [WebRTC] Cleaning up all connections...');
    
    // 로컬 스트림 정리
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // 모든 P2P 연결 정리
    this.peerConnections.forEach((pc, socketId) => {
      pc.close();
    });
    this.peerConnections.clear();
    this.peerStates.clear();

    this.onLocalStreamChanged(null);
    this.notifyStateChanged();
  }
}

// 싱글톤 인스턴스 내보내기
export const webRTCService = new WebRTCService();
export default webRTCService;