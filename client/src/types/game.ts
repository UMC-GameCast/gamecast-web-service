// 게임 관련 타입 정의

// 통합 플레이어 (모든 상태 정보를 포함)
export interface Player {
  // 기본 정보
  id: string;
  guestUserId: string;
  nickname: string;
  name?: string; // 호환성을 위한 alias
  role: 'host' | 'participant';
  joinedAt: string;
  isHost?: boolean;
  
  // Socket.IO 연결 정보
  socketId?: string | null;
  isConnected: boolean;
  
  // WebRTC 정보  
  hasWebRTCConnection: boolean;
  remoteStream?: MediaStream | null;
  
  // 캐릭터 정보
  characterInfo?: {
    selectedOptions: Record<string, string> | null;
    selectedColors: Record<string, string> | null;
    isCustomized: boolean;
  } | null;
  
  // 준비 상태
  preparationStatus: {
    characterSetup: boolean;
    screenSetup: boolean;
    isReady?: boolean;
  };
  
  // 호환성을 위한 직접 접근 속성들
  isReady?: boolean;
  
  // UI/오디오 상태
  isMuted?: boolean;
  hasAudio?: boolean;
}

// 방 정보 (UI용)
export interface Room {
  id: string;
  roomCode: string;
  roomName: string;
  maxCapacity: number;
  currentCapacity: number;
  roomState: 'waiting' | 'active' | 'recording' | 'processing' | 'expired';
  hostGuestId: string;
  expiresAt: string;
  createdAt: string;
  participants: Player[];
  hostGuest: {
    nickname: string;
  } | null;
}

// 캐릭터 데이터
export interface CharacterData {
  selectedOptions: Record<string, string>;
  selectedColors: Record<string, string>;
  nickname: string;
}

// 캐릭터 옵션
export interface CharacterOptions {
  face: string[];
  hair: string[];
  top: string[];
  bottom: string[];
  accessory: string[];
}

// 캐릭터 색상
export interface CharacterColors {
  face: string[];
  hair: string[];
  top: string[];
  bottom: string[];
  accessory: string[];
}

// 캐릭터 애니메이션 상태
export interface CharacterAnimationState {
  isIdle: boolean;
  isWaving: boolean;
  isTalking: boolean;
  currentFrame: number;
  animationSpeed: number;
}

// 게임 녹화 상태
export interface GameRecordingState {
  isRecording: boolean;
  isPreparing: boolean;
  recordingDuration: number;
  recordingError: string | null;
  playersReady: Record<string, {
    characterSetup: boolean;
    screenSetup: boolean;
    isReady: boolean;
  }>;
}

// 게임 세션 정보
export interface GameSession {
  sessionId: string;
  roomCode: string;
  hostId: string;
  participants: Player[];
  startedAt: string;
  endedAt?: string;
  recordingUrl?: string;
  highlightClips?: HighlightClip[];
  status: 'waiting' | 'active' | 'recording' | 'processing' | 'completed' | 'failed';
}

// 하이라이트 클립
export interface HighlightClip {
  id: string;
  sessionId: string;
  title: string;
  description?: string;
  startTime: number;
  endTime: number;
  videoUrl: string;
  thumbnailUrl?: string;
  tags: string[];
  createdAt: string;
  participants: string[]; // 참여자 닉네임들
}

// 음성 분석 결과
export interface VoiceAnalysis {
  speakerId: string;
  speakerNickname: string;
  segments: Array<{
    startTime: number;
    endTime: number;
    text: string;
    confidence: number;
    emotion?: 'excited' | 'frustrated' | 'surprised' | 'calm';
    volume: number;
  }>;
  totalSpeakingTime: number;
  wordCount: number;
  averageVolume: number;
}

// 오디오 설정
export interface AudioSettings {
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  sampleRate: number;
  channelCount: number;
  volume: number;
}

// UI 상태 관리
export interface UIState {
  showCharacterSetup: boolean;
  showMicrophoneGuide: boolean;
  showRecordingControls: boolean;
  showDebugPanels: boolean;
  currentPage: string;
  isLoading: boolean;
  error: string | null;
}

// 방 설정
export interface RoomSettings {
  maxCapacity: number;
  requireCharacterSetup: boolean;
  requireScreenSetup: boolean;
  autoStartRecording: boolean;
  recordingQuality: '720p' | '1080p' | '4K';
  recordingFormat: 'webm' | 'mp4';
  allowLateJoin: boolean;
  microphoneRequired: boolean;
}

// 사용자 권한
export interface UserPermissions {
  canModifyRoom: boolean;
  canStartRecording: boolean;
  canStopRecording: boolean;
  canKickParticipants: boolean;
  canChangeRoomSettings: boolean;
  canAccessDebugTools: boolean;
}