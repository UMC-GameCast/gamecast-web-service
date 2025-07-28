import { io, Socket } from "socket.io-client";

const SOCKET_SERVER_URL = "http://localhost:3000"; // 통합 서버 연결

export class WebRTCManager {
  private socket: Socket;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private roomId: string;

  public onRemoteStream: (sid: string, stream: MediaStream) => void = () => {};
  public onUserLeft: (sid: string) => void = () => {};

  constructor(roomId: string) {
    this.roomId = roomId;
    this.socket = io(SOCKET_SERVER_URL);
    this.initializeSocketListeners();
  }

  private initializeSocketListeners() {
    this.socket.on("connect", () => {
      console.log("Socket connected:", this.socket.id);
      this.socket.emit("join_room", { room: this.roomId });
    });

    this.socket.on("user_joined", async (data: { sid: string }) => {
      console.log("New user joined:", data.sid);
      await this.createPeerConnection(data.sid, true);
    });
    
    this.socket.on("user_left", (data: { sid: string }) => {
      console.log("User left:", data.sid);
      this.closePeerConnection(data.sid);
      this.onUserLeft(data.sid);
    });

    this.socket.on("webrtc_offer", async (data: { offer: RTCSessionDescriptionInit, sid: string }) => {
      console.log(`Received offer from ${data.sid}`);
      await this.createPeerConnection(data.sid, false);
      const pc = this.peerConnections.get(data.sid);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.socket.emit("webrtc_answer", { room: this.roomId, answer, target_sid: data.sid });
      }
    });

    this.socket.on("webrtc_answer", async (data: { answer: RTCSessionDescriptionInit, sid: string }) => {
      console.log(`Received answer from ${data.sid}`);
      const pc = this.peerConnections.get(data.sid);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    });

    this.socket.on("webrtc_ice_candidate", async (data: { candidate: RTCIceCandidateInit, sid: string }) => {
      const pc = this.peerConnections.get(data.sid);
      if (pc && data.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
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

  private async createPeerConnection(targetSid: string, isOfferer: boolean) {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit("webrtc_ice_candidate", {
          room: this.roomId,
          candidate: event.candidate,
          target_sid: targetSid,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log(`Received remote stream from ${targetSid}`);
      this.onRemoteStream(targetSid, event.streams[0]);
    };

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => pc.addTrack(track, this.localStream!));
    }

    this.peerConnections.set(targetSid, pc);

    if (isOfferer) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.socket.emit("webrtc_offer", { room: this.roomId, offer, target_sid: targetSid });
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
    this.socket.emit("leave_room", { room: this.roomId });
    this.localStream?.getTracks().forEach(track => track.stop());
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();
    this.socket.disconnect();
  }
} 