/**
 * 실제 사용자 신원을 위한 별도 Socket.IO 연결 관리
 * WebRTC Manager와 분리되어 실제 사용자 ID/닉네임으로 서버와 통신
 */

import { io, Socket } from "socket.io-client";

const SOCKET_SERVER_URL = "http://3.37.34.211:8889"; // WebRTC Manager와 동일한 서버 사용

interface UserSocketConnection {
  socket: Socket;
  isConnected: boolean;
  guestUserId: string;
  nickname: string;
}

class UserSocketManager {
  private connections = new Map<string, UserSocketConnection>();
  
  /**
   * 실제 사용자를 위한 Socket.IO 연결 생성
   */
  public async createUserConnection(
    roomCode: string,
    guestUserId: string, 
    nickname: string
  ): Promise<Socket | null> {
    const connectionKey = `${roomCode}_${guestUserId}`;
    
    // 기존 연결이 있으면 재사용
    if (this.connections.has(connectionKey)) {
      const existing = this.connections.get(connectionKey)!;
      if (existing.socket.connected) {
        console.log('✅ [UserSocket] 기존 연결 재사용:', connectionKey);
        return existing.socket;
      } else {
        // 연결이 끊어진 경우 정리
        existing.socket.disconnect();
        this.connections.delete(connectionKey);
      }
    }
    
    console.log('🔗 [UserSocket] 새로운 사용자 Socket 연결 생성:', {
      roomCode,
      guestUserId,
      nickname,
      serverUrl: SOCKET_SERVER_URL
    });
    
    try {
      const socket = io(SOCKET_SERVER_URL, {
        query: {
          roomCode,
          guestUserId,
          nickname,
          connectionType: 'user' // WebRTC와 구분
        },
        transports: ['websocket', 'polling'],
        timeout: 10000
      });
      
      // 연결 상태 관리
      const connection: UserSocketConnection = {
        socket,
        isConnected: false,
        guestUserId,
        nickname
      };
      
      // 연결 성공 이벤트
      socket.on('connect', () => {
        console.log('✅ [UserSocket] 연결 성공:', {
          socketId: socket.id,
          roomCode,
          guestUserId,
          nickname
        });
        
        connection.isConnected = true;
        
        // 방 참여
        socket.emit('join_room', {
          roomCode,
          guestUserId,
          nickname
        });
      });
      
      // 연결 실패 이벤트
      socket.on('connect_error', (error) => {
        console.error('❌ [UserSocket] 연결 실패:', {
          error: error.message,
          roomCode,
          guestUserId
        });
        connection.isConnected = false;
      });
      
      // 연결 해제 이벤트
      socket.on('disconnect', (reason) => {
        console.log('🔌 [UserSocket] 연결 해제:', {
          reason,
          roomCode,
          guestUserId
        });
        connection.isConnected = false;
      });
      
      // 방 참여 성공
      socket.on('room_joined', (data) => {
        console.log('🏠 [UserSocket] 방 참여 성공:', data);
      });
      
      // 방 참여 실패
      socket.on('room_join_failed', (error) => {
        console.error('❌ [UserSocket] 방 참여 실패:', error);
      });
      
      this.connections.set(connectionKey, connection);
      
      // 연결 완료까지 대기
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);
        
        socket.on('connect', () => {
          clearTimeout(timeout);
          resolve();
        });
        
        socket.on('connect_error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
      
      return socket;
      
    } catch (error) {
      console.error('❌ [UserSocket] 연결 생성 실패:', error);
      return null;
    }
  }
  
  /**
   * 사용자 연결 가져오기
   */
  public getUserConnection(roomCode: string, guestUserId: string): Socket | null {
    const connectionKey = `${roomCode}_${guestUserId}`;
    const connection = this.connections.get(connectionKey);
    
    if (connection && connection.socket.connected) {
      return connection.socket;
    }
    
    return null;
  }
  
  /**
   * 캐릭터 상태 전송
   */
  public async sendCharacterStatus(
    roomCode: string,
    guestUserId: string,
    characterData: {
      selectedOptions: Record<string, string>;
      selectedColors: Record<string, string>;
    }
  ): Promise<boolean> {
    const socket = this.getUserConnection(roomCode, guestUserId);
    
    if (!socket) {
      console.error('❌ [UserSocket] 사용자 연결을 찾을 수 없음:', { roomCode, guestUserId });
      return false;
    }
    
    try {
      console.log('🎨 [UserSocket] 캐릭터 상태 전송:', {
        roomCode,
        guestUserId,
        characterData
      });
      
      socket.emit('update-character-status', {
        selectedOptions: characterData.selectedOptions,
        selectedColors: characterData.selectedColors
      });
      
      console.log('✅ [UserSocket] 캐릭터 상태 전송 완료');
      return true;
      
    } catch (error) {
      console.error('❌ [UserSocket] 캐릭터 상태 전송 실패:', error);
      return false;
    }
  }
  
  /**
   * 특정 연결 해제
   */
  public disconnectUser(roomCode: string, guestUserId: string): void {
    const connectionKey = `${roomCode}_${guestUserId}`;
    const connection = this.connections.get(connectionKey);
    
    if (connection) {
      console.log('🔌 [UserSocket] 사용자 연결 해제:', connectionKey);
      connection.socket.disconnect();
      this.connections.delete(connectionKey);
    }
  }
  
  /**
   * 모든 연결 해제
   */
  public disconnectAll(): void {
    console.log('🔌 [UserSocket] 모든 연결 해제');
    for (const [key, connection] of this.connections) {
      connection.socket.disconnect();
    }
    this.connections.clear();
  }
}

// 싱글톤 인스턴스
const userSocketManager = new UserSocketManager();

export default userSocketManager;

// 편의 함수들
export const createUserSocket = userSocketManager.createUserConnection.bind(userSocketManager);
export const getUserSocket = userSocketManager.getUserConnection.bind(userSocketManager);
export const sendCharacterStatus = userSocketManager.sendCharacterStatus.bind(userSocketManager);
export const disconnectUserSocket = userSocketManager.disconnectUser.bind(userSocketManager);