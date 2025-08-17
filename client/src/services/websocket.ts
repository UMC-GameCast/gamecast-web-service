// WebSocket/Socket.IO 서비스 레이어 - 실시간 통신 담당

import { io, Socket } from 'socket.io-client';
import type { SocketEvents } from '../types/webrtc';

const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_URL || 'http://3.37.34.211:8889';

export class WebSocketService {
  private socket: Socket | null = null;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor() {
    // 생성자에서는 연결하지 않음 - 명시적으로 connect() 호출 필요
  }

  // Socket.IO 연결
  connect(): Promise<Socket> {
    if (this.socket?.connected) {
      return Promise.resolve(this.socket);
    }

    if (this.isConnecting) {
      return new Promise((resolve, reject) => {
        const checkConnection = () => {
          if (this.socket?.connected) {
            resolve(this.socket);
          } else if (!this.isConnecting) {
            reject(new Error('Connection failed'));
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      });
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      this.socket = io(SOCKET_SERVER_URL, {
        transports: ['websocket'],
        upgrade: false,
        rememberUpgrade: false,
        timeout: 20000,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        randomizationFactor: 0.5,
      });

      this.socket.on('connect', () => {
        console.log('🟢 [WebSocket] Connected:', this.socket?.id);
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        resolve(this.socket!);
      });

      this.socket.on('connect_error', (error) => {
        console.error('🔴 [WebSocket] Connection error:', error);
        this.isConnecting = false;
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 [WebSocket] Disconnected:', reason);
        this.isConnecting = false;
      });

      this.socket.on('reconnect', (attemptNumber) => {
        console.log('🔄 [WebSocket] Reconnected after', attemptNumber, 'attempts');
        this.reconnectAttempts = 0;
      });

      this.socket.on('reconnect_error', (error) => {
        console.error('❌ [WebSocket] Reconnection failed:', error);
        this.reconnectAttempts++;
      });
    });
  }

  // 연결 해제
  disconnect(): void {
    if (this.socket) {
      console.log('🔌 [WebSocket] Disconnecting...');
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  // 이벤트 전송 (타입 안전)
  emit<K extends keyof SocketEvents>(
    event: K,
    data: SocketEvents[K]
  ): void {
    if (!this.socket?.connected) {
      console.warn('⚠️ [WebSocket] Cannot emit - not connected:', event);
      return;
    }

    this.socket.emit(event as string, data);
    console.log('📤 [WebSocket] Emitted:', event, data);
  }

  // 이벤트 리스너 등록 (타입 안전)
  on<K extends keyof SocketEvents>(
    event: K,
    listener: (data: SocketEvents[K]) => void
  ): void {
    if (!this.socket) {
      console.warn('⚠️ [WebSocket] Cannot add listener - socket not initialized:', event);
      return;
    }

    this.socket.on(event as string, listener);
    console.log('👂 [WebSocket] Listener added:', event);
  }

  // 이벤트 리스너 제거
  off<K extends keyof SocketEvents>(
    event: K,
    listener?: (data: SocketEvents[K]) => void
  ): void {
    if (!this.socket) return;

    if (listener) {
      this.socket.off(event as string, listener);
    } else {
      this.socket.off(event as string);
    }
    console.log('🚫 [WebSocket] Listener removed:', event);
  }

  // 일회성 이벤트 리스너
  once<K extends keyof SocketEvents>(
    event: K,
    listener: (data: SocketEvents[K]) => void
  ): void {
    if (!this.socket) {
      console.warn('⚠️ [WebSocket] Cannot add once listener - socket not initialized:', event);
      return;
    }

    this.socket.once(event as string, listener);
    console.log('👂 [WebSocket] Once listener added:', event);
  }

  // 연결 상태 확인
  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // 소켓 ID 가져오기
  get socketId(): string | undefined {
    return this.socket?.id;
  }

  // 소켓 인스턴스 가져오기 (고급 사용법)
  getSocket(): Socket | null {
    return this.socket;
  }

  // 방 참여
  joinRoom(roomCode: string, guestUserId: string, nickname: string): void {
    this.emit('join-room', {
      roomCode,
      guestUserId,
      nickname,
    });
  }

  // 방 나가기
  leaveRoom(roomCode?: string): void {
    this.emit('leave-room', {
      roomCode,
    });
  }

  // WebRTC 시그널링
  sendOffer(targetSocketId: string, offer: RTCSessionDescriptionInit): void {
    this.emit('offer', {
      targetSocketId,
      offer,
    });
  }

  sendAnswer(targetSocketId: string, answer: RTCSessionDescriptionInit): void {
    this.emit('answer', {
      targetSocketId,
      answer,
    });
  }

  sendIceCandidate(targetSocketId: string, candidate: RTCIceCandidateInit): void {
    this.emit('ice-candidate', {
      targetSocketId,
      candidate,
    });
  }

  // 준비 상태 업데이트
  updatePreparationStatus(characterSetup: boolean, screenSetup: boolean): void {
    this.emit('update-preparation-status', {
      characterSetup,
      screenSetup,
    });
  }

  // 캐릭터 상태 업데이트
  updateCharacterStatus(
    selectedOptions: Record<string, string>,
    selectedColors: Record<string, string>
  ): void {
    this.emit('update-character-status', {
      selectedOptions: selectedOptions as any,
      selectedColors: selectedColors as any,
    });
  }

  // 채팅 메시지 전송
  sendChatMessage(roomCode: string, message: string): void {
    this.emit('chat-message', {
      roomCode,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  // 방 사용자 목록 요청
  requestRoomUsers(roomCode: string): void {
    this.emit('request-room-users', {
      roomCode,
    });
  }

  // 녹화 시작
  startRecording(roomCode: string): void {
    this.emit('start-recording', {
      roomCode,
    });
  }

  // 녹화 종료
  stopRecording(roomCode: string, sessionId?: string): void {
    this.emit('stop-recording', {
      roomCode,
      sessionId,
    });
  }
}

// 싱글톤 인스턴스 내보내기
export const webSocketService = new WebSocketService();
export default webSocketService;