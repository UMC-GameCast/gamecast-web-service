// API 관련 타입 정의
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 방 생성/참여 API
export interface CreateRoomRequest {
  roomName: string;
  maxCapacity?: number;
  hostSessionId: string;
  hostNickname: string;
  roomSettings?: Record<string, any>;
}

export interface CreateRoomResponse {
  roomId: string;
  roomCode: string;
  roomName: string;
  maxCapacity: number;
  currentCapacity: number;
  roomState: string;
  hostGuestId: string;
  expiresAt: string;
  createdAt: string;
}

export interface JoinRoomRequest {
  roomCode: string;
  sessionId: string;
  nickname: string;
}

export interface JoinRoomResponse {
  guestUserId: string;
  nickname: string;
  role: string;
  joinedAt: string;
  roomInfo: {
    roomId: string;
    roomCode: string;
    roomName: string;
    currentCapacity: number;
    maxCapacity: number;
    roomState: string;
  };
}

// 방 정보 조회 API
export interface RoomInfoResponse {
  id: string;
  roomCode: string;
  roomName: string;
  maxCapacity: number;
  currentCapacity: number;
  roomState: 'waiting' | 'active' | 'recording' | 'processing' | 'expired';
  hostGuestId: string;
  expiresAt: string;
  createdAt: string;
  participants: ParticipantInfo[];
  hostGuest: {
    nickname: string;
  } | null;
}

// 참여자 정보
export interface ParticipantInfo {
  guestUserId: string;
  nickname: string;
  role: 'host' | 'participant';
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

// 캐릭터 설정 관련
export interface CharacterSetupRequest {
  guestUserId: string;
  characterData: {
    selectedOptions: Record<string, string>;
    selectedColors: Record<string, string>;
    nickname: string;
  };
}

export interface CharacterSetupResponse {
  success: boolean;
  message: string;
}

// 준비 상태 업데이트
export interface PreparationStatusRequest {
  guestUserId: string;
  preparationStatus: {
    characterSetup?: boolean;
    screenSetup?: boolean;
  };
}

export interface PreparationStatusResponse {
  success: boolean;
  preparationStatus: {
    characterSetup: boolean;
    screenSetup: boolean;
  };
}