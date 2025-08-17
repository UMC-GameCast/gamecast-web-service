import { io, Socket } from "socket.io-client";
import { getCurrentUserId } from './roomManager';
import { SOCKET_URL } from '../config/server.config';
import type { 
  ParticipantUpdateEvent, 
  WebRTCOffer, 
  WebRTCAnswer, 
  WebRTCIceCandidate,
  PeerConnectionState,
  VoiceChatState
} from '../types/room';

export class WebRTCManager {
  private socket: Socket;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private peerStates: Map<string, PeerConnectionState> = new Map();
  // 🔧 Socket ID <-> guestUserId 매핑 추가
  private socketToUserIdMapping: Map<string, string> = new Map();
  private userIdToSocketMapping: Map<string, string> = new Map();
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
    
    // 🔧 강화된 guestUserId 초기화
    const realPlayerId = getCurrentUserId();
    this.guestUserId = realPlayerId || null;
    
    console.log('🔧 [WebRTC] Constructor initialization:', {
      roomCode: this.roomCode,
      nickname: this.nickname,
      guestUserId: this.guestUserId,
      hasGuestUserId: !!this.guestUserId,
      realPlayerId: realPlayerId
    });
    
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
      serverUrl: SOCKET_URL,
      timestamp: new Date().toISOString()
    });
    
    // WebSocket 전용 연결 설정 (enhanced retry logic)
    // WebRTC 음성 전용 경로로 연결
    this.socket = io(SOCKET_URL, {
      path: '/webrtc-voice',
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

  // ✅ 강화된 연결 품질 체크
  private checkConnectionQuality() {
    this.peerConnections.forEach(async (pc, socketId) => {
      try {
        const stats = await pc.getStats();
        let audioStats = {
          packetsLost: 0,
          packetsReceived: 0,
          jitter: 0,
          roundTripTime: 0,
          audioLevel: 0
        };
        
        stats.forEach(report => {
          if (report.type === 'inbound-rtp' && report.kind === 'audio') {
            audioStats.packetsLost = report.packetsLost || 0;
            audioStats.packetsReceived = report.packetsReceived || 0;
            audioStats.jitter = report.jitter || 0;
            audioStats.audioLevel = report.audioLevel || 0;
          }
          
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            audioStats.roundTripTime = report.currentRoundTripTime || 0;
          }
        });
        
        const totalPackets = audioStats.packetsReceived + audioStats.packetsLost;
        if (totalPackets > 0) {
          const lossRate = audioStats.packetsLost / totalPackets;
          const jitterMs = audioStats.jitter * 1000;
          const rttMs = audioStats.roundTripTime * 1000;
          
          let quality: 'good' | 'poor' | 'bad' = 'good';
          let issues: string[] = [];
          
          if (lossRate > 0.05) {
            quality = lossRate > 0.1 ? 'bad' : 'poor';
            issues.push(`${(lossRate * 100).toFixed(1)}% 패킷 손실`);
          }
          
          if (jitterMs > 50) {
            quality = quality === 'good' ? 'poor' : quality;
            issues.push(`${jitterMs.toFixed(1)}ms 지터`);
          }
          
          if (rttMs > 200) {
            quality = quality === 'good' ? 'poor' : quality;
            issues.push(`${rttMs.toFixed(1)}ms RTT`);
          }
          
          if (quality !== 'good' && Math.random() < 0.1) { // 10% 확률로만 로깅
            console.warn(`⚠️ [WebRTC] 연결 품질 문제 (${socketId}):`, {
              quality,
              issues: issues.join(', '),
              stats: audioStats
            });
            this.onConnectionQualityChanged(socketId, quality);
          }
        }
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
        serverUrl: SOCKET_URL,
        roomCode: this.roomCode,
        nickname: this.nickname,
        isReconnection: !!this.socket.recovered,
        timestamp: new Date().toISOString()
      });
      
      // 연결 상태 업데이트
      this.connectionState.isConnected = true;
      this.onRealtimeConnectionStateChanged(true);
      
      // 재연결 시 기존 P2P 연결들 정리
      if (this.peerConnections.size > 0) {
        console.log('🧹 [WebRTC] Cleaning up existing peer connections on reconnect');
        this.peerConnections.forEach(pc => pc.close());
        this.peerConnections.clear();
        this.peerStates.clear();
        this.reconnectionAttempts.clear();
      }
      
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
      
      // 방 참여 (재연결 감지)
      this.joinRoom();
    });

    this.socket.on("connect_error", (error) => {
      const errorMessage = this.getConnectionErrorMessage(error);
      console.error('🔴 [WebRTC] Socket connection ERROR:', {
        error: error.message,
        type: (error as any).type,
        description: (error as any).description,
        serverUrl: SOCKET_URL,
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

    this.socket.on("joined-room-success", async (data: { roomCode: string; roomId: string; users: unknown[] }) => {
      console.log('🎉 [WebRTC] Room join SUCCESS:', {
        roomCode: data.roomCode,
        roomId: data.roomId,
        userCount: Array.isArray(data.users) ? data.users.length : 'invalid',
        users: data.users,
        timestamp: new Date().toISOString()
      });
      
      // 🔧 기존 방 참여자들의 매핑 정보 수집 (WebRTC 연결 구분)
      if (Array.isArray(data.users)) {
        data.users.forEach((user: any) => {
          if (user.socketId && user.socketId !== this.socket.id) {
            // WebRTC 연결인 경우 parentGuestUserId 사용, 아니면 guestUserId 사용
            const targetUserId = user.parentGuestUserId || user.guestUserId;
            
            if (targetUserId) {
              this.socketToUserIdMapping.set(user.socketId, targetUserId);
              this.userIdToSocketMapping.set(targetUserId, user.socketId);
              
              console.log('🗺️ [WebRTC] Collected initial mapping:', {
                socketId: user.socketId,
                originalGuestUserId: user.guestUserId,
                targetUserId: targetUserId,
                nickname: user.nickname,
                isWebRTCConnection: !!user.parentGuestUserId
              });
            }
          }
        });
        
        console.log('🗺️ [WebRTC] Total initial mappings:', this.socketToUserIdMapping.size);
      }
      
      // 🔧 해결 방안: joined-room-success에서는 기존 사용자와 P2P 연결 시도하지 않음
      // 대신 기존 사용자들이 새로운 사용자 참여를 감지하면 user-joined 이벤트로 P2P 연결 시작
      if (Array.isArray(data.users)) {
        console.log('🔍 [P2P DEBUG] 🚀 Processing existing users - socketId availability check:', {
          totalUsers: data.users.length,
          mySocketId: this.socket.id,
          users: data.users.map(u => ({
            socketId: u.socketId,
            nickname: u.nickname,
            guestUserId: u.guestUserId,
            hasSocketId: !!u.socketId,
            isMe: u.socketId === this.socket.id,
            isWebRTC: u.nickname?.startsWith('WEBRTC_'),
            canConnect: u.socketId && u.socketId !== this.socket.id && !u.nickname?.startsWith('WEBRTC_')
          }))
        });
        
        // socketId가 없는 사용자들 카운트
        const usersWithoutSocketId = data.users.filter(u => !u.socketId && !u.nickname?.startsWith('WEBRTC_'));
        if (usersWithoutSocketId.length > 0) {
          console.log('🔍 [P2P DEBUG] ⚠️ Found users without socketId (cannot create P2P):', {
            count: usersWithoutSocketId.length,
            users: usersWithoutSocketId.map(u => ({
              nickname: u.nickname,
              guestUserId: u.guestUserId
            })),
            reason: 'Server provided REST API data without active Socket.IO connection info'
          });
          
          console.log('🔍 [P2P DEBUG] 💡 Solution: These users will connect via user-joined events when they start their WebRTC managers');
        }
        
        // 🔧 SKIP P2P connections in joined-room-success
        // 문제: 기존 사용자들의 socketId가 없어서 P2P 연결 불가능
        // 해결책: user-joined 이벤트에서만 P2P 연결 수행
        console.log('🔍 [P2P DEBUG] ⏭️ Skipping P2P connections in joined-room-success');
        console.log('🔍 [P2P DEBUG] 💡 P2P connections will be established via user-joined events');
        
        // 기존 사용자 중 socketId가 있는 사용자들만 카운트 (통계용)
        const usersWithSocketId = data.users.filter(u => u.socketId && u.socketId !== this.socket.id && !u.nickname?.startsWith('WEBRTC_'));
        console.log('🔍 [P2P DEBUG] 📊 Statistics:', {
          totalUsersInResponse: data.users.length,
          usersWithSocketId: usersWithSocketId.length,
          mySocketId: this.socket.id,
          note: 'P2P connections will happen when other users receive user-joined events'
        });
      }
      
      // 방 참여 성공 시 플래그 및 타임아웃 해제
      this.isJoiningRoom = false;
      if (this.joinTimeoutId) {
        clearTimeout(this.joinTimeoutId);
        this.joinTimeoutId = null;
      }
      
      // ✅ 기존 사용자들과 P2P 연결 생성 (재연결 대응)
      if (Array.isArray(data.users) && data.users.length > 1) {
        console.log('🔄 [WebRTC] Found existing users, creating peer connections:', {
          totalUsers: data.users.length,
          users: data.users.map((u: any) => ({ socketId: u.socketId, nickname: u.nickname }))
        });
        
        for (const user of data.users) {
          const userData = user as any;
          // 자신이 아닌 사용자들과 연결 생성
          if (userData.socketId && userData.socketId !== this.socket.id) {
            console.log('🔄 [WebRTC] Creating peer connection with existing user:', {
              socketId: userData.socketId,
              nickname: userData.nickname || 'Unknown',
              guestUserId: userData.guestUserId,
              isOfferer: true,
              isReconnection: true
            });
            
            try {
              await this.createPeerConnection(userData.socketId, true, userData.nickname || 'Unknown');
              console.log('✅ [WebRTC] Peer connection created with existing user:', userData.nickname);
            } catch (error) {
              console.error('❌ [WebRTC] Failed to create peer connection with existing user:', {
                user: userData,
                error: error
              });
            }
          }
        }
        
        // 연결 상태 확인을 위한 지연된 체크
        setTimeout(() => {
          console.log('📊 [WebRTC] Post-reconnection status check:', {
            totalPeerConnections: this.peerConnections.size,
            connectedPeers: this.getConnectedPeersCount(),
            expectedPeers: data.users.length - 1
          });
        }, 3000);
      } else {
        console.log('ℹ️ [WebRTC] No existing users to connect to:', { userCount: data.users.length });
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
          participants: event.map((p: any) => ({
            id: p.id,
            guestUserId: p.guestUserId,
            nickname: p.nickname,
            role: p.role,
            isWebRTCConnection: p.nickname?.startsWith('WEBRTC_')
          }))
        });
        this.onRealtimeParticipantsUpdate(event);
      } else if (event && typeof event === 'object' && 'eventType' in event) {
        const participantEvent = event as ParticipantUpdateEvent;
        console.log('👥 [WebRTC] Participant update received (event):', {
          eventType: participantEvent.eventType,
          roomCode: participantEvent.roomCode,
          participantCount: participantEvent.participants?.length || 0,
          participantDetails: participantEvent.participants?.map((p: any) => ({
            id: p.id,
            guestUserId: p.guestUserId,
            nickname: p.nickname,
            role: p.role,
            isWebRTCConnection: p.nickname?.startsWith('WEBRTC_')
          })),
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

    // 🚫 기존 user-joined 이벤트 비활성화 - WebRTC Voice Service는 voice-peer-joined 사용
    /*
    this.socket.on("user-joined", async (data: { socketId: string; guestUserId: string; nickname: string; joinedAt: string; parentGuestUserId?: string; parentNickname?: string }) => {
      console.log('🔍 [P2P DEBUG] 👋 NEW USER JOINED - 상세 분석:', {
        nickname: data.nickname,
        socketId: data.socketId,
        guestUserId: data.guestUserId,
        parentGuestUserId: data.parentGuestUserId,
        parentNickname: data.parentNickname,
        joinedAt: data.joinedAt,
        mySocketId: this.socket.id,
        isSameAsMe: data.socketId === this.socket.id,
        willCreatePeerConnection: data.socketId !== this.socket.id,
        timestamp: new Date().toISOString()
      });
      
      // 🔧 Socket ID <-> guestUserId 매핑 저장 (WebRTC 연결은 parentGuestUserId 사용)
      const targetUserId = data.parentGuestUserId || data.guestUserId;
      this.socketToUserIdMapping.set(data.socketId, targetUserId);
      this.userIdToSocketMapping.set(targetUserId, data.socketId);
      
      console.log('🔍 [P2P DEBUG] 🗺️ Updated user mapping:', {
        socketId: data.socketId,
        originalGuestUserId: data.guestUserId,
        targetUserId: targetUserId,
        isWebRTCConnection: !!data.parentGuestUserId,
        totalMappings: this.socketToUserIdMapping.size,
        allMappings: Array.from(this.socketToUserIdMapping.entries())
      });
      
      // 🔧 핵심 해결책: 새로운 실제 사용자가 참여했을 때 양방향 연결 보장
      // 만약 이것이 실제 사용자(WebRTC가 아닌)라면, 그들도 나와 P2P 연결을 시작해야 함
      if (!data.parentGuestUserId && !data.nickname?.startsWith('WEBRTC_')) {
        console.log('🔍 [P2P DEBUG] 💡 Real user joined - they should also start WebRTC manager');
        // 이 경우는 실제 사용자가 방에 입장한 것이므로, 그들의 WebRTC Manager도 곧 시작될 것임
        // 우리는 P2P 연결을 시도하고, 그들도 user-joined 이벤트를 통해 우리와 연결을 시도할 것임
      }
      
      // 자신에게는 P2P 연결을 생성하지 않음
      if (data.socketId === this.socket.id) {
        console.log('🔍 [P2P DEBUG] ⚠️ Skipping peer connection - this is myself');
        return;
      }
      
      // 🔧 WebRTC 연결인 사용자는 P2P 연결 생성하지 않음
      if (data.nickname?.startsWith('WEBRTC_')) {
        console.log('🔍 [P2P DEBUG] ⚠️ Skipping peer connection - this is another WebRTC connection:', data.nickname);
        return;
      }
      
      // 🔍 P2P 연결 생성 전 상태 체크
      console.log('🔍 [P2P DEBUG] 🔄 Pre-connection state check:', {
        nickname: data.nickname,
        socketId: data.socketId,
        hasLocalStream: !!this.localStream,
        localStreamTracks: this.localStream?.getTracks().length || 0,
        localStreamId: this.localStream?.id,
        currentPeerConnections: this.peerConnections.size,
        existingConnections: Array.from(this.peerConnections.keys()),
        socketConnected: this.socket.connected,
        isJoiningRoom: this.isJoiningRoom
      });
      
      try {
        console.log('🔍 [P2P DEBUG] 🚀 Starting peer connection creation for:', data.nickname);
        
        await this.createPeerConnection(data.socketId, true, data.nickname);
        
        // 연결 생성 후 상태 확인
        const createdConnection = this.peerConnections.get(data.socketId);
        console.log('🔍 [P2P DEBUG] ✅ Peer connection creation result:', {
          nickname: data.nickname,
          socketId: data.socketId,
          connectionExists: !!createdConnection,
          connectionState: createdConnection?.connectionState,
          iceConnectionState: createdConnection?.iceConnectionState,
          signalingState: createdConnection?.signalingState,
          totalConnections: this.peerConnections.size,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('🔍 [P2P DEBUG] ❌ Failed to create peer connection for new user:', {
          nickname: data.nickname,
          socketId: data.socketId,
          error: error,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorStack: error instanceof Error ? error.stack : undefined,
          currentState: {
            hasLocalStream: !!this.localStream,
            socketConnected: this.socket.connected,
            isJoiningRoom: this.isJoiningRoom,
            peerConnectionCount: this.peerConnections.size
          },
          timestamp: new Date().toISOString()
        });
      }
    });
    */
    
    // 🚫 기존 user-left 이벤트 비활성화 - WebRTC Voice Service는 voice-peer-left 사용  
    /*
    this.socket.on("user-left", (data: { socketId: string; guestUserId: string; nickname: string; parentGuestUserId?: string }) => {
      console.log('👋 [WebRTC] USER LEFT:', {
        nickname: data.nickname,
        socketId: data.socketId,
        guestUserId: data.guestUserId,
        parentGuestUserId: data.parentGuestUserId,
        willClosePeerConnection: true,
        currentPeerConnections: this.peerConnections.size,
        timestamp: new Date().toISOString()
      });
      
      // 🔧 Socket ID <-> guestUserId 매핑 정리 (WebRTC는 parent 기준)
      const targetUserId = data.parentGuestUserId || data.guestUserId;
      this.socketToUserIdMapping.delete(data.socketId);
      this.userIdToSocketMapping.delete(targetUserId);
      
      console.log('🗺️ [WebRTC] Cleaned user mapping:', {
        removedSocketId: data.socketId,
        removedOriginalUserId: data.guestUserId,
        removedTargetUserId: targetUserId,
        remainingMappings: this.socketToUserIdMapping.size
      });
      
      // P2P 연결 정리
      this.closePeerConnection(data.socketId);
      
      // 사용자 나가기 콜백 호출 - 매핑된 사용자 ID로 전달
      const mappedUserId = targetUserId || this.socketToUserIdMapping.get(data.socketId);
      this.onUserLeft(mappedUserId || data.socketId);
      
      // 추가: 방 사용자 목록 갱신 요청
      setTimeout(() => {
        this.requestRoomUsers();
        console.log('📊 [WebRTC] Post-leave status:', {
          remainingConnections: this.peerConnections.size,
          connectedPeers: this.getConnectedPeersCount()
        });
      }, 1000);
    });
    */

    this.socket.on("room-participants", (participants: unknown[]) => {
      console.log(`👥 [WebRTC] Room participants received:`, {
        count: Array.isArray(participants) ? participants.length : 0,
        participants: participants
      });
      this.onRealtimeParticipantsUpdate(participants);
    });

    // WebRTC Voice Service 이벤트들
    this.socket.on("voice-room-joined", (data: { roomCode: string; existingPeers: string[]; message: string }) => {
      console.log('🎉 [WebRTC] Voice room joined successfully:', {
        roomCode: data.roomCode,
        existingPeers: data.existingPeers,
        existingPeersCount: data.existingPeers.length,
        message: data.message,
        mySocketId: this.socket.id,
        timestamp: new Date().toISOString(),
        hasLocalStream: !!this.localStream,
        localStreamTracks: this.localStream?.getAudioTracks().length || 0
      });
      
      // 연결 상태 업데이트
      this.connectionState.isConnected = true;
      this.onConnectionStateChanged(this.connectionState);
      
      // 기존 피어들과 P2P 연결 생성
      if (data.existingPeers.length > 0) {
        console.log(`🔗 [WebRTC] Found ${data.existingPeers.length} existing peers, creating connections...`);
        data.existingPeers.forEach(async (socketId: string) => {
          if (socketId !== this.socket.id) {
            console.log('🔗 [WebRTC] Creating peer connection with existing peer:', { socketId, mySocketId: this.socket.id });
            try {
              await this.createPeerConnection(socketId, true, 'Existing User');
            } catch (error) {
              console.error('❌ [WebRTC] Failed to create peer connection with existing peer:', { socketId, error });
            }
          } else {
            console.log('⚠️ [WebRTC] Skipping peer connection with self:', socketId);
          }
        });
      } else {
        console.log('ℹ️ [WebRTC] No existing peers found, waiting for others to join...');
      }
    });

    this.socket.on("voice-peer-joined", async (data: { socketId: string; guestUserId: string }) => {
      console.log('👋 [WebRTC] New voice peer joined:', {
        socketId: data.socketId,
        guestUserId: data.guestUserId,
        mySocketId: this.socket.id,
        timestamp: new Date().toISOString()
      });
      
      // 새로운 피어와 P2P 연결 생성 (내가 offerer)
      if (data.socketId !== this.socket.id) {
        try {
          await this.createPeerConnection(data.socketId, true, `User_${data.guestUserId}`);
        } catch (error) {
          console.error('❌ [WebRTC] Failed to create peer connection with new peer:', error);
        }
      }
    });

    this.socket.on("voice-peer-left", (data: { socketId: string; guestUserId: string }) => {
      console.log('👋 [WebRTC] Voice peer left:', {
        socketId: data.socketId,
        guestUserId: data.guestUserId,
        timestamp: new Date().toISOString()
      });
      
      // P2P 연결 정리
      this.closePeerConnection(data.socketId);
      this.onUserLeft(data.socketId);
    });

    this.socket.on("voice-error", (error: { message: string }) => {
      console.error('❌ [WebRTC] Voice service error:', {
        error,
        roomCode: this.roomCode,
        guestUserId: this.guestUserId,
        socketId: this.socket.id,
        socketConnected: this.socket.connected,
        timestamp: new Date().toISOString()
      });
      this.onJoinRoomError(error);
    });

    // WebRTC 시그널링 이벤트들
    this.socket.on("voice-offer", async (data: { fromSocketId: string; fromGuestUserId: string; offer: RTCSessionDescriptionInit }) => {
      console.log('📞 [WebRTC] OFFER RECEIVED:', {
        fromSocketId: data.fromSocketId,
        fromGuestUserId: data.fromGuestUserId,
        mySocketId: this.socket.id,
        offerType: data.offer.type,
        offerSdp: data.offer.sdp?.substring(0, 100) + '...',
        timestamp: new Date().toISOString()
      });
      
      try {
        // 중복 연결 방지 - offer 처리 전 기존 연결 확인
        const existingPc = this.peerConnections.get(data.fromSocketId);
        if (existingPc && (existingPc.connectionState === 'connected' || existingPc.connectionState === 'connecting')) {
          console.log('ℹ️ [WebRTC] Ignoring offer - already connected/connecting:', {
            fromSocketId: data.fromSocketId,
            connectionState: existingPc.connectionState,
            signalingState: existingPc.signalingState
          });
          return;
        }
        
        await this.createPeerConnection(data.fromSocketId, false, `User_${data.fromGuestUserId}`);
        const pc = this.peerConnections.get(data.fromSocketId);
        if (pc) {
          console.log('🔄 [WebRTC] Setting remote description and creating answer...', {
            fromSocketId: data.fromSocketId,
            currentSignalingState: pc.signalingState,
            currentConnectionState: pc.connectionState,
            offerType: data.offer.type,
            offerSdpLength: data.offer.sdp?.length || 0
          });
          
          // ⚠️ signaling state 체크 추가
          if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer') {
            console.warn('⚠️ [WebRTC] Invalid signaling state for offer, skipping:', {
              currentState: pc.signalingState,
              fromSocketId: data.fromSocketId,
              expectedStates: ['stable', 'have-local-offer']
            });
            return;
          }
          
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            console.log('✅ [WebRTC] Remote description set successfully from offer:', {
              fromSocketId: data.fromSocketId,
              signalingState: pc.signalingState,
              connectionState: pc.connectionState
            });
          } catch (setRemoteError) {
            console.error('❌ [WebRTC] Failed to set remote description from offer:', {
              fromSocketId: data.fromSocketId,
              error: setRemoteError,
              signalingState: pc.signalingState,
              connectionState: pc.connectionState,
              offerType: data.offer.type,
              offerSdp: data.offer.sdp?.substring(0, 200)
            });
            throw setRemoteError;
          }
          
          // 🎵 오디오 전용 answer 생성 및 코덱 최적화
          const answer = await pc.createAnswer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: false,
            voiceActivityDetection: false
          });
          
          console.log('✅ [WebRTC] Answer created, applying codec optimization...');
          
          // Opus 코덱 우선순위 적용
          if (answer.sdp) {
            answer.sdp = this.prioritizeOpusCodec(answer.sdp);
            console.log('✅ [WebRTC] Codec optimization applied to answer');
          }
          
          await pc.setLocalDescription(answer);
          console.log('✅ [WebRTC] Local description set successfully');
          
          const answerData = {
            targetSocketId: data.fromSocketId,
            answer
          };
          this.socket.emit("voice-answer", answerData);
          console.log('📤 [WebRTC] ANSWER SENT:', {
            targetSocketId: data.fromSocketId,
            fromGuestUserId: data.fromGuestUserId,
            answerType: answer.type,
            timestamp: new Date().toISOString()
          });
        } else {
          console.error('❌ [WebRTC] Peer connection not found after creation!');
        }
      } catch (error) {
        console.error('❌ [WebRTC] Error handling OFFER:', {
          fromSocketId: data.fromSocketId,
          fromGuestUserId: data.fromGuestUserId,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorName: error instanceof Error ? error.name : 'Unknown',
          peerConnectionState: this.peerConnections.get(data.fromSocketId)?.signalingState,
          timestamp: new Date().toISOString()
        });
      }
    });

    this.socket.on("voice-answer", async (data: { fromSocketId: string; fromGuestUserId: string; answer: RTCSessionDescriptionInit }) => {
      console.log('📞 [WebRTC] ANSWER RECEIVED:', {
        fromSocketId: data.fromSocketId,
        fromGuestUserId: data.fromGuestUserId,
        mySocketId: this.socket.id,
        answerType: data.answer.type,
        answerSdp: data.answer.sdp?.substring(0, 100) + '...',
        timestamp: new Date().toISOString()
      });
      
      try {
        const pc = this.peerConnections.get(data.fromSocketId);
        if (pc) {
          console.log('🔄 [WebRTC] Setting remote description from answer...', {
            fromSocketId: data.fromSocketId,
            currentSignalingState: pc.signalingState,
            currentConnectionState: pc.connectionState,
            answerType: data.answer.type,
            answerSdpLength: data.answer.sdp?.length || 0
          });
          
          // ⚠️ signaling state 체크 수정 - stable 상태도 허용
          if (pc.signalingState !== 'have-local-offer' && pc.signalingState !== 'stable') {
            console.warn('⚠️ [WebRTC] Invalid signaling state for answer, skipping:', {
              expectedStates: ['have-local-offer', 'stable'],
              currentState: pc.signalingState,
              fromSocketId: data.fromSocketId
            });
            return;
          }
          
          // stable 상태인 경우 이미 처리된 answer일 수 있음
          if (pc.signalingState === 'stable') {
            console.log('ℹ️ [WebRTC] Already in stable state, answer may be duplicate:', {
              fromSocketId: data.fromSocketId,
              currentState: pc.signalingState
            });
            return;
          }
          
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            console.log('✅ [WebRTC] ANSWER PROCESSED:', {
              fromSocketId: data.fromSocketId,
              fromGuestUserId: data.fromGuestUserId,
              newSignalingState: pc.signalingState,
              connectionState: pc.connectionState,
              iceConnectionState: pc.iceConnectionState,
              timestamp: new Date().toISOString()
            });
          } catch (setRemoteError) {
            console.error('❌ [WebRTC] Failed to set remote description from answer:', {
              fromSocketId: data.fromSocketId,
              error: setRemoteError,
              signalingState: pc.signalingState,
              connectionState: pc.connectionState,
              answerType: data.answer.type,
              answerSdp: data.answer.sdp?.substring(0, 200)
            });
            throw setRemoteError;
          }
        } else {
          console.error('❌ [WebRTC] Peer connection not found for answer!');
        }
      } catch (error) {
        console.error('❌ [WebRTC] Error handling ANSWER:', {
          fromSocketId: data.fromSocketId,
          fromGuestUserId: data.fromGuestUserId,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorName: error instanceof Error ? error.name : 'Unknown',
          peerConnectionState: this.peerConnections.get(data.fromSocketId)?.signalingState,
          timestamp: new Date().toISOString()
        });
      }
    });

    this.socket.on("voice-ice-candidate", async (data: { fromSocketId: string; candidate: RTCIceCandidateInit }) => {
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
          // 🔧 Peer Connection 상태 체크 - 더 느슨한 처리
          if (pc.connectionState === 'closed') {
            console.warn('⚠️ [WebRTC] Peer connection is closed, skipping ICE candidate:', {
              fromSocketId: data.fromSocketId,
              connectionState: pc.connectionState,
              iceConnectionState: pc.iceConnectionState
            });
            return;
          }
          
          // Failed 상태이어도 ICE candidate 추가 시도 (복구 가능성)
          if (pc.connectionState === 'failed') {
            console.warn('⚠️ [WebRTC] Connection failed but trying ICE candidate (recovery attempt):', {
              fromSocketId: data.fromSocketId,
              connectionState: pc.connectionState,
              iceConnectionState: pc.iceConnectionState
            });
          }
          
          // 🔧 Remote description이 설정되어 있는지 확인
          if (!pc.remoteDescription) {
            console.warn('⚠️ [WebRTC] No remote description set, will try to add ICE candidate anyway:', {
              fromSocketId: data.fromSocketId,
              signalingState: pc.signalingState,
              iceConnectionState: pc.iceConnectionState
            });
            // Remote description 없어도 ICE candidate 추가 시도
          }
          
          try {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            console.log('✅ [WebRTC] ICE CANDIDATE ADDED:', {
              fromSocketId: data.fromSocketId,
              iceConnectionState: pc.iceConnectionState,
              connectionState: pc.connectionState,
              signalingState: pc.signalingState,
              timestamp: new Date().toISOString()
            });
          } catch (addIceError) {
            console.error('❌ [WebRTC] Failed to add ICE candidate (will continue):', {
              fromSocketId: data.fromSocketId,
              error: addIceError,
              connectionState: pc.connectionState,
              iceConnectionState: pc.iceConnectionState,
              signalingState: pc.signalingState,
              candidateType: data.candidate.candidate?.split(' ')[7] || 'unknown'
            });
            // ICE candidate 추가 실패에도 연결을 계속 진행 - 다른 candidate가 성공할 수 있음
          }
        } else if (!pc) {
          console.warn('⚠️ [WebRTC] Peer connection not found for ICE candidate:', {
            fromSocketId: data.fromSocketId,
            availableConnections: Array.from(this.peerConnections.keys())
          });
        } else if (!data.candidate) {
          console.warn('⚠️ [WebRTC] Invalid ICE candidate data received');
        }
      } catch (error) {
        console.error('❌ [WebRTC] Error adding ICE candidate:', {
          fromSocketId: data.fromSocketId,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorName: error instanceof Error ? error.name : 'Unknown',
          peerConnectionState: this.peerConnections.get(data.fromSocketId)?.connectionState,
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

    // 🚫 preparation-status-updated 이벤트 리스너 제거 (캐릭터 필터링 강화)
    // WebRTC Manager에서는 캐릭터/준비 상태 이벤트를 처리하지 않음
    console.log("ℹ️ [WebRTC] preparation-status-updated 이벤트는 useCharacter/useGameRecording에서 직접 처리됨");
    
    /*
    this.socket.on("preparation-status-updated", (data: any) => {
      // 비활성화됨 - useCharacter/useGameRecording에서 직접 처리
    });
    */

    // 🚫 캐릭터 상태 업데이트 이벤트 비활성화 (useCharacter에서 직접 처리)
    // 이제 useCharacter 훅에서 직접 Socket.IO 이벤트를 처리하므로 WebRTC Manager는 캐릭터 이벤트 처리 안함
    console.log("ℹ️ [WebRTC] character-status-updated 이벤트는 useCharacter에서 직접 처리됨");
    
    // 기존 코드 주석 처리 - 더 이상 WebRTC Manager에서 캐릭터 이벤트 처리하지 않음
    /*
    this.socket.on("character-status-updated", (data: any) => {
      // 비활성화됨 - useCharacter에서 직접 처리
    });
    */

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
        // 🔄 롤백: 실제 사용자 ID 재시도
        const realPlayerId = getCurrentUserId();
        this.guestUserId = realPlayerId || null;
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

    if (!this.roomCode || !this.nickname || !this.guestUserId) {
      console.error('❌ [WebRTC] Missing required values for room join:', {
        hasRoomCode: !!this.roomCode,
        hasGuestUserId: !!this.guestUserId,
        hasNickname: !!this.nickname,
        roomCode: this.roomCode,
        nickname: this.nickname,
        guestUserId: this.guestUserId,
        timestamp: new Date().toISOString()
      });
      
      // guestUserId가 없으면 재시도 로직 실행
      if (!this.guestUserId) {
        console.warn('⚠️ [WebRTC] No guestUserId available, attempting to obtain...');
        const realPlayerId = getCurrentUserId();
        if (realPlayerId) {
          this.guestUserId = realPlayerId;
          console.log('✅ [WebRTC] guestUserId obtained, retrying join:', this.guestUserId);
          // 재귀 호출로 다시 시도
          setTimeout(() => this.joinRoom(), 500);
        } else {
          console.error('❌ [WebRTC] Cannot obtain guestUserId, join failed');
          this.onJoinRoomError({ message: '사용자 정보를 찾을 수 없습니다. 페이지를 새로고침해주세요.' });
        }
      }
      
      this.isJoiningRoom = false;
      if (this.joinTimeoutId) {
        clearTimeout(this.joinTimeoutId);
        this.joinTimeoutId = null;
      }
      return;
    }

    // 🔧 Socket ID 매핑: WebRTC 전용 닉네임으로 구분하되 부모 사용자 정보 포함
    const webrtcIdentifier = `WEBRTC_${this.nickname}_${Date.now()}`;
    
    console.log('🚀 [WebRTC] JOINING ROOM via Socket.IO (WebRTC connection with parent user info):', {
      roomCode: this.roomCode,
      parentGuestUserId: this.guestUserId,
      parentNickname: this.nickname,
      webrtcIdentifier: webrtcIdentifier,
      socketId: this.socket.id,
      purpose: 'WebRTC signaling connection (mapped to parent user)',
      isReconnect: false,
      timestamp: new Date().toISOString()
    });

    // Socket.IO 방 참여 실행 - WebRTC 전용 식별자 사용하되 부모 정보 포함
    const joinRoomData = {
      roomCode: this.roomCode,
      nickname: webrtcIdentifier,
      guestUserId: `${webrtcIdentifier}_${Date.now()}`, // WebRTC 전용 ID (중복 방지)
      parentGuestUserId: this.guestUserId, // 🔧 실제 사용자 ID (매핑용)
      parentNickname: this.nickname, // 🔧 실제 사용자 닉네임 (매핑용)
      connectionType: 'webrtc',
      metadata: {
        isWebRTCConnection: true,
        parentUserId: this.guestUserId,
        timestamp: Date.now()
      }
    };
    
    console.log('📤 [WebRTC] Sending join-voice-room event:', {
      roomCode: this.roomCode,
      guestUserId: this.guestUserId,
      socketId: this.socket.id,
      socketConnected: this.socket.connected,
      timestamp: new Date().toISOString()
    });
    
    this.socket.emit("join-voice-room", { roomCode: this.roomCode, guestUserId: this.guestUserId });
    
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
          sampleRate: 48000,
          channelCount: 1
          // latency 설정 제거 (호환성 문제)
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
        // 시도 2: 안정적인 기본 오디오 설정
        async () => {
          console.log('🎤 [WebRTC] Attempt 2: Stable basic audio settings');
          return await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 44100, // 더 안정적인 샘플레이트
              channelCount: 1
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

      // 🔧 마이크 초기화 시 기본적으로 음소거 해제 상태로 설정
      const audioTracks = this.localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = true; // 명시적으로 활성화
      });
      this.isLocalMuted = false; // 음소거 상태를 false로 설정

      console.log('✅ [WebRTC] Microphone initialized successfully:', {
        streamId: this.localStream.id,
        audioTracks: this.localStream.getAudioTracks().length,
        videoTracks: this.localStream.getVideoTracks().length,
        audioTrackSettings: this.localStream.getAudioTracks()[0]?.getSettings(),
        audioTracksEnabled: audioTracks.map(track => ({ id: track.id, enabled: track.enabled })),
        initialMuteState: this.isLocalMuted
      });

      // 연결 상태 업데이트
      this.connectionState.localStream = this.localStream;
      this.connectionState.isLocalMuted = this.isLocalMuted;
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
      
      // 🔧 마이크 초기화 성공 후 WebRTC Voice Service에 방 참여 요청
      if (this.localStream && this.socket && this.socket.connected) {
        console.log('🚪 [WebRTC] Microphone initialized, joining voice room...');
        this.joinRoom();
      } else {
        console.log('⚠️ [WebRTC] Socket not connected yet, will join room when connected');
      }
      
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
    console.log('🔍 [P2P DEBUG] 🔗 CREATING PEER CONNECTION - Entry Point:', {
      targetNickname: nickname,
      targetSocketId: targetSocketId,
      mySocketId: this.socket.id,
      isOfferer: isOfferer,
      existingConnections: this.peerConnections.size,
      timestamp: new Date().toISOString()
    });
    
    // 이미 연결이 있는지 확인 및 상태 검증
    if (this.peerConnections.has(targetSocketId)) {
      const existingPc = this.peerConnections.get(targetSocketId)!;
      const connectionState = existingPc.connectionState;
      const iceConnectionState = existingPc.iceConnectionState;
      
      console.warn('🔍 [P2P DEBUG] ⚠️ Peer connection already exists:', {
        targetSocketId,
        nickname,
        connectionState,
        iceConnectionState,
        signalingState: existingPc.signalingState
      });
      
      // 🔧 연결이 실패했거나 닫혔으면 새로 생성
      if (connectionState === 'failed' || connectionState === 'closed' || 
          iceConnectionState === 'failed' || iceConnectionState === 'closed') {
        console.log('🔄 [P2P DEBUG] Removing failed connection and creating new one:', {
          targetSocketId,
          oldConnectionState: connectionState,
          oldIceConnectionState: iceConnectionState
        });
        
        this.closePeerConnection(targetSocketId);
      } else if (connectionState === 'connected' || connectionState === 'connecting') {
        console.log('✅ [P2P DEBUG] Keeping existing healthy connection:', {
          targetSocketId,
          connectionState,
          iceConnectionState: iceConnectionState
        });
        return existingPc;
      } else {
        console.log('ℹ️ [P2P DEBUG] Connection exists but in uncertain state:', {
          targetSocketId,
          connectionState,
          iceConnectionState,
          signalingState: existingPc.signalingState
        });
        return;
      }
    }
    
    console.log('🔍 [P2P DEBUG] ✅ Pre-creation validation passed, starting peer connection creation...');
    
    try {
      console.log('🔍 [P2P DEBUG] 🛠️ Creating RTCPeerConnection with STUN servers...');
      
      // 🎯 단순하고 안정적인 WebRTC 설정 (이전에 작동했던 방식)
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" }
        ]
      });
      
      console.log('🔍 [P2P DEBUG] ✅ RTCPeerConnection created successfully:', {
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
        signalingState: pc.signalingState
      });

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
          this.socket.emit("voice-ice-candidate", candidateData);
          // 로그 경량화 - 확률적 로깅으로 스팸 방지
          if (Math.random() < 0.05) {
            console.log('🧊 [WebRTC] ICE CANDIDATE SENT (sampled):', {
            to: nickname,
            targetSocketId,
            candidate: event.candidate.candidate?.substring(0, 50) + '...',
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            iceGatheringState: pc.iceGatheringState,
            timestamp: new Date().toISOString()
            });
          }
        } else {
          console.log('🏁 [WebRTC] ICE gathering complete for:', nickname);
        }
      };
      
      // ✨ Connection State 전체 모니터링 추가
      pc.onconnectionstatechange = () => {
        console.log('🔗 [WebRTC] CONNECTION STATE CHANGED:', {
          nickname,
          targetSocketId,
          connectionState: pc.connectionState,
          iceConnectionState: pc.iceConnectionState,
          timestamp: new Date().toISOString()
        });
        
        if (pc.connectionState === 'failed') {
          console.error('❌ [WebRTC] Overall connection FAILED:', {
            nickname,
            targetSocketId,
            allStates: {
              connectionState: pc.connectionState,
              iceConnectionState: pc.iceConnectionState,
              iceGatheringState: pc.iceGatheringState,
              signalingState: pc.signalingState
            }
          });
          
          // 연결 실패 상세 분석
          pc.getStats().then(stats => {
            const candidatePairs: any[] = [];
            const localCandidates: any[] = [];
            const remoteCandidates: any[] = [];
            
            stats.forEach(report => {
              if (report.type === 'candidate-pair') {
                candidatePairs.push({
                  state: report.state,
                  nominated: report.nominated,
                  priority: report.priority,
                  localCandidateId: report.localCandidateId,
                  remoteCandidateId: report.remoteCandidateId
                });
              } else if (report.type === 'local-candidate') {
                localCandidates.push({
                  candidateType: report.candidateType,
                  protocol: report.protocol,
                  address: report.address,
                  port: report.port
                });
              } else if (report.type === 'remote-candidate') {
                remoteCandidates.push({
                  candidateType: report.candidateType,
                  protocol: report.protocol,
                  address: report.address,
                  port: report.port
                });
              }
            });
            
            console.error('📊 [WebRTC] Connection failure analysis:', {
              nickname,
              candidatePairs,
              localCandidates,
              remoteCandidates
            });
          }).catch(err => console.error('Failed to get stats:', err));
          
          // 연결 재시작 시도
          this.attemptConnectionRestart(targetSocketId, pc);
        } else if (pc.connectionState === 'connected') {
          console.log('🎉 [WebRTC] Connection FULLY ESTABLISHED!', {
            nickname,
            targetSocketId,
            hasRemoteStream: this.connectionState.remoteStreams.has(targetSocketId),
            audioTracks: pc.getRemoteStreams?.()?.[0]?.getAudioTracks()?.length || 0
          });
          
          // Peer state도 connected로 업데이트
          const state = this.peerStates.get(targetSocketId);
          if (state) {
            state.connectionState = 'connected';
            this.notifyStateChanged();
          }
          
          // 성공적인 연결에서 재연결 카운터 리셋
          this.reconnectionAttempts.set(targetSocketId, 0);
          
          // 🎵 연결 성공 후 오디오 스트림 재확인
          this.verifyAudioConnection(targetSocketId, pc);
          
          // 🚨 ontrack이 안 온 경우 강제로 스트림 확인
          setTimeout(() => {
            const receivers = pc.getReceivers();
            console.log('🔍 [WebRTC] 연결 성공 후 Receivers 확인:', {
              nickname,
              receiversCount: receivers.length,
              receivers: receivers.map(r => ({
                trackId: r.track?.id,
                trackKind: r.track?.kind,
                enabled: r.track?.enabled
              }))
            });
            
            // Receiver가 있는데 ontrack이 안 온 경우
            if (receivers.length > 0 && !this.connectionState.remoteStreams.has(targetSocketId)) {
              console.warn('⚠️ [WebRTC] Receiver는 있는데 ontrack 안 옴, 수동 처리:', nickname);
              
              // 수동으로 MediaStream 생성
              const audioReceiver = receivers.find(r => r.track?.kind === 'audio');
              if (audioReceiver && audioReceiver.track) {
                const manualStream = new MediaStream([audioReceiver.track]);
                console.log('🔧 [WebRTC] 수동으로 스트림 생성:', {
                  nickname,
                  streamId: manualStream.id,
                  trackCount: manualStream.getTracks().length
                });
                
                // 수동으로 onRemoteStream 호출
                const finalGuestUserId = this.socketToUserIdMapping.get(targetSocketId) || targetSocketId;
                this.onRemoteStream(finalGuestUserId, manualStream);
              }
            }
          }, 2000); // 2초 후 확인
        }
      };
      
      // ICE Gathering State 모니터링 추가
      pc.onicegatheringstatechange = () => {
        console.log('❄️ [WebRTC] ICE GATHERING STATE CHANGED:', {
          nickname,
          targetSocketId,
          iceGatheringState: pc.iceGatheringState,
          iceConnectionState: pc.iceConnectionState,
          connectionState: pc.connectionState,
          timestamp: new Date().toISOString()
        });
        
        if (pc.iceGatheringState === 'complete') {
          console.log('✅ [WebRTC] ICE gathering completed successfully for:', nickname);
        }
      };

      pc.ontrack = (event) => {
        console.log('🎵 [WebRTC] ontrack 이벤트 트리거됨:', {
          nickname,
          targetSocketId,
          streamsLength: event.streams.length,
          tracksLength: event.streams[0]?.getTracks().length,
          trackKind: event.track?.kind,
          trackId: event.track?.id
        });
        
        // 🔧 Socket ID를 guestUserId로 매핑하여 전달
        let mappedGuestUserId = this.socketToUserIdMapping.get(targetSocketId);
        
        // 🔍 매핑이 없는 경우 participants에서 찾기
        if (!mappedGuestUserId && (window as any).gamecastCurrentParticipants) {
          console.log('🔍 [WebRTC] participants에서 매핑 시도:', { 
            targetSocketId, 
            participants: (window as any).gamecastCurrentParticipants?.map((p: any) => ({ socketId: p.socketId, guestUserId: p.guestUserId }))
          });
          
          // 현재 참여자 목록에서 socketId로 guestUserId 찾기
          const participant = (window as any).gamecastCurrentParticipants.find((p: any) => p.socketId === targetSocketId);
          if (participant && participant.guestUserId) {
            mappedGuestUserId = participant.guestUserId;
            this.socketToUserIdMapping.set(targetSocketId, mappedGuestUserId);
            console.log('🔄 [WebRTC] Socket ID를 guestUserId로 동적 매핑 성공:', { targetSocketId, mappedGuestUserId });
          } else {
            console.log('⚠️ [WebRTC] 매핑 실패 - participants에서 targetSocketId를 찾을 수 없음:', { targetSocketId });
          }
        } else if (!mappedGuestUserId) {
          console.log('⚠️ [WebRTC] 매핑 불가 - participants 데이터 없음');
        }
        
        const streamIdentifier = mappedGuestUserId || targetSocketId;
        
        console.log('🎵 [WebRTC] REMOTE STREAM RECEIVED:', {
          from: nickname,
          targetSocketId,
          mappedGuestUserId,
          streamIdentifier: streamIdentifier,
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
          // 스트림을 받았다는 것은 연결이 어느 정도 성공했다는 의미
          if (state.connectionState !== 'connected') {
            state.connectionState = 'connecting'; // 최소한 connecting 상태로 업데이트
          }
          console.log('🔊 [WebRTC] Audio track status updated:', {
            nickname,
            hasAudio: state.hasAudio,
            connectionState: state.connectionState,
            peerConnectionState: pc.connectionState
          });
          this.notifyStateChanged();
        }
        // 🔧 매핑된 guestUserId로 스트림 전달 + 디버깅
        console.log('🎆 [WebRTC] onRemoteStream 호출:', {
          streamIdentifier,
          targetSocketId,
          mappedGuestUserId,
          streamId: event.streams[0]?.id,
          audioTracks: event.streams[0]?.getAudioTracks().length,
          timestamp: new Date().toISOString()
        });
        
        // 🎯 올바른 guestUserId로 스트림 전달 (연결 상태 수정)
        const finalGuestUserId = mappedGuestUserId || streamIdentifier;
        
        console.log('🎆 [WebRTC] 최종 guestUserId로 스트림 전달:', {
          finalGuestUserId,
          streamIdentifier,
          mappedGuestUserId,
          targetSocketId
        });
        
        // 메인 스트림 전달 - guestUserId 우선 사용
        this.onRemoteStream(finalGuestUserId, event.streams[0]);
        
        // 백업용 키들로도 저장 (PlayerCard에서 찾을 수 있도록)
        if (finalGuestUserId !== streamIdentifier) {
          this.onRemoteStream(streamIdentifier, event.streams[0]);
        }
        if (finalGuestUserId !== targetSocketId) {
          this.onRemoteStream(targetSocketId, event.streams[0]);
        }
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
          
          // 강화된 복구 로직 (이전에 작동했던 방식)
          setTimeout(() => this.forceReconnection(targetSocketId), 1000);
          
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

      console.log('🔍 [P2P DEBUG] 🎵 Adding local stream tracks...', {
        hasLocalStream: !!this.localStream,
        localStreamId: this.localStream?.id,
        trackCount: this.localStream?.getTracks().length || 0
      });
      
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          pc.addTrack(track, this.localStream!);
          console.log('🔍 [P2P DEBUG] ➕ LOCAL TRACK ADDED:', {
            to: nickname,
            trackKind: track.kind,
            trackId: track.id,
            enabled: track.enabled,
            readyState: track.readyState,
            timestamp: new Date().toISOString()
          });
        });
        console.log('🔍 [P2P DEBUG] ✅ All local tracks added successfully');
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
                  // 🎵 재연결 offer도 코덱 최적화 적용
                  const newOffer = await connection.createOffer({
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: false,
                    voiceActivityDetection: false
                  });
                  
                  if (newOffer.sdp) {
                    newOffer.sdp = this.prioritizeOpusCodec(newOffer.sdp);
                    console.log('✅ [WebRTC] Codec optimization applied to reconnection offer');
                  }
                  
                  await connection.setLocalDescription(newOffer);
                  
                  const offerData: WebRTCOffer = {
                    targetSocketId: targetSocketId,
                    offer: newOffer
                  };
                  
                  this.socket.emit("voice-offer", offerData);
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

      console.log('🔍 [P2P DEBUG] 💾 Storing peer connection in map...', {
        targetSocketId,
        nickname,
        mapSize: this.peerConnections.size
      });
      
      this.peerConnections.set(targetSocketId, pc);
      
      console.log('🔍 [P2P DEBUG] ✅ Peer connection stored, map size:', this.peerConnections.size);

      if (isOfferer) {
        try {
          console.log('🔍 [P2P DEBUG] 📤 Creating offer as offerer...', {
            nickname,
            targetSocketId,
            hasLocalStream: !!this.localStream,
            pcState: pc.signalingState
          });
          
          // 🎵 오디오 전용 offer 생성 및 코덱 최적화
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: false,
            voiceActivityDetection: false
          });
          
          console.log('🔍 [P2P DEBUG] ✅ Offer created, applying codec optimization...', {
            offerType: offer.type,
            originalSdpLength: offer.sdp?.length || 0
          });
          
          // Opus 코덱 우선순위 적용
          if (offer.sdp) {
            offer.sdp = this.prioritizeOpusCodec(offer.sdp);
          }
          
          console.log('🔍 [P2P DEBUG] ✅ Codec optimization applied, setting local description...', {
            optimizedSdpLength: offer.sdp?.length || 0
          });
          
          await pc.setLocalDescription(offer);
          console.log('🔍 [P2P DEBUG] ✅ Local description set, preparing to send offer...');
          
          const offerData: WebRTCOffer = {
            targetSocketId: targetSocketId, 
            offer 
          };
          
          console.log('🔍 [P2P DEBUG] 📤 OFFER CREATED & SENDING:', {
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
          
          this.socket.emit("voice-offer", offerData);
          console.log('🔍 [P2P DEBUG] ✅ Offer emission completed');
        } catch (error) {
          console.error('🔍 [P2P DEBUG] ❌ Error creating OFFER:', {
            to: nickname,
            error: error,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          });
          throw error;
        }
      } else {
        console.log('🔍 [P2P DEBUG] ⏭️ Not offerer, waiting for offer from remote peer:', nickname);
      }
      
      console.log('🔍 [P2P DEBUG] ✅ createPeerConnection completed successfully:', {
        nickname,
        targetSocketId,
        isOfferer,
        totalConnections: this.peerConnections.size,
        connectionStored: this.peerConnections.has(targetSocketId),
        stateStored: this.peerStates.has(targetSocketId)
      });
      
    } catch (error) {
      console.error('🔍 [P2P DEBUG] ❌ Peer connection creation failed:', {
        nickname,
        targetSocketId,
        error: error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined
      });
      
      // 실패한 연결 정리
      console.log('🔍 [P2P DEBUG] 🧹 Cleaning up failed connection...');
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
      .filter(state => 
        state.connectionState === 'connected' || 
        state.hasAudio || // 스트림을 받은 경우도 연결된 것으로 간주
        state.connectionState === 'connecting' // 연결 중인 경우도 포함
      ).length;
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

  // 🚫 캐릭터 전송 기능 제거 (UserSocket에서 처리)
  // emitUpdateCharacterStatus는 더 이상 사용하지 않음
  // 캐릭터 설정은 userSocketManager를 통해 실제 사용자 신원으로 전송

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

  // WebRTC Manager는 완전히 독립적이므로 ID 변환 로직 불필요

  // 🆕 강화된 연결 복구 시도 (이전에 작동했던 방식 복원)
  private async attemptConnectionRestart(socketId: string, pc: RTCPeerConnection) {
    console.log('🔄 [WebRTC] Attempting enhanced connection restart for:', socketId);
    
    try {
      // 1단계: ICE 재시작
      await pc.restartIce();
      console.log('✅ [WebRTC] ICE restart initiated for:', socketId);
      
      // 2단계: 3초 대기 후 강제 재연결 시도
      setTimeout(async () => {
        if (pc.connectionState === 'failed') {
          console.log('🔄 [WebRTC] Force reconnection attempt for:', socketId);
          await this.forceReconnection(socketId);
        }
      }, 3000);
      
    } catch (error) {
      console.error('❌ [WebRTC] Connection restart failed for:', socketId, error);
      // 즉시 강제 재연결 시도
      setTimeout(() => this.forceReconnection(socketId), 1000);
    }
  }

  // 🆕 강제 재연결 (완전히 새로운 PeerConnection 생성)
  private async forceReconnection(socketId: string) {
    console.log('💪 [WebRTC] Force reconnection for:', socketId);
    
    const oldPc = this.peerConnections.get(socketId);
    if (oldPc) {
      oldPc.close();
      this.peerConnections.delete(socketId);
    }
    
    // 새로운 연결 생성 (이전에 작동했던 방식)
    const nickname = `User_${socketId.substring(0, 8)}`;
    await this.createPeerConnection(socketId, true, nickname);
    console.log('✅ [WebRTC] New connection created for:', socketId);
  }

  // 🎵 오디오 연결 검증 (이전에 작동했던 상태 복원)
  private verifyAudioConnection(socketId: string, pc: RTCPeerConnection) {
    console.log('🔍 [WebRTC] Verifying audio connection for:', socketId);
    
    // 원격 스트림 확인
    const receivers = pc.getReceivers();
    const audioReceiver = receivers.find(receiver => 
      receiver.track && receiver.track.kind === 'audio'
    );
    
    if (audioReceiver && audioReceiver.track) {
      console.log('✅ [WebRTC] Audio receiver found:', {
        trackId: audioReceiver.track.id,
        enabled: audioReceiver.track.enabled,
        readyState: audioReceiver.track.readyState,
        muted: audioReceiver.track.muted
      });
      
      // 트랙이 비활성화된 경우 활성화 시도
      if (!audioReceiver.track.enabled) {
        audioReceiver.track.enabled = true;
        console.log('🔧 [WebRTC] Audio track enabled for:', socketId);
      }
    } else {
      console.warn('⚠️ [WebRTC] No audio receiver found for:', socketId);
    }
  }

  // 🎵 Opus 코덱 우선순위 설정 (코덱 문제 해결)
  private prioritizeOpusCodec(sdp: string): string {
    console.log('🎵 [WebRTC] Prioritizing Opus codec in SDP');
    
    const lines = sdp.split('\r\n');
    const audioMLineIndex = lines.findIndex(line => line.startsWith('m=audio'));
    
    if (audioMLineIndex === -1) {
      console.warn('⚠️ [WebRTC] No audio m-line found in SDP');
      return sdp;
    }
    
    const audioMLine = lines[audioMLineIndex];
    const rtpMapLines = lines.filter(line => line.startsWith('a=rtpmap:') && line.includes('opus'));
    
    if (rtpMapLines.length === 0) {
      console.warn('⚠️ [WebRTC] No Opus codec found in SDP');
      return sdp;
    }
    
    // Opus의 payload type 추출
    const opusMatch = rtpMapLines[0].match(/a=rtpmap:(\d+) opus/);
    if (!opusMatch) return sdp;
    
    const opusPayloadType = opusMatch[1];
    console.log('✅ [WebRTC] Found Opus payload type:', opusPayloadType);
    
    // 오디오 m-line에서 Opus를 첫 번째로 배치
    const payloadTypes = audioMLine.split(' ').slice(3); // 'UDP/TLS/RTP/SAVPF' 이후 부분
    const reorderedPayloads = [opusPayloadType, ...payloadTypes.filter(pt => pt !== opusPayloadType)];
    
    lines[audioMLineIndex] = audioMLine.split(' ').slice(0, 3).join(' ') + ' ' + reorderedPayloads.join(' ');
    
    console.log('✅ [WebRTC] Opus codec prioritized successfully');
    return lines.join('\r\n');
  }
}
