// 방 관련 타입 정의

export interface Player {
  id: string;
  name: string;
  isHost: boolean; // 방장 여부
  character?: string | null; // 캐릭터 설정 여부 (설정된 캐릭터 이름 또는 null)
  recording?: boolean; // 녹화화면 설정 여부
}

export interface RecodeRoom {
  id: string;
  roomName: string;
  entryCode: string; // 입장코드 (6자리)
  hostId: string; // 방장 ID
  maxPlayers: number; // 최대 인원
  players: Player[]; // 현재 참여자 목록
  createdAt: string; // 생성 시간
}

export interface CreateRoomRequest {
  roomName: string;
  maxPlayers: number;
  // hostName 제거 - 자동으로 "Nickname1"로 설정
}

export interface JoinRoomRequest {
  entryCode: string;
  // playerName 제거 - 자동으로 순서대로 설정
} 