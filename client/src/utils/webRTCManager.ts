import { io, Socket } from "socket.io-client";
import { getCurrentUserId } from './roomManager';
import type { ParticipantUpdateEvent } from '../types/room';

const SOCKET_SERVER_URL = "http://3.37.34.211:8889";

export class WebRTCManager {
  private socket: Socket;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private roomCode: string;
  private guestUserId: string | null = null;
  private nickname: string;

  public onRemoteStream: (sid: string, stream: MediaStream) => void = () => {};
  public onUserLeft: (sid: string) => void = () => {};
  public onParticipantUpdate: (event: ParticipantUpdateEvent) => void = () => {};
  public onRoomUsers: (users: unknown[]) => void = () => {};
  public onJoinRoomError: (error: { message: string }) => void = () => {};

  constructor(roomCode: string, nickname: string) {
    this.roomCode = roomCode;
    this.nickname = nickname;
    this.guestUserId = getCurrentUserId();
    
    this.socket = io(SOCKET_SERVER_URL);
    
    this.initializeSocketListeners();
  }

  private initializeSocketListeners() {
    this.socket.on("connect", () => {
      console.log("✅ Socket.IO connected:", this.socket.id);
      console.log("Server URL:", SOCKET_SERVER_URL);
      this.joinRoom();
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    this.socket.on("disconnect", (reason) => {
      console.log("🔌 Socket.IO disconnected:", reason);
      if (reason === 'io server disconnect') {
        // 서버에서 연결을 끊은 경우 재연결 시도
        this.socket.connect();
      }
    });

    // 재연결 시도
    this.socket.on("reconnect", (attemptNumber) => {
      console.log("🔄 Socket.IO reconnected after", attemptNumber, "attempts");
    });

    this.socket.on("reconnect_error", (error) => {
      console.error("❌ Socket.IO reconnection failed:", error);
    });

    // room_status 이벤트 처리 - 서버 요구사항에 따른 방 상태 업데이트
    this.socket.on("room_status", (userList: unknown[]) => {
      console.log("Room status updated:", userList);
      this.onRoomUsers(userList);
    });

    // 새 서버 이벤트: 방 참여 관련 (기존 이벤트 유지)
    this.socket.on("joined-room-success", (data: { roomCode: string; roomId: string; users: unknown[] }) => {
      console.log("Successfully joined room:", data.roomCode);
      this.onRoomUsers(data.users);
    });

    this.socket.on("join-room-error", (error: { message: string }) => {
      console.error("Failed to join room:", error.message);
      this.onJoinRoomError(error);
    });

    this.socket.on("room-users", (users: unknown[]) => {
      console.log("Room users updated:", users);
      this.onRoomUsers(users);
    });

    // 새 서버 이벤트: 참여자 업데이트
    this.socket.on("participant-update", (event: ParticipantUpdateEvent) => {
      console.log("Participant update:", event);
      this.onParticipantUpdate(event);
    });

    // 사용자 참여/퇴장 이벤트
    this.socket.on("user-joined", async (data: { socketId: string; guestUserId: string; nickname: string; joinedAt: string }) => {
      console.log("New user joined:", data.nickname);
      await this.createPeerConnection(data.socketId, true);
    });
    
    this.socket.on("user-left", (data: { socketId: string; guestUserId: string; nickname: string }) => {
      console.log("User left:", data.nickname);
      this.closePeerConnection(data.socketId);
      this.onUserLeft(data.socketId);
    });

    // WebRTC 시그널링 이벤트
    this.socket.on("offer", async (data: { fromSocketId: string; fromNickname: string; offer: RTCSessionDescriptionInit }) => {
      console.log(`Received offer from ${data.fromNickname}`);
      await this.createPeerConnection(data.fromSocketId, false);
      const pc = this.peerConnections.get(data.fromSocketId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.socket.emit("answer", { targetSocketId: data.fromSocketId, answer });
      }
    });

    this.socket.on("answer", async (data: { fromSocketId: string; fromNickname: string; answer: RTCSessionDescriptionInit }) => {
      console.log(`Received answer from ${data.fromNickname}`);
      const pc = this.peerConnections.get(data.fromSocketId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    });

    this.socket.on("ice-candidate", async (data: { fromSocketId: string; candidate: RTCIceCandidateInit }) => {
      const pc = this.peerConnections.get(data.fromSocketId);
      if (pc && data.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
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
    if (!this.guestUserId) {
      console.error("No guest user ID available for WebRTC, will retry...");
      // 잠시 후 재시도
      setTimeout(() => {
        this.guestUserId = getCurrentUserId();
        if (this.guestUserId) {
          this.joinRoom();
        }
      }, 1000);
      return;
    }

    // guestUserId, nickname, roomCode 값 정확성 확인
    if (!this.roomCode || !this.nickname) {
      console.error("Missing required values for room join:", {
        roomCode: !!this.roomCode,
        guestUserId: !!this.guestUserId,
        nickname: !!this.nickname
      });
      return;
    }

    // 닉네임 고유화 - 전역 중복 방지
    const uniqueNickname = `${this.nickname}_${this.roomCode}_${this.guestUserId.slice(-8)}`;
    
    console.log("Attempting to join room via Socket.IO (정확성 확인됨):", {
      roomCode: this.roomCode,
      guestUserId: this.guestUserId,
      originalNickname: this.nickname,
      uniqueNickname: uniqueNickname
    });

    // API 문서에 맞는 Socket.IO 이벤트 구조 사용
    this.socket.emit("join-room", {
      roomCode: this.roomCode,
      guestUserId: this.guestUserId,
      nickname: uniqueNickname,  // 고유 닉네임 사용
      isReconnect: true  // 이미 REST API로 입장한 상태임을 표시
    });
  }

  public async start(): Promise<MediaStream | null> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      return this.localStream;
    } catch (error) {
      console.error("Error getting user media:", error);
      return null;
    }
  }

  private async createPeerConnection(targetSocketId: string, isOfferer: boolean) {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit("ice-candidate", {
          targetSocketId: targetSocketId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log(`Received remote stream from ${targetSocketId}`);
      this.onRemoteStream(targetSocketId, event.streams[0]);
    };

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => pc.addTrack(track, this.localStream!));
    }

    this.peerConnections.set(targetSocketId, pc);

    if (isOfferer) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.socket.emit("offer", { 
        targetSocketId: targetSocketId, 
        offer 
      });
    }
  }

  private closePeerConnection(sid: string) {
    const pc = this.peerConnections.get(sid);
    if (pc) {
      pc.close();
      this.peerConnections.delete(sid);
    }
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
} 