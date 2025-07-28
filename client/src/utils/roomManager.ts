// 임시 방 관리 유틸리티 (localStorage 사용)
import type { RecodeRoom, Player, CreateRoomRequest, JoinRoomRequest } from '../types/room';

const ROOMS_STORAGE_KEY = 'gamecast_rooms';
const CURRENT_ROOM_KEY = 'gamecast_current_room';
const CURRENT_PLAYER_KEY = 'gamecast_current_player';

// 탭별 고유 세션 ID 생성 및 관리
const SESSION_ID_KEY = 'gamecast_session_id';
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = 'session_' + Math.random().toString(36).substring(2, 15) + Date.now();
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
};

// 세션별 키 생성
const getSessionKey = (baseKey: string): string => {
  return `${baseKey}_${getSessionId()}`;
};

// 6자리 랜덤 입장코드 생성
const generateEntryCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// UUID 생성 (임시)
const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// 자동 닉네임 생성 (방장: Nickname1, 게스트: 순서대로)
const generateNickname = (playerIndex: number): string => {
  return `Nickname${playerIndex}`;
};

// 모든 방 조회
export const getAllRooms = (): RecodeRoom[] => {
  const rooms = localStorage.getItem(ROOMS_STORAGE_KEY);
  return rooms ? JSON.parse(rooms) : [];
};

// 방 저장
const saveRooms = (rooms: RecodeRoom[]): void => {
  localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(rooms));
};

// 입장코드로 방 찾기
export const findRoomByCode = (entryCode: string): RecodeRoom | null => {
  const rooms = getAllRooms();
  return rooms.find(room => room.entryCode === entryCode) || null;
};

// 방 생성
export const createRoom = (request: CreateRoomRequest): { success: boolean; room?: RecodeRoom; error?: string } => {
  try {
    const rooms = getAllRooms();
    
    const hostId = generateId();
    const roomId = generateId();
    const entryCode = generateEntryCode();
    
    // 방장은 항상 Nickname1
    const host: Player = {
      id: hostId,
      name: generateNickname(1), // "Nickname1"
      isHost: true
    };
    
    const newRoom: RecodeRoom = {
      id: roomId,
      roomName: request.roomName,
      entryCode,
      hostId,
      maxPlayers: request.maxPlayers,
      players: [host],
      createdAt: new Date().toISOString()
    };
    
    rooms.push(newRoom);
    saveRooms(rooms);
    
    // 현재 방과 플레이어 정보 저장
    localStorage.setItem(getSessionKey(CURRENT_ROOM_KEY), JSON.stringify(newRoom));
    localStorage.setItem(getSessionKey(CURRENT_PLAYER_KEY), JSON.stringify(host));
    
    return { success: true, room: newRoom };
  } catch {
    return { success: false, error: '방 생성에 실패했습니다.' };
  }
};

// 방 참여
export const joinRoom = (request: JoinRoomRequest): { success: boolean; room?: RecodeRoom; error?: string } => {
  try {
    const rooms = getAllRooms();
    const roomIndex = rooms.findIndex(room => room.entryCode === request.entryCode);
    
    if (roomIndex === -1) {
      return { success: false, error: '존재하지 않는 입장코드입니다.' };
    }
    
    const room = rooms[roomIndex];
    
    // 인원 수 확인
    if (room.players.length >= room.maxPlayers) {
      return { success: false, error: '방이 가득 찼습니다.' };
    }
    
    const playerId = generateId();
    // 다음 순서 닉네임 생성 (현재 인원 수 + 1)
    const nextNicknameIndex = room.players.length + 1;
    
    const newPlayer: Player = {
      id: playerId,
      name: generateNickname(nextNicknameIndex), // "Nickname2", "Nickname3", ...
      isHost: false
    };
    
    room.players.push(newPlayer);
    rooms[roomIndex] = room;
    saveRooms(rooms);
    
    // 현재 방과 플레이어 정보 저장
    localStorage.setItem(getSessionKey(CURRENT_ROOM_KEY), JSON.stringify(room));
    localStorage.setItem(getSessionKey(CURRENT_PLAYER_KEY), JSON.stringify(newPlayer));
    
    return { success: true, room };
  } catch {
    return { success: false, error: '방 참여에 실패했습니다.' };
  }
};

// 현재 방 조회
export const getCurrentRoom = (): RecodeRoom | null => {
  const room = localStorage.getItem(getSessionKey(CURRENT_ROOM_KEY));
  return room ? JSON.parse(room) : null;
};

// 현재 플레이어 조회
export const getCurrentPlayer = (): Player | null => {
  const player = localStorage.getItem(getSessionKey(CURRENT_PLAYER_KEY));
  return player ? JSON.parse(player) : null;
};

// 방 나가기
export const leaveRoom = (): void => {
  const currentRoom = getCurrentRoom();
  const currentPlayer = getCurrentPlayer();
  
  if (currentRoom && currentPlayer) {
    const rooms = getAllRooms();
    const roomIndex = rooms.findIndex(room => room.id === currentRoom.id);
    
    if (roomIndex !== -1) {
      const room = rooms[roomIndex];
      room.players = room.players.filter(player => player.id !== currentPlayer.id);
      
      // 방장이 나가면 방 삭제
      if (currentPlayer.isHost) {
        rooms.splice(roomIndex, 1);
      } else {
        // 게스트가 나가면 남은 플레이어들의 닉네임 재정렬
        room.players.forEach((player, index) => {
          player.name = generateNickname(index + 1);
        });
        rooms[roomIndex] = room;
      }
      
      saveRooms(rooms);
    }
  }
  
  // 현재 방과 플레이어 정보 제거
  localStorage.removeItem(getSessionKey(CURRENT_ROOM_KEY));
  localStorage.removeItem(getSessionKey(CURRENT_PLAYER_KEY));
};

// 방 업데이트 (참여자 변경 등)
export const updateRoom = (roomId: string): RecodeRoom | null => {
  const rooms = getAllRooms();
  const room = rooms.find(r => r.id === roomId);
  
  if (room) {
    localStorage.setItem(getSessionKey(CURRENT_ROOM_KEY), JSON.stringify(room));
    return room;
  }
  
  return null;
};

// 현재 플레이어 상태 업데이트
export const updateCurrentPlayer = (updates: Partial<Pick<Player, 'character' | 'recording'>>): { success: boolean; error?: string } => {
  try {
    const currentRoom = getCurrentRoom();
    const currentPlayer = getCurrentPlayer();
    
    if (!currentRoom || !currentPlayer) {
      return { success: false, error: '현재 방 또는 플레이어 정보를 찾을 수 없습니다.' };
    }
    
    // 현재 플레이어 정보 업데이트
    const updatedPlayer = { ...currentPlayer, ...updates };
    
    // 방의 플레이어 목록에서도 업데이트
    const rooms = getAllRooms();
    const roomIndex = rooms.findIndex(room => room.id === currentRoom.id);
    
    if (roomIndex !== -1) {
      const room = rooms[roomIndex];
      const playerIndex = room.players.findIndex(player => player.id === currentPlayer.id);
      
      if (playerIndex !== -1) {
        room.players[playerIndex] = updatedPlayer;
        rooms[roomIndex] = room;
        saveRooms(rooms);
        
        // 로컬스토리지의 현재 플레이어와 방 정보도 업데이트
        localStorage.setItem(getSessionKey(CURRENT_PLAYER_KEY), JSON.stringify(updatedPlayer));
        localStorage.setItem(getSessionKey(CURRENT_ROOM_KEY), JSON.stringify(room));
        
        return { success: true };
      }
    }
    
    return { success: false, error: '플레이어 정보 업데이트에 실패했습니다.' };
  } catch {
    return { success: false, error: '플레이어 정보 업데이트 중 오류가 발생했습니다.' };
  }
};

// 디버깅용 함수들
export const debugGetAllData = (): { rooms: RecodeRoom[]; currentRoom: RecodeRoom | null; currentPlayer: Player | null } => {
  return {
    rooms: getAllRooms(),
    currentRoom: getCurrentRoom(),
    currentPlayer: getCurrentPlayer()
  };
};

export const debugClearAllData = (): void => {
  localStorage.removeItem(ROOMS_STORAGE_KEY);
  localStorage.removeItem(getSessionKey(CURRENT_ROOM_KEY));
  localStorage.removeItem(getSessionKey(CURRENT_PLAYER_KEY));
  console.log('🗑️ All room data cleared');
  // storage 이벤트 트리거하여 다른 탭에도 알림
  window.dispatchEvent(new StorageEvent('storage', {
    key: ROOMS_STORAGE_KEY,
    newValue: null,
    oldValue: localStorage.getItem(ROOMS_STORAGE_KEY),
    url: window.location.href
  }));
};

export const debugLogRoomData = (): void => {
  const data = debugGetAllData();
  console.log('📊 Current Room Data:');
  console.log('Rooms:', data.rooms);
  console.log('Current Room:', data.currentRoom);
  console.log('Current Player:', data.currentPlayer);
  
  // 실제 localStorage 내용도 로그
  console.log('📁 Raw localStorage:');
  console.log('gamecast_rooms:', localStorage.getItem(ROOMS_STORAGE_KEY));
  console.log('gamecast_current_room:', localStorage.getItem(getSessionKey(CURRENT_ROOM_KEY)));
  console.log('gamecast_current_player:', localStorage.getItem(getSessionKey(CURRENT_PLAYER_KEY)));
}; 