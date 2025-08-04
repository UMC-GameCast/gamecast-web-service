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
  private localStream: MediaStream | null = null;
  private roomCode: string;
  private guestUserId: string | null = null;
  private nickname: string;
  private isLocalMuted: boolean = false;
  
  // 연결 상태 관리
  private connectionState: VoiceChatState;
  
  // 중복 방 참여 방지
  private isJoiningRoom: boolean = false;
  private lastJoinAttempt: number = 0;

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

  constructor(roomCode: string, nickname: string) {
    this.roomCode = roomCode;
    this.nickname = nickname;
    this.guestUserId = getCurrentUserId();
    
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
    
    // WebSocket 전용 연결 설정 (polling 방식 완전 비활성화)
    this.socket = io(SOCKET_SERVER_URL, {
      transports: ['websocket'], // WebSocket만 사용
      upgrade: false, // polling으로 자동 업그레이드 방지
      rememberUpgrade: false,
      timeout: 15000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 2000
    });
    
    this.initializeSocketListeners();
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
        // 마이크 초기화 실패를 콜백으로 알림
        this.onJoinRoomError({ 
          message: `마이크 초기화 실패: ${error instanceof Error ? error.message : '알 수 없는 에러'}` 
        });
        // 마이크 실패해도 방 참여는 계속 진행
      }
      
      // 방 참여
      this.joinRoom();
    });

    this.socket.on("connect_error", (error) => {
      console.error('🔴 [WebRTC] Socket connection ERROR:', {
        error: error.message,
        type: error.type,
        description: error.description,
        serverUrl: SOCKET_SERVER_URL,
        timestamp: new Date().toISOString()
      });
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

    // 재연결 시도
    this.socket.on("reconnect", (attemptNumber) => {
      console.log('🔄 [WebRTC] Socket.IO RECONNECTED:', {
        attemptNumber,
        socketId: this.socket.id,
        timestamp: new Date().toISOString()
      });
    });

    this.socket.on("reconnect_error", (error) => {
      console.error('❌ [WebRTC] Socket.IO reconnection FAILED:', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
    });

    // room_status 이벤트 처리 - 서버 요구사항에 따른 방 상태 업데이트
    this.socket.on("room_status", (userList: unknown[]) => {
      console.log('📊 [WebRTC] Room status updated:', {
        userCount: Array.isArray(userList) ? userList.length : 'invalid',
        users: userList,
        roomCode: this.roomCode,
        timestamp: new Date().toISOString()
      });
      this.onRoomUsers(userList);
    });

    // 새 서버 이벤트: 방 참여 관련 (기존 이벤트 유지)
    this.socket.on("joined-room-success", (data: { roomCode: string; roomId: string; users: unknown[] }) => {
      console.log('🎉 [WebRTC] Room join SUCCESS:', {
        roomCode: data.roomCode,
        roomId: data.roomId,
        userCount: Array.isArray(data.users) ? data.users.length : 'invalid',
        users: data.users,
        timestamp: new Date().toISOString()
      });
      
      // 방 참여 성공 시 플래그 해제
      this.isJoiningRoom = false;
      
      this.onRoomUsers(data.users);
    });

    this.socket.on("join-room-error", (error: { message: string }) => {
      console.error('❌ [WebRTC] Room join FAILED:', {
        error: error.message,
        roomCode: this.roomCode,
        nickname: this.nickname,
        timestamp: new Date().toISOString()
      });
      
      // 방 참여 실패 시 플래그 해제
      this.isJoiningRoom = false;
      
      this.onJoinRoomError(error);
    });

    this.socket.on("room-users", (users: unknown[]) => {
      console.log('👥 [WebRTC] Room users updated:', {
        userCount: Array.isArray(users) ? users.length : 'invalid',
        users: users,
        roomCode: this.roomCode,
        timestamp: new Date().toISOString()
      });
      this.onRoomUsers(users);
    });

    // 통합된 참여자 업데이트 이벤트
    this.socket.on("participant-update", (event: ParticipantUpdateEvent | unknown[]) => {
      // 이벤트 타입 확인 - 객체 형태인지 배열 형태인지
      if (Array.isArray(event)) {
        // 배열 형태 (실시간 업데이트)
        console.log(`👥 [WebRTC] Participant update received (array):`, {
          count: event.length,
          participants: event
        });
        this.onRealtimeParticipantsUpdate(event);
      } else if (event && typeof event === 'object' && 'eventType' in event) {
        // 객체 형태 (구조화된 이벤트)
        const participantEvent = event as ParticipantUpdateEvent;
        console.log('👥 [WebRTC] Participant update received (event):', {
          eventType: participantEvent.eventType,
          roomCode: participantEvent.roomCode,
          participantCount: participantEvent.participants?.length || 0,
          timestamp: new Date().toISOString()
        });
        this.onParticipantUpdate(participantEvent);
        // 실시간 업데이트도 함께 처리
        if (participantEvent.participants) {
          this.onRealtimeParticipantsUpdate(participantEvent.participants);
        }
      } else {
        console.warn('⚠️ [WebRTC] Unknown participant-update format:', event);
      }
    });

    // 사용자 참여/퇴장 이벤트
    this.socket.on("user-joined", async (data: { socketId: string; guestUserId: string; nickname: string; joinedAt: string }) => {
      console.log('👋 [WebRTC] NEW USER JOINED:', {
        nickname: data.nickname,
        socketId: data.socketId,
        guestUserId: data.guestUserId,
        joinedAt: data.joinedAt,
        mySocketId: this.socket.id,
        willCreatePeerConnection: true,
        timestamp: new Date().toISOString()
      });
      await this.createPeerConnection(data.socketId, true, data.nickname);
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

    // WebRTC 시그널링 이벤트
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
      console.log("Chat message received:", data);
    });

    // 녹화 관련 이벤트
    this.socket.on("recording-started", (data: unknown) => {
      console.log("Recording started:", data);
    });

    this.socket.on("recording-stopped", (data: unknown) => {
      console.log("Recording stopped:", data);
    });

    // 에러 처리
    this.socket.on("error", (error: { message: string }) => {
      console.error("Socket error:", error);
    });
  }

  private joinRoom() {
    console.log('🚪 [WebRTC] Attempting to join room...');
    
    // 중복 참여 방지 (1초 내)
    const now = Date.now();
    if (this.isJoiningRoom || (now - this.lastJoinAttempt < 1000)) {
      console.log('⚠️ [WebRTC] Join room attempt blocked - too frequent or already joining', {
        isJoiningRoom: this.isJoiningRoom,
        timeSinceLastAttempt: now - this.lastJoinAttempt,
        roomCode: this.roomCode
      });
      return;
    }
    
    this.isJoiningRoom = true;
    this.lastJoinAttempt = now;
    
    if (!this.guestUserId) {
      console.error('❌ [WebRTC] No guest user ID available, will retry...', {
        retryIn: '1000ms',
        timestamp: new Date().toISOString()
      });
      setTimeout(() => {
        this.guestUserId = getCurrentUserId();
        if (this.guestUserId) {
          console.log('✅ [WebRTC] Guest user ID obtained, retrying join...');
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
      return;
    }

    const uniqueNickname = `${this.nickname}_${this.roomCode}_${this.guestUserId.slice(-8)}`;
    
    console.log('🚀 [WebRTC] JOINING ROOM via Socket.IO:', {
      roomCode: this.roomCode,
      guestUserId: this.guestUserId,
      originalNickname: this.nickname,
      uniqueNickname: uniqueNickname,
      socketId: this.socket.id,
      isReconnect: true,
      timestamp: new Date().toISOString()
    });

    this.socket.emit("join-room", {
      roomCode: this.roomCode,
      guestUserId: this.guestUserId,
      nickname: uniqueNickname,
      isReconnect: true
    });
  }

  private async setupProcessedAudioStream(): Promise<MediaStream | null> {
    try {
      // 1. 원본 마이크 스트림 획득
      const originalStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
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
      let permissionGranted = false;
      if ('permissions' in navigator) {
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          console.log('🔐 [WebRTC] Permission API status:', permissionStatus.state);
          permissionGranted = permissionStatus.state === 'granted';
        } catch (permError) {
          console.warn('⚠️ [WebRTC] Permission API not available:', permError);
          // Permission API 실패 시에도 직접 시도해봄
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
            // 마지막 시도도 실패
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

  // 레거시 메서드 (호환성 유지)
  public async startLegacy(): Promise<MediaStream | null> {
    console.log('🎵 [WebRTC] Starting local media stream (legacy)...');
    
    // 브라우저 호환성 확인
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error('❌ [WebRTC] getUserMedia is not supported in this browser');
      this.onJoinRoomError({ 
        message: '이 브라우저는 마이크 기능을 지원하지 않습니다. Chrome, Firefox, Safari 등 최신 브라우저를 사용해주세요.' 
      });
      return null;
    }

    try {
      // 마이크 권한 먼저 확인
      console.log('🔍 [WebRTC] Checking microphone permissions...');
      
      // 권한 상태 확인 (지원하는 브라우저만)
      if ('permissions' in navigator) {
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          console.log('🔐 [WebRTC] Microphone permission status:', permissionStatus.state);
          
          if (permissionStatus.state === 'denied') {
            console.error('❌ [WebRTC] Microphone permission denied');
            this.onJoinRoomError({ 
              message: '마이크 권한이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요.' 
            });
            return null;
          }
        } catch (permError) {
          console.warn('⚠️ [WebRTC] Could not check permission status:', permError);
        }
      }

      // 마이크 접근 시도 - 처리된 오디오 스트림 사용
      console.log('🎤 [WebRTC] Requesting microphone access with audio processing...');
      this.localStream = await this.setupProcessedAudioStream();

      if (!this.localStream) {
        console.error('❌ [WebRTC] Failed to obtain audio stream');
        this.onJoinRoomError({ 
          message: '오디오 스트림을 가져올 수 없습니다. 마이크 권한을 확인해주세요.' 
        });
        return null;
      }
      
      console.log('✅ [WebRTC] LOCAL STREAM OBTAINED:', {
        streamId: this.localStream.id,
        audioTracks: this.localStream.getAudioTracks().length,
        videoTracks: this.localStream.getVideoTracks().length,
        tracks: this.localStream.getTracks().map(track => ({
          kind: track.kind,
          id: track.id,
          label: track.label,
          enabled: track.enabled,
          readyState: track.readyState,
          settings: track.getSettings ? track.getSettings() : 'N/A'
        })),
        timestamp: new Date().toISOString()
      });
      
      // 오디오 트랙 상태 확인
      const audioTracks = this.localStream.getAudioTracks();
      if (audioTracks.length === 0) {
        console.error('❌ [WebRTC] No audio tracks found in stream');
        this.onJoinRoomError({ 
          message: '마이크를 찾을 수 없습니다. 마이크가 연결되어 있는지 확인해주세요.' 
        });
        return null;
      }

      // 오디오 트랙 이벤트 리스너 추가
      audioTracks.forEach((track, index) => {
        console.log(`🎵 [WebRTC] Audio track ${index}:`, {
          label: track.label,
          enabled: track.enabled,
          readyState: track.readyState
        });

        track.addEventListener('ended', () => {
          console.warn(`⚠️ [WebRTC] Audio track ${index} ended`);
        });

        track.addEventListener('mute', () => {
          console.warn(`🔇 [WebRTC] Audio track ${index} muted`);
        });

        track.addEventListener('unmute', () => {
          console.log(`🔊 [WebRTC] Audio track ${index} unmuted`);
        });
      });
      
      return this.localStream;
    } catch (error) {
      const err = error as DOMException;
      console.error('❌ [WebRTC] Error getting user media:', {
        error: error,
        name: err.name,
        message: err.message,
        timestamp: new Date().toISOString()
      });

      // 구체적인 에러 메시지 제공
      let userMessage = '마이크 접근 중 오류가 발생했습니다.';
      
      switch (err.name) {
        case 'NotAllowedError':
        case 'PermissionDeniedError':
          userMessage = '마이크 권한이 거부되었습니다. 브라우저 주소창 옆의 마이크 아이콘을 클릭하여 권한을 허용해주세요.';
          break;
        case 'NotFoundError':
        case 'DevicesNotFoundError':
          userMessage = '마이크를 찾을 수 없습니다. 마이크가 연결되어 있는지 확인해주세요.';
          break;
        case 'NotReadableError':
        case 'TrackStartError':
          userMessage = '마이크에 접근할 수 없습니다. 다른 앱에서 마이크를 사용 중일 수 있습니다.';
          break;
        case 'OverconstrainedError':
        case 'ConstraintNotSatisfiedError':
          userMessage = '마이크 설정에 문제가 있습니다. 브라우저를 새로고침 후 다시 시도해주세요.';
          break;
        case 'NotSupportedError':
          userMessage = '이 브라우저는 마이크 기능을 지원하지 않습니다.';
          break;
        case 'TypeError':
          userMessage = '마이크 설정 오류가 발생했습니다. 페이지를 새로고침해주세요.';
          break;
        default:
          userMessage = `마이크 오류: ${err.message || '알 수 없는 오류'}`;
      }

      this.onJoinRoomError({ message: userMessage });
      return null;
    }
  }

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

    pc.oniceconnectionstatechange = () => {
      console.log('❄️ [WebRTC] ICE CONNECTION STATE CHANGED:', {
        nickname,
        targetSocketId,
        iceConnectionState: pc.iceConnectionState,
        connectionState: pc.connectionState,
        timestamp: new Date().toISOString()
      });
      
      // ICE 연결 실패 시 로깅
      if (pc.iceConnectionState === 'failed') {
        console.error('❌ [WebRTC] ICE connection FAILED:', {
          nickname,
          targetSocketId,
          allStates: {
            connectionState: pc.connectionState,
            iceConnectionState: pc.iceConnectionState,
            iceGatheringState: pc.iceGatheringState,
            signalingState: pc.signalingState
          }
        });
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
      console.warn('⚠️ [WebRTC] No local stream available to add tracks');
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
      }
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
    
    console.log('✅ [WebRTC] Peer connection cleanup completed for:', state?.nickname || sid);
  }

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

  public close() {
    console.log("Closing all connections and leaving room.");
    
    // 방 나가기 이벤트 emit (roomCode 포함)
    if (this.socket.connected && this.roomCode) {
      this.socket.emit("leave-room", {
        roomCode: this.roomCode
      });
    }
    
    // 로컬 스트림 정리
    this.localStream?.getTracks().forEach(track => track.stop());
    
    // P2P 연결 정리
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();
    this.peerStates.clear();
    
    // Socket.IO 연결 해제
    this.socket.disconnect();
    console.log("✅ WebRTC Manager cleanup 완료");
  }

  // 추가 메서드들
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
} 