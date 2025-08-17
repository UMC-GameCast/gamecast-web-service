import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
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

// 전역 Socket 인스턴스 (중복 연결 방지 + 지속적 재연결)
let globalSocket: Socket | null = null;

// Socket 연결 상태 추적
let currentRoomCode: string | null = null;
let currentGuestUserId: string | null = null;
let isSocketDisconnecting = false; // 의도적 연결 해제 중인지 플래그

// Context 초기화 중복 방지
let isInitializing = false;

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
      isSocketDisconnecting = true;
      
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

      // 전역 상태 초기화
      currentRoomCode = null;
      currentGuestUserId = null;

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

      // 2. Socket 완전 초기화 (방 나가기 시 재연결 방지)
      console.log('🔌 [UnifiedContext] Socket 완전 초기화 시작');
      
      // 의도적 연결 해제 플래그 설정 (재연결 방지)
      isSocketDisconnecting = true;
      
      if (state.realtime.socket) {
        console.log('🔌 [UnifiedContext] Context Socket 연결 해제');
        state.realtime.socket.removeAllListeners(); // 모든 이벤트 리스너 제거
        state.realtime.socket.disconnect();
      }
      
      // 전역 Socket도 완전 정리
      if (globalSocket) {
        console.log('🔌 [UnifiedContext] 전역 Socket 완전 정리');
        globalSocket.removeAllListeners(); // 모든 이벤트 리스너 제거
        globalSocket.disconnect();
        globalSocket = null;
      }

      // 전역 상태 초기화
      currentRoomCode = null;
      currentGuestUserId = null;
      
      console.log('✅ [UnifiedContext] Socket 완전 초기화 완료');
      
      // 3. 서버 API 호출 및 세션 정리
      console.log('🧹 [UnifiedContext] 서버 API 호출 및 세션 정리 시작');
      const result = await leaveRoomUtil();
      
      if (result.success) {
        console.log('✅ [UnifiedContext] 서버 방 나가기 성공:', result.message);
        
        // 성공 시 간단한 알림 (선택적)
        if (result.message) {
          console.log('📢 [UnifiedContext] 방 나가기 메시지:', result.message);
        }
      } else {
        console.warn('⚠️ [UnifiedContext] 서버 방 나가기 실패, 로컬 정리는 완료:', result.error);
      }
      
      // 4. Context 상태 초기화
      console.log('♻️ [UnifiedContext] Context 상태 초기화');
      dispatch({ type: 'RESET_STATE' });
      
      console.log('✅ [UnifiedContext] 방 나가기 완료');
      return { success: true };
      
    } catch (error) {
      console.error('❌ [UnifiedContext] 방 나가기 실패:', error);
      
      // 에러 발생 시에도 로컬 정리는 수행
      console.log('🧹 [UnifiedContext] 에러 상황에서 로컬 정리 수행');
      dispatch({ type: 'RESET_STATE' });
      
      return { success: false, error: error instanceof Error ? error.message : '방 나가기 중 오류가 발생했습니다.' };
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

  // 강화된 Socket 초기화 (지속적 재연결 지원)
  const initializeSocket = (roomCode: string, currentPlayer: Player) => {
    console.log('🔌 [initializeSocket] Socket 초기화 시작:', {
      requestedRoom: roomCode,
      currentGlobalRoom: currentRoomCode,
      playerGuestId: currentPlayer.guestUserId,
      hasGlobalSocket: !!globalSocket,
      isGlobalSocketConnected: globalSocket?.connected || false,
      isDisconnecting: isSocketDisconnecting
    });

    // 의도적 연결 해제 중이면 초기화 무시
    if (isSocketDisconnecting) {
      console.log('⏭️ [initializeSocket] 연결 해제 중, 초기화 건너뜀');
      return;
    }

    // 전역 Socket이 있고 같은 방/같은 유저면 재사용
    if (globalSocket && globalSocket.connected && 
        currentRoomCode === roomCode && 
        currentGuestUserId === currentPlayer.guestUserId) {
      console.log('✅ [initializeSocket] 기존 Socket 재사용:', { 
        socketId: globalSocket.id, 
        roomCode,
        guestUserId: currentPlayer.guestUserId
      });
      dispatch({ type: 'SET_SOCKET', payload: globalSocket });
      return;
    }

    // 기존 Socket이 있지만 다른 방/다른 유저면 정리 후 새로 생성
    if (globalSocket) {
      console.log('🔄 [initializeSocket] 기존 Socket 정리 (방/유저 변경):', { 
        oldRoom: currentRoomCode, 
        newRoom: roomCode,
        oldUser: currentGuestUserId,
        newUser: currentPlayer.guestUserId
      });
      
      // 재연결 방지를 위해 일시적으로 플래그 설정
      isSocketDisconnecting = true;
      globalSocket.disconnect();
      globalSocket = null;
      
      // 잠시 후 플래그 해제
      setTimeout(() => {
        isSocketDisconnecting = false;
      }, 1000);
    }

    console.log('🔌 [initializeSocket] 새 Socket 연결 시작:', { roomCode, playerId: currentPlayer.guestUserId });

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      query: {
        roomCode: roomCode,
        guestUserId: currentPlayer.guestUserId
      }
    });

    // 전역 상태 업데이트
    currentRoomCode = roomCode;
    currentGuestUserId = currentPlayer.guestUserId;

    // 강화된 이벤트 리스너 설정
    socket.on('connect', () => {
      console.log('✅ Socket 연결됨:', {
        socketId: socket.id,
        roomCode,
        guestUserId: currentPlayer.guestUserId,
        nickname: currentPlayer.nickname
      });
      
      socket.emit('join-room', {
        roomCode,
        guestUserId: currentPlayer.guestUserId,
        nickname: currentPlayer.nickname
      });

      // 연결 후 현재 방 상태 요청
      setTimeout(() => {
        console.log('🔄 [Socket] 현재 방 상태 요청');
        socket.emit('get-room-state', { roomCode });
      }, 1000);
    });

    // 재연결 이벤트 처리
    socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket 재연결됨:', {
        attempt: attemptNumber,
        socketId: socket.id,
        roomCode: currentRoomCode
      });
      
      // 재연결 시 자동으로 방에 다시 참여
      if (currentRoomCode && currentGuestUserId) {
        socket.emit('join-room', {
          roomCode: currentRoomCode,
          guestUserId: currentGuestUserId,
          nickname: currentPlayer.nickname
        });
      }
    });

    // 연결 해제 시 재연결 시도
    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket 연결 해제:', { reason, isDisconnecting: isSocketDisconnecting });
      
      // 의도적 해제가 아닌 경우에만 재연결 로직 활성화
      if (!isSocketDisconnecting) {
        if (reason === 'io server disconnect') {
          console.log('⚠️ 서버에서 강제 연결 해제, 재연결 시도');
          dispatch({ type: 'SET_ERROR', payload: '서버와의 연결이 끊어졌습니다. 재연결 시도 중...' });
        } else if (reason === 'transport close' || reason === 'ping timeout') {
          console.log('🔄 네트워크 이슈로 연결 해제, 자동 재연결 대기');
        }
      }
    });

    socket.on('participants-update', (data: { participants: Player[] }) => {
      console.log('👥 [Socket] participants-update 이벤트 수신:', {
        participantsCount: data.participants.length,
        participants: data.participants.map(p => ({
          guestUserId: p.guestUserId,
          nickname: p.nickname,
          role: p.role
        }))
      });
      dispatch({ type: 'SET_PARTICIPANTS', payload: data.participants });
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
        newUser: data.newParticipant.nickname,
        guestUserId: data.newParticipant.guestUserId,
        totalParticipants: data.participants.length,
        capacity: `${data.currentCapacity}/${data.maxCapacity}`
      });

      // 참여자 목록 업데이트
      dispatch({ type: 'SET_PARTICIPANTS', payload: data.participants });

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
      dispatch({ type: 'SET_PARTICIPANTS', payload: data.participants });
    });

    // 이미 위에서 처리된 disconnect 이벤트이므로 중복 제거

    // 모든 Socket 이벤트 수신 디버깅
    socket.onAny((eventName, ...args) => {
      console.log(`🎯 [Socket] 이벤트 수신:`, { eventName, args });
    });

    // Socket 에러 처리
    socket.on('error', (error) => {
      console.error('❌ [Socket] 에러:', error);
    });

    // 전역 Socket으로 저장
    globalSocket = socket;
    dispatch({ type: 'SET_SOCKET', payload: socket });
  };

  // WebRTC 제거됨 - 나중에 구현 예정

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
            if (!state.realtime.socket && globalSocket && globalSocket.connected) {
              console.log('🔌 [UnifiedContext] 기존 Socket 복구:', {
                socketId: globalSocket.id,
                roomCode: room.roomCode,
                isConnected: globalSocket.connected
              });
              dispatch({ type: 'SET_SOCKET', payload: globalSocket });
            }
            
            dispatch({ type: 'SET_LOADING', payload: false });
            return;
          }
          
          // 기본 플레이어 정보 생성 (API 없이)
          const basicPlayer: Player = {
            id: userId,
            guestUserId: userId,
            nickname: "Nickname1", // 기본 닉네임 (방장은 항상 Nickname1)
            role: "host", // 방 생성자는 항상 호스트
            isHost: true,
            joinedAt: new Date().toISOString(),
            preparationStatus: {
              characterSetup: false,
              screenSetup: false,
              isReady: false
            },
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

  // 액션들
  const actions = {
    refreshRoomState,
    leaveRoom,
    clearRoomData,
    updateParticipant,
    updatePreparation,
    initializeSocket,
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
  const { state } = useUnifiedGamecast();
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