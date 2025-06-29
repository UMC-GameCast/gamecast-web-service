// 임시 방 관리 유틸리티 (localStorage 사용)
import type { RecodeRoom, Player, CreateRoomRequest, JoinRoomRequest } from '../types/room';

const ROOMS_STORAGE_KEY = 'gamecast_rooms';
const CURRENT_ROOM_KEY = 'gamecast_current_room';
const CURRENT_PLAYER_KEY = 'gamecast_current_player';

// 6자리 랜덤 입장코드 생성
const generateEntryCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
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
    localStorage.setItem(CURRENT_ROOM_KEY, JSON.stringify(newRoom));
    localStorage.setItem(CURRENT_PLAYER_KEY, JSON.stringify(host));
    
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
    localStorage.setItem(CURRENT_ROOM_KEY, JSON.stringify(room));
    localStorage.setItem(CURRENT_PLAYER_KEY, JSON.stringify(newPlayer));
    
    return { success: true, room };
  } catch {
    return { success: false, error: '방 참여에 실패했습니다.' };
  }
};

// 현재 방 조회
export const getCurrentRoom = (): RecodeRoom | null => {
  const room = localStorage.getItem(CURRENT_ROOM_KEY);
  return room ? JSON.parse(room) : null;
};

// 현재 플레이어 조회
export const getCurrentPlayer = (): Player | null => {
  const player = localStorage.getItem(CURRENT_PLAYER_KEY);
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
  localStorage.removeItem(CURRENT_ROOM_KEY);
  localStorage.removeItem(CURRENT_PLAYER_KEY);
};

// 방 업데이트 (참여자 변경 등)
export const updateRoom = (roomId: string): RecodeRoom | null => {
  const rooms = getAllRooms();
  const room = rooms.find(r => r.id === roomId);
  
  if (room) {
    localStorage.setItem(CURRENT_ROOM_KEY, JSON.stringify(room));
    return room;
  }
  
  return null;
}; 