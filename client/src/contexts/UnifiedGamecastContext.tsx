import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Room, Player, CharacterData } from '../types/game';
import { WebRTCManager } from '../utils/webRTCManager';
import { SOCKET_URL } from '../config/server.config';
import { 
  getCurrentRoom, 
  getCurrentUserId, 
  getRoomInfo, 
  leaveRoom as leaveRoomUtil 
} from '../utils/roomManager';

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
type UnifiedGamecastAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ROOM'; payload: Room | null }
  | { type: 'SET_PLAYER'; payload: Player | null }
  | { type: 'SET_PARTICIPANTS'; payload: Player[] }
  | { type: 'UPDATE_PARTICIPANT'; payload: { guestUserId: string; updates: Partial<Player> } }
  | { type: 'SET_PREPARATION'; payload: Partial<UnifiedGamecastState['preparation']> }
  | { type: 'SET_SOCKET'; payload: Socket | null }
  | { type: 'SET_WEBRTC'; payload: WebRTCManager | null }
  | { type: 'SET_VOICE_CONNECTED'; payload: boolean }
  | { type: 'SET_LOCAL_STREAM'; payload: MediaStream | null }
  | { type: 'UPDATE_REMOTE_STREAM'; payload: { guestUserId: string; stream: MediaStream | null } }
  | { type: 'SET_LOCAL_MUTED'; payload: boolean }
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
    webrtc: null,
    voiceConnected: false,
    localStream: null,
    remoteStreams: new Map(),
    isLocalMuted: false
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
      return { ...state, participants: action.payload };
    
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
    
    case 'SET_WEBRTC':
      return {
        ...state,
        realtime: { ...state.realtime, webrtc: action.payload }
      };
    
    case 'SET_VOICE_CONNECTED':
      return {
        ...state,
        realtime: { ...state.realtime, voiceConnected: action.payload }
      };
    
    case 'SET_LOCAL_STREAM':
      return {
        ...state,
        realtime: { ...state.realtime, localStream: action.payload }
      };
    
    case 'UPDATE_REMOTE_STREAM':
      const newRemoteStreams = new Map(state.realtime.remoteStreams);
      if (action.payload.stream) {
        newRemoteStreams.set(action.payload.guestUserId, action.payload.stream);
      } else {
        newRemoteStreams.delete(action.payload.guestUserId);
      }
      return {
        ...state,
        realtime: { ...state.realtime, remoteStreams: newRemoteStreams }
      };
    
    case 'SET_LOCAL_MUTED':
      return {
        ...state,
        realtime: { ...state.realtime, isLocalMuted: action.payload }
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
    updateParticipant: (guestUserId: string, updates: Partial<Player>) => void;
    
    // 준비 상태 관리
    updatePreparation: (updates: Partial<UnifiedGamecastState['preparation']>) => void;
    
    // 실시간 연결 관리
    initializeSocket: (roomCode: string, currentPlayer: Player) => void;
    initializeWebRTC: (roomCode: string, nickname: string) => Promise<void>;
    toggleLocalAudio: () => void;
    
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

  // 방 나가기
  const leaveRoom = async () => {
    try {
      // WebRTC 정리
      if (state.realtime.webrtc) {
        state.realtime.webrtc.close();
      }
      
      // Socket 정리
      if (state.realtime.socket) {
        state.realtime.socket.disconnect();
      }
      
      await leaveRoomUtil();
      dispatch({ type: 'RESET_STATE' });
    } catch (error) {
      console.error('방 나가기 실패:', error);
    }
  };

  // 참여자 업데이트
  const updateParticipant = (guestUserId: string, updates: Partial<Player>) => {
    dispatch({ type: 'UPDATE_PARTICIPANT', payload: { guestUserId, updates } });
  };

  // 준비 상태 업데이트
  const updatePreparation = (updates: Partial<UnifiedGamecastState['preparation']>) => {
    dispatch({ type: 'SET_PREPARATION', payload: updates });
    
    // Socket으로 서버에 전송
    if (state.realtime.socket && state.currentPlayer) {
      state.realtime.socket.emit('update-preparation', {
        roomCode: state.currentRoom?.roomCode,
        guestUserId: state.currentPlayer.guestUserId,
        preparationStatus: { ...state.preparation, ...updates }
      });
    }
  };

  // Socket 초기화
  const initializeSocket = (roomCode: string, currentPlayer: Player) => {
    if (state.realtime.socket) {
      console.log('Socket 이미 연결됨, 재사용');
      return;
    }

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // 이벤트 리스너 설정
    socket.on('connect', () => {
      console.log('✅ Socket 연결됨:', socket.id);
      socket.emit('join-room', {
        roomCode,
        guestUserId: currentPlayer.guestUserId,
        nickname: currentPlayer.nickname
      });
    });

    socket.on('participants-update', (data: { participants: Player[] }) => {
      console.log('👥 참여자 목록 업데이트:', data.participants.length);
      dispatch({ type: 'SET_PARTICIPANTS', payload: data.participants });
    });

    socket.on('character-update', (data: { guestUserId: string; characterInfo: any }) => {
      console.log('🎨 캐릭터 업데이트:', data);
      updateParticipant(data.guestUserId, { characterInfo: data.characterInfo });
    });

    socket.on('preparation-update', (data: { guestUserId: string; preparationStatus: any }) => {
      console.log('✅ 준비 상태 업데이트:', data);
      updateParticipant(data.guestUserId, { preparationStatus: data.preparationStatus });
    });

    socket.on('recording-start', () => {
      console.log('🎬 녹화 시작 신호 수신');
      dispatch({ type: 'SET_RECORDING_STATE', payload: { isRecording: true, recordingTime: 0 } });
    });

    socket.on('recording-stop', () => {
      console.log('⏹️ 녹화 종료 신호 수신');
      dispatch({ type: 'SET_RECORDING_STATE', payload: { isRecording: false } });
    });

    dispatch({ type: 'SET_SOCKET', payload: socket });
  };

  // WebRTC 초기화
  const initializeWebRTC = async (roomCode: string, nickname: string) => {
    if (state.realtime.webrtc) {
      console.log('WebRTC 이미 초기화됨');
      return;
    }

    try {
      const webrtcManager = new WebRTCManager(roomCode, nickname);
      
      // 이벤트 바인딩
      webrtcManager.onRemoteStream = (guestUserId: string, stream: MediaStream) => {
        console.log('🎵 Remote stream 수신:', guestUserId);
        dispatch({ type: 'UPDATE_REMOTE_STREAM', payload: { guestUserId, stream } });
        updateParticipant(guestUserId, { hasWebRTCConnection: true, remoteStream: stream });
      };

      webrtcManager.onUserLeft = (guestUserId: string) => {
        console.log('👋 사용자 퇴장:', guestUserId);
        dispatch({ type: 'UPDATE_REMOTE_STREAM', payload: { guestUserId, stream: null } });
        updateParticipant(guestUserId, { hasWebRTCConnection: false, remoteStream: null });
      };

      // 로컬 스트림 시작
      const localStream = await webrtcManager.start();
      dispatch({ type: 'SET_WEBRTC', payload: webrtcManager });
      dispatch({ type: 'SET_LOCAL_STREAM', payload: localStream });
      dispatch({ type: 'SET_VOICE_CONNECTED', payload: true });

      console.log('✅ WebRTC 초기화 완료');
    } catch (error) {
      console.error('❌ WebRTC 초기화 실패:', error);
      dispatch({ type: 'SET_ERROR', payload: 'WebRTC 초기화에 실패했습니다.' });
    }
  };

  // 로컬 오디오 토글
  const toggleLocalAudio = () => {
    if (state.realtime.localStream) {
      const audioTracks = state.realtime.localStream.getAudioTracks();
      const newMutedState = !state.realtime.isLocalMuted;
      
      audioTracks.forEach(track => {
        track.enabled = !newMutedState;
      });
      
      dispatch({ type: 'SET_LOCAL_MUTED', payload: newMutedState });
    }
  };

  // 캐릭터 업데이트
  const updateCharacter = (characterData: CharacterData) => {
    if (state.realtime.socket && state.currentPlayer) {
      console.log('🎨 캐릭터 업데이트 전송:', characterData);
      state.realtime.socket.emit('update-character', {
        roomCode: state.currentRoom?.roomCode,
        guestUserId: state.currentPlayer.guestUserId,
        characterInfo: characterData
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
      await refreshRoomState();
      dispatch({ type: 'SET_LOADING', payload: false });
    };

    initializeRoom();
  }, []);

  // 액션들
  const actions = {
    refreshRoomState,
    leaveRoom,
    updateParticipant,
    updatePreparation,
    initializeSocket,
    initializeWebRTC,
    toggleLocalAudio,
    updateCharacter,
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
  const { state, actions } = useUnifiedGamecast();
  return {
    localStream: state.realtime.localStream,
    remoteStreams: state.realtime.remoteStreams,
    voiceChatConnected: state.realtime.voiceConnected,
    isLocalMuted: state.realtime.isLocalMuted,
    toggleLocalAudio: actions.toggleLocalAudio,
    initializeWebRTC: actions.initializeWebRTC
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