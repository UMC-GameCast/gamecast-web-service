// 방 관련 타입 정의

export interface CharacterData {
  selectedOptions: Record<string, string>; // 선택된 형태 옵션들
  selectedColors: Record<string, string>; // 선택된 색상 옵션들
  nickname: string; // 사용자 닉네임
}

export interface PreparationStatus {
  characterSetup: boolean;
  screenSetup: boolean;
  isReady?: boolean; // 준비 완료 상태 추가
}

export interface Player {
  id: string; // participant ID (서버에서 받는 필드)
  guestUserId?: string; // guest user ID (클라이언트 전용)
  nickname: string;
  name?: string; // 캐릭터 이름 (선택적)
  role: 'host' | 'participant'; // 서버와 일치: 'participant' 사용
  joinedAt: string;
  preparationStatus?: PreparationStatus; // 선택적 필드로 변경
  isHost?: boolean; // 선택적 필드로 변경
  isReady?: boolean; // 준비 완료 상태 추가
  character?: CharacterData; // 레거시 캐릭터 데이터 (선택적)
  characterInfo?: {
    selectedOptions: {
      face: string;
      hair: string;
      top: string;
      bottom: string;
      accessory: string;
    } | null;
    selectedColors: {
      face: string;
      hair: string;
      top: string;
      bottom: string;
      accessory: string;
    } | null;
    isCustomized: boolean;
  } | null;
}

export interface Room {
  id: string;
  roomCode: string; // 6자리 입장코드
  roomName: string;
  gameTitle?: string; // 게임 제목 (선택적)
  maxCapacity: number; // 최대 인원
  currentCapacity: number; // 현재 인원
  roomState: 'waiting' | 'active' | 'recording' | 'expired';
  hostGuestId: string; // 방장 게스트 ID
  createdAt: string;
  expiresAt: string;
  roomSettings?: Record<string, unknown>;
  hostGuest?: {
    nickname: string;
  };
  participants: Player[];
}

export interface CreateRoomRequest {
  roomName: string;
  hostNickname: string;
  maxCapacity?: number; // 기본값 5
  roomSettings?: Record<string, unknown>;
}

export interface JoinRoomRequest {
  roomCode: string;
  nickname: string;
}

export interface LeaveRoomRequest {
  guestUserId: string;
}

export interface UpdatePreparationRequest {
  guestUserId: string;
  characterSetup?: boolean;
  screenSetup?: boolean;
}

// API 응답 타입
export interface APIResponse<T> {
  resultType: 'SUCCESS' | 'FAIL';
  error: {
    errorCode: string;
    reason: string;
    data?: unknown;
  } | null;
  success: T | null;
}

export interface CreateRoomResponse {
  roomId: string;
  roomCode: string;
  roomName: string;
  maxCapacity: number;
  currentCapacity: number;
  roomState: string;
  hostGuestId: string;
  createdAt: string;
  expiresAt: string;
}

export interface JoinRoomResponse {
  guestUserId: string;
  roomInfo: {
    roomId: string;
    roomCode: string;
    roomName: string;
    currentCapacity: number;
    maxCapacity: number;
    roomState: string;
  };
}

export interface ParticipantUpdateEvent {
  roomCode: string;
  eventType: 'user-joined' | 'user-left';
  participants: Player[];
  newParticipant?: {
    guestUserId: string;
    nickname: string;
    role: string;
    joinedAt: string;
  };
  leftParticipant?: {
    guestUserId: string;
    nickname: string;
    role: string;
  };
  roomInfo: {
    currentCapacity: number;
    maxCapacity: number;
  };
  timestamp: string;
}

// RecodeRoom 타입은 제거됨 - Room 타입을 직접 사용

// WebRTC 관련 타입들
export interface WebRTCSocketEvent {
  event: string; // Socket.IO 이벤트 타입
  data: Record<string, unknown>; // 이벤트 데이터
}

export interface WebRTCOffer {
  offer: RTCSessionDescriptionInit; // WebRTC Offer 데이터
  targetSocketId: string; // 대상 소켓 ID
}

export interface WebRTCAnswer {
  answer: RTCSessionDescriptionInit; // WebRTC Answer 데이터
  targetSocketId: string; // 대상 소켓 ID
}

export interface WebRTCIceCandidate {
  candidate: RTCIceCandidateInit; // ICE Candidate 데이터
  targetSocketId: string; // 대상 소켓 ID
}

export interface PeerConnectionState {
  socketId: string;
  nickname: string;
  connectionState: RTCPeerConnectionState;
  hasAudio: boolean;
  isMuted: boolean;
}

export interface VoiceChatState {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  peerConnections: Map<string, PeerConnectionState>;
  isLocalMuted: boolean;
  isConnected: boolean;
}

// 사용자 세션 관리
export interface UserSession {
  sessionId: string;
  guestUserId?: string;
  currentRoom?: Room;
  currentPlayer?: Player;
} 