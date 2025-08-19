import React, { createContext, useContext, useReducer, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Room, Player, CharacterData } from '../types/game';
import { SOCKET_URL } from '../config/server.config';
import { 
  getCurrentRoom, 
  getCurrentUserId, 
  getRoomInfo, 
  leaveRoom as leaveRoomUtil 
} from '../utils/roomManager';

// 🔧 강화된 Socket 연결 상태 관리
interface SocketState {
  socket: Socket | null;
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
  roomCode: string | null;
  guestUserId: string | null;
  connectionAttempts: number;
  lastConnectedAt: number | null;
  isIntentionalDisconnect: boolean;
}

// 전역 Socket 상태 (Single Source of Truth)
const globalSocketState: SocketState = {
  socket: null,
  status: 'disconnected',
  roomCode: null,
  guestUserId: null,
  connectionAttempts: 0,
  lastConnectedAt: null,
  isIntentionalDisconnect: false
};

// 추가 전역 변수들 (코드에서 참조되는 변수들)
let globalSocket: Socket | null = null;

// Context 초기화 중복 방지
let isInitializing = false;

// 올바른 닉네임으로 정규화하는 함수
const normalizePlayerNickname = (player: Player): Player => {
  // 이미 올바른 닉네임 패턴이면 그대로 반환
  if (player.nickname && player.nickname.startsWith('Nickname') && /^Nickname\d+$/.test(player.nickname)) {
    return player;
  }
  
  // 호스트인 경우 항상 "Nickname1"
  if (player.role === 'host' || player.isHost) {
    return {
      ...player,
      nickname: "Nickname1"
    };
  }
  
  // 참여자이고 닉네임이 guestUserId 형태인 경우
  // 임시로 "Nickname2"로 설정 (실제로는 서버에서 정확한 순번을 받아야 함)
  if (/^[a-f0-9-]{36}$/.test(player.nickname) || /^\d+$/.test(player.nickname)) {
    return {
      ...player,
      nickname: "Nickname2" // 임시 fallback - 추후 서버 API로 정확한 닉네임 조회 필요
    };
  }
  
  return player;
};

// participants 배열 전체를 정규화하는 함수 (순번 기반)
const normalizeParticipants = (participants: Player[]): Player[] => {
  if (!Array.isArray(participants)) return [];
  
  // 호스트와 참여자를 분리
  const hostPlayers = participants.filter(p => p.role === 'host' || p.isHost);
  const participantPlayers = participants.filter(p => p.role !== 'host' && !p.isHost);
  
  // 호스트는 항상 "Nickname1"
  const normalizedHosts = hostPlayers.map(player => ({
    ...player,
    nickname: "Nickname1"
  }));
  
  // 참여자들은 순번에 따라 "Nickname2", "Nickname3", ...
  const normalizedParticipants = participantPlayers.map((player, index) => {
    // 이미 올바른 닉네임 패턴이면 그대로 사용
    if (player.nickname && player.nickname.startsWith('Nickname') && /^Nickname\d+$/.test(player.nickname)) {
      return player;
    }
    
    // 순번 기반으로 닉네임 생성 (2부터 시작)
    return {
      ...player,
      nickname: `Nickname${index + 2}`
    };
  });
  
  return [...normalizedHosts, ...normalizedParticipants];
};

// Socket 상태 변경 로깅
const logSocketState = (action: string, details?: Record<string, unknown>) => {
  console.log(`🔌 [SocketState] ${action}:`, {
    status: globalSocketState.status,
    socketId: globalSocketState.socket?.id,
    roomCode: globalSocketState.roomCode,
    guestUserId: globalSocketState.guestUserId,
    attempts: globalSocketState.connectionAttempts,
    lastConnected: globalSocketState.lastConnectedAt ? new Date(globalSocketState.lastConnectedAt).toISOString() : null,
    isIntentional: globalSocketState.isIntentionalDisconnect,
    ...details
  });
};

// 🔍 데이터 검증 함수들
const validatePlayer = (player: unknown): player is Player => {
  return player !== null && 
    typeof player === 'object' &&
    'guestUserId' in player &&
    'nickname' in player &&
    'role' in player &&
    typeof (player as Player).guestUserId === 'string' && 
    typeof (player as Player).nickname === 'string' && 
    ((player as Player).role === 'host' || (player as Player).role === 'participant');
};

const validateRoom = (room: unknown): room is Room => {
  return room !== null &&
    typeof room === 'object' &&
    'roomCode' in room &&
    'roomName' in room &&
    'maxCapacity' in room &&
    typeof (room as any).roomCode === 'string' && 
    (room as any).roomCode.length === 6 &&
    typeof (room as any).roomName === 'string' &&
    typeof (room as any).maxCapacity === 'number' &&
    (room as any).maxCapacity > 0;
};

const validateParticipants = (participants: unknown): participants is Player[] => {
  return Array.isArray(participants) && 
    participants.every(validatePlayer);
};

const validateTimestamp = (timestamp: unknown, maxAge: number = 300000): boolean => {
  if (typeof timestamp !== 'number') return false;
  const age = Math.abs(Date.now() - timestamp);
  return age <= maxAge; // 기본 5분 이내
};

// 🔍 데이터 검증 및 로깅
const validateAndLog = (eventName: string, data: any, validator?: (data: any) => boolean): boolean => {
  try {
    const isValid = validator ? validator(data) : true;
    const hasTimestamp = data && typeof data.timestamp === 'number';
    const timestampValid = hasTimestamp ? validateTimestamp(data.timestamp) : true;
    
    logSocketState(`${eventName} 데이터 검증`, {
      isValid,
      hasTimestamp,
      timestampValid,
      dataType: typeof data,
      dataKeys: data && typeof data === 'object' ? Object.keys(data) : null
    });
    
    if (!isValid) {
      logSocketState(`${eventName} 데이터 검증 실패`, { data });
      return false;
    }
    
    if (hasTimestamp && !timestampValid) {
      logSocketState(`${eventName} 타임스탬프 검증 실패`, { 
        timestamp: data.timestamp,
        age: Math.abs(Date.now() - data.timestamp)
      });
      return false;
    }
    
    return true;
  } catch (error) {
    logSocketState(`${eventName} 검증 중 오류`, { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
};

// 통합 전역 상태 인터페이스
interface UnifiedGamecastState {
  // 방 관련 (단일 소스)
  currentRoom: Room | null;
  currentPlayer: Player | null;
  participants: Player[]; // Socket.IO + WebRTC 통합 관리
  
  // 로딩 및 에러
  loading: boolean;
  error: string | null;
  
  // 준비 상태 (preparationStatus 기반 통합)
  preparation: {
    characterSetup: boolean;
    screenSetup: boolean;
    isReady: boolean;
  };
  
  // 실시간 연결 상태 (WebRTC 제거됨)
  realtime: {
    socket: Socket | null;
    voiceConnected: boolean; // 항상 false
  };
  
  // 녹화 상태
  recording: {
    isRecording: boolean;
    recordingTime: number;
  };
  
  // UI 상태
  ui: {
    showCharacterSetup: boolean;
    showMicGuide: boolean;
  };
}

// 액션 타입
type UnifiedGamecastAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ROOM'; payload: Room | null }
  | { type: 'SET_PLAYER'; payload: Player | null }
  | { type: 'SET_PARTICIPANTS'; payload: Player[] }
  | { type: 'UPDATE_PARTICIPANT'; payload: { guestUserId: string; updates: Partial<Player> } }
  | { type: 'SET_PREPARATION'; payload: Partial<UnifiedGamecastState['preparation']> }
  | { type: 'SET_SOCKET'; payload: Socket | null }
  | { type: 'SET_VOICE_CONNECTED'; payload: boolean }
  | { type: 'SET_RECORDING_STATE'; payload: Partial<UnifiedGamecastState['recording']> }
  | { type: 'SET_UI_STATE'; payload: Partial<UnifiedGamecastState['ui']> }
  | { type: 'RESET_STATE' };

// 초기 상태
const initialState: UnifiedGamecastState = {
  currentRoom: null,
  currentPlayer: null,
  participants: [],
  loading: true,
  error: null,
  preparation: {
    characterSetup: false,
    screenSetup: false,
    isReady: false
  },
  realtime: {
    socket: null,
    voiceConnected: false
  },
  recording: {
    isRecording: false,
    recordingTime: 0
  },
  ui: {
    showCharacterSetup: false,
    showMicGuide: false
  }
};

// 리듀서
const unifiedGamecastReducer = (state: UnifiedGamecastState, action: UnifiedGamecastAction): UnifiedGamecastState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SET_ROOM':
      return { 
        ...state, 
        currentRoom: action.payload,
        participants: action.payload?.participants || []
      };
    
    case 'SET_PLAYER':
      return { ...state, currentPlayer: action.payload };
    
    case 'SET_PARTICIPANTS':
      return { ...state, participants: normalizeParticipants(action.payload || []) };
    
    case 'UPDATE_PARTICIPANT':
      return {
        ...state,
        participants: state.participants.map(participant =>
          participant.guestUserId === action.payload.guestUserId
            ? { ...participant, ...action.payload.updates }
            : participant
        )
      };
    
    case 'SET_PREPARATION':
      return {
        ...state,
        preparation: { ...state.preparation, ...action.payload }
      };
    
    case 'SET_SOCKET':
      return {
        ...state,
        realtime: { ...state.realtime, socket: action.payload }
      };
    
    case 'SET_VOICE_CONNECTED':
      return {
        ...state,
        realtime: { ...state.realtime, voiceConnected: action.payload }
      };
    
    case 'SET_RECORDING_STATE':
      return {
        ...state,
        recording: { ...state.recording, ...action.payload }
      };
    
    case 'SET_UI_STATE':
      return {
        ...state,
        ui: { ...state.ui, ...action.payload }
      };
    
    case 'RESET_STATE':
      return initialState;
    
    default:
      return state;
  }
};

// Context 생성
const UnifiedGamecastContext = createContext<{
  state: UnifiedGamecastState;
  actions: {
    // 방 관련
    refreshRoomState: () => Promise<void>;
    leaveRoom: () => Promise<void>;
    clearRoomData: () => Promise<void>;
    updateParticipant: (guestUserId: string, updates: Partial<Player>) => void;
    
    // 준비 상태 관리
    updatePreparation: (updates: Partial<UnifiedGamecastState['preparation']>) => void;
    
    // 실시간 연결 관리
    initializeSocket: (roomCode: string, currentPlayer: Player) => void;
    
    // 캐릭터 관리
    updateCharacter: (characterData: CharacterData) => void;
    
    // 녹화 관리
    startRecording: () => void;
    stopRecording: () => void;
    
    // UI 상태 관리
    setUIState: (updates: Partial<UnifiedGamecastState['ui']>) => void;
    setError: (error: string | null) => void;
  };
} | null>(null);

// Provider 컴포넌트
export const UnifiedGamecastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(unifiedGamecastReducer, initialState);
  const [pathname, setPathname] = useState(window.location.pathname);
  
  // 경로 변경 감지
  useEffect(() => {
    const handleLocationChange = () => {
      const newPath = window.location.pathname;
      if (newPath !== pathname) {
        console.log('🚗 [UnifiedContext] 경로 변경 감지:', pathname, '→', newPath);
        setPathname(newPath);
      }
    };

    // popstate 이벤트 리스너 (뒤로가기/앞으로가기)
    window.addEventListener('popstate', handleLocationChange);
    
    // pushState/replaceState 감지를 위한 override
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      handleLocationChange();
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      handleLocationChange();
    };

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, [pathname]);

  // 방 상태 새로고침
  const refreshRoomState = async () => {
    const room = getCurrentRoom();
    const userId = getCurrentUserId();

    if (room && userId) {
      try {
        const result = await getRoomInfo(room.roomCode);
        if (result.success && result.room) {
          dispatch({ type: 'SET_ROOM', payload: result.room });
          
          // 🎯 guestUserId를 주 식별자로 사용 (통합 정책)
          const serverPlayer = result.room.participants?.find(p => p.guestUserId === userId);
          
          if (serverPlayer) {
            const playerInfo: Player = {
              ...serverPlayer,
              id: serverPlayer.guestUserId, // 🎯 guestUserId를 기본 id로 사용
              guestUserId: serverPlayer.guestUserId,
              preparationStatus: serverPlayer.preparationStatus || {
                characterSetup: false,
                screenSetup: false,
                isReady: false
              },
              isHost: serverPlayer.role === 'host',
              characterInfo: serverPlayer.characterInfo || null
            };
            dispatch({ type: 'SET_PLAYER', payload: playerInfo });
            
            // 준비 상태 동기화
            dispatch({ 
              type: 'SET_PREPARATION', 
              payload: playerInfo.preparationStatus 
            });
          }
        } else {
          dispatch({ type: 'SET_ERROR', payload: result.error || '방 정보를 불러올 수 없습니다.' });
        }
      } catch (error) {
        console.error('방 정보 새로고침 실패:', error);
        dispatch({ type: 'SET_ERROR', payload: '방 정보 새로고침 중 오류가 발생했습니다.' });
      }
    }
  };

  // 방 데이터 완전 초기화 (메인/참여/생성 페이지 진입 시 사용)
  const clearRoomData = async () => {
    console.log('🧹 [UnifiedContext] 방 데이터 완전 초기화 시작');
    
    try {
      // Socket 완전 정리 (clearRoomData는 페이지 이동용이므로 완전 초기화)
      console.log('🔌 [UnifiedContext] Socket 완전 정리 시작');
      
      if (state.realtime.socket) {
        console.log('🔌 [UnifiedContext] Context Socket 정리');
        state.realtime.socket.removeAllListeners();
        state.realtime.socket.disconnect();
      }

      if (globalSocket) {
        console.log('🔌 [UnifiedContext] 전역 Socket 정리');
        globalSocket.removeAllListeners();
        globalSocket.disconnect();
        globalSocket = null;
      }

      // 전역 상태 초기화 완료

      // localStorage와 sessionStorage 완전 초기화
      const { debugClearAllData } = await import('../utils/roomManager');
      debugClearAllData();
      
      // Context 상태 완전 초기화
      dispatch({ type: 'RESET_STATE' });
      
      console.log('✅ [UnifiedContext] 방 데이터 완전 초기화 완료');
    } catch (error) {
      console.error('❌ [UnifiedContext] 방 데이터 초기화 실패:', error);
    }
  };

  // 방 나가기
  const leaveRoom = async () => {
    console.log('🚪 [UnifiedContext] 방 나가기 시작', {
      hasSocket: !!state.realtime.socket,
      hasRoom: !!state.currentRoom,
      hasPlayer: !!state.currentPlayer,
      guestUserId: state.currentPlayer?.guestUserId
    });
    
    try {
      // 1. Socket을 통한 방 나가기 알림 (서버 API 호출 전)
      if (state.realtime.socket && state.currentRoom && state.currentPlayer) {
        console.log('📤 [UnifiedContext] Socket으로 방 나가기 알림 전송');
        state.realtime.socket.emit('leave-room', {
          roomCode: state.currentRoom.roomCode,
          guestUserId: state.currentPlayer.guestUserId,
          nickname: state.currentPlayer.nickname
        });
      }

      // 2. 강화된 Socket 완전 초기화 (방 나가기 시 재연결 방지)
      console.log('🔌 [UnifiedContext] Socket 완전 초기화 시작');
      
      // 강화된 정리 함수 사용
      cleanupSocket();
      
      // 전역 상태 완전 초기화
      globalSocketState.roomCode = null;
      globalSocketState.guestUserId = null;
      globalSocketState.lastConnectedAt = null;
      globalSocketState.connectionAttempts = 0;
      
      logSocketState('방 나가기로 인한 완전 정리');
      
      console.log('✅ [UnifiedContext] Socket 완전 초기화 완료');
      
      // 3. 서버 API 호출 및 세션 정리
      console.log('🧹 [UnifiedContext] 서버 API 호출 및 세션 정리 시작');
      const result = await leaveRoomUtil();
      
      if (result.success) {
        console.log('✅ [UnifiedContext] 서버 방 나가기 성공');
        
        // 성공 시 간단한 알림 (선택적)
        console.log('📢 [UnifiedContext] 방 나가기 완료');
      } else {
        console.warn('⚠️ [UnifiedContext] 서버 방 나가기 실패, 로컬 정리는 완료:', result.error);
      }
      
      // 4. Context 상태 초기화
      console.log('♻️ [UnifiedContext] Context 상태 초기화');
      dispatch({ type: 'RESET_STATE' });
      
      console.log('✅ [UnifiedContext] 방 나가기 완료');
      
    } catch (error) {
      console.error('❌ [UnifiedContext] 방 나가기 실패:', error);
      
      // 에러 발생 시에도 로컬 정리는 수행
      console.log('🧹 [UnifiedContext] 에러 상황에서 로컬 정리 수행');
      dispatch({ type: 'RESET_STATE' });
    }
  };

  // 참여자 업데이트
  const updateParticipant = (guestUserId: string, updates: Partial<Player>) => {
    dispatch({ type: 'UPDATE_PARTICIPANT', payload: { guestUserId, updates } });
  };

  // 🔄 서버 우선 준비 상태 업데이트 (낙관적 업데이트 제거)
  const updatePreparation = (updates: Partial<UnifiedGamecastState['preparation']>) => {
    // 로컬 상태는 업데이트하지 않고 서버에만 전송
    // 서버 응답을 통해 상태가 변경됨 (Single Source of Truth)
    
    if (state.realtime.socket && state.currentPlayer) {
      logSocketState('준비 상태 업데이트 요청', {
        updates,
        currentState: state.preparation
      });
      
      state.realtime.socket.emit('update-preparation', {
        roomCode: state.currentRoom?.roomCode,
        guestUserId: state.currentPlayer.guestUserId,
        preparationStatus: { ...state.preparation, ...updates },
        timestamp: Date.now() // 클라이언트 타임스탬프 추가
      });
    } else {
      logSocketState('준비 상태 업데이트 실패', { 
        hasSocket: !!state.realtime.socket,
        hasPlayer: !!state.currentPlayer
      });
    }
  };

  // 🔄 상태 동기화 요청 함수 (전역 Socket 상태 사용)
  const requestStateSync = () => {
    if (globalSocketState.socket && globalSocketState.socket.connected && 
        globalSocketState.roomCode && globalSocketState.guestUserId) {
      logSocketState('전체 상태 동기화 요청');
      globalSocketState.socket.emit('sync-request', {
        roomCode: globalSocketState.roomCode,
        guestUserId: globalSocketState.guestUserId,
        timestamp: Date.now()
      });
    } else {
      logSocketState('상태 동기화 요청 실패', {
        hasSocket: !!globalSocketState.socket,
        isConnected: globalSocketState.socket?.connected,
        hasRoomCode: !!globalSocketState.roomCode,
        hasGuestUserId: !!globalSocketState.guestUserId
      });
    }
  };

  // 🔍 연결 건강성 체크
  const checkConnectionHealth = () => {
    if (!globalSocketState.socket || !globalSocketState.socket.connected) {
      logSocketState('연결 건강성 체크 실패 - 연결 끊어짐');
      return false;
    }
    
    if (globalSocketState.status === 'error') {
      logSocketState('연결 건강성 체크 실패 - 에러 상태');
      return false;
    }
    
    // 마지막 연결 시간 체크 (10분 이상 오래된 연결은 불안정)
    if (globalSocketState.lastConnectedAt) {
      const connectionAge = Date.now() - globalSocketState.lastConnectedAt;
      if (connectionAge > 600000) { // 10분
        logSocketState('연결 건강성 체크 경고 - 오래된 연결', { age: connectionAge });
      }
    }
    
    return true;
  };

  // 🔄 자동 복구 시스템
  const attemptAutoRecovery = () => {
    logSocketState('자동 복구 시스템 시작');
    
    // 1. 연결 상태 확인
    if (!checkConnectionHealth()) {
      // 2. 재연결 시도
      if (globalSocketState.socket && !globalSocketState.socket.connected) {
        logSocketState('재연결 시도');
        globalSocketState.socket.connect();
      }
      
      // 3. 5초 후 상태 동기화 시도
      setTimeout(() => {
        if (checkConnectionHealth()) {
          requestStateSync();
        }
      }, 5000);
    }
  };

  // 🔧 강화된 Socket 초기화 (Context 전용 - 단일 관리점)
  const initializeSocket = useCallback((roomCode: string, currentPlayer: Player) => {
    logSocketState('초기화 시작', { 
      requestedRoom: roomCode,
      requestedUser: currentPlayer.guestUserId,
      currentStatus: globalSocketState.status
    });

    // 의도적 연결 해제 중이거나 연결 중이면 무시
    if (globalSocketState.isIntentionalDisconnect || globalSocketState.status === 'connecting') {
      logSocketState('초기화 건너뜀', { 
        reason: globalSocketState.isIntentionalDisconnect ? '의도적 해제 중' : '연결 시도 중' 
      });
      return;
    }

    // 동일한 방/유저이고 연결된 상태면 재사용
    if (globalSocketState.socket?.connected && 
        globalSocketState.roomCode === roomCode && 
        globalSocketState.guestUserId === currentPlayer.guestUserId &&
        globalSocketState.status === 'connected') {
      logSocketState('기존 Socket 재사용');
      dispatch({ type: 'SET_SOCKET', payload: globalSocketState.socket });
      return;
    }

    // 기존 Socket 정리 (방/유저 변경 또는 연결 상태 불량)
    if (globalSocketState.socket) {
      logSocketState('기존 Socket 정리', {
        reason: 'room/user change or bad connection',
        oldRoom: globalSocketState.roomCode,
        newRoom: roomCode,
        oldUser: globalSocketState.guestUserId,
        newUser: currentPlayer.guestUserId
      });
      
      cleanupSocket();
    }

    // 새 Socket 연결 시작
    createNewSocket(roomCode, currentPlayer);
  }, []); // 빈 의존성 배열로 한 번만 생성

  // 🧹 강화된 Socket 정리 함수
  const cleanupSocket = () => {
    logSocketState('Socket 정리 시작', {
      hasGlobalSocket: !!globalSocketState.socket,
      hasLegacySocket: !!globalSocket
    });
    
    // 의도적 해제 플래그 설정
    globalSocketState.isIntentionalDisconnect = true;
    
    // 전역 Socket 상태 정리
    if (globalSocketState.socket) {
      globalSocketState.socket.removeAllListeners();
      globalSocketState.socket.disconnect();
      globalSocketState.socket = null;
    }
    
    // 레거시 전역 Socket 정리
    if (globalSocket) {
      globalSocket.removeAllListeners();
      globalSocket.disconnect();
      globalSocket = null;
    }
    
    // 모든 전역 상태 초기화
    globalSocketState.status = 'disconnected';
    globalSocketState.roomCode = null;
    globalSocketState.guestUserId = null;
    globalSocketState.connectionAttempts = 0;
    globalSocketState.lastConnectedAt = null;
    
    logSocketState('Socket 정리 완료');
    
    // 잠시 후 플래그 해제
    setTimeout(() => {
      globalSocketState.isIntentionalDisconnect = false;
    }, 1000);
  };

  // 🔗 새 Socket 생성 함수
  const createNewSocket = (roomCode: string, currentPlayer: Player) => {
    logSocketState('새 Socket 생성 시작', { roomCode, guestUserId: currentPlayer.guestUserId });
    
    // 이미 연결 중이면 중단
    if (globalSocketState.status === 'connecting') {
      logSocketState('이미 연결 시도 중, 중단');
      return;
    }
    
    // 상태 업데이트
    globalSocketState.status = 'connecting';
    globalSocketState.roomCode = roomCode;
    globalSocketState.guestUserId = currentPlayer.guestUserId;
    globalSocketState.connectionAttempts += 1;

    // 🔄 지수 백오프 재연결 설정
    const getReconnectionDelay = (attempt: number) => {
      // 지수 백오프: 1초, 2초, 4초, 8초, 16초, 최대 30초
      return Math.min(1000 * Math.pow(2, attempt), 30000);
    };

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10, // 시도 횟수 증가
      reconnectionDelay: 1000, // 초기 지연
      reconnectionDelayMax: 30000, // 최대 지연
      timeout: 20000, // 연결 타임아웃
      forceNew: true, // 🔧 새 연결 강제
      query: {
        roomCode: roomCode,
        guestUserId: currentPlayer.guestUserId
      }
    });

    // 전역 상태에 Socket 저장 (두 곳 모두)
    globalSocketState.socket = socket;
    globalSocket = socket;

    // 🔗 강화된 이벤트 리스너 설정
    socket.on('connect', () => {
      // 중복 연결 확인 (이미 다른 소켓이 같은 방에 연결되어 있다면 중단)
      if (globalSocketState.socket !== socket) {
        logSocketState('중복 연결 감지, 새 소켓 종료', {
          currentSocketId: globalSocketState.socket?.id,
          newSocketId: socket.id
        });
        socket.disconnect();
        return;
      }
      
      // 상태 업데이트
      globalSocketState.status = 'connected';
      globalSocketState.lastConnectedAt = Date.now();
      globalSocketState.connectionAttempts = 0; // 성공 시 카운터 리셋
      
      logSocketState('연결 성공', {
        socketId: socket.id,
        roomCode: roomCode,
        guestUserId: currentPlayer.guestUserId
      });
      
      // Context에 Socket 설정
      dispatch({ type: 'SET_SOCKET', payload: socket });
      
      // 방 참여 요청 (중복 요청 방지를 위한 플래그 체크)
      if (!(socket as any).hasJoinedRoom) {
        const isHost = currentPlayer.role === 'host' || currentPlayer.isHost;
        
        logSocketState('방 참여 요청 전송', {
          isHost,
          nickname: currentPlayer.nickname,
          socketId: socket.id,
          guestUserId: currentPlayer.guestUserId
        });
        
        console.log('🔗 [Socket] 기존 사용자 Socket 연결:', {
          displayName: currentPlayer.nickname,
          guestUserId: currentPlayer.guestUserId,
          isHost,
          isExistingUser: true
        });
        
        // 🎯 호스트와 일반 참여자 모두 join-room 사용, 호스트는 guestUserId를 닉네임으로 사용
        console.log('🔗 [Socket] 방 참여 시도:', {
          isHost,
          originalNickname: currentPlayer.nickname,
          guestUserId: currentPlayer.guestUserId
        });
        
        // 호스트는 닉네임 중복 회피를 위해 guestUserId를 닉네임으로 사용
        const socketNickname = isHost ? currentPlayer.guestUserId : currentPlayer.nickname;
        
        socket.emit('join-room', {
          roomCode,
          guestUserId: currentPlayer.guestUserId,
          nickname: socketNickname, // 호스트는 고유한 ID 사용
          isHost: isHost // 서버에서 호스트 확인용
        });
        
        console.log('📤 [Socket] join-room 이벤트 전송:', {
          roomCode,
          guestUserId: currentPlayer.guestUserId,
          nickname: socketNickname,
          isHost: isHost
        });
        
        // 중복 방지 플래그 설정
        (socket as any).hasJoinedRoom = true;
      }

      // 연결 후 현재 방 상태 요청 (1초 지연)
      setTimeout(() => {
        if (globalSocketState.socket === socket && globalSocketState.status === 'connected') {
          logSocketState('방 상태 요청');
          socket.emit('get-room-state', { roomCode });
        }
      }, 1000);
    });

    // 🔄 재연결 이벤트 처리 강화 (상태 복구 포함)
    socket.on('reconnect', (attemptNumber) => {
      globalSocketState.status = 'connected';
      globalSocketState.lastConnectedAt = Date.now();
      globalSocketState.connectionAttempts = 0;
      
      logSocketState('재연결 성공', { attempt: attemptNumber });
      
      // 에러 상태 해제
      dispatch({ type: 'SET_ERROR', payload: null });
      
      // 🔄 재연결 후 상태 복구 시퀀스
      if (globalSocketState.roomCode && globalSocketState.guestUserId) {
        logSocketState('상태 복구 시퀀스 시작');
        
        // 1. 방 재참여 (원본 닉네임 사용)
        const isHost = currentPlayer.role === 'host' || currentPlayer.isHost;
          
        console.log('🔄 [Socket] 재연결 시 기존 사용자로 처리:', {
          displayName: currentPlayer.nickname,
          guestUserId: globalSocketState.guestUserId,
          isHost,
          reconnect: true
        });
        
        socket.emit('join-room', {
          roomCode: globalSocketState.roomCode,
          guestUserId: globalSocketState.guestUserId,
          nickname: currentPlayer.nickname,
          isHost: isHost,
          isExistingUser: true,  // 🎯 재연결은 항상 기존 사용자
          reconnect: true        // 🎯 재연결임을 명시
        });
        
        // 2. 단계별 상태 복구 (순차 실행으로 서버 부하 방지)
        setTimeout(() => {
          if (globalSocketState.socket === socket && globalSocketState.status === 'connected') {
            // 방 전체 상태 요청
            logSocketState('방 상태 복구 요청');
            socket.emit('get-room-state', { roomCode: globalSocketState.roomCode });
          }
        }, 500);
        
        setTimeout(() => {
          if (globalSocketState.socket === socket && globalSocketState.status === 'connected') {
            // 참여자 목록 최신화 요청
            logSocketState('참여자 목록 복구 요청');
            socket.emit('get-participants', { roomCode: globalSocketState.roomCode });
          }
        }, 1000);
        
        setTimeout(() => {
          if (globalSocketState.socket === socket && globalSocketState.status === 'connected') {
            // 현재 플레이어 준비 상태 복구
            logSocketState('플레이어 상태 복구 완료');
          }
        }, 1500);
      }
    });

    // 🔌 연결 해제 이벤트 강화
    socket.on('disconnect', (reason) => {
      const wasIntentional = globalSocketState.isIntentionalDisconnect;
      globalSocketState.status = wasIntentional ? 'disconnected' : 'reconnecting';
      
      logSocketState('연결 해제', { reason, wasIntentional });
      
      // 의도적 해제가 아닌 경우에만 재연결 준비
      if (!wasIntentional) {
        if (reason === 'io server disconnect') {
          logSocketState('서버에서 강제 연결 해제');
          dispatch({ type: 'SET_ERROR', payload: '서버와의 연결이 끊어졌습니다. 재연결 시도 중...' });
        } else if (reason === 'transport close' || reason === 'ping timeout') {
          logSocketState('네트워크 이슈로 연결 해제');
        }
      }
    });

    // 🔄 재연결 시도 중 이벤트
    socket.on('reconnect_attempt', (attemptNumber) => {
      globalSocketState.status = 'reconnecting';
      globalSocketState.connectionAttempts = attemptNumber;
      
      const delay = getReconnectionDelay(attemptNumber - 1);
      logSocketState('재연결 시도', { 
        attempt: attemptNumber, 
        nextDelay: delay,
        maxAttempts: 10
      });
      
      // UI에 재연결 상태 표시
      dispatch({ 
        type: 'SET_ERROR', 
        payload: `서버 재연결 중... (${attemptNumber}/10)` 
      });
    });

    // 🚫 연결 오류 처리 강화
    socket.on('connect_error', (error) => {
      globalSocketState.status = 'error';
      const attempt = globalSocketState.connectionAttempts + 1;
      globalSocketState.connectionAttempts = attempt;
      
      logSocketState('연결 오류', { 
        error: error.message, 
        attempts: attempt,
        willRetry: attempt < 10
      });
      
      // 연결 실패 타입에 따른 대응
      if (error.message.includes('timeout')) {
        logSocketState('연결 타임아웃 감지');
      } else if (error.message.includes('refused')) {
        logSocketState('서버 연결 거부');
        dispatch({ 
          type: 'SET_ERROR', 
          payload: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.' 
        });
      }
    });

    // 🔚 재연결 포기 이벤트
    socket.on('reconnect_failed', () => {
      globalSocketState.status = 'error';
      
      logSocketState('재연결 완전 실패', {
        totalAttempts: globalSocketState.connectionAttempts
      });
      
      dispatch({ 
        type: 'SET_ERROR', 
        payload: '서버와의 연결이 복구되지 않습니다. 페이지를 새로고침해주세요.' 
      });
    });

    // 🔄 서버 우선 상태 동기화 이벤트들
    
    // ✅ 방 참여 성공 이벤트 (서버 이벤트명에 맞춤)
    socket.on('joined-room-success', (data: { 
      message?: string; 
      users?: Player[]; 
      participants?: Player[]; 
      roomState?: any;
      roomCode?: string;
      roomId?: string;
      userCount?: number;
    }) => {
      console.log('🎉 [Socket] 방 참여 성공 (joined-room-success):', {
        message: data.message,
        users: data.users?.length,
        participants: data.participants?.length,
        userCount: data.userCount,
        roomCode: data.roomCode
      });
      
      logSocketState('방 참여 성공', {
        userCount: data.userCount || data.users?.length || data.participants?.length
      });
      
      // 참여자 목록 업데이트 (users 우선, 없으면 participants)
      const participantsList = data.users || data.participants || [];
      if (participantsList.length > 0) {
        dispatch({ type: 'SET_PARTICIPANTS', payload: participantsList });
      }
      
      // 방 상태 업데이트
      if (data.roomState) {
        dispatch({ type: 'SET_ROOM', payload: data.roomState });
      }
      
      // 에러 상태 해제
      dispatch({ type: 'SET_ERROR', payload: null });
    });
    
    // 🔄 기존 이벤트명도 유지 (호환성)
    socket.on('join-room-success', (data: { message: string; participants: Player[]; roomState?: any }) => {
      console.log('🎉 [Socket] 방 참여 성공 (join-room-success):', data);
      
      // 참여자 목록 업데이트 (안전하게 처리)
      if (data.participants && Array.isArray(data.participants)) {
        dispatch({ type: 'SET_PARTICIPANTS', payload: data.participants });
      } else {
        console.warn('⚠️ join-room-success에서 잘못된 participants 데이터:', data.participants);
      }
      
      // 방 상태 업데이트
      if (data.roomState) {
        dispatch({ type: 'SET_ROOM', payload: data.roomState });
      }
      
      // 에러 상태 해제
      dispatch({ type: 'SET_ERROR', payload: null });
    });
    
    // 참여자 업데이트 (서버가 단일 소스) - 검증 강화
    socket.on('participants-update', (data: { participants: Player[], timestamp: number }) => {
      // 🔍 데이터 검증
      if (!validateAndLog('participants-update', data, (d) => 
        d && validateParticipants(d.participants) && validateTimestamp(d.timestamp, 60000) // 1분 허용
      )) {
        // 검증 실패 시 상태 동기화 요청
        logSocketState('참여자 업데이트 검증 실패, 동기화 요청');
        requestStateSync();
        return;
      }
      
      dispatch({ type: 'SET_PARTICIPANTS', payload: data.participants });
    });

    // 전체 상태 동기화 이벤트 (재연결 후 사용) - 검증 강화
    socket.on('sync-state', (data: {
      room: Room,
      participants: Player[],
      currentPlayer: Player,
      timestamp: number
    }) => {
      // 🔍 전체 상태 데이터 검증
      if (!validateAndLog('sync-state', data, (d) => 
        d && 
        validateRoom(d.room) && 
        validateParticipants(d.participants) && 
        validatePlayer(d.currentPlayer) &&
        validateTimestamp(d.timestamp, 300000) // 5분 허용
      )) {
        logSocketState('전체 상태 동기화 검증 실패');
        return;
      }
      
      logSocketState('전체 상태 동기화 성공', {
        roomCode: data.room.roomCode,
        participantsCount: data.participants.length,
        currentPlayerRole: data.currentPlayer.role
      });
      
      // 전체 상태를 서버 데이터로 덮어쓰기
      dispatch({ type: 'SET_ROOM', payload: data.room });
      dispatch({ type: 'SET_PARTICIPANTS', payload: data.participants });
      dispatch({ type: 'SET_PLAYER', payload: data.currentPlayer });
      
      // 준비 상태도 동기화
      if (data.currentPlayer.preparationStatus) {
        dispatch({ 
          type: 'SET_PREPARATION', 
          payload: data.currentPlayer.preparationStatus 
        });
      }
    });

    // 새로운 참여자가 방에 입장했을 때 (서버에서 user-joined 이벤트)
    socket.on('user-joined', (data: { 
      participants: Player[];
      newParticipant: {
        guestUserId: string;
        nickname: string;
        role: string;
        joinedAt: string;
      };
      currentCapacity: number;
      maxCapacity: number;
    }) => {
      console.log('🎉 새로운 참여자 입장:', {
        newUser: data.newParticipant?.nickname || 'Unknown',
        guestUserId: data.newParticipant?.guestUserId || 'Unknown',
        totalParticipants: data.participants?.length || 0,
        capacity: `${data.currentCapacity || 0}/${data.maxCapacity || 0}`
      });

      // 참여자 목록 업데이트 (안전하게 처리)
      if (data.participants && Array.isArray(data.participants)) {
        dispatch({ type: 'SET_PARTICIPANTS', payload: data.participants });
      } else {
        console.warn('⚠️ 참여자 데이터가 올바르지 않음:', data.participants);
      }

      // 방 정보의 현재 인원 수도 업데이트
      if (state.currentRoom) {
        const updatedRoom = {
          ...state.currentRoom,
          currentCapacity: data.currentCapacity,
          participants: data.participants
        };
        dispatch({ type: 'SET_ROOM', payload: updatedRoom });
      }

      // 환영 메시지 표시 (선택적)
      console.log(`🎊 ${data.newParticipant.nickname}님이 방에 입장했습니다!`);
    });

    // 🎨 캐릭터 업데이트 이벤트 - 검증 강화
    socket.on('character-update', (data: { guestUserId: string; characterInfo: any; timestamp?: number }) => {
      if (!validateAndLog('character-update', data, (d) => 
        d && 
        typeof d.guestUserId === 'string' && 
        d.characterInfo &&
        (!d.timestamp || validateTimestamp(d.timestamp))
      )) {
        logSocketState('캐릭터 업데이트 검증 실패');
        return;
      }
      
      logSocketState('캐릭터 업데이트 적용', { guestUserId: data.guestUserId });
      updateParticipant(data.guestUserId, { characterInfo: data.characterInfo });
    });

    // ✅ 준비 상태 업데이트 이벤트 - 검증 강화
    socket.on('preparation-update', (data: { guestUserId: string; preparationStatus: any; timestamp?: number }) => {
      if (!validateAndLog('preparation-update', data, (d) => 
        d && 
        typeof d.guestUserId === 'string' && 
        d.preparationStatus &&
        typeof d.preparationStatus.isReady === 'boolean' &&
        (!d.timestamp || validateTimestamp(d.timestamp))
      )) {
        logSocketState('준비 상태 업데이트 검증 실패');
        return;
      }
      
      logSocketState('준비 상태 업데이트 적용', { 
        guestUserId: data.guestUserId,
        isReady: data.preparationStatus.isReady
      });
      updateParticipant(data.guestUserId, { preparationStatus: data.preparationStatus });
      
      // 현재 플레이어의 준비 상태 업데이트인 경우 로컬 상태도 동기화
      if (data.guestUserId === state.currentPlayer?.guestUserId) {
        dispatch({ type: 'SET_PREPARATION', payload: data.preparationStatus });
      }
    });

    socket.on('recording-start', () => {
      console.log('🎬 녹화 시작 신호 수신');
      dispatch({ type: 'SET_RECORDING_STATE', payload: { isRecording: true, recordingTime: 0 } });
    });

    socket.on('recording-stop', () => {
      console.log('⏹️ 녹화 종료 신호 수신');
      dispatch({ type: 'SET_RECORDING_STATE', payload: { isRecording: false } });
    });

    // 방 해체 이벤트 (방장이 나갔을 때)
    socket.on('room-dissolved', (data: { reason: string; message: string; timestamp: string; roomCode: string }) => {
      console.log('🚪 방 해체 알림 수신:', data);
      dispatch({ type: 'SET_ERROR', payload: data.message });
      
      // 잠시 후 자동으로 메인 페이지로 이동
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    });

    // 참여자 나가기 이벤트 (다른 참여자가 나갔을 때)
    socket.on('user-left', (data: { guestUserId: string; nickname: string; participants: Player[] }) => {
      console.log('👤 참여자 나가기 알림:', data);
      if (data.participants && Array.isArray(data.participants)) {
        dispatch({ type: 'SET_PARTICIPANTS', payload: data.participants });
      } else {
        console.warn('⚠️ user-left 이벤트에서 잘못된 participants 데이터:', data.participants);
      }
    });

    // 이미 위에서 처리된 disconnect 이벤트이므로 중복 제거

    // 모든 Socket 이벤트 수신 디버깅
    socket.onAny((eventName, ...args) => {
      console.log(`🎯 [Socket] 이벤트 수신:`, { eventName, args });
    });

    // 🚨 포괄적 Socket 에러 처리
    socket.on('error', (error) => {
      globalSocketState.status = 'error';
      logSocketState('Socket 에러 발생', { 
        error: error.message,
        errorType: error.type || 'unknown'
      });
      
      // 에러 타입별 대응
      if (error.message.includes('unauthorized') || error.message.includes('403')) {
        logSocketState('인증 에러 감지');
        dispatch({ 
          type: 'SET_ERROR', 
          payload: '접근 권한이 없습니다. 다시 로그인해주세요.' 
        });
      } else if (error.message.includes('room not found') || error.message.includes('404')) {
        logSocketState('방 없음 에러 감지');
        dispatch({ 
          type: 'SET_ERROR', 
          payload: '방을 찾을 수 없습니다. 방 코드를 확인해주세요.' 
        });
      } else if (error.message.includes('room full') || error.message.includes('capacity')) {
        logSocketState('방 정원 초과 에러 감지');
        dispatch({ 
          type: 'SET_ERROR', 
          payload: '방이 가득 참입니다. 다른 방을 이용해주세요.' 
        });
      } else {
        // 일반적인 에러
        dispatch({ 
          type: 'SET_ERROR', 
          payload: '연결 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' 
        });
      }
    });

    // 🔄 자동 복구 메커니즘
    socket.on('join-room-error', (errorData: { error: string; code?: string }) => {
      // 🔍 에러 상세 정보 로깅
      console.log('🚨 [Socket] join-room-error 상세:', {
        error: errorData.error,
        code: errorData.code,
        fullErrorData: errorData,
        currentRoom: roomCode,
        currentUser: currentPlayer.guestUserId,
        currentNickname: currentPlayer.nickname
      });
      
      // 인원 초과 에러인 경우 추가 디버깅 정보 요청
      if (errorData.error?.includes('인원 초과') || errorData.error?.includes('가득')) {
        console.log('🔍 [Socket] 인원 초과 에러 발생, 방 정보 요청');
        setTimeout(() => {
          socket.emit('get-room-state', { roomCode });
        }, 1000);
      }
      
      logSocketState('방 참여 에러', {
        ...errorData,
        roomCode,
        guestUserId: currentPlayer.guestUserId
      });
      
      // 에러 코드별 자동 복구 시도
      if (errorData.code === 'ROOM_FULL') {
        dispatch({ 
          type: 'SET_ERROR', 
          payload: '방이 가득 참습니다.' 
        });
      } else if (errorData.code === 'ROOM_NOT_FOUND') {
        // 방이 없는 경우 메인으로 리디렉션
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
        dispatch({ 
          type: 'SET_ERROR', 
          payload: '방을 찾을 수 없습니다. 메인 페이지로 이동합니다.' 
        });
      } else if (errorData.code === 'ALREADY_IN_ROOM') {
        // 이미 방에 있는 경우 상태 동기화 시도
        logSocketState('이미 방에 참여 상태, 동기화 시도');
        console.log('🔄 [Socket] 이미 방에 참여된 상태, 상태 동기화 시도');
        setTimeout(() => {
          requestStateSync();
        }, 1000);
      } else if (errorData.error?.includes('duplicate') || errorData.error?.includes('already exists')) {
        // 중복 참여 에러의 경우
        console.log('🔄 [Socket] 중복 참여 감지, 기존 연결 정리 후 재시도');
        logSocketState('중복 참여 감지, 재시도 준비');
        
        // 기존 소켓 정리하고 재시도
        setTimeout(() => {
          cleanupSocket();
          setTimeout(() => {
            createNewSocket(roomCode, currentPlayer);
          }, 1000);
        }, 500);
      } else {
        // 일반적인 방 참여 에러
        console.log('❌ [Socket] 알 수 없는 방 참여 에러:', errorData);
        dispatch({ 
          type: 'SET_ERROR', 
          payload: errorData.error || '방 참여 중 오류가 발생했습니다.' 
        });
      }
    });

    // Socket 이벤트 리스너 설정 완료
    logSocketState('Socket 생성 및 이벤트 리스너 설정 완료');
  };

  // WebRTC 제거됨 - 나중에 구현 예정

  // 🎨 서버 우선 캐릭터 업데이트
  const updateCharacter = (characterData: CharacterData) => {
    if (state.realtime.socket && state.currentPlayer) {
      logSocketState('캐릭터 업데이트 요청', { 
        hasCharacterData: !!characterData,
        selectedOptionsCount: Object.keys(characterData.selectedOptions || {}).length
      });
      
      state.realtime.socket.emit('update-character', {
        roomCode: state.currentRoom?.roomCode,
        guestUserId: state.currentPlayer.guestUserId,
        characterInfo: characterData,
        timestamp: Date.now()
      });
    } else {
      logSocketState('캐릭터 업데이트 실패', {
        hasSocket: !!state.realtime.socket,
        hasPlayer: !!state.currentPlayer
      });
    }
  };

  // 녹화 시작
  const startRecording = () => {
    if (state.realtime.socket && state.currentPlayer?.role === 'host') {
      console.log('🎬 녹화 시작 신호 전송');
      state.realtime.socket.emit('start-recording', { roomCode: state.currentRoom?.roomCode });
    }
  };

  // 녹화 종료
  const stopRecording = () => {
    if (state.realtime.socket && state.currentPlayer?.role === 'host') {
      console.log('⏹️ 녹화 종료 신호 전송');
      state.realtime.socket.emit('stop-recording', { roomCode: state.currentRoom?.roomCode });
    }
  };

  // UI 상태 설정
  const setUIState = (updates: Partial<UnifiedGamecastState['ui']>) => {
    dispatch({ type: 'SET_UI_STATE', payload: updates });
  };

  // 에러 설정
  const setError = (error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  };

  // 간단한 초기화 useEffect - 경로 변경 감지
  useEffect(() => {
    const initializeRoom = async () => {
      const currentPath = window.location.pathname;
      
      // 중복 초기화 방지
      if (isInitializing) {
        console.log('⏭️ [UnifiedContext] 이미 초기화 중, 건너뜀');
        return;
      }
      
      isInitializing = true;
      console.log('🔄 [UnifiedContext] 경로 변경 감지, 초기화 시작:', currentPath);
      
      try {
        const room = getCurrentRoom();
        const userId = getCurrentUserId();

        console.log('🔍 [UnifiedContext] 세션 데이터 확인:', { 
          hasRoom: !!room,
          hasUserId: !!userId,
          roomCode: room?.roomCode,
          currentPath: currentPath
        });

        // /room 페이지가 아니면 초기화 안함
        if (currentPath !== '/room') {
          console.log('🏠 [UnifiedContext] 방 페이지가 아님, 초기화 건너뜀');
          dispatch({ type: 'SET_LOADING', payload: false });
          return;
        }

        // /room 페이지에서 방 정보가 있으면 바로 설정
        if (room && userId) {
          console.log('✅ [UnifiedContext] 방 정보 있음, 기본값으로 바로 설정');
          
          // 기존 데이터가 이미 설정되어 있는지 확인
          if (state.currentRoom && state.currentRoom.roomCode === room.roomCode && state.currentPlayer) {
            console.log('🔄 [UnifiedContext] 동일한 방 데이터가 이미 설정됨');
            
            // 기존 Socket 상태 확인 및 복구
            if (!state.realtime.socket && globalSocketState.socket && globalSocketState.socket.connected) {
              console.log('🔌 [UnifiedContext] 기존 Socket 복구:', {
                socketId: globalSocketState.socket.id,
                roomCode: room.roomCode,
                isConnected: globalSocketState.socket.connected
              });
              dispatch({ type: 'SET_SOCKET', payload: globalSocketState.socket });
            } else if (!state.realtime.socket) {
              // Socket이 없으면 나중에 초기화 (currentPlayer가 설정된 후)
              console.log('🔌 [UnifiedContext] Socket 초기화는 플레이어 설정 후 진행');
            }
            
            dispatch({ type: 'SET_LOADING', payload: false });
            return;
          }
          
          // 기본 플레이어 정보 생성 (API 없이)
          const basicPlayer: Player = {
            id: userId,
            guestUserId: userId,
            nickname: "Nickname1", // 기본 닉네임 (방장은 항상 Nickname1)
            name: "Nickname1", // 호환성을 위한 alias
            role: "host", // 방 생성자는 항상 호스트
            isHost: true,
            joinedAt: new Date().toISOString(),
            isConnected: true,
            hasWebRTCConnection: false,
            preparationStatus: {
              characterSetup: false,
              screenSetup: false,
              isReady: false
            },
            isReady: false,
            characterInfo: null
          };

          // Context에 바로 설정
          dispatch({ type: 'SET_ROOM', payload: room });
          dispatch({ type: 'SET_PLAYER', payload: basicPlayer });
          dispatch({ type: 'SET_PARTICIPANTS', payload: [] }); // 빈 배열
          dispatch({ type: 'SET_PREPARATION', payload: { 
            characterSetup: false, 
            screenSetup: false, 
            isReady: false 
          }});
          
          console.log('🎯 [UnifiedContext] 기본값 설정 완료:', {
            room: room.roomCode,
            player: basicPlayer.guestUserId,
            isHost: basicPlayer.isHost
          });
          
          // 🔌 Context 전용 Socket 초기화 (단일 관리점)
          if (!globalSocketState.socket || !globalSocketState.socket.connected) {
            console.log('🔌 [UnifiedContext] Socket 초기화 시작 (Context 전용)');
            setTimeout(() => {
              // 방 생성 후 서버 상태 안정화를 위한 지연
              console.log('🔌 [UnifiedContext] Socket 초기화 실행 (단일 관리점)');
              
              // 다시 한 번 상태 확인 (타이밍 이슈 방지)
              if (!globalSocketState.socket || !globalSocketState.socket.connected) {
                initializeSocket(room.roomCode, basicPlayer);
              } else {
                console.log('🔌 [UnifiedContext] 이미 Socket이 연결됨, 초기화 건너뜀');
              }
            }, 750); // 지연 시간 증가로 안정성 확보
          } else {
            console.log('🔌 [UnifiedContext] 기존 Socket 사용:', {
              socketId: globalSocketState.socket.id,
              isConnected: globalSocketState.socket.connected
            });
          }
        } else {
          console.log('⚠️ [UnifiedContext] 방 정보 없음, 로딩만 완료');
        }

        // API 호출 없이 바로 로딩 완료
        dispatch({ type: 'SET_LOADING', payload: false });
        
      } finally {
        // 초기화 완료 후 플래그 리셋
        isInitializing = false;
      }
    };

    initializeRoom();
  }, [pathname]); // pathname 변경 시마다 초기화 실행

  // 🔌 Socket 연결 상태 모니터링 및 자동 복구 (Context 전용)
  useEffect(() => {
    if (globalSocketState.socket) {
      console.log('🔌 [UnifiedContext] Socket 상태 변경 감지:', {
        socketId: globalSocketState.socket.id,
        isConnected: globalSocketState.socket.connected,
        status: globalSocketState.status,
        roomCode: globalSocketState.roomCode
      });
    }

    // Socket 연결이 끊어졌을 때 자동 복구 시도 (5초 후)
    if (globalSocketState.status === 'error' && state.currentRoom && state.currentPlayer) {
      console.log('🔌 [UnifiedContext] Socket 에러 상태, 자동 복구 시도 예약');
      const recoveryTimer = setTimeout(() => {
        if (globalSocketState.status === 'error' && state.currentRoom && state.currentPlayer) {
          console.log('🔌 [UnifiedContext] Socket 자동 복구 시도');
          initializeSocket(state.currentRoom.roomCode, state.currentPlayer);
        }
      }, 5000);

      return () => clearTimeout(recoveryTimer);
    }
  }, [initializeSocket, globalSocketState.socket?.connected, globalSocketState.status, state.currentRoom, state.currentPlayer]);

  // 액션들
  const actions = {
    refreshRoomState,
    leaveRoom,
    clearRoomData,
    updateParticipant,
    updatePreparation,
    initializeSocket,
    updateCharacter,
    requestStateSync, // 🔄 상태 동기화 요청
    checkConnectionHealth, // 🔍 연결 건강성 체크
    attemptAutoRecovery, // 🔄 자동 복구 시스템
    startRecording,
    stopRecording,
    setUIState,
    setError
  };

  return (
    <UnifiedGamecastContext.Provider value={{ state, actions }}>
      {children}
    </UnifiedGamecastContext.Provider>
  );
};

// Context를 사용하기 위한 Hook
export const useUnifiedGamecast = () => {
  const context = useContext(UnifiedGamecastContext);
  if (!context) {
    throw new Error('useUnifiedGamecast는 UnifiedGamecastProvider 내부에서만 사용할 수 있습니다.');
  }
  return context;
};

// 개별 기능별 Hook들 (기존 Hook과의 호환성을 위해)
export const useUnifiedRoom = () => {
  const { state, actions } = useUnifiedGamecast();
  return {
    currentRoom: state.currentRoom,
    currentPlayer: state.currentPlayer,
    participants: state.participants,
    loading: state.loading,
    error: state.error,
    refreshRoomState: actions.refreshRoomState,
    handleLeaveRoom: actions.leaveRoom,
    updateParticipant: actions.updateParticipant
  };
};

export const useUnifiedVoiceChat = () => {
  // WebRTC 기능이 비활성화되어 있으므로 빈 구조 반환
  useUnifiedGamecast(); // Context 연결용
  return {
    localStream: null, // WebRTC 제거됨
    remoteStreams: new Map<string, MediaStream>(), // 빈 맵
    voiceChatConnected: false, // 항상 false
    isLocalMuted: false,
    toggleLocalAudio: () => {}, // 빈 함수
  };
};

export const useUnifiedPreparation = () => {
  const { state, actions } = useUnifiedGamecast();
  return {
    preparation: state.preparation,
    updatePreparation: actions.updatePreparation,
    characterSetupComplete: state.preparation.characterSetup,
    screenSetupComplete: state.preparation.screenSetup,
    isReady: state.preparation.isReady
  };
};

export const useUnifiedUI = () => {
  const { state, actions } = useUnifiedGamecast();
  return {
    ui: state.ui,
    setUIState: actions.setUIState,
    showCharacterSetup: state.ui.showCharacterSetup,
    showMicGuide: state.ui.showMicGuide
  };
};

export const useUnifiedRecording = () => {
  const { state, actions } = useUnifiedGamecast();
  return {
    recording: state.recording,
    isRecording: state.recording.isRecording,
    recordingTime: state.recording.recordingTime,
    startRecording: actions.startRecording,
    stopRecording: actions.stopRecording
  };
};