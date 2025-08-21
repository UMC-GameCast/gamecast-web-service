import type { Room, Player } from '../types/game';

// 데모용 플레이어 정보
export const DEMO_PLAYERS: Player[] = [
  {
    id: "host",
    guestUserId: "host",
    nickname: "초토로",
    name: "초토로",
    role: "host",
    joinedAt: new Date().toISOString(),
    isHost: true,
    socketId: null,
    isConnected: true,
    hasWebRTCConnection: false,
    characterInfo: {
      isCustomized: true,
      characterData: {
        selectedOptions: { 
          face: "face1", 
          hair: "hair2",
          top: "top1",
          bottom: "bottom2",
          accessory: "accessories1"
        },
        selectedColors: { 
          face: "21",        // 밝은 살색
          hair: "black",     // 검은색 머리
          top: "blue",       // 파란색 상의
          bottom: "red",     // 빨간색 하의
          accessory: "green" // 초록색 악세서리
        },
        nickname: "초토로"
      }
    }
  },
  {
    id: "user1",
    guestUserId: "user1",
    nickname: "소질이",
    name: "소질이",
    role: "participant",
    joinedAt: new Date().toISOString(),
    isHost: false,
    socketId: null,
    isConnected: true,
    hasWebRTCConnection: false,
    characterInfo: {
      isCustomized: true,
      characterData: {
        selectedOptions: { 
          face: "face2", 
          hair: "hair3",
          top: "top3",
          bottom: "bottom1",
          accessory: "accessories2"
        },
        selectedColors: { 
          face: "23",        // 중간 살색
          hair: "yellow",    // 노란색 머리
          top: "white",      // 흰색 상의 (top3는 한글명 파일)
          bottom: "green",   // 초록색 하의
          accessory: "blue"  // 파란색 악세서리
        },
        nickname: "소질이"
      }
    }
  },
  {
    id: "user2",
    guestUserId: "user2",
    nickname: "톰쥬",
    name: "톰쥬",
    role: "participant",
    joinedAt: new Date().toISOString(),
    isHost: false,
    socketId: null,
    isConnected: true,
    hasWebRTCConnection: false,
    characterInfo: {
      isCustomized: true,
      characterData: {
        selectedOptions: { 
          face: "face3", 
          hair: "hair1",
          top: "top2",
          bottom: "bottom3",
          accessory: "accessories3"
        },
        selectedColors: { 
          face: "27",        // 어두운 살색
          hair: "red",       // 빨간색 머리
          top: "yellow",     // 노란색 상의
          bottom: "blue",    // 파란색 하의
          accessory: "white" // 흰색 악세서리
        },
        nickname: "톰쥬"
      }
    }
  }
];

// 데모용 방 정보
export const DEMO_ROOM_DATA: Room = {
  roomCode: "DEMO01",
  hostGuestUserId: "host",
  gameTitle: "데모 게임 세션",
  createdAt: new Date().toISOString(),
  status: "active",
  participants: DEMO_PLAYERS,
  maxParticipants: 4,
  currentParticipants: 3,
  gameSettings: {
    recordingEnabled: true,
    voiceChatEnabled: true
  }
};

// 데모 모드 체크 함수
export const isDemoMode = (searchParams: URLSearchParams): boolean => {
  return searchParams.get('demo') === 'true';
};

// 데모 roomCode 체크 함수  
export const isDemoRoomCode = (roomCode: string): boolean => {
  return roomCode === 'DEMO01' || roomCode === 'demo';
};