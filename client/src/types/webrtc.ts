// WebRTC 관련 타입 정의

// Socket.IO 이벤트 타입들
export interface SocketEvents {
  // 클라이언트 → 서버
  'join-room': {
    roomCode: string;
    guestUserId: string;
    nickname: string;
  };
  'leave-room': {
    roomCode?: string;
  };
  'offer': WebRTCOfferData;
  'answer': WebRTCAnswerData;
  'ice-candidate': WebRTCIceCandidateData;
  'update-preparation-status': PreparationStatusData;
  'update-character-status': CharacterStatusData;
  'chat-message': ChatMessageData;
  'request-room-users': {
    roomCode: string;
  };
  'start-recording': {
    roomCode: string;
  };
  'stop-recording': {
    roomCode: string;
    sessionId?: string;
  };

  // 서버 → 클라이언트
  'connect': void;
  'disconnect': string;
  'joined-room-success': {
    roomCode: string;
    roomId: string;
    users: RoomUser[];
  };
  'join-room-error': {
    message: string;
  };
  'user-joined': {
    socketId: string;
    guestUserId: string;
    nickname: string;
    joinedAt: string;
  };
  'user-left': {
    socketId: string;
    guestUserId: string;
    nickname: string;
  };
  'room-users': RoomUser[];
  'participant-update': ParticipantUpdateEvent;
  'preparation-status-updated': PreparationStatusUpdateEvent;
  'character-status-updated': CharacterStatusUpdateEvent;
  'recording-started': RecordingEvent;
  'recording-stopped': RecordingEvent;
  'error': {
    message: string;
  };
}

// WebRTC 시그널링 데이터
export interface WebRTCOfferData {
  targetSocketId: string;
  offer: RTCSessionDescriptionInit;
}

export interface WebRTCAnswerData {
  targetSocketId: string;
  answer: RTCSessionDescriptionInit;
}

export interface WebRTCIceCandidateData {
  targetSocketId: string;
  candidate: RTCIceCandidateInit;
}

// 준비 상태 데이터
export interface PreparationStatusData {
  characterSetup: boolean;
  screenSetup: boolean;
}

// 캐릭터 상태 데이터
export interface CharacterStatusData {
  selectedOptions: {
    face: string;
    hair: string;
    top: string;
    bottom: string;
    accessory: string;
  };
  selectedColors: {
    face: string;
    hair: string;
    top: string;
    bottom: string;
    accessory: string;
  };
}

// 채팅 메시지 데이터
export interface ChatMessageData {
  roomCode: string;
  message: string;
  timestamp: string;
}

// 방 사용자 정보 (Socket.IO)
export interface RoomUser {
  socketId: string;
  guestUserId: string;
  nickname: string;
  isHost: boolean;
  joinedAt: string;
  preparationStatus: {
    characterSetup: boolean;
    screenSetup: boolean;
  };
  characterInfo: {
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

// 참여자 업데이트 이벤트
export interface ParticipantUpdateEvent {
  roomCode: string;
  eventType: 'user-joined' | 'user-left';
  participants: RoomUser[];
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

// 준비 상태 업데이트 이벤트
export interface PreparationStatusUpdateEvent {
  guestUserId: string;
  nickname: string;
  characterSetup: boolean;
  screenSetup: boolean;
  updatedAt: string;
}

// 캐릭터 상태 업데이트 이벤트
export interface CharacterStatusUpdateEvent {
  guestUserId: string;
  nickname: string;
  selectedOptions: {
    face: string;
    hair: string;
    top: string;
    bottom: string;
    accessory: string;
  };
  selectedColors: {
    face: string;
    hair: string;
    top: string;
    bottom: string;
    accessory: string;
  };
  characterInfo: {
    selectedOptions: {
      face: string;
      hair: string;
      top: string;
      bottom: string;
      accessory: string;
    };
    selectedColors: {
      face: string;
      hair: string;
      top: string;
      bottom: string;
      accessory: string;
    };
    isCustomized: boolean;
  };
  updatedAt: string;
}

// 녹화 이벤트
export interface RecordingEvent {
  sessionId: string;
  startedBy?: string;
  stoppedBy?: string;
  autoStarted?: boolean;
  timestamp: string;
}

// WebRTC 연결 상태
export interface PeerConnectionState {
  socketId: string;
  nickname: string;
  connectionState: RTCPeerConnectionState;
  hasAudio: boolean;
  isMuted: boolean;
}

// 음성 채팅 상태
export interface VoiceChatState {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  peerConnections: Map<string, PeerConnectionState>;
  isLocalMuted: boolean;
  isConnected: boolean;
}

// WebRTC 매니저 설정
export interface WebRTCConfig {
  serverUrl: string;
  iceServers: RTCIceServer[];
  reconnectionAttempts: number;
  reconnectionDelay: number;
}

// 연결 진단 정보
export interface ConnectionDiagnostics {
  socketConnected: boolean;
  socketId: string;
  localStreamActive: boolean;
  localStreamTracks: number;
  totalPeerConnections: number;
  connectedPeers: number;
  roomCode: string;
  guestUserId: string | null;
  nickname: string;
  isJoining: boolean;
  lastJoinAttempt: string;
  reconnectionAttempts: Record<string, number>;
  peerStates: Array<{
    socketId: string;
    nickname: string;
    connectionState: RTCPeerConnectionState;
    hasAudio: boolean;
    isMuted: boolean;
  }>;
}