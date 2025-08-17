import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Room, Player, CharacterData } from '../types/game';
import { WebRTCManager } from '../utils/webRTCManager';
import { SOCKET_URL } from '../config/server.config';
import { 
  getCurrentRoom, 
  getCurrentUserId, 
  getRoomInfo, 
  leaveRoom as leaveRoomUtil 
} from '../utils/roomManager';

// 통합 전역 상태 인터페이스
interface GamecastState {
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
  
  // 실시간 연결 상태 통합
  realtime: {
    socket: Socket | null;
    webrtc: WebRTCManager | null;
    voiceConnected: boolean;
    localStream: MediaStream | null;
    remoteStreams: Map<string, MediaStream>;
    isLocalMuted: boolean;
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
type GamecastAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ROOM'; payload: Room | null }
  | { type: 'SET_PLAYER'; payload: Player | null }
  | { type: 'SET_PARTICIPANTS'; payload: Player[] }
  | { type: 'SET_CHARACTER_DATA'; payload: CharacterData | null }
  | { type: 'SET_SHOW_CHARACTER_SETUP'; payload: boolean }
  | { type: 'SET_CHARACTER_SETUP_COMPLETE'; payload: boolean }
  | { type: 'SET_SCREEN_SETUP_COMPLETE'; payload: boolean }
  | { type: 'SET_SHOW_MIC_GUIDE'; payload: boolean }
  | { type: 'RESET_STATE' };

// 초기 상태
const initialState: GamecastState = {
  currentRoom: null,
  currentPlayer: null,
  participants: [],
  loading: true,
  error: null,
  characterData: null,
  showCharacterSetup: false,
  characterSetupComplete: false,
  screenSetupComplete: false,
  showMicGuide: false
};

// 리듀서
const gamecastReducer = (state: GamecastState, action: GamecastAction): GamecastState => {
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
      return { ...state, participants: action.payload };
    
    case 'SET_CHARACTER_DATA':
      return { ...state, characterData: action.payload };
    
    case 'SET_SHOW_CHARACTER_SETUP':
      return { ...state, showCharacterSetup: action.payload };
    
    case 'SET_CHARACTER_SETUP_COMPLETE':
      return { ...state, characterSetupComplete: action.payload };
    
    case 'SET_SCREEN_SETUP_COMPLETE':
      return { ...state, screenSetupComplete: action.payload };
    
    case 'SET_SHOW_MIC_GUIDE':
      return { ...state, showMicGuide: action.payload };
    
    case 'RESET_STATE':
      return initialState;
    
    default:
      return state;
  }
};

// Context 생성
const GamecastContext = createContext<{
  state: GamecastState;
  actions: {
    // 방 관련
    refreshRoomState: () => Promise<void>;
    leaveRoom: () => Promise<void>;
    
    // 캐릭터 관련
    setShowCharacterSetup: (show: boolean) => void;
    updateCharacterData: (data: CharacterData) => void;
    setCharacterSetupComplete: (complete: boolean) => void;
    setScreenSetupComplete: (complete: boolean) => void;
    
    // UI 상태 관리
    setError: (error: string | null) => void;
    setShowMicGuide: (show: boolean) => void;
    
    // 참여자 업데이트
    updateParticipants: (participants: Player[]) => void;
  };
} | null>(null);

// Provider 컴포넌트
export const GamecastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gamecastReducer, initialState);

  // 방 상태 새로고침
  const refreshRoomState = async () => {
    const room = getCurrentRoom();
    const userId = getCurrentUserId();

    if (room && userId) {
      try {
        const result = await getRoomInfo(room.roomCode);
        if (result.success && result.room) {
          dispatch({ type: 'SET_ROOM', payload: result.room });
          
          // 현재 플레이어 정보 업데이트
          let serverPlayer = result.room.participants?.find(p => p.guestUserId === userId);
          if (!serverPlayer) {
            serverPlayer = result.room.participants?.find(p => p.id === userId);
          }
          
          if (serverPlayer) {
            const playerInfo: Player = {
              ...serverPlayer,
              id: serverPlayer.id || serverPlayer.guestUserId,
              guestUserId: serverPlayer.guestUserId || serverPlayer.id,
              preparationStatus: serverPlayer.preparationStatus || {
                characterSetup: false,
                screenSetup: false
              },
              isHost: serverPlayer.role === 'host',
              characterInfo: serverPlayer.characterInfo || null
            };
            dispatch({ type: 'SET_PLAYER', payload: playerInfo });
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

  // 방 나가기
  const leaveRoom = async () => {
    try {
      await leaveRoomUtil();
      dispatch({ type: 'RESET_STATE' });
    } catch (error) {
      console.error('방 나가기 실패:', error);
    }
  };

  // 액션들
  const actions = {
    refreshRoomState,
    leaveRoom,
    setShowCharacterSetup: (show: boolean) => {
      dispatch({ type: 'SET_SHOW_CHARACTER_SETUP', payload: show });
    },
    updateCharacterData: (data: CharacterData) => {
      dispatch({ type: 'SET_CHARACTER_DATA', payload: data });
    },
    setCharacterSetupComplete: (complete: boolean) => {
      dispatch({ type: 'SET_CHARACTER_SETUP_COMPLETE', payload: complete });
    },
    setScreenSetupComplete: (complete: boolean) => {
      dispatch({ type: 'SET_SCREEN_SETUP_COMPLETE', payload: complete });
    },
    setError: (error: string | null) => {
      dispatch({ type: 'SET_ERROR', payload: error });
    },
    setShowMicGuide: (show: boolean) => {
      dispatch({ type: 'SET_SHOW_MIC_GUIDE', payload: show });
    },
    updateParticipants: (participants: Player[]) => {
      dispatch({ type: 'SET_PARTICIPANTS', payload: participants });
    }
  };

  // 초기화 useEffect
  useEffect(() => {
    const initializeRoom = async () => {
      const room = getCurrentRoom();
      const userId = getCurrentUserId();

      if (!room || !userId) {
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      dispatch({ type: 'SET_ROOM', payload: room });
      
      try {
        const result = await getRoomInfo(room.roomCode);
        if (result.success && result.room) {
          dispatch({ type: 'SET_ROOM', payload: result.room });
          
          let serverPlayer = result.room.participants?.find(p => p.guestUserId === userId);
          if (!serverPlayer) {
            serverPlayer = result.room.participants?.find(p => p.id === userId);
          }
          
          if (serverPlayer) {
            const playerInfo: Player = {
              ...serverPlayer,
              id: serverPlayer.id || serverPlayer.guestUserId,
              guestUserId: serverPlayer.guestUserId || serverPlayer.id,
              preparationStatus: serverPlayer.preparationStatus || {
                characterSetup: false,
                screenSetup: false
              },
              isHost: serverPlayer.role === 'host',
              characterInfo: serverPlayer.characterInfo || null
            };
            dispatch({ type: 'SET_PLAYER', payload: playerInfo });
          }
        }
      } catch (error) {
        console.error('방 초기화 실패:', error);
        dispatch({ type: 'SET_ERROR', payload: '방 초기화 중 오류가 발생했습니다.' });
      }
      
      dispatch({ type: 'SET_LOADING', payload: false });
    };

    initializeRoom();
  }, []);

  return (
    <GamecastContext.Provider value={{ state, actions }}>
      {children}
    </GamecastContext.Provider>
  );
};

// Context를 사용하기 위한 Hook
export const useGamecast = () => {
  const context = useContext(GamecastContext);
  if (!context) {
    throw new Error('useGamecast는 GamecastProvider 내부에서만 사용할 수 있습니다.');
  }
  return context;
};

// 개별 기능별 Hook들 (기존 Hook과의 호환성을 위해)
export const useGamecastRoom = () => {
  const { state, actions } = useGamecast();
  return {
    currentRoom: state.currentRoom,
    currentPlayer: state.currentPlayer,
    participants: state.participants,
    loading: state.loading,
    error: state.error,
    refreshRoomState: actions.refreshRoomState,
    handleLeaveRoom: actions.leaveRoom
  };
};

export const useGamecastCharacter = () => {
  const { state, actions } = useGamecast();
  return {
    characterData: state.characterData,
    showCharacterSetup: state.showCharacterSetup,
    characterSetupComplete: state.characterSetupComplete,
    setShowCharacterSetup: actions.setShowCharacterSetup,
    updateCharacterData: actions.updateCharacterData,
    setCharacterSetupComplete: actions.setCharacterSetupComplete
  };
};

export const useGamecastUI = () => {
  const { state, actions } = useGamecast();
  return {
    showMicGuide: state.showMicGuide,
    screenSetupComplete: state.screenSetupComplete,
    setShowMicGuide: actions.setShowMicGuide,
    setScreenSetupComplete: actions.setScreenSetupComplete,
    setError: actions.setError
  };
};

// WebRTC 관련은 기존 Hook 사용 (점진적 마이그레이션)
export const useGamecastVoiceChat = () => {
  // 기존 useVoiceChat Hook을 래핑
  return {
    localStream: null,
    remoteStreams: new Map(),
    joinError: null,
    microphoneError: null,
    voiceChatState: { isConnected: false, isConnecting: false },
    toggleLocalAudio: () => {},
    isLocalMuted: false,
    getConnectedPeersCount: () => 0
  };
};