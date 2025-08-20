import React, { createContext, useContext, useReducer, useEffect, useState, useCallback, useRef, useMemo } from 'react';
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
  
  // 호스트는 항상 "Nickname1" (새 객체 생성으로 React 리렌더링 보장)
  const normalizedHosts = hostPlayers.map(player => ({
    ...player,
    nickname: "Nickname1"
  }));
  
  // 참여자들은 순번에 따라 "Nickname2", "Nickname3", ...
  const normalizedParticipants = participantPlayers.map((player, index) => {
    // 이미 올바른 닉네임 패턴이면 새 객체로 복사 (React 리렌더링 보장)
    if (player.nickname && player.nickname.startsWith('Nickname') && /^Nickname\d+$/.test(player.nickname)) {
      return { ...player }; // 새 객체 생성
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
      const normalizedParticipants = normalizeParticipants(action.payload || []);
      
      // 🚨 중복 업데이트 방지: 동일한 데이터면 기존 state 반환
      // JSON 안전성 검사를 포함한 비교
      let isSameData = false;
      try {
        isSameData = JSON.stringify(state.participants) === JSON.stringify(normalizedParticipants);
      } catch (jsonError) {
        console.warn('⚠️ [Participants] JSON 비교 중 에러, 객체 직접 비교로 대체:', jsonError);
        isSameData = state.participants === normalizedParticipants;
      }
      
      console.log('🔄 [Reducer] SET_PARTICIPANTS:', {
        before: state.participants?.length || 0,
        after: normalizedParticipants.length,
        payload: action.payload?.map(p => ({ nickname: p.nickname, guestUserId: p.guestUserId })) || [],
        normalized: normalizedParticipants.map(p => ({ nickname: p.nickname, guestUserId: p.guestUserId })),
        stateChanged: !isSameData,
        참조변경여부: state.participants !== normalizedParticipants,
        중복업데이트방지: isSameData ? 'SKIPPED' : 'UPDATED',
        timestamp: new Date().toLocaleTimeString()
      });
      
      // 동일한 데이터면 업데이트 건너뛰기
      if (isSameData) {
        console.log('⚠️ [Reducer] 동일한 participants 데이터, 업데이트 건너뜀');
        return state;
      }
      
      // 🔧 강제 새 배열 생성으로 React 리렌더링 보장
      return { 
        ...state, 
        participants: [...normalizedParticipants] // 새 배열 참조 생성
      };
    
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
      console.log('🔄 [Reducer] SET_PREPARATION:', {
        before: state.preparation,
        after: { ...state.preparation, ...action.payload },
        payload: action.payload,
        timestamp: new Date().toLocaleTimeString()
      });
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
      console.log('🎭 [Reducer] SET_UI_STATE 처리:', {
        currentUI: state.ui,
        payload: action.payload,
        newUI: { ...state.ui, ...action.payload }
      });
      return {
        ...state,
        ui: { ...state.ui, ...action.payload }
      };
    
    case 'FORCE_UPDATE':
      // 강제 리렌더링을 위한 더미 업데이트
      return {
        ...state,
        _forceUpdateTimestamp: action.payload
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
  
  // 🔧 최신 state를 참조하기 위한 ref
  const stateRef = useRef(state);
  stateRef.current = state;
  
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
          
          // 🎯 participants 배열 업데이트 (캐릭터 정보 포함)
          if (result.room.participants && Array.isArray(result.room.participants)) {
            console.log('🔄 [refreshRoomState] 서버에서 participants 업데이트:', {
              participantCount: result.room.participants.length,
              participantIds: result.room.participants.map(p => p.guestUserId),
              hasCharacterInfo: result.room.participants.map(p => ({
                id: p.guestUserId,
                hasCharacterInfo: !!p.characterInfo,
                isCustomized: p.characterInfo?.isCustomized
              }))
            });
            
            dispatch({ type: 'SET_PARTICIPANTS', payload: result.room.participants });
          }
          
          // 🎯 guestUserId를 주 식별자로 사용 (통합 정책)
          const serverPlayer = result.room.participants?.find(p => p.guestUserId === userId);
          
          if (serverPlayer) {
            const playerInfo: Player = {
              ...serverPlayer,
              id: serverPlayer.guestUserId, // 🎯 guestUserId를 기본 id로 사용
              guestUserId: serverPlayer.guestUserId,
              preparationStatus: serverPlayer.preparationStatus || {
                characterSetup: serverPlayer.characterInfo?.isCustomized || false,
                screenSetup: false,
                isReady: false
              },
              isHost: serverPlayer.role === 'host',
              characterInfo: serverPlayer.characterInfo || null
            };
            
            console.log('🔄 [refreshRoomState] currentPlayer 업데이트:', {
              guestUserId: playerInfo.guestUserId,
              hasCharacterInfo: !!playerInfo.characterInfo,
              isCustomized: playerInfo.characterInfo?.isCustomized,
              characterSetup: playerInfo.preparationStatus?.characterSetup
            });
            
            dispatch({ type: 'SET_PLAYER', payload: playerInfo });
            
            // 준비 상태 동기화 (캐릭터 설정 상태 포함)
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
        console.log('📊 [joined-room-success] 소켓 기반 참여자 목록 설정:', {
          participantsCount: participantsList.length,
          hasCharacterInfo: participantsList.map(p => ({ id: p.guestUserId || p.id, hasChar: !!p.characterInfo }))
        });
        dispatch({ type: 'SET_PARTICIPANTS', payload: participantsList });
      }
      
      // 방 상태 업데이트
      if (data.roomState) {
        dispatch({ type: 'SET_ROOM', payload: data.roomState });
      }
      
      // 🎯 새 서버에서는 캐릭터 정보가 포함되므로 자동 조회 제거
      // 필요 시에만 refreshRoomState 호출하도록 변경
      const hasCharacterInfo = participantsList.some(p => p.characterInfo?.isCustomized);
      if (!hasCharacterInfo && participantsList.length > 0) {
        console.log('🔄 [joined-room-success] 캐릭터 정보 없음 - 필요시에만 DB 조회');
        setTimeout(() => {
          refreshRoomState();
        }, 1000); // 더 긴 지연으로 안정성 확보
      } else {
        console.log('✅ [joined-room-success] 서버 응답에 캐릭터 정보 포함됨, 별도 조회 생략');
      }
      
      // 에러 상태 해제
      dispatch({ type: 'SET_ERROR', payload: null });
    });
    
    // 🔄 기존 이벤트명도 유지 (호환성)
    socket.on('join-room-success', (data: { message: string; participants: Player[]; roomState?: any }) => {
      console.log('🎉 [Socket] 방 참여 성공 (join-room-success):', data);
      
      // 🚨 임시 비활성화: joined-room-success에서 participants 업데이트 방지
      // (user-joined 이벤트와 충돌을 피하기 위해)
      console.log('🔄 [joined-room-success] participants 업데이트 건너뜀 (user-joined에서 처리):', {
        hasParticipants: !!(data.participants && Array.isArray(data.participants)),
        participantsLength: data.participants?.length || 0
      });
      /*
      if (data.participants && Array.isArray(data.participants)) {
        dispatch({ type: 'SET_PARTICIPANTS', payload: data.participants });
      } else {
        console.warn('⚠️ join-room-success에서 잘못된 participants 데이터:', data.participants);
      }
      */
      
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

    // 새로운 참여자가 방에 입장했을 때 (user-left와 동일한 방식으로 처리)
    socket.on('user-joined', (data: { socketId: string; guestUserId: string; nickname: string; joinedAt: Date }) => {
      console.log('🚨 [user-joined] 이벤트 수신!', {
        socketId: data.socketId,
        guestUserId: data.guestUserId,
        nickname: data.nickname,
        currentParticipantsCount: stateRef.current.participants?.length || 0,
        currentParticipants: stateRef.current.participants?.map(p => ({
          nickname: p.nickname,
          guestUserId: p.guestUserId,
          socketId: p.socketId
        })) || []
      });

      // 🔧 최신 state를 사용하여 현재 participants 배열에 새 참여자 추가 (user-left와 동일한 방식)
      const currentParticipants = stateRef.current.participants || [];
      console.log('🔍 입장 처리 전 상태:', {
        추가할_guestUserId: data.guestUserId,
        현재_참여자들: currentParticipants.map(p => ({
          nickname: p.nickname,
          guestUserId: p.guestUserId,
          socketId: p.socketId
        }))
      });

      // 중복 확인
      const isAlreadyExists = currentParticipants.some(p => 
        p.guestUserId === data.guestUserId || p.id === data.guestUserId
      );

      if (!isAlreadyExists) {
        // 새 참여자 생성
        const newParticipant: Player = {
          id: data.guestUserId,
          guestUserId: data.guestUserId,
          nickname: data.nickname,
          socketId: data.socketId,
          isHost: false,
          role: 'participant',
          preparationStatus: {
            characterSetup: false,
            screenSetup: false,
            isReady: false
          },
          characterInfo: null,
          isConnected: true
        };

        // user-left와 동일한 방식으로 배열 업데이트
        const updatedParticipants = [...currentParticipants, newParticipant];
        
        console.log('✅ 참여자 추가 완료:', {
          before: currentParticipants.length,
          after: updatedParticipants.length,
          joinedParticipant: data.nickname
        });
        
        // Context 업데이트 → 자동 리렌더링 트리거
        dispatch({ type: 'SET_PARTICIPANTS', payload: updatedParticipants });
        
        // 🔧 React 배칭 문제 해결을 위한 강제 리렌더링
        setTimeout(() => {
          // 강제로 다시 한번 동일한 데이터로 dispatch (참조 변경 강제)
          dispatch({ type: 'SET_PARTICIPANTS', payload: [...updatedParticipants] });
          console.log('🔄 [user-joined] 강제 리렌더링 완료:', {
            participantsCount: updatedParticipants.length,
            timestamp: new Date().toLocaleTimeString()
          });
        }, 0);
        
        // 방 정보의 현재 인원 수도 업데이트
        if (stateRef.current.currentRoom) {
          dispatch({ 
            type: 'SET_ROOM', 
            payload: { 
              ...stateRef.current.currentRoom, 
              currentCapacity: updatedParticipants.length
            } 
          });
        }

        // 환영 메시지 표시
        console.log(`🎊 ${data.nickname}님이 방에 입장했습니다.`);
      } else {
        console.log('⚠️ 추가할 참여자가 이미 존재함:', data.guestUserId);
      }
    });

    // 🔍 모든 Socket.IO 이벤트 캐치 (디버깅용)
    const originalOn = socket.on.bind(socket);
    socket.on = (event: any, callback: any) => {
      const wrappedCallback = (...args: any[]) => {
        if (event.includes('character') || event.includes('preparation') || event.includes('update')) {
          console.log(`🔔 [Socket] 이벤트 수신: ${event}`, args);
        }
        callback(...args);
      };
      return originalOn(event, wrappedCallback);
    };

    // 🎨 서버 캐릭터 업데이트 이벤트 (실시간 브로드캐스트) - 새 서버 형식 지원
    socket.on('character-status-updated', (data: { 
      guestUserId: string; 
      nickname: string;
      characterInfo?: { // 기존 형식 호환
        selectedOptions: Record<string, string>;
        selectedColors: Record<string, string>;
        isCustomized: boolean;
      };
      characterSetup?: { // 새 서버 형식
        selectedOptions?: Record<string, string>;
        selectedColors?: Record<string, string>;
      };
      isCustomized?: boolean; // 새 서버 형식
      timestamp?: number;
    }) => {
      // 새 서버 형식과 기존 형식 모두 지원
      let characterInfo = data.characterInfo || {
        selectedOptions: data.characterSetup?.selectedOptions || {},
        selectedColors: data.characterSetup?.selectedColors || {},
        isCustomized: data.isCustomized ?? false
      };

      // 🔧 서버 버그 우회: 서버에서 잘못된 데이터를 보내는 경우 백업 데이터 사용
      const hasValidData = characterInfo.isCustomized && 
        Object.keys(characterInfo.selectedOptions || {}).length > 0 && 
        Object.keys(characterInfo.selectedColors || {}).length > 0;
        
      if (!hasValidData && typeof window !== 'undefined') {
        // 로컬 백업 데이터에서 정확한 캐릭터 정보 가져오기
        const backupData = localStorage.getItem(`character-backup-${data.guestUserId}`);
        if (backupData) {
          try {
            const parsed = JSON.parse(backupData);
            if (parsed.data && parsed.data.selectedOptions && parsed.data.selectedColors) {
              console.log('🔧 [Socket] 서버 데이터 오류 감지, 백업 데이터 사용:', {
                serverData: characterInfo,
                backupData: parsed.data
              });
              characterInfo = {
                selectedOptions: parsed.data.selectedOptions,
                selectedColors: parsed.data.selectedColors,
                isCustomized: true
              };
            }
          } catch (error) {
            console.warn('⚠️ [Socket] 백업 데이터 파싱 실패:', error);
          }
        }
      }
      
      if (!validateAndLog('character-status-updated', data, (d) => 
        d && 
        typeof d.guestUserId === 'string' && 
        (d.characterInfo || d.characterSetup) &&
        (!d.timestamp || validateTimestamp(d.timestamp))
      )) {
        logSocketState('캐릭터 상태 업데이트 검증 실패');
        return;
      }
      
      // 🚫 실시간 업데이트 디버깅 (확률적 로깅으로 스팸 방지)
      if (import.meta.env.DEV && Math.random() < 0.05) {
        console.log('🎨 [Socket] 캐릭터 상태 업데이트 수신:', data.guestUserId, characterInfo.isCustomized);
      }

      // 🔍 서버 원본 데이터 분석 (개발 모드에서만)
      if (import.meta.env.DEV && Math.random() < 0.02) {
        console.log('📦 [Socket] 서버 원본 데이터:', {
          hasCharacterInfo: !!data.characterInfo,
          hasCharacterSetup: !!data.characterSetup,
          characterInfoIsCustomized: data.characterInfo?.isCustomized,
          characterSetupOptions: Object.keys(data.characterSetup?.selectedOptions || {}).length,
          characterSetupColors: Object.keys(data.characterSetup?.selectedColors || {}).length,
          computedIsCustomized: data.isCustomized
        });
      }

      // 🔧 실시간 participants 업데이트
      const currentParticipants = stateRef.current.participants || [];
      
      const updatedParticipants = currentParticipants.map(p => {
        const isTargetPlayer = p.guestUserId === data.guestUserId || p.id === data.guestUserId;
        
        return isTargetPlayer
          ? { 
              ...p, 
              characterInfo: {
                selectedOptions: characterInfo.selectedOptions,
                selectedColors: characterInfo.selectedColors,
                isCustomized: characterInfo.isCustomized
              },
              preparationStatus: {
                ...p.preparationStatus,
                characterSetup: characterInfo.isCustomized
              }
            }
          : p;
      });

      // 🚫 서버 버그 우회: isCustomized가 false인 경우 업데이트 무시 (백업 데이터 사용 안함)
      if (!characterInfo.isCustomized) {
        console.log('🚫 [Socket] 서버에서 isCustomized: false로 전송, 업데이트 무시:', {
          guestUserId: data.guestUserId,
          reason: '새 캐릭터 설정 보호를 위해 false 데이터 무시'
        });
        return;
      }

      // 실제로 변경된 경우에만 업데이트 (무한 루프 방지)
      const hasActualChanges = updatedParticipants.some((updated, i) => {
        const current = currentParticipants[i];
        return !current || 
          current.characterInfo?.isCustomized !== updated.characterInfo?.isCustomized ||
          (() => {
          try {
            return JSON.stringify(current.characterInfo?.selectedOptions) !== JSON.stringify(updated.characterInfo?.selectedOptions);
          } catch (jsonError) {
            console.warn('⚠️ [Character] JSON 비교 에러, 객체 직접 비교 사용:', jsonError);
            return current.characterInfo?.selectedOptions !== updated.characterInfo?.selectedOptions;
          }
        })();
      });

      if (hasActualChanges) {
        // 🚫 업데이트 적용 로깅 (확률적 로깅으로 스팸 방지)
        if (import.meta.env.DEV && Math.random() < 0.03) {
          console.log('✅ [Socket] participants 캐릭터 업데이트 적용:', data.guestUserId);
        }

        // 단일 dispatch로 업데이트 (이중 dispatch 제거하여 무한 루프 방지)
        dispatch({ type: 'SET_PARTICIPANTS', payload: updatedParticipants });
        
        // 🎯 현재 플레이어의 캐릭터 설정인 경우 currentPlayer와 preparation 상태 모두 업데이트
        const currentPlayer = stateRef.current.currentPlayer;
        if (currentPlayer && (currentPlayer.guestUserId === data.guestUserId || currentPlayer.id === data.guestUserId)) {
          // 🚫 현재 플레이어 업데이트 로깅 (확률적 로깅)
          if (import.meta.env.DEV && Math.random() < 0.05) {
            console.log('🎨 [Socket] 현재 플레이어 캐릭터 설정 완료:', characterInfo.isCustomized);
          }
          
          // 1. currentPlayer 업데이트 (가장 중요!)
          const updatedCurrentPlayer = {
            ...currentPlayer,
            characterInfo: {
              selectedOptions: characterInfo.selectedOptions,
              selectedColors: characterInfo.selectedColors,
              isCustomized: characterInfo.isCustomized
            },
            preparationStatus: {
              ...currentPlayer.preparationStatus,
              characterSetup: characterInfo.isCustomized
            }
          };
          dispatch({ type: 'SET_PLAYER', payload: updatedCurrentPlayer });
          
          // 2. preparation 상태 업데이트
          dispatch({ 
            type: 'SET_PREPARATION', 
            payload: { 
              ...stateRef.current.preparation,
              characterSetup: characterInfo.isCustomized
            }
          });
          
          // 확률적 로깅 (스팸 방지)
          if (Math.random() < 0.2) {
            console.log('🎨 [Socket] currentPlayer 업데이트 완료:', data.guestUserId);
          }
        }
      } else {
        console.log('⏭️ [Socket] 캐릭터 상태 변경 없음, 업데이트 생략:', {
          guestUserId: data.guestUserId,
          isCustomized: characterInfo.isCustomized,
          reason: '이미 동일한 상태'
        });
      }
      
      // 🚫 중복 updateParticipant 호출 제거 (무한 루프 방지)
      // updateParticipant(data.guestUserId, { characterInfo: data.characterInfo });
    });

    // 🔍 서버에서 오는 모든 이벤트 모니터링 (캐릭터 관련)
    ['character-updated', 'characterUpdated', 'character_updated', 'update-character', 'updateCharacter', 
     'preparation-status-updated', 'preparationStatusUpdated', 'preparation_status_updated'].forEach(eventName => {
      socket.on(eventName, (data: any) => {
        console.log(`🔔 [Socket] 대안 이벤트 수신: ${eventName}`, data);
      });
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
    // 서버 실제 데이터 구조에 맞춤: { socketId, guestUserId, nickname }
    socket.on('user-left', (data: { socketId: string; guestUserId: string; nickname: string }) => {
      console.log('🚨 [user-left] 이벤트 수신!', {
        socketId: data.socketId,
        guestUserId: data.guestUserId,
        nickname: data.nickname,
        currentParticipantsCount: stateRef.current.participants?.length || 0,
        currentParticipants: stateRef.current.participants?.map(p => ({
          nickname: p.nickname,
          guestUserId: p.guestUserId,
          socketId: p.socketId
        })) || []
      });

      // 🔧 최신 state를 사용하여 participants 배열에서 해당 참여자 제거
      const currentParticipants = stateRef.current.participants || [];
      console.log('🔍 퇴장 처리 전 상태:', {
        찾을_guestUserId: data.guestUserId,
        현재_참여자들: currentParticipants.map(p => ({
          nickname: p.nickname,
          guestUserId: p.guestUserId,
          socketId: p.socketId
        }))
      });
      
      const updatedParticipants = currentParticipants.filter(p => 
        p.guestUserId !== data.guestUserId && p.id !== data.guestUserId
        // socketId는 제외 - 닉네임 정규화로 인해 다를 수 있음
      );

      if (updatedParticipants.length !== currentParticipants.length) {
        console.log('✅ 참여자 제거 완료:', {
          before: currentParticipants.length,
          after: updatedParticipants.length,
          leftParticipant: data.nickname
        });
        
        // Context 업데이트 → 자동 리렌더링 트리거
        dispatch({ type: 'SET_PARTICIPANTS', payload: updatedParticipants });
        
        // 방 정보의 현재 인원 수도 업데이트
        if (stateRef.current.currentRoom) {
          dispatch({ 
            type: 'SET_ROOM', 
            payload: { 
              ...stateRef.current.currentRoom, 
              currentCapacity: updatedParticipants.length
            } 
          });
        }

        // 퇴장 메시지 표시
        console.log(`👋 ${data.nickname}님이 방을 나갔습니다.`);
      } else {
        console.log('⚠️ 제거할 참여자를 찾을 수 없음:', data.guestUserId);
      }
    });

    // 🔍 추가 퇴장 이벤트 리스너들 (다양한 케이스 처리)
    
    // 일반적인 disconnect 시 참여자 제거 (user-left 보완용)
    socket.on('disconnect', (reason) => {
      console.log('🔌 [disconnect] 이벤트 발생:', { reason });
      // disconnect는 자신의 연결이 끊어진 것이므로 참여자 제거 안 함
      // 다른 참여자의 퇴장은 user-left에서 처리
    });

    // 혹시 다른 이벤트명으로 퇴장 알림이 올 수 있음
    socket.on('participant-left', (data: any) => {
      console.log('🚨 [participant-left] 이벤트 수신!', data);
      // user-left와 동일한 처리
      if (data.guestUserId) {
        const currentParticipants = state.participants || [];
        const updatedParticipants = currentParticipants.filter(p => 
          p.guestUserId !== data.guestUserId && p.id !== data.guestUserId
        );
        if (updatedParticipants.length !== currentParticipants.length) {
          dispatch({ type: 'SET_PARTICIPANTS', payload: updatedParticipants });
        }
      }
    });

    // 모든 Socket 이벤트 수신 디버깅 (퇴장 관련 이벤트 특별 표시)
    socket.onAny((eventName, ...args) => {
      if (eventName.includes('left') || eventName.includes('disconnect') || eventName.includes('leave')) {
        console.log(`🚨 [Socket] 퇴장 관련 이벤트:`, { eventName, args });
      } else {
        console.log(`🎯 [Socket] 이벤트 수신:`, { eventName, args });
      }
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

  // 🎨 서버 Socket.IO 캐릭터 업데이트 (실시간)
  const updateCharacter = (characterData: CharacterData) => {
    if (state.realtime.socket && state.currentPlayer && state.currentRoom) {
      logSocketState('캐릭터 상태 업데이트 요청', { 
        hasCharacterData: !!characterData,
        selectedOptionsCount: Object.keys(characterData.selectedOptions || {}).length,
        selectedColorsCount: Object.keys(characterData.selectedColors || {}).length
      });
      
      // 유니코드 문자 정리 함수
      const sanitizeUnicodeString = (str: string): string => {
        if (!str) return str;
        return str.replace(/[\uD800-\uDFFF]/g, '');
      };

      // 객체 내 모든 문자열 값을 sanitize하는 함수
      const sanitizeObject = (obj: Record<string, any>): Record<string, any> => {
        const sanitized: Record<string, any> = {};
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'string') {
            sanitized[key] = sanitizeUnicodeString(value);
          } else {
            sanitized[key] = value;
          }
        }
        return sanitized;
      };

      // 🔥 서버가 기대하는 형식으로 데이터 전송 (새 서버 타입에 맞춤)
      const characterStatusData = {
        guestUserId: sanitizeUnicodeString(state.currentPlayer.guestUserId), // 필수: 업데이트할 플레이어 식별
        roomCode: sanitizeUnicodeString(state.currentRoom.roomCode), // 필수: 방 식별
        nickname: sanitizeUnicodeString(characterData.nickname || state.currentPlayer.nickname || ''),
        characterSetup: { // 새 서버 형식에 맞춰 CharacterSetup 구조 사용
          selectedOptions: sanitizeObject(characterData.selectedOptions || {}),
          selectedColors: sanitizeObject(characterData.selectedColors || {}),
        },
        isCustomized: !!(characterData.selectedOptions && characterData.selectedColors &&
          Object.keys(characterData.selectedOptions).length > 0 &&
          Object.keys(characterData.selectedColors).length > 0)
      };

      console.log('🎨 [updateCharacter] Socket 이벤트 전송:', {
        guestUserId: characterStatusData.guestUserId,
        isCustomized: characterStatusData.isCustomized,
        socketConnected: !!state.realtime.socket?.connected,
        socketId: state.realtime.socket?.id
      });

      // 🔍 전송 데이터 상세 분석
      console.log('📤 [updateCharacter] 전송 데이터 상세:', {
        originalCharacterData: characterData,
        processedData: characterStatusData,
        selectedOptionsKeys: Object.keys(characterData.selectedOptions || {}),
        selectedColorsKeys: Object.keys(characterData.selectedColors || {}),
        computedIsCustomized: !!(characterData.selectedOptions && characterData.selectedColors &&
          Object.keys(characterData.selectedOptions).length > 0 &&
          Object.keys(characterData.selectedColors).length > 0)
      });
      
      // 🔍 실제 전송되는 데이터 전체 로깅 (JSON 안전성 검사 포함)
      try {
        const jsonString = JSON.stringify(characterStatusData, null, 2);
        console.log('📦 [Socket] 실제 전송 데이터 전체:', jsonString);
      } catch (jsonError) {
        console.error('❌ [Socket] JSON 직렬화 에러:', jsonError);
        console.log('📦 [Socket] 전송 데이터 (안전 모드):', characterStatusData);
      }
      
      // 🎯 단일 이벤트로만 전송 (다중 전송으로 인한 혼란 방지)
      state.realtime.socket.emit('update-character-status', characterStatusData);
      console.log('📤 [Socket] update-character-status 이벤트 전송 완료');

      // 🚀 즉시 자신의 currentPlayer 상태도 업데이트 (실시간 반영 위해)
      if (state.currentPlayer && state.currentPlayer.guestUserId === characterStatusData.guestUserId) {
        const updatedCurrentPlayer = {
          ...state.currentPlayer,
          characterInfo: {
            isCustomized: characterStatusData.isCustomized,
            selectedOptions: characterStatusData.characterSetup.selectedOptions,
            selectedColors: characterStatusData.characterSetup.selectedColors
          }
        };
        
        console.log('⚡ [Socket] currentPlayer 즉시 업데이트:', {
          guestUserId: characterStatusData.guestUserId,
          isCustomized: characterStatusData.isCustomized
        });
        
        dispatch({ type: 'SET_CURRENT_PLAYER', payload: updatedCurrentPlayer });

        // 🚀 participants 배열에서도 자신의 정보 즉시 업데이트
        const currentParticipants = state.participants || [];
        const updatedParticipants = currentParticipants.map(participant => {
          if (participant.guestUserId === characterStatusData.guestUserId || participant.id === characterStatusData.guestUserId) {
            return {
              ...participant,
              characterInfo: {
                isCustomized: characterStatusData.isCustomized,
                selectedOptions: characterStatusData.characterSetup.selectedOptions,
                selectedColors: characterStatusData.characterSetup.selectedColors
              }
            };
          }
          return participant;
        });
        
        dispatch({ type: 'SET_PARTICIPANTS', payload: updatedParticipants });
        console.log('⚡ [Socket] participants에서도 자신의 캐릭터 정보 즉시 업데이트 완료');
      }
    } else {
      logSocketState('캐릭터 상태 업데이트 실패', {
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
    console.log('🎭 [UnifiedGamecastContext] setUIState 호출:', {
      updates,
      currentUIState: state.ui,
      timestamp: new Date().toLocaleTimeString()
    });
    dispatch({ type: 'SET_UI_STATE', payload: updates });
    console.log('🎭 [UnifiedGamecastContext] dispatch 완료');
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

  // 🔧 Context value 최적화로 React 배칭 문제 해결
  const contextValue = useMemo(() => {
    // participants 변경 시 완전히 새로운 참조 생성
    const enhancedState = {
      ...state,
      participants: state.participants ? [...state.participants] : state.participants,
      // 강제 업데이트를 위한 타임스탬프 추가
      _participantsUpdateTime: state.participants?.length ? Date.now() : 0
    };
    
    console.log('🔄 [Context] contextValue 재생성:', {
      participantsLength: state.participants?.length || 0,
      timestamp: new Date().toLocaleTimeString(),
      participantsData: state.participants?.map(p => ({
        nickname: p.nickname,
        guestUserId: p.guestUserId,
        isHost: p.isHost
      })) || []
    });
    
    return { 
      state: enhancedState, 
      actions 
    };
  }, [
    state.participants?.length, // participants 길이 변경 시 새 참조
    state.participants, // participants 전체 참조도 감시
    state.currentRoom?.roomCode,
    state.currentPlayer?.guestUserId,
    state.error,
    (state as any)._forceUpdateTimestamp, // 강제 업데이트 타임스탬프
    state.loading,
    // actions는 안정적이므로 제외
  ]);

  return (
    <UnifiedGamecastContext.Provider value={contextValue}>
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
    updateParticipant: actions.updateParticipant,
    updateCharacter: actions.updateCharacter
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