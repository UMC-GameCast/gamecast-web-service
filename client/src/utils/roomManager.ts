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
      let errorData;
      try {
        const errorText = await response.text();
        errorData = JSON.parse(errorText);
        console.error(`❌ HTTP 오류: ${response.status}`, errorData);
      } catch (parseError) {
        console.error(`❌ HTTP 오류 (JSON 파싱 실패): ${response.status}`, parseError);
        errorData = { message: `HTTP ${response.status} 오류` };
      }
      
      // 서버에서 보낸 구조화된 에러 응답 처리
      if (errorData.resultType === 'FAIL' && errorData.error) {
        return {
          resultType: 'FAIL',
          error: errorData.error,
          success: null
        };
      }
      
      // 일반적인 HTTP 에러 처리
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    console.log(`✅ API 응답 성공:`, responseData);
    return responseData;
  } catch (error) {
    console.error('🚨 API request failed:', error);
    
    // 에러 메시지에서 더 구체적인 정보 추출
    let errorReason = '서버 연결에 실패했습니다.';
    let errorCode = 'NETWORK_ERROR';
    
    if (error instanceof TypeError) {
      if (error.message.includes('fetch') || error.message.includes('NetworkError')) {
        errorReason = '서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.';
        errorCode = 'NETWORK_ERROR';
      }
    } else if (error instanceof Error) {
      if (error.message.includes('CORS')) {
        errorReason = 'CORS 정책으로 인해 서버에 접근할 수 없습니다.';
        errorCode = 'CORS_ERROR';
      } else if (error.message.includes('HTTP 409')) {
        errorReason = '방 인원이 가득 찼습니다.';
        errorCode = 'CONFLICT';
      } else if (error.message.includes('HTTP 404')) {
        errorReason = '존재하지 않는 방입니다.';
        errorCode = 'NOT_FOUND';
      } else if (error.message.includes('HTTP 400')) {
        errorReason = '잘못된 요청입니다.';
        errorCode = 'BAD_REQUEST';
      } else if (error.message) {
        // 에러 메시지에 의미있는 정보가 있으면 사용
        errorReason = error.message;
      }
    }
    
    return {
      resultType: 'FAIL',
      error: {
        errorCode: errorCode,
        reason: errorReason,
        data: error
      },
      success: null
    };
  }
};

// 방 생성
export const createRoom = async (request: CreateRoomRequest): Promise<{ success: boolean; room?: Room; error?: string }> => {
  try {
    // const session = getUserSession(); // createRoom에서는 세션 불필요
    
    // 로컬 세션 ID 사용 (서버 세션 초기화 제거)
    // const sessionId = session.sessionId; // 향후 세션 기반 인증시 사용

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
      
      // 세션 정보 업데이트
      updateUserSession({
        guestUserId: roomData.hostGuestId,
        currentRoom: roomInfo
      });
      
      console.log('💾 세션 업데이트 완료:', {
        guestUserId: roomData.hostGuestId,
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
    // const session = getUserSession(); // joinRoom에서는 세션 불필요
    // const sessionId = session.sessionId; // 향후 세션 기반 인증용

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
        // 세션 정보 업데이트
        updateUserSession({
          guestUserId: joinData.guestUserId,
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
    
    // 에러 타입에 따른 구체적인 메시지 반환
    if (error instanceof Error) {
      if (error.message.includes('NETWORK_ERROR')) {
        return { success: false, error: '네트워크 연결을 확인해주세요.' };
      } else if (error.message.includes('CORS')) {
        return { success: false, error: '서버 접근 권한 오류가 발생했습니다.' };
      } else if (error.message.includes('HTTP 409')) {
        return { success: false, error: '방 인원이 가득 찼습니다.' };
      } else if (error.message.includes('HTTP 404')) {
        return { success: false, error: '존재하지 않는 방입니다.' };
      } else {
        return { success: false, error: error.message || '방 참여 중 오류가 발생했습니다.' };
      }
    }
    
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
    
    console.log('🎯 [updatePreparationStatus] 세션 정보 확인:', {
      session,
      localStorage: localStorage.getItem('gamecast_user_session'),
      updates
    });
    
    if (!session.guestUserId) {
      console.error('❌ [updatePreparationStatus] guestUserId가 없음:', {
        session,
        sessionKeys: Object.keys(session),
        localStorageRaw: localStorage.getItem('gamecast_user_session')
      });
      return { success: false, error: '사용자 정보를 찾을 수 없습니다. 페이지를 새로고침해주세요.' };
    }

    // 서버 API 형식에 맞게 요청 데이터 구성
    const requestBody: any = {
      guestUserId: session.guestUserId  // camelCase로 변경
    };

    // characterSetup이 객체인 경우 (실제 캐릭터 데이터)
    if (typeof updates.characterSetup === 'object' && updates.characterSetup !== null) {
      requestBody.characterSetup = updates.characterSetup;
    } else if (updates.characterSetup !== undefined) {
      // boolean 값인 경우 빈 객체로 전송 (서버가 객체를 기대함)
      requestBody.characterSetup = {};
    }
    
    if (updates.screenSetup !== undefined) {
      requestBody.screenSetup = updates.screenSetup;
    }

    console.log('🎯 [updatePreparationStatus] 최종 요청 데이터:', requestBody);

    const response = await apiRequest('/rooms/preparation', {
      method: 'PATCH',
      body: JSON.stringify(requestBody)
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
  characterSetup?: boolean | any; 
  screenSetup?: boolean; 
}): Promise<{ success: boolean; error?: string }> => {
  // 준비 상태 업데이트
  const result = await updatePreparationStatus(updates);
  
  // 성공한 경우 로컬 세션의 currentPlayer도 업데이트
  if (result.success) {
    const session = getUserSession();
    if (session.currentPlayer) {
      session.currentPlayer = {
        ...session.currentPlayer,
        preparationStatus: {
          ...session.currentPlayer.preparationStatus,
          characterSetup: typeof updates.characterSetup === 'boolean' ? updates.characterSetup : true,
          screenSetup: updates.screenSetup ?? session.currentPlayer.preparationStatus?.screenSetup ?? false
        }
      };
      updateUserSession({ currentPlayer: session.currentPlayer });
    }
  }
  
  return result;
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