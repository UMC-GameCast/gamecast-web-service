// 방 관련 타입 정의 (레거시 지원용)
// 새로운 코드에서는 types/game.ts, types/api.ts, types/webrtc.ts 사용 권장

// 레거시 타입들 - 하위 호환성을 위해 유지
export type { CharacterData, Player, Room } from './game';
export type { 
  ParticipantUpdateEvent, 
  VoiceChatState, 
  PeerConnectionState,
  WebRTCOfferData as WebRTCOffer,
  WebRTCAnswerData as WebRTCAnswer,
  WebRTCIceCandidateData as WebRTCIceCandidate,
} from './webrtc';

// 추가 레거시 인터페이스
export interface PreparationStatus {
  characterSetup: boolean;
  screenSetup: boolean;
  isReady?: boolean;
}

// 기존 코드 호환성을 위한 추가 타입들
export interface LegacyCharacterOptions {
  face: string[];
  hair: string[];
  top: string[];
  bottom: string[];
  accessory: string[];
}

export interface LegacyCharacterColors {
  face: string[];
  hair: string[];
  top: string[];
  bottom: string[];
  accessory: string[];
}