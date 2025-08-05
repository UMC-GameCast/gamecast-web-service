import { io, Socket } from "socket.io-client";
import { getCurrentUserId } from './roomManager';
import type { 
  ParticipantUpdateEvent, 
  WebRTCOffer, 
  WebRTCAnswer, 
  WebRTCIceCandidate,
  PeerConnectionState,
  VoiceChatState
} from '../types/room';

const SOCKET_SERVER_URL = "http://3.37.34.211:8889";

export class WebRTCManager {
  private socket: Socket;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private peerStates: Map<string, PeerConnectionState> = new Map();
  public localStream: MediaStream | null = null;
  private roomCode: string;
  private guestUserId: string | null = null;
  private nickname: string;
  private isLocalMuted: boolean = false;
  
  // 연결 상태 관리
  private connectionState: VoiceChatState;
  
  // 강화된 중복 방 참여 방지
  private isJoiningRoom: boolean = false;
  private lastJoinAttempt: number = 0;
  private joinTimeoutId: ReturnType<typeof setTimeout> | null = null;
  
  // 재시도 로직
  private reconnectionAttempts: Map<string, number> = new Map();
  private maxReconnectionAttempts: number = 3;
  
  // 연결 품질 모니터링
  private qualityCheckInterval: ReturnType<typeof setInterval> | null = null;

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

  // 연결 에러 메시지 변환 헬퍼
  private getConnectionErrorMessage(error: any): string {
    const errorMsg = error?.message || error?.description || String(error);
    
    if (errorMsg.includes('ENOTFOUND') || errorMsg.includes('getaddrinfo')) {
      return '서버에 연결할 수 없습니다. 인터넷 연결을 확인해주세요.';
    } else if (errorMsg.includes('ECONNREFUSED')) {
      return '서버가 연결을 거부했습니다. 잠시 후 다시 시도해주세요.';
    } else if (errorMsg.includes('timeout')) {
      return '서버 연결 시간이 초과되었습니다. 네트워크 상태를 확인해주세요.';
    } else if (errorMsg.includes('CORS')) {
      return '서버 접근 권한 오류입니다. 관리자에게 문의해주세요.';
    } else {
      return '서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.';
    }
  }

  constructor(roomCode: string, nickname: string) {
    this.roomCode = roomCode;
    this.nickname = nickname;
    // 🎯 핵심 수정: WebRTC Manager 전용 ID 생성 (실제 플레이어와 구분)
    const realPlayerId = getCurrentUserId();
    this.guestUserId = realPlayerId ? `WEBRTC_${realPlayerId}` : null;
    
    // 연결 상태 초기화
    this.connectionState = {
      localStream: null,
      remoteStreams: new Map(),
      peerConnections: new Map(),
      isLocalMuted: false,
      isConnected: false
    };
    
    const managerId = Math.random().toString(36).substr(2, 9);
    console.log(`🚀 [WebRTC] [ID:${managerId}] Initializing WebRTC Manager:`, {
      roomCode,
      nickname,
      guestUserId: this.guestUserId,
      serverUrl: SOCKET_SERVER_URL,
      timestamp: new Date().toISOString()
    });
    
    // WebSocket 전용 연결 설정 (enhanced retry logic)
    this.socket = io(SOCKET_SERVER_URL, {
      transports: ['websocket'], // WebSocket만 사용
      upgrade: false, // polling으로 자동 업그레이드 방지
      rememberUpgrade: false,
      timeout: 20000, // 타임아웃 증가
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5, // 재시도 횟수 증가
      reconnectionDelay: 1000, // 초기 딜레이
      reconnectionDelayMax: 5000, // 최대 딜레이
      randomizationFactor: 0.5 // 지터 추가
    });
    
    this.initializeSocketListeners();
    this.setupCleanupListeners();
    this.startConnectionQualityMonitoring();
  }

  // ✅ 새로 추가: 정리 리스너 설정
  private setupCleanupListeners() {
    // 페이지 종료 시 자동 정리
    const cleanup = () => {
      console.log('🧹 [WebRTC] Auto cleanup triggered');
      this.close();
    };
    
    window.addEventListener('beforeunload', cleanup);
    window.addEventListener('pagehide', cleanup);
    
    // 브라우저 탭 변경 감지 기능 제거됨 (게임 녹화 시 백그라운드 실행 보장)
  }

  // ✅ 새로 추가: 연결 품질 모니터링 시작
  private startConnectionQualityMonitoring() {
    this.qualityCheckInterval = setInterval(() => {
      this.checkConnectionQuality();
    }, 5000); // 5초마다 품질 체크
  }

  // ✅ 새로 추가: 연결 품질 체크
  private checkConnectionQuality() {
    this.peerConnections.forEach(async (pc, socketId) => {
      try {
        const stats = await pc.getStats();
        stats.forEach(report => {
          if (report.type === 'inbound-rtp' && report.kind === 'audio') {
            const packetsLost = report.packetsLost || 0;
            const packetsReceived = report.packetsReceived || 0;
            const totalPackets = packetsReceived + packetsLost;
            
            if (totalPackets > 0) {
              const lossRate = packetsLost / totalPackets;
              let quality: 'good' | 'poor' | 'bad' = 'good';
              
              if (lossRate > 0.1) {
                quality = 'bad';
              } else if (lossRate > 0.05) {
                quality = 'poor';
              }
              
              if (quality !== 'good') {
                console.warn(`⚠️ [WebRTC] Poor connection quality with ${socketId}: ${(lossRate * 100).toFixed(2)}% packet loss`);
                this.onConnectionQualityChanged(socketId, quality);
              }
            }
          }
        });
      } catch (error) {
        console.error('❌ [WebRTC] Error checking connection quality:', error);
      }
    });
  }

  private initializeSocketListeners() {
    console.log('🔧 [WebRTC] Setting up Socket.IO listeners...');
    
    this.socket.on("connect", async () => {
      console.log('🟢 [WebRTC] Socket.IO CONNECTED:', {
        socketId: this.socket.id,
        serverUrl: SOCKET_SERVER_URL,
        roomCode: this.roomCode,
        nickname: this.nickname,
        timestamp: new Date().toISOString()
      });
      
      // 연결 상태 업데이트
      this.connectionState.isConnected = true;
      this.onRealtimeConnectionStateChanged(true);
      
      // Socket 연결 직후 마이크 자동 초기화 시도
      try {
        console.log('🎤 [WebRTC] Auto-initializing microphone after socket connection...');
        await this.initializeMicrophone();
        console.log('✅ [WebRTC] Microphone initialized successfully');
      } catch (error) {
        console.warn('⚠️ [WebRTC] Microphone initialization failed, continuing without mic:', error);
        this.onJoinRoomError({ 
          message: `마이크 초기화 실패: ${error instanceof Error ? error.message : '알 수 없는 에러'}` 
        });
      }
      
      // 방 참여
      this.joinRoom();
    });

    this.socket.on("connect_error", (error) => {
      const errorMessage = this.getConnectionErrorMessage(error);
      console.error('🔴 [WebRTC] Socket connection ERROR:', {
        error: error.message,
        type: (error as any).type,
        description: (error as any).description,
        serverUrl: SOCKET_SERVER_URL,
        timestamp: new Date().toISOString(),
        userFriendlyMessage: errorMessage
      });
      
      this.connectionState.isConnected = false;
      this.onRealtimeConnectionStateChanged(false, errorMessage);
      this.onJoinRoomError({ message: errorMessage });
    });

    this.socket.on("disconnect", (reason) => {
      console.log('🔌 [WebRTC] Socket.IO DISCONNECTED:', {
        reason,
        socketId: this.socket.id,
        timestamp: new Date().toISOString(),
        willReconnect: reason === 'io server disconnect'
      });
      
      // 연결 상태 업데이트
      this.connectionState.isConnected = false;
      this.onRealtimeConnectionStateChanged(false);
      
      if (reason === 'io server disconnect') {
        console.log('🔄 [WebRTC] Server disconnected, attempting reconnection...');
        this.socket.connect();
      }
    });

    // ✅ 개선된 재연결 처리
    this.socket.on("reconnect", (attemptNumber) => {
      console.log('🔄 [WebRTC] Socket.IO RECONNECTED:', {
        attemptNumber,
        socketId: this.socket.id,
        timestamp: new Date().toISOString()
      });
      
      // 재연결 시 상태 초기화
      this.isJoiningRoom = false;
      this.lastJoinAttempt = 0;
      if (this.joinTimeoutId) {
        clearTimeout(this.joinTimeoutId);
        this.joinTimeoutId = null;
      }
      
      // 기존 P2P 연결들 정리 후 재설정
      this.peerConnections.forEach(pc => pc.close());
      this.peerConnections.clear();
      this.peerStates.clear();
      this.reconnectionAttempts.clear();
      
      // 연결 상태 업데이트
      this.connectionState.isConnected = true;
      this.onRealtimeConnectionStateChanged(true);
      
      // 방 재참여
      setTimeout(() => {
        this.joinRoom();
      }, 1000); // 1초 대기 후 재참여
    });

    this.socket.on("reconnect_error", (error) => {
      console.error('❌ [WebRTC] Socket.IO reconnection FAILED:', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      this.onRealtimeConnectionStateChanged(false, `재연결 실패: ${error.message}`);
    });

    // 기존 이벤트 리스너들...
    this.socket.on("room_status", (userList: unknown[]) => {
      console.log('📊 [WebRTC] Room status updated:', {
        userCount: Array.isArray(userList) ? userList.length : 'invalid',
        users: userList,
        roomCode: this.roomCode,
        timestamp: new Date().toISOString()
      });
      this.onRoomUsers(userList);
    });

    this.socket.on("joined-room-success", (data: { roomCode: string; roomId: string; users: unknown[] }) => {
      console.log('🎉 [WebRTC] Room join SUCCESS:', {
        roomCode: data.roomCode,
        roomId: data.roomId,
        userCount: Array.isArray(data.users) ? data.users.length : 'invalid',
        users: data.users,
        timestamp: new Date().toISOString()
      });
      
      // 방 참여 성공 시 플래그 및 타임아웃 해제
      this.isJoiningRoom = false;
      if (this.joinTimeoutId) {
        clearTimeout(this.joinTimeoutId);
        this.joinTimeoutId = null;
      }
      
      this.onRoomUsers(data.users);
    });

    this.socket.on("join-room-error", (error: { message: string }) => {
      console.error('❌ [WebRTC] Room join FAILED:', {
        error: error.message,
        roomCode: this.roomCode,
        nickname: this.nickname,
        timestamp: new Date().toISOString()
      });
      
      // 방 참여 실패 시 플래그 및 타임아웃 해제
      this.isJoiningRoom = false;
      if (this.joinTimeoutId) {
        clearTimeout(this.joinTimeoutId);
        this.joinTimeoutId = null;
      }
      
      // 인원 초과 에러인 경우 추가 처리
      if (error.message.includes('인원') || error.message.includes('초과') || error.message.includes('찼습니다')) {
        console.warn('⚠️ [WebRTC] Room capacity error detected, cleaning up existing connections...');
        
        // 기존 P2P 연결들 모두 정리
        this.peerConnections.forEach((pc, socketId) => {
          console.log(`🧹 [WebRTC] Cleaning up peer connection: ${socketId}`);
          pc.close();
        });
        this.peerConnections.clear();
        this.peerStates.clear();
        this.reconnectionAttempts.clear();
        
        // 재시도 카운터 초기화
        this.lastJoinAttempt = 0;
        
        console.log('🧹 [WebRTC] All peer connections cleaned up due to capacity error');
      }
      
      this.onJoinRoomError(error);
    });

    // 나머지 이벤트 리스너들은 기존과 동일...
    this.socket.on("room-users", (users: unknown[]) => {
      console.log('👥 [WebRTC] Room users updated:', {
        userCount: Array.isArray(users) ? users.length : 'invalid',
        users: users,
        roomCode: this.roomCode,
        timestamp: new Date().toISOString()
      });
      this.onRoomUsers(users);
    });

    this.socket.on("participant-update", (event: ParticipantUpdateEvent | unknown[]) => {
      if (Array.isArray(event)) {
        console.log(`👥 [WebRTC] Participant update received (array):`, {
          count: event.length,
          participants: event
        });
        this.onRealtimeParticipantsUpdate(event);
      } else if (event && typeof event === 'object' && 'eventType' in event) {
        const participantEvent = event as ParticipantUpdateEvent;
        console.log('👥 [WebRTC] Participant update received (event):', {
          eventType: participantEvent.eventType,
          roomCode: participantEvent.roomCode,
          participantCount: participantEvent.participants?.length || 0,
          timestamp: new Date().toISOString()
        });
        this.onParticipantUpdate(participantEvent);
        if (participantEvent.participants) {
          this.onRealtimeParticipantsUpdate(participantEvent.participants);
          
          // participant-update 이벤트에서 characterInfo 추출하여 캐릭터 상태 업데이트
          participantEvent.participants.forEach((participant: any) => {
            if (participant.characterInfo?.isCustomized) {
              console.log('🎨 [WebRTC] participant-update에서 캐릭터 정보 추출:', {
                guestUserId: participant.guestUserId,
                nickname: participant.nickname,
                characterInfo: participant.characterInfo
              });
              
              // 기존 character-status-updated 콜백 재사용
              this.onCharacterStatusUpdated({
                roomCode: participantEvent.roomCode || '',
                guestUserId: participant.guestUserId,
                nickname: participant.nickname,
                selectedOptions: participant.characterInfo.selectedOptions,
                selectedColors: participant.characterInfo.selectedColors,
                updatedAt: new Date().toISOString()
              });
            }
          });
        }
      } else {
        console.warn('⚠️ [WebRTC] Unknown participant-update format:', event);
      }
    });

    this.socket.on("user-joined", async (data: { socketId: string; guestUserId: string; nickname: string; joinedAt: string }) => {
      console.log('👋 [WebRTC] NEW USER JOINED:', {
        nickname: data.nickname,
        socketId: data.socketId,
        guestUserId: data.guestUserId,
        joinedAt: data.joinedAt,
        mySocketId: this.socket.id,
        isSameAsMe: data.socketId === this.socket.id,
        willCreatePeerConnection: data.socketId !== this.socket.id,
        timestamp: new Date().toISOString()
      });
      
      // 자신에게는 P2P 연결을 생성하지 않음
      if (data.socketId === this.socket.id) {
        console.log('⚠️ [WebRTC] Skipping peer connection - this is myself');
        return;
      }
      
      try {
        console.log('🔄 [WebRTC] Attempting to create peer connection for new user:', {
          socketId: data.socketId,
          nickname: data.nickname,
          isOfferer: true,
          hasLocalStream: !!this.localStream,
          localStreamTracks: this.localStream?.getTracks().length || 0
        });
        
        await this.createPeerConnection(data.socketId, true, data.nickname);
        
        console.log('✅ [WebRTC] Peer connection created successfully for:', data.nickname);
      } catch (error) {
        console.error('❌ [WebRTC] Failed to create peer connection for new user:', {
          nickname: data.nickname,
          socketId: data.socketId,
          error: error,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorStack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    this.socket.on("user-left", (data: { socketId: string; guestUserId: string; nickname: string }) => {
      console.log('👋 [WebRTC] USER LEFT:', {
        nickname: data.nickname,
        socketId: data.socketId,
        guestUserId: data.guestUserId,
        willClosePeerConnection: true,
        timestamp: new Date().toISOString()
      });
      this.closePeerConnection(data.socketId);
      this.onUserLeft(data.socketId);
    });

    this.socket.on("room-participants", (participants: unknown[]) => {
      console.log(`👥 [WebRTC] Room participants received:`, {
        count: Array.isArray(participants) ? participants.length : 0,
        participants: participants
      });
      this.onRealtimeParticipantsUpdate(participants);
    });

    // WebRTC 시그널링 이벤트들
    this.socket.on("offer", async (data: { fromSocketId: string; fromNickname: string; offer: RTCSessionDescriptionInit }) => {
      console.log('📞 [WebRTC] OFFER RECEIVED:', {
        from: data.fromNickname,
        fromSocketId: data.fromSocketId,
        mySocketId: this.socket.id,
        offerType: data.offer.type,
        offerSdp: data.offer.sdp?.substring(0, 100) + '...',
        timestamp: new Date().toISOString()
      });
      
      try {
        await this.createPeerConnection(data.fromSocketId, false, data.fromNickname);
        const pc = this.peerConnections.get(data.fromSocketId);
        if (pc) {
          console.log('🔄 [WebRTC] Setting remote description and creating answer...');
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          
          const answerData: WebRTCAnswer = {
            targetSocketId: data.fromSocketId,
            answer
          };
          this.socket.emit("answer", answerData);
          console.log('📤 [WebRTC] ANSWER SENT:', {
            to: data.fromNickname,
            targetSocketId: data.fromSocketId,
            answerType: answer.type,
            timestamp: new Date().toISOString()
          });
        } else {
          console.error('❌ [WebRTC] Peer connection not found after creation!');
        }
      } catch (error) {
        console.error('❌ [WebRTC] Error handling OFFER:', {
          from: data.fromNickname,
          error: error,
          timestamp: new Date().toISOString()
        });
      }
    });

    this.socket.on("answer", async (data: { fromSocketId: string; fromNickname: string; answer: RTCSessionDescriptionInit }) => {
      console.log('📞 [WebRTC] ANSWER RECEIVED:', {
        from: data.fromNickname,
        fromSocketId: data.fromSocketId,
        mySocketId: this.socket.id,
        answerType: data.answer.type,
        answerSdp: data.answer.sdp?.substring(0, 100) + '...',
        timestamp: new Date().toISOString()
      });
      
      try {
        const pc = this.peerConnections.get(data.fromSocketId);
        if (pc) {
          console.log('🔄 [WebRTC] Setting remote description from answer...');
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          console.log('✅ [WebRTC] ANSWER PROCESSED:', {
            from: data.fromNickname,
            connectionState: pc.connectionState,
            iceConnectionState: pc.iceConnectionState,
            timestamp: new Date().toISOString()
          });
        } else {
          console.error('❌ [WebRTC] Peer connection not found for answer!');
        }
      } catch (error) {
        console.error('❌ [WebRTC] Error handling ANSWER:', {
          from: data.fromNickname,
          error: error,
          timestamp: new Date().toISOString()
        });
      }
    });

    this.socket.on("ice-candidate", async (data: { fromSocketId: string; candidate: RTCIceCandidateInit }) => {
      console.log('🧊 [WebRTC] ICE CANDIDATE RECEIVED:', {
        fromSocketId: data.fromSocketId,
        candidate: data.candidate?.candidate?.substring(0, 50) + '...',
        sdpMid: data.candidate?.sdpMid,
        sdpMLineIndex: data.candidate?.sdpMLineIndex,
        timestamp: new Date().toISOString()
      });
      
      try {
        const pc = this.peerConnections.get(data.fromSocketId);
        if (pc && data.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          console.log('✅ [WebRTC] ICE CANDIDATE ADDED:', {
            fromSocketId: data.fromSocketId,
            iceConnectionState: pc.iceConnectionState,
            connectionState: pc.connectionState,
            timestamp: new Date().toISOString()
          });
        } else if (!pc) {
          console.warn('⚠️ [WebRTC] Peer connection not found for ICE candidate');
        }
      } catch (error) {
        console.error('❌ [WebRTC] Error adding ICE candidate:', {
          fromSocketId: data.fromSocketId,
          error: error,
          timestamp: new Date().toISOString()
        });
      }
    });

    // 채팅 메시지
    this.socket.on("chat-message", (data: unknown) => {
      console.log("💬 [WebRTC] Chat message received:", data);
    });

    // 녹화 관련 이벤트들 - 콜백으로 React 컴포넌트에 전달
    this.socket.on("recording-status-update", (data: any) => {
      console.log("📊 [WebRTC] Recording status update:", data);
      this.onRecordingStatusUpdate(data);
    });

    this.socket.on("players-ready-status", (players: any[]) => {
      console.log("👥 [WebRTC] Players ready status:", players);
      this.onPlayersReadyStatus(players);
    });

    this.socket.on("all-players-ready", () => {
      console.log("✅ [WebRTC] All players ready");
      this.onAllPlayersReady();
    });

    this.socket.on("recording-start-countdown", (data: any) => {
      console.log("⏰ [WebRTC] Recording start countdown:", data);
      this.onRecordingStartCountdown(data);
    });

    this.socket.on("recording-started", () => {
      console.log("🎬 [WebRTC] Recording started");
      this.onRecordingStarted();
    });

    this.socket.on("recording-stopped", () => {
      console.log("⏹️ [WebRTC] Recording stopped");
      this.onRecordingStopped();
    });

    this.socket.on("preparation-status-updated", (data: any) => {
      console.log("🔄 [WebRTC] Preparation status updated 이벤트 수신:", {
        receivedData: data,
        dataType: typeof data,
        callbackExists: typeof this.onPreparationStatusUpdated === 'function',
        timestamp: new Date().toISOString()
      });
      
      if (typeof this.onPreparationStatusUpdated === 'function') {
        console.log("📞 [WebRTC] onPreparationStatusUpdated 콜백 호출 중...");
        this.onPreparationStatusUpdated(data);
        console.log("✅ [WebRTC] onPreparationStatusUpdated 콜백 호출 완료");
      } else {
        console.warn("⚠️ [WebRTC] onPreparationStatusUpdated 콜백이 함수가 아님:", typeof this.onPreparationStatusUpdated);
      }
    });

    // ✅ 캐릭터 상태 업데이트 이벤트 수정 - ID 매핑 처리
    this.socket.on("character-status-updated", (data: any) => {
      console.log("🎨 [WebRTC] Character status updated 이벤트 수신:", {
        receivedData: data,
        dataType: typeof data,
        callbackExists: typeof this.onCharacterStatusUpdated === 'function',
        timestamp: new Date().toISOString()
      });
      
      if (typeof this.onCharacterStatusUpdated === 'function') {
        // 🎯 핵심 수정: WebRTC Manager ID를 실제 플레이어 ID로 변환
        const processedData = this.processCharacterEventData(data);
        
        console.log("📞 [WebRTC] 처리된 캐릭터 데이터로 콜백 호출:", {
          originalData: data,
          processedData: processedData,
          idMapping: {
            webrtcManagerId: this.guestUserId,
            extractedPlayerId: this.extractRealPlayerIdFromWebRTC(this.guestUserId),
            finalDataGuestUserId: processedData.guestUserId
          }
        });
        
        this.onCharacterStatusUpdated(processedData);
        console.log("✅ [WebRTC] onCharacterStatusUpdated 콜백 호출 완료");
      } else {
        console.warn("⚠️ [WebRTC] onCharacterStatusUpdated 콜백이 함수가 아님:", typeof this.onCharacterStatusUpdated);
      }
    });

    this.socket.on("recording-error", (data: any) => {
      console.error("❌ [WebRTC] Recording error:", data);
    });

    this.socket.on("error", (error: { message: string }) => {
      console.error("❌ [WebRTC] Socket error:", error);
      this.onRealtimeConnectionStateChanged(false, error.message);
    });
  }

  // ✅ 개선된 방 참여 로직
  private joinRoom() {
    console.log('🚪 [WebRTC] Attempting to join room...');
    
    // 강화된 중복 참여 방지 (5초로 연장)
    const now = Date.now();
    if (this.isJoiningRoom || (now - this.lastJoinAttempt < 5000)) {
      console.log('⚠️ [WebRTC] Join room attempt blocked - too frequent or already joining', {
        isJoiningRoom: this.isJoiningRoom,
        timeSinceLastAttempt: now - this.lastJoinAttempt,
        roomCode: this.roomCode
      });
      return;
    }
    
    this.isJoiningRoom = true;
    this.lastJoinAttempt = now;
    
    // 타임아웃 설정으로 플래그 강제 해제
    this.joinTimeoutId = setTimeout(() => {
      if (this.isJoiningRoom) {
        console.warn('⚠️ [WebRTC] Join room timeout, resetting flag');
        this.isJoiningRoom = false;
        this.joinTimeoutId = null;
      }
    }, 10000); // 10초 타임아웃
    
    if (!this.guestUserId) {
      console.error('❌ [WebRTC] No guest user ID available, will retry...', {
        retryIn: '1000ms',
        timestamp: new Date().toISOString()
      });
      
      this.isJoiningRoom = false;
      if (this.joinTimeoutId) {
        clearTimeout(this.joinTimeoutId);
        this.joinTimeoutId = null;
      }
      
      setTimeout(() => {
        const realPlayerId = getCurrentUserId();
        this.guestUserId = realPlayerId ? `WEBRTC_${realPlayerId}` : null;
        if (this.guestUserId) {
          console.log('✅ [WebRTC] Guest user ID obtained, retrying join...');
          this.joinRoom();
        } else {
          // 임시 ID 생성하여 연결 시도
          this.guestUserId = `WEBRTC_temp_${this.nickname}_${Date.now()}`;
          this.joinRoom();
        }
      }, 1000);
      return;
    }

    if (!this.roomCode || !this.nickname) {
      console.error('❌ [WebRTC] Missing required values for room join:', {
        hasRoomCode: !!this.roomCode,
        hasGuestUserId: !!this.guestUserId,
        hasNickname: !!this.nickname,
        roomCode: this.roomCode,
        nickname: this.nickname,
        timestamp: new Date().toISOString()
      });
      
      this.isJoiningRoom = false;
      if (this.joinTimeoutId) {
        clearTimeout(this.joinTimeoutId);
        this.joinTimeoutId = null;
      }
      return;
    }

    // WebRTC 매니저는 백그라운드용 고유 닉네임으로 방 참여 (UI에서 필터링됨)
    const webrtcNickname = `WEBRTC_${this.nickname}_${this.guestUserId?.slice(-8) || 'unknown'}_${this.socket.id?.slice(-8) || 'unknown'}`;
    
    console.log('🚀 [WebRTC] JOINING ROOM via Socket.IO (as background WebRTC manager):', {
      roomCode: this.roomCode,
      guestUserId: this.guestUserId,
      originalNickname: this.nickname,
      webrtcNickname: webrtcNickname,
      socketId: this.socket.id,
      purpose: 'WebRTC signaling participant (will be filtered from UI)',
      isReconnect: false,
      timestamp: new Date().toISOString()
    });

    // Socket.IO 방 참여 실행
    this.socket.emit("join-room", {
      roomCode: this.roomCode,
      nickname: webrtcNickname, // WEBRTC_ 접두사로 실제 참여자와 구분
      guestUserId: this.guestUserId
    });
    
    this.isJoiningRoom = false; // 플래그 해제
  }

  // ✅ 개선된 오디오 스트림 설정
  private async setupProcessedAudioStream(): Promise<MediaStream | null> {
    try {
      // 1. 원본 마이크 스트림 획득 (설정 최적화)
      const originalStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100, // 48000 → 44100으로 변경 (더 안정적)
          channelCount: 1
        }
      });

      // 2. Web Audio Context 생성
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(originalStream);

      // 3. 볼륨 정규화 체인 구성
      const compressor = audioContext.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 30;
      compressor.ratio.value = 12;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;

      const gainNode = audioContext.createGain();
      gainNode.gain.value = 1.2; // 개인별 조정 가능

      // 4. 처리된 스트림을 다시 MediaStream으로 변환
      const destination = audioContext.createMediaStreamDestination();

      // 연결: 원본 → 컴프레서 → 게인 → 출력
      source.connect(compressor);
      compressor.connect(gainNode);
      gainNode.connect(destination);

      console.log('🎛️ [WebRTC] Audio processing chain created:', {
        originalTracks: originalStream.getAudioTracks().length,
        processedTracks: destination.stream.getAudioTracks().length,
        audioContext: {
          state: audioContext.state,
          sampleRate: audioContext.sampleRate
        }
      });

      // 5. 처리된 스트림 반환
      return destination.stream;
    } catch (error) {
      console.warn('⚠️ [WebRTC] Failed to setup audio processing, falling back to basic stream:', error);
      // Web Audio API 실패 시 기본 스트림으로 폴백
      return await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
    }
  }

  // 마이크 초기화 (Socket 연결 직후 자동 호출)
  private async initializeMicrophone(): Promise<void> {
    // 이미 마이크가 초기화되어 있으면 건너뜀
    if (this.localStream) {
      console.log('🎤 [WebRTC] Microphone already initialized, skipping...');
      return;
    }

    console.log('🎤 [WebRTC] Initializing microphone...');
    
    // 브라우저 호환성 확인
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error('❌ [WebRTC] getUserMedia is not supported in this browser');
      throw new Error('이 브라우저는 마이크 기능을 지원하지 않습니다.');
    }

    try {
      // 1단계: 권한 상태 확인 (Chrome의 경우 정확하지 않을 수 있음)
      if ('permissions' in navigator) {
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          console.log('🔐 [WebRTC] Permission API status:', permissionStatus.state);
        } catch (permError) {
          console.warn('⚠️ [WebRTC] Permission API not available:', permError);
        }
      }

      // 2단계: 실제 마이크 접근 시도 (여러 방법으로 시도)
      console.log('🎤 [WebRTC] Attempting microphone access...');
      
      let stream: MediaStream | null = null;
      const attempts = [
        // 시도 1: 고품질 오디오 (Web Audio API 처리 포함)
        async () => {
          console.log('🎤 [WebRTC] Attempt 1: High-quality audio with processing');
          return await this.setupProcessedAudioStream();
        },
        // 시도 2: 기본 오디오 (에코 캔슬레이션 포함)
        async () => {
          console.log('🎤 [WebRTC] Attempt 2: Basic audio with echo cancellation');
          return await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
        },
        // 시도 3: 최소한의 오디오 설정
        async () => {
          console.log('🎤 [WebRTC] Attempt 3: Minimal audio settings');
          return await navigator.mediaDevices.getUserMedia({
            audio: true
          });
        }
      ];

      for (let i = 0; i < attempts.length; i++) {
        try {
          stream = await attempts[i]();
          if (stream && stream.getAudioTracks().length > 0) {
            console.log(`✅ [WebRTC] Microphone access successful on attempt ${i + 1}`);
            break;
          }
        } catch (attemptError) {
          console.warn(`⚠️ [WebRTC] Attempt ${i + 1} failed:`, attemptError);
          if (i === attempts.length - 1) {
            throw attemptError;
          }
        }
      }

      if (!stream || stream.getAudioTracks().length === 0) {
        throw new Error('모든 마이크 접근 시도가 실패했습니다.');
      }

      this.localStream = stream;

      console.log('✅ [WebRTC] Microphone initialized successfully:', {
        streamId: this.localStream.id,
        audioTracks: this.localStream.getAudioTracks().length,
        videoTracks: this.localStream.getVideoTracks().length,
        audioTrackSettings: this.localStream.getAudioTracks()[0]?.getSettings()
      });

      // 연결 상태 업데이트
      this.connectionState.localStream = this.localStream;
      this.onConnectionStateChanged(this.connectionState);

    } catch (error) {
      console.error('❌ [WebRTC] Microphone initialization failed:', error);
      
      // 구체적인 에러 메시지 제공
      let errorMessage = '마이크 접근에 실패했습니다.';
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = '마이크 권한이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = '마이크 장치를 찾을 수 없습니다. 마이크가 연결되어 있는지 확인해주세요.';
        } else if (error.name === 'NotReadableError') {
          errorMessage = '다른 애플리케이션에서 마이크를 사용 중입니다. 다른 프로그램을 종료하고 다시 시도해주세요.';
        } else if (error.name === 'OverconstrainedError') {
          errorMessage = '마이크 설정이 지원되지 않습니다. 다른 마이크를 사용해보세요.';
        } else if (error.message) {
          errorMessage = error.message;
        }
      }
      
      throw new Error(errorMessage);
    }
  }

  public async start(): Promise<MediaStream | null> {
    console.log('🎵 [WebRTC] Starting local media stream...');
    
    // 이미 마이크가 초기화되어 있으면 기존 스트림 반환
    if (this.localStream) {
      console.log('✅ [WebRTC] Using existing microphone stream:', {
        streamId: this.localStream.id,
        audioTracks: this.localStream.getAudioTracks().length
      });
      return this.localStream;
    }

    // 마이크 초기화 시도
    try {
      await this.initializeMicrophone();
      return this.localStream;
    } catch (error) {
      console.error('❌ [WebRTC] Failed to initialize microphone in start():', error);
      this.onJoinRoomError({ 
        message: typeof error === 'string' ? error : (error as Error).message || '마이크 접근에 실패했습니다.' 
      });
      return null;
    }
  }

  // ✅ 강화된 Peer Connection 생성
  private async createPeerConnection(targetSocketId: string, isOfferer: boolean, nickname: string = 'Unknown') {
    console.log('🔗 [WebRTC] CREATING PEER CONNECTION:', {
      targetNickname: nickname,
      targetSocketId: targetSocketId,
      mySocketId: this.socket.id,
      isOfferer: isOfferer,
      existingConnections: this.peerConnections.size,
      timestamp: new Date().toISOString()
    });
    
    // 이미 연결이 있는지 확인
    if (this.peerConnections.has(targetSocketId)) {
      console.warn('⚠️ [WebRTC] Peer connection already exists:', {
        targetSocketId,
        nickname,
        connectionState: this.peerConnections.get(targetSocketId)?.connectionState
      });
      return;
    }
    
    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" }
        ],
      });
      
      console.log('⚙️ [WebRTC] RTCPeerConnection created with STUN servers');

      // 연결 상태 추적
      const peerState: PeerConnectionState = {
        socketId: targetSocketId,
        nickname,
        connectionState: 'new',
        hasAudio: false,
        isMuted: false
      };
      this.peerStates.set(targetSocketId, peerState);
      
      console.log('📋 [WebRTC] Peer state initialized:', peerState);

      // 연결 상태 변경 감지
      pc.onconnectionstatechange = () => {
        const state = this.peerStates.get(targetSocketId);
        if (state) {
          const prevState = state.connectionState;
          state.connectionState = pc.connectionState;
          console.log('🔄 [WebRTC] CONNECTION STATE CHANGED:', {
            nickname,
            targetSocketId,
            previousState: prevState,
            newState: pc.connectionState,
            iceConnectionState: pc.iceConnectionState,
            iceGatheringState: pc.iceGatheringState,
            signalingState: pc.signalingState,
            timestamp: new Date().toISOString()
          });
          this.notifyStateChanged();
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const candidateData: WebRTCIceCandidate = {
            targetSocketId: targetSocketId,
            candidate: event.candidate,
          };
          this.socket.emit("ice-candidate", candidateData);
          console.log('🧊 [WebRTC] ICE CANDIDATE SENT:', {
            to: nickname,
            targetSocketId,
            candidate: event.candidate.candidate?.substring(0, 50) + '...',
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            timestamp: new Date().toISOString()
          });
        } else {
          console.log('🏁 [WebRTC] ICE gathering complete for:', nickname);
        }
      };

      pc.ontrack = (event) => {
        console.log('🎵 [WebRTC] REMOTE STREAM RECEIVED:', {
          from: nickname,
          targetSocketId,
          streamId: event.streams[0]?.id,
          tracks: event.streams[0]?.getTracks().map(track => ({
            kind: track.kind,
            id: track.id,
            enabled: track.enabled,
            readyState: track.readyState
          })),
          audioTracks: event.streams[0]?.getAudioTracks().length || 0,
          videoTracks: event.streams[0]?.getVideoTracks().length || 0,
          timestamp: new Date().toISOString()
        });
        
        const state = this.peerStates.get(targetSocketId);
        if (state) {
          state.hasAudio = event.streams[0].getAudioTracks().length > 0;
          console.log('🔊 [WebRTC] Audio track status updated:', {
            nickname,
            hasAudio: state.hasAudio
          });
          this.notifyStateChanged();
        }
        this.onRemoteStream(targetSocketId, event.streams[0]);
      };

      // ✅ 개선된 ICE 연결 상태 처리
      pc.oniceconnectionstatechange = () => {
        console.log('❄️ [WebRTC] ICE CONNECTION STATE CHANGED:', {
          nickname,
          targetSocketId,
          iceConnectionState: pc.iceConnectionState,
          connectionState: pc.connectionState,
          timestamp: new Date().toISOString()
        });
        
        // ICE 연결 실패 시 복구 로직
        if (pc.iceConnectionState === 'failed') {
          console.error('❌ [WebRTC] ICE connection FAILED, attempting recovery:', {
            nickname,
            targetSocketId,
            allStates: {
              connectionState: pc.connectionState,
              iceConnectionState: pc.iceConnectionState,
              iceGatheringState: pc.iceGatheringState,
              signalingState: pc.signalingState
            }
          });
          
          // ICE 재시작 시도
          try {
            pc.restartIce();
            console.log('🔄 [WebRTC] ICE restart initiated for:', nickname);
          } catch (restartError) {
            console.error('❌ [WebRTC] ICE restart failed:', restartError);
          }
          
          // 재시도 횟수 확인
          const attempts = this.reconnectionAttempts.get(targetSocketId) || 0;
          if (attempts < this.maxReconnectionAttempts) {
            this.reconnectionAttempts.set(targetSocketId, attempts + 1);
            
            // 3초 후에도 실패하면 연결 재생성
            setTimeout(() => {
              if (pc.iceConnectionState === 'failed') {
                console.log('🔄 [WebRTC] Attempting peer connection recreation for:', nickname);
                this.closePeerConnection(targetSocketId);
                this.createPeerConnection(targetSocketId, true, nickname);
              }
            }, 3000);
          } else {
            console.error('❌ [WebRTC] Max reconnection attempts reached for:', nickname);
            this.onJoinRoomError({
              message: `${nickname}와의 연결을 복구할 수 없습니다. 새로고침을 시도해주세요.`
            });
          }
        } else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          // 연결 성공 시 재시도 횟수 초기화
          this.reconnectionAttempts.delete(targetSocketId);
        }
      };

      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          pc.addTrack(track, this.localStream!);
          console.log('➕ [WebRTC] LOCAL TRACK ADDED:', {
            to: nickname,
            trackKind: track.kind,
            trackId: track.id,
            enabled: track.enabled,
            readyState: track.readyState,
            timestamp: new Date().toISOString()
          });
        });
      } else {
        console.warn('⚠️ [WebRTC] No local stream available to add tracks - will retry after stream initialization');
        
        // 로컬 스트림이 준비될 때까지 대기하고 나중에 트랙 추가
        const waitForLocalStream = async () => {
          let attempts = 0;
          const maxAttempts = 50; // 5초 대기
          
          while (!this.localStream && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
          }
          
          if (this.localStream && this.peerConnections.has(targetSocketId)) {
            const connection = this.peerConnections.get(targetSocketId);
            if (connection) {
              console.log('🔄 [WebRTC] Adding local tracks to existing peer connection:', {
                to: nickname,
                targetSocketId,
                streamId: this.localStream.id,
                audioTracks: this.localStream.getAudioTracks().length
              });
              
              this.localStream.getTracks().forEach(track => {
                connection.addTrack(track, this.localStream!);
                console.log('➕ [WebRTC] DELAYED LOCAL TRACK ADDED:', {
                  to: nickname,
                  trackKind: track.kind,
                  trackId: track.id,
                  enabled: track.enabled,
                  readyState: track.readyState,
                  timestamp: new Date().toISOString()
                });
              });
              
              // 새로운 offer 생성하여 변경사항 전달
              if (isOfferer) {
                try {
                  const newOffer = await connection.createOffer();
                  await connection.setLocalDescription(newOffer);
                  
                  const offerData: WebRTCOffer = {
                    targetSocketId: targetSocketId,
                    offer: newOffer
                  };
                  
                  this.socket.emit("offer", offerData);
                  console.log('📤 [WebRTC] NEW OFFER SENT after adding tracks:', {
                    to: nickname,
                    targetSocketId,
                    timestamp: new Date().toISOString()
                  });
                } catch (error) {
                  console.error('❌ [WebRTC] Error creating new offer after adding tracks:', error);
                }
              }
            }
          } else {
            console.error('❌ [WebRTC] Failed to add tracks - local stream or peer connection not available');
          }
        };
        
        waitForLocalStream();
      }

      this.peerConnections.set(targetSocketId, pc);

      if (isOfferer) {
        try {
          console.log('📤 [WebRTC] Creating offer...');
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          
          const offerData: WebRTCOffer = {
            targetSocketId: targetSocketId, 
            offer 
          };
          
          console.log('📤 [WebRTC] OFFER CREATED & SENDING:', {
            to: nickname,
            targetSocketId,
            offerType: offer.type,
            offerSdp: offer.sdp?.substring(0, 100) + '...',
            localDescription: {
              type: pc.localDescription?.type,
              sdp: pc.localDescription?.sdp?.substring(0, 100) + '...'
            },
            timestamp: new Date().toISOString()
          });
          
          this.socket.emit("offer", offerData);
        } catch (error) {
          console.error('❌ [WebRTC] Error creating OFFER:', {
            to: nickname,
            error: error,
            timestamp: new Date().toISOString()
          });
          throw error;
        }
      }
    } catch (error) {
      console.error('❌ [WebRTC] Peer connection creation failed:', error);
      
      // 실패한 연결 정리
      this.peerConnections.delete(targetSocketId);
      this.peerStates.delete(targetSocketId);
      
      // 사용자에게 알림
      this.onJoinRoomError({ 
        message: `${nickname}와의 연결에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}` 
      });
      
      throw error;
    }
  }

  private closePeerConnection(sid: string) {
    const pc = this.peerConnections.get(sid);
    const state = this.peerStates.get(sid);
    
    console.log('🔌 [WebRTC] CLOSING PEER CONNECTION:', {
      targetSocketId: sid,
      nickname: state?.nickname || 'Unknown',
      hadConnection: !!pc,
      hadState: !!state,
      connectionState: pc?.connectionState,
      iceConnectionState: pc?.iceConnectionState,
      remainingConnections: this.peerConnections.size - (pc ? 1 : 0),
      timestamp: new Date().toISOString()
    });
    
    if (pc) {
      pc.close();
      this.peerConnections.delete(sid);
    }
    
    if (state) {
      this.peerStates.delete(sid);
      this.notifyStateChanged();
    }
    
    // 재시도 횟수도 정리
    this.reconnectionAttempts.delete(sid);
    
    console.log('✅ [WebRTC] Peer connection cleanup completed for:', state?.nickname || sid);
  }

  // ✅ 개선된 상태 알림
  private notifyStateChanged() {
    const state: VoiceChatState = {
      localStream: this.localStream,
      remoteStreams: new Map(), // 이것은 useVoiceChat에서 관리
      peerConnections: new Map(this.peerStates),
      isLocalMuted: this.isLocalMuted,
      isConnected: this.socket.connected
    };
    
    this.onConnectionStateChanged(state);
    this.onPeerConnectionStateChanged(new Map(this.peerStates));
  }

  public muteLocalAudio(): boolean {
    if (!this.localStream) {
      console.warn('⚠️ No local stream available to mute');
      return false;
    }

    const audioTracks = this.localStream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.warn('⚠️ No audio tracks found in local stream');
      return false;
    }

    audioTracks.forEach(track => {
      track.enabled = false;
    });
    
    this.isLocalMuted = true;
    console.log('🔇 Local audio muted');
    this.notifyStateChanged();
    return true;
  }

  public unmuteLocalAudio(): boolean {
    if (!this.localStream) {
      console.warn('⚠️ No local stream available to unmute');
      return false;
    }

    const audioTracks = this.localStream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.warn('⚠️ No audio tracks found in local stream');
      return false;
    }

    audioTracks.forEach(track => {
      track.enabled = true;
    });
    
    this.isLocalMuted = false;
    console.log('🔊 Local audio unmuted');
    this.notifyStateChanged();
    return true;
  }

  public toggleLocalAudio(): boolean {
    return this.isLocalMuted ? this.unmuteLocalAudio() : this.muteLocalAudio();
  }

  public getVoiceChatState(): VoiceChatState {
    return {
      localStream: this.localStream,
      remoteStreams: new Map(), // 이것은 useVoiceChat에서 관리
      peerConnections: new Map(this.peerStates),
      isLocalMuted: this.isLocalMuted,
      isConnected: this.socket.connected
    };
  }

  public getPeerConnectionStates(): Map<string, PeerConnectionState> {
    return new Map(this.peerStates);
  }

  // ✅ 새로 추가: 진단 정보 제공
  public getConnectionDiagnostics() {
    return {
      socketConnected: this.socket.connected,
      socketId: this.socket.id,
      localStreamActive: !!this.localStream,
      localStreamTracks: this.localStream?.getTracks().length || 0,
      totalPeerConnections: this.peerConnections.size,
      connectedPeers: this.getConnectedPeersCount(),
      roomCode: this.roomCode,
      guestUserId: this.guestUserId,
      nickname: this.nickname,
      isJoining: this.isJoiningRoom,
      lastJoinAttempt: new Date(this.lastJoinAttempt).toISOString(),
      reconnectionAttempts: Object.fromEntries(this.reconnectionAttempts),
      peerStates: Array.from(this.peerStates.entries()).map(([id, state]) => ({
        socketId: id,
        nickname: state.nickname,
        connectionState: state.connectionState,
        hasAudio: state.hasAudio,
        isMuted: state.isMuted
      }))
    };
  }

  // ✅ 강화된 종료 로직
  public close() {
    console.log("🧹 [WebRTC] Closing all connections and leaving room.");
    
    // 타이머들 정리
    if (this.joinTimeoutId) {
      clearTimeout(this.joinTimeoutId);
      this.joinTimeoutId = null;
    }
    
    if (this.qualityCheckInterval) {
      clearInterval(this.qualityCheckInterval);
      this.qualityCheckInterval = null;
    }
    
    // 방 나가기 이벤트 emit (roomCode 포함)
    if (this.socket.connected && this.roomCode) {
      this.socket.emit("leave-room", {
        roomCode: this.roomCode
      });
    }
    
    // 로컬 스트림 정리
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
        console.log('🛑 [WebRTC] Local track stopped:', track.kind);
      });
      this.localStream = null;
    }
    
    // P2P 연결 정리
    this.peerConnections.forEach((pc, socketId) => {
      console.log('🔌 [WebRTC] Closing peer connection:', socketId);
      pc.close();
    });
    this.peerConnections.clear();
    this.peerStates.clear();
    this.reconnectionAttempts.clear();
    
    // Socket.IO 연결 해제
    this.socket.disconnect();
    
    // 상태 초기화
    this.isJoiningRoom = false;
    this.lastJoinAttempt = 0;
    
    // 연결 상태 업데이트
    this.connectionState.isConnected = false;
    this.connectionState.localStream = null;
    this.onRealtimeConnectionStateChanged(false);
    
    console.log("✅ [WebRTC] WebRTC Manager cleanup 완료");
  }

  // 기존 메서드들 유지...
  public sendChatMessage(message: string) {
    this.socket.emit("chat-message", {
      roomCode: this.roomCode,
      message,
      timestamp: new Date().toISOString()
    });
  }

  public startRecording() {
    this.socket.emit("start-recording", {
      roomCode: this.roomCode
    });
  }

  public stopRecording() {
    this.socket.emit("stop-recording", {
      roomCode: this.roomCode
    });
  }

  public updatePreparationStatus(characterSetup: boolean, screenSetup: boolean) {
    this.socket.emit("update-preparation-status", {
      characterSetup,
      screenSetup
    });
  }

  // ✅ 새로 추가: 녹화 관련 메서드들
  public updatePlayerReadyStatus(isReady: boolean, playerName: string, screenSetup: boolean = true) {
    console.log(`🎯 [WebRTC] Updating player ready status: ${isReady}`);
    this.socket.emit("update-preparation-status", {
      roomCode: this.roomCode,
      playerId: this.guestUserId,
      playerName: playerName,
      characterSetup: true, // 캐릭터 설정은 항상 true (현재 비활성화)
      screenSetup: screenSetup, // 화면 설정 상태
      isReady: isReady
    });
  }

  public stopRecordingAsHost() {
    console.log('⏹️ [WebRTC] Host stopping recording...');
    this.socket.emit("stop-recording", {
      roomCode: this.roomCode,
      hostId: this.guestUserId
    });
  }

  public reportRecordingError(error: string) {
    console.error(`❌ [WebRTC] Reporting recording error: ${error}`);
    this.socket.emit("recording-error", {
      roomCode: this.roomCode,
      playerId: this.guestUserId,
      error: error
    });
  }

  public requestRoomUsers() {
    this.socket.emit("request-room-users", {
      roomCode: this.roomCode
    });
  }

  // 게터 메서드들
  public getSocket(): Socket {
    return this.socket;
  }

  public getRoomCode(): string {
    return this.roomCode;
  }

  public getGuestUserId(): string | null {
    return this.guestUserId;
  }

  public getNickname(): string {
    return this.nickname;
  }

  public getIsLocalMuted(): boolean {
    return this.isLocalMuted;
  }

  public getConnectedPeersCount(): number {
    return Array.from(this.peerStates.values())
      .filter(state => state.connectionState === 'connected').length;
  }

  public getActiveSpeakers(): string[] {
    return Array.from(this.peerStates.values())
      .filter(state => state.hasAudio && !state.isMuted)
      .map(state => state.nickname);
  }

  // 녹화 시스템 메서드들
  emitUpdatePreparationStatus(data: {
    roomCode: string;
    playerId: string;
    playerName: string;
    characterSetup: boolean;
    screenSetup: boolean;
    isReady: boolean;
  }) {
    console.log('🎯 [WebRTC] Emitting preparation status update:', {
      data,
      socketExists: !!this.socket,
      socketConnected: this.socket?.connected,
      socketId: this.socket?.id,
      timestamp: new Date().toISOString()
    });
    
    if (!this.socket) {
      console.error('❌ [WebRTC] Socket not available for emitUpdatePreparationStatus');
      return;
    }
    
    if (!this.socket.connected) {
      console.error('❌ [WebRTC] Socket not connected for emitUpdatePreparationStatus');
      return;
    }
    
    try {
      this.socket.emit('update-preparation-status', data);
      console.log('📤 [WebRTC] update-preparation-status 이벤트 전송 완료');
    } catch (error) {
      console.error('❌ [WebRTC] update-preparation-status 이벤트 전송 실패:', error);
    }
  }

  // ✅ 순수 Socket.IO 기반 캐릭터 상태 전송 (서버 핸들러 활용)
  emitUpdateCharacterStatus(data: {
    selectedOptions: Record<string, string>;
    selectedColors: Record<string, string>;
    guestUserId: string;
    nickname: string;
    updatedAt: string;
  }) {
    console.log('🎨 [WebRTC] Emitting character status update via Socket.IO:', {
      data,
      socketExists: !!this.socket,
      socketConnected: this.socket?.connected,
      socketId: this.socket?.id,
      timestamp: new Date().toISOString()
    });
    
    if (!this.socket) {
      console.error('❌ [WebRTC] Socket not available for emitUpdateCharacterStatus');
      return;
    }
    
    if (!this.socket.connected) {
      console.error('❌ [WebRTC] Socket not connected for emitUpdateCharacterStatus');
      return;
    }
    
    try {
      // 서버의 handleCharacterStatusUpdate() 호출 - 완전한 데이터 전송
      this.socket.emit('update-character-status', {
        selectedOptions: data.selectedOptions,
        selectedColors: data.selectedColors,
        guestUserId: data.guestUserId,
        nickname: data.nickname,
        updatedAt: data.updatedAt
      });
      console.log('📤 [WebRTC] update-character-status 이벤트 전송 완료:', {
        webrtcManagerId: this.guestUserId,
        realPlayerIdUsed: data.guestUserId,
        message: '실제 플레이어 ID로 캐릭터 데이터 전송됨 → 서버가 handleCharacterStatusUpdate 처리'
      });
    } catch (error) {
      console.error('❌ [WebRTC] update-character-status 이벤트 전송 실패:', error);
    }
  }

  // ✅ 간단한 준비 상태 전송 (서버 PreparationStatusData 스펙에 맞춤)
  emitSimplePreparationStatus(data: {
    characterSetup: boolean;
    screenSetup: boolean;
  }) {
    console.log('🎯 [WebRTC] Emitting simple preparation status:', {
      data,
      socketExists: !!this.socket,
      socketConnected: this.socket?.connected,
      timestamp: new Date().toISOString()
    });
    
    if (!this.socket) {
      console.error('❌ [WebRTC] Socket not available for emitSimplePreparationStatus');
      return;
    }
    
    if (!this.socket.connected) {
      console.error('❌ [WebRTC] Socket not connected for emitSimplePreparationStatus');
      return;
    }
    
    try {
      // 서버 PreparationStatusData 인터페이스에 맞춰 전송
      this.socket.emit('update-preparation-status', {
        characterSetup: data.characterSetup,
        screenSetup: data.screenSetup
      });
      console.log('📤 [WebRTC] update-preparation-status 이벤트 전송 완료');
    } catch (error) {
      console.error('❌ [WebRTC] update-preparation-status 이벤트 전송 실패:', error);
    }
  }

  emitStartRecording(data: { roomCode: string; hostId: string }) {
    console.log('🎬 [WebRTC] Emitting start recording:', data);
    this.socket.emit('start-recording', data);
  }

  emitStopRecording(data: { roomCode: string; hostId: string }) {
    console.log('⏹️ [WebRTC] Emitting stop recording:', data);
    this.socket.emit('stop-recording', data);
  }

  emitRecordingError(data: { roomCode: string; playerId: string; error: string }) {
    console.log('❌ [WebRTC] Emitting recording error:', data);
    this.socket.emit('recording-error', data);
  }

  // Socket.IO 연결 상태 확인
  isSocketConnected(): boolean {
    return this.socket?.connected || false;
  }

  // 현재 방 코드 반환
  getCurrentRoomCode(): string {
    return this.roomCode;
  }

  // 현재 사용자 ID 반환  
  getCurrentGuestUserId(): string | null {
    return this.guestUserId;
  }

  // 🎯 새로 추가: WebRTC Manager ID에서 실제 플레이어 ID 추출
  private extractRealPlayerIdFromWebRTC(webrtcId: string | null): string | null {
    if (!webrtcId) return null;
    
    // WEBRTC_ 접두사 제거하여 실제 플레이어 ID 추출
    if (webrtcId.startsWith('WEBRTC_')) {
      return webrtcId.replace('WEBRTC_', '');
    }
    
    return webrtcId; // 이미 실제 ID인 경우
  }

  // 🎯 새로 추가: 캐릭터 이벤트 데이터 처리 (ID 매핑)
  private processCharacterEventData(data: any): any {
    if (!data || typeof data !== 'object') {
      console.warn('⚠️ [WebRTC] 잘못된 캐릭터 이벤트 데이터:', data);
      return data;
    }

    // 현재 WebRTC Manager의 실제 플레이어 ID 추출
    const realPlayerId = this.extractRealPlayerIdFromWebRTC(this.guestUserId);
    
    if (!realPlayerId) {
      console.warn('⚠️ [WebRTC] 실제 플레이어 ID를 추출할 수 없음:', this.guestUserId);
      return data;
    }

    // 캐릭터 데이터를 실제 플레이어 ID로 처리
    const processedData = {
      ...data,
      guestUserId: realPlayerId,  // 핵심: 실제 플레이어 ID로 변경
      originalWebRTCId: this.guestUserId  // 디버깅용
    };

    console.log('🔄 [WebRTC] 캐릭터 이벤트 데이터 ID 변환:', {
      webrtcId: this.guestUserId,
      extractedPlayerId: realPlayerId,
      originalData: data,
      processedData: processedData
    });

    return processedData;
  }

  // 🎯 새로 추가: 실제 플레이어 ID 반환 (public 메서드)
  getRealPlayerId(): string | null {
    return this.extractRealPlayerIdFromWebRTC(this.guestUserId);
  }
}
