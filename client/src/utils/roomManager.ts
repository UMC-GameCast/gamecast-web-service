// REST API 기반 방 관리 유틸리티
import type { 
  Room, 
  Player, 
  CreateRoomRequest, 
  JoinRoomRequest, 
  UpdatePreparationRequest,
  APIResponse,
  CreateRoomResponse,
  JoinRoomResponse,
  UserSession
} from '../types/room';

const API_BASE_URL = 'http://3.37.34.211:8889/api';
const SESSION_ID_KEY = 'gamecast_session_id';
const USER_SESSION_KEY = 'gamecast_user_session';

// 서버 연결 테스트 함수
export const testServerConnection = async (): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('🔍 서버 연결 테스트 중...');
    const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
    });
    
    if (response.ok) {
      return { success: true, message: '서버 연결 성공' };
    } else {
      return { success: false, message: `서버 응답 오류: ${response.status}` };
    }
  } catch (error) {
    console.error('서버 연결 테스트 실패:', error);
    return { success: false, message: `서버 연결 실패: ${error}` };
  }
};

// 세션 ID 생성 및 관리
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = 'session_' + Math.random().toString(36).substring(2, 15) + Date.now();
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
};

// 사용자 세션 관리
const getUserSession = (): UserSession => {
  const sessionData = localStorage.getItem(USER_SESSION_KEY);
  if (sessionData) {
    return JSON.parse(sessionData);
  }
  
  const newSession: UserSession = {
    sessionId: getSessionId()
  };
  localStorage.setItem(USER_SESSION_KEY, JSON.stringify(newSession));
  return newSession;
};

const updateUserSession = (updates: Partial<UserSession>): void => {
  const currentSession = getUserSession();
  const updatedSession = { ...currentSession, ...updates };
  localStorage.setItem(USER_SESSION_KEY, JSON.stringify(updatedSession));
};

// API 요청 헬퍼
const apiRequest = async <T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<APIResponse<T>> => {
  try {
    console.log(`🌐 API 요청 시작: ${endpoint}`, options);
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      mode: 'cors', // CORS 모드 명시적 설정
      credentials: 'omit', // 쿠키 없이 요청
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': window.location.origin,
        ...options.headers,
      },
      ...options,
    });

    console.log(`📡 응답 상태: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ HTTP 오류: ${response.status}`, errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const responseData = await response.json();
    console.log(`✅ API 응답 성공:`, responseData);
    return responseData;
  } catch (error) {
    console.error('🚨 API request failed:', error);
    
    // 네트워크 오류인 경우 더 구체적인 메시지
    if (error instanceof TypeError) {
      if (error.message.includes('fetch') || error.message.includes('NetworkError')) {
        return {
          resultType: 'FAIL',
          error: {
            errorCode: 'NETWORK_ERROR',
            reason: '서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.',
            data: error
          },
          success: null
        };
      }
    }
    
    // CORS 관련 오류
    if (error instanceof Error && error.message.includes('CORS')) {
      return {
        resultType: 'FAIL',
        error: {
          errorCode: 'CORS_ERROR',
          reason: 'CORS 정책으로 인해 서버에 접근할 수 없습니다.',
          data: error
        },
        success: null
      };
    }
    
    return {
      resultType: 'FAIL',
      error: {
        errorCode: 'NETWORK_ERROR',
        reason: '서버 연결에 실패했습니다.',
        data: error
      },
      success: null
    };
  }
};

// 방 생성
export const createRoom = async (request: CreateRoomRequest): Promise<{ success: boolean; room?: Room; error?: string }> => {
  try {
    const session = getUserSession();
    
    // 로컬 세션 ID 사용 (서버 세션 초기화 제거)
    const sessionId = session.sessionId;

    const requestData = {
      roomName: request.roomName,
      hostNickname: request.hostNickname,
      maxCapacity: request.maxCapacity || 5,
      roomSettings: request.roomSettings || {
        gameMode: "competitive",
        difficulty: "normal"
      }
    };

    const response = await apiRequest<CreateRoomResponse>('/rooms', {
      method: 'POST',
      body: JSON.stringify(requestData)
    });

    if (response.resultType === 'SUCCESS' && response.success) {
      const roomData = response.success;
      console.log('✅ 방 생성 성공, 세션 정보 업데이트 중:', roomData);
      
      const roomInfo: Room = {
        id: roomData.roomId,
        roomCode: roomData.roomCode,
        roomName: roomData.roomName,
        maxCapacity: roomData.maxCapacity,
        currentCapacity: roomData.currentCapacity,
        roomState: roomData.roomState as Room['roomState'],
        hostGuestId: roomData.hostGuestId,
        createdAt: roomData.createdAt,
        expiresAt: roomData.expiresAt,
        participants: []
      };
      
      // 세션 정보 업데이트 - 서버에서 받은 guestUserId 사용
      updateUserSession({
        guestUserId: roomData.hostGuestId, // 서버에서 받은 guestUserId
        currentRoom: roomInfo
      });
      
      console.log('💾 세션 업데이트 완료:', {
        guestUserId: roomData.hostGuestId, // 서버에서 받은 guestUserId
        roomCode: roomData.roomCode
      });

      return { 
        success: true, 
        room: roomInfo
      };
    } else {
      return { 
        success: false, 
        error: response.error?.reason || '방 생성에 실패했습니다.' 
      };
    }
  } catch (error) {
    console.error('방 생성 오류:', error);
    return { success: false, error: '방 생성 중 오류가 발생했습니다.' };
  }
};

// 방 참여
export const joinRoom = async (request: JoinRoomRequest): Promise<{ success: boolean; room?: Room; error?: string }> => {
  try {
    // 로컬 세션 ID 사용
    const session = getUserSession();
    const sessionId = session.sessionId;

    const requestData = {
      roomCode: request.roomCode,
      nickname: request.nickname
    };

    const response = await apiRequest<JoinRoomResponse>('/rooms/join', {
      method: 'POST',
      body: JSON.stringify(requestData)
    });

    if (response.resultType === 'SUCCESS' && response.success) {
      const joinData = response.success;
      
      // 방 정보 조회
      const roomResponse = await getRoomInfo(request.roomCode);
      if (roomResponse.success && roomResponse.room) {
        // 세션 정보 업데이트 - 서버에서 받은 guestUserId 사용
        updateUserSession({
          guestUserId: joinData.guestUserId, // 서버에서 받은 guestUserId
          currentRoom: roomResponse.room
        });

        return { success: true, room: roomResponse.room };
      } else {
        return { success: false, error: '방 정보 조회에 실패했습니다.' };
      }
    } else {
      return { 
        success: false, 
        error: response.error?.reason || '방 참여에 실패했습니다.' 
      };
    }
  } catch (error) {
    console.error('방 참여 오류:', error);
    return { success: false, error: '방 참여 중 오류가 발생했습니다.' };
  }
};

// 방 정보 조회
export const getRoomInfo = async (roomCode: string): Promise<{ success: boolean; room?: Room; error?: string }> => {
  try {
    console.log('🔍 방 정보 조회 시작:', roomCode);
    const response = await apiRequest<Room>(`/rooms/${roomCode}`);
    console.log('📡 방 정보 조회 응답:', response);

    if (response.resultType === 'SUCCESS' && response.success) {
      console.log('✅ 방 정보 조회 성공:', response.success);
      return { success: true, room: response.success };
    } else {
      console.error('❌ 방 정보 조회 실패:', response.error);
      return { 
        success: false, 
        error: response.error?.reason || '방 정보를 찾을 수 없습니다.' 
      };
    }
  } catch (error) {
    console.error('🚨 방 정보 조회 예외:', error);
    return { success: false, error: '방 정보 조회 중 오류가 발생했습니다.' };
  }
};

// 방 나가기
export const leaveRoom = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const session = getUserSession();
    
    if (!session.guestUserId) {
      console.log('⚠️ guestUserId가 없어서 서버 호출 없이 로컬 정리만 수행');
      // 로컬 세션 정리
      updateUserSession({
        guestUserId: undefined,
        currentRoom: undefined,
        currentPlayer: undefined
      });
      return { success: true };
    }

    console.log('🚪 방 나가기 API 호출:', { guestUserId: session.guestUserId });

    const response = await apiRequest('/rooms/leave', {
      method: 'POST',
      body: JSON.stringify({ guestUserId: session.guestUserId })
    });

    console.log('📡 방 나가기 응답:', response);

    if (response.resultType === 'SUCCESS') {
      // 세션 정보에서 방 정보 제거
      updateUserSession({
        guestUserId: undefined,
        currentRoom: undefined,
        currentPlayer: undefined
      });

      return { success: true };
    } else {
      // 서버 호출 실패해도 로컬 정리는 수행
      updateUserSession({
        guestUserId: undefined,
        currentRoom: undefined,
        currentPlayer: undefined
      });
      
      return { 
        success: false, 
        error: response.error?.reason || '방 나가기에 실패했습니다.' 
      };
    }
  } catch (error) {
    console.error('방 나가기 오류:', error);
    
    // 네트워크 오류여도 로컬 정리는 수행
    updateUserSession({
      guestUserId: undefined,
      currentRoom: undefined,
      currentPlayer: undefined
    });
    
    return { success: false, error: '방 나가기 중 오류가 발생했습니다.' };
  }
};

// 준비 상태 업데이트
export const updatePreparationStatus = async (
  updates: Omit<UpdatePreparationRequest, 'guestUserId'>
): Promise<{ success: boolean; error?: string }> => {
  try {
    const session = getUserSession();
    
    if (!session.guestUserId) {
      return { success: false, error: '사용자 정보를 찾을 수 없습니다.' };
    }

    const response = await apiRequest('/rooms/preparation', {
      method: 'PATCH',
      body: JSON.stringify({
        guestUserId: session.guestUserId,
        ...updates
      })
    });

    if (response.resultType === 'SUCCESS') {
      return { success: true };
    } else {
      return { 
        success: false, 
        error: response.error?.reason || '준비 상태 업데이트에 실패했습니다.' 
      };
    }
  } catch (error) {
    console.error('준비 상태 업데이트 오류:', error);
    return { success: false, error: '준비 상태 업데이트 중 오류가 발생했습니다.' };
  }
};

// 현재 방 조회
export const getCurrentRoom = (): Room | null => {
  const session = getUserSession();
  return session.currentRoom || null;
};

// 현재 플레이어 조회
export const getCurrentPlayer = (): Player | null => {
  const session = getUserSession();
  return session.currentPlayer || null;
};

// 현재 사용자 ID 조회
export const getCurrentUserId = (): string | null => {
  const session = getUserSession();
  return session.guestUserId || null;
};

// 레거시 함수들 (호환성을 위해 유지)
export const findRoomByCode = async (entryCode: string): Promise<Room | null> => {
  const result = await getRoomInfo(entryCode);
  return result.room || null;
};

export const getAllRooms = (): Room[] => {
  // 서버 기반에서는 로컬 조회 불가
  console.warn('getAllRooms는 서버 기반에서 지원되지 않습니다. getRoomInfo를 사용하세요.');
  return [];
};

export const updateRoom = (_roomId: string): Room | null => {
  console.warn('updateRoom는 서버 기반에서 지원되지 않습니다. getRoomInfo를 사용하세요.');
  return null;
};

// 플레이어 정보 업데이트 (준비 상태용)
export const updateCurrentPlayer = async (updates: { 
  characterSetup?: boolean; 
  screenSetup?: boolean; 
}): Promise<{ success: boolean; error?: string }> => {
  return await updatePreparationStatus(updates);
};

// 디버깅용 함수들
export const debugGetAllData = (): { 
  session: UserSession; 
  currentRoom: Room | null; 
  currentPlayer: Player | null 
} => {
  const session = getUserSession();
  return {
    session,
    currentRoom: getCurrentRoom(),
    currentPlayer: getCurrentPlayer()
  };
};

export const debugClearAllData = (): void => {
  localStorage.removeItem(USER_SESSION_KEY);
  sessionStorage.removeItem(SESSION_ID_KEY);
  console.log('🗑️ All session data cleared');
};

export const debugLogRoomData = (): void => {
  const data = debugGetAllData();
  console.log('📊 Current Session Data:');
  console.log('Session:', data.session);
  console.log('Current Room:', data.currentRoom);
  console.log('Current Player:', data.currentPlayer);
}; 