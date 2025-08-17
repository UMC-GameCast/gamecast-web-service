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
import { API_BASE_URL } from '../config/server.config';
const SESSION_ID_KEY = 'gamecast_session_id';
const USER_SESSION_KEY = 'gamecast_user_session';

// 서버 연결 테스트 함수
export const testServerConnection = async (): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('🔍 서버 연결 테스트 중...');
    const response = await fetch(`${API_BASE_URL}/health`, {
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

// 🔧 강화된 세션 ID 관리: 새로고침 후에도 유지
const getSessionId = (): string => {
  // 1. 먼저 localStorage에서 확인 (새로고침 후에도 유지)
  let sessionId = localStorage.getItem(SESSION_ID_KEY);
  
  if (!sessionId) {
    // 2. sessionStorage에서 확인 (브라우저 세션 동안만 유지)
    sessionId = sessionStorage.getItem(SESSION_ID_KEY);
  }
  
  if (!sessionId) {
    // 3. 둘 다 없으면 새로 생성
    sessionId = 'session_' + Math.random().toString(36).substring(2, 15) + Date.now();
    
    // 4. 새로고침 후에도 유지되도록 localStorage에 저장
    localStorage.setItem(SESSION_ID_KEY, sessionId);
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
    
    console.log('🆕 새로운 세션 ID 생성:', sessionId);
  } else {
    console.log('✅ 기존 세션 ID 사용:', sessionId);
    
    // localStorage와 sessionStorage 동기화
    localStorage.setItem(SESSION_ID_KEY, sessionId);
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  
  return sessionId;
};

// 🔧 강화된 사용자 세션 관리: guestUserId 영속성 보장
const getUserSession = (): UserSession => {
  const sessionData = localStorage.getItem(USER_SESSION_KEY);
  if (sessionData) {
    try {
      const session = JSON.parse(sessionData);
      
      // 기존 세션이 있으면 세션 ID 동기화
      if (session.sessionId) {
        localStorage.setItem(SESSION_ID_KEY, session.sessionId);
        sessionStorage.setItem(SESSION_ID_KEY, session.sessionId);
      }
      
      console.log('✅ [getUserSession] 기존 세션 복구:', {
        sessionId: session.sessionId,
        guestUserId: session.guestUserId,
        hasCurrentRoom: !!session.currentRoom
      });
      
      return session;
    } catch (error) {
      console.error('❌ [getUserSession] 세션 데이터 파싱 오류:', error);
      // 파싱 오류 시 새 세션 생성
    }
  }
  
  const newSession: UserSession = {
    sessionId: getSessionId()
  };
  localStorage.setItem(USER_SESSION_KEY, JSON.stringify(newSession));
  
  console.log('🆕 [getUserSession] 새로운 세션 생성:', newSession);
  
  return newSession;
};

const updateUserSession = (updates: Partial<UserSession>): void => {
  console.log('🔧 [updateUserSession] 시작:', { updates });
  
  const currentSession = getUserSession();
  console.log('📋 [updateUserSession] 현재 세션:', currentSession);
  
  const updatedSession = { ...currentSession, ...updates };
  console.log('🔄 [updateUserSession] 업데이트된 세션:', updatedSession);
  
  const serializedSession = JSON.stringify(updatedSession);
  localStorage.setItem(USER_SESSION_KEY, serializedSession);
  
  // 저장 후 즉시 검증
  const savedData = localStorage.getItem(USER_SESSION_KEY);
  const parsedData = savedData ? JSON.parse(savedData) : null;
  
  console.log('💾 [updateUserSession] 저장 검증:', {
    stored: !!savedData,
    hasCurrentRoom: !!(parsedData?.currentRoom),
    hasGuestUserId: !!(parsedData?.guestUserId),
    roomCode: parsedData?.currentRoom?.roomCode
  });
};

// 완전한 세션 초기화 함수
const clearUserSession = (): void => {
  console.log('🧹 [clearUserSession] 세션 완전 초기화 수행');
  localStorage.removeItem(SESSION_ID_KEY);
  localStorage.removeItem(USER_SESSION_KEY);
  sessionStorage.removeItem(SESSION_ID_KEY);
  sessionStorage.removeItem(USER_SESSION_KEY);
};

// API 요청 헬퍼
const apiRequest = async <T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<APIResponse<T>> => {
  try {
    console.log(`🌐 API 요청 시작: ${endpoint}`, options);
    
    const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
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
export const createRoom = async (request: CreateRoomRequest): Promise<{ resultType: 'SUCCESS' | 'ERROR'; success?: any; error?: string }> => {
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
      console.log('✅ [createRoom] 서버 방 생성 성공:', {
        roomId: roomData.roomId,
        roomCode: roomData.roomCode,
        roomName: roomData.roomName,
        hostGuestId: roomData.hostGuestId,
        capacity: `${roomData.currentCapacity}/${roomData.maxCapacity}`
      });

      // 방 생성 후 추가 방 정보 조회 (방 참여와 동일한 패턴)
      const roomResponse = await getRoomInfo(roomData.roomCode);
      if (roomResponse.success && roomResponse.room) {
        console.log('📋 [createRoom] 방 정보 조회 성공:', {
          roomName: roomResponse.room.roomName,
          participants: roomResponse.room.participants?.length || 0,
          capacity: `${roomResponse.room.currentCapacity}/${roomResponse.room.maxCapacity}`,
          hostInfo: roomResponse.room.participants?.find(p => p.role === 'host')?.nickname
        });

        // 세션 정보 업데이트 전/후 상태 확인
        const beforeSession = getUserSession();
        console.log('📋 [createRoom] 세션 업데이트 전:', {
          hasGuestUserId: !!beforeSession.guestUserId,
          hasCurrentRoom: !!beforeSession.currentRoom
        });

        updateUserSession({
          guestUserId: roomData.hostGuestId,
          currentRoom: roomResponse.room
        });

        const afterSession = getUserSession();
        console.log('💾 [createRoom] 세션 업데이트 후:', {
          guestUserId: afterSession.guestUserId,
          roomCode: afterSession.currentRoom?.roomCode,
          participantsCount: afterSession.currentRoom?.participants?.length || 0
        });

        return { 
          resultType: 'SUCCESS',
          success: roomResponse.room, // 추가 조회된 완전한 방 정보 반환
          error: null
        };
      } else {
        console.error('❌ [createRoom] 방 정보 조회 실패:', roomResponse.error);
        
        // 방 정보 조회 실패 시에도 기본 Room 객체는 생성
        const basicRoomInfo: Room = {
          id: roomData.roomId,
          roomCode: roomData.roomCode,
          roomName: roomData.roomName,
          maxCapacity: roomData.maxCapacity,
          currentCapacity: roomData.currentCapacity,
          roomState: roomData.roomState as Room['roomState'],
          hostGuestId: roomData.hostGuestId,
          createdAt: roomData.createdAt,
          expiresAt: roomData.expiresAt,
          participants: [] // 빈 배열로 시작
        };

        console.log('⚠️ [createRoom] 기본 방 정보로 fallback:', basicRoomInfo);
        
        updateUserSession({
          guestUserId: roomData.hostGuestId,
          currentRoom: basicRoomInfo
        });

        return { 
          resultType: 'SUCCESS',
          success: basicRoomInfo,
          error: null
        };
      }
    } else {
      console.error('❌ [createRoom] 서버 방 생성 실패:', response.error);
      return { 
        resultType: 'ERROR',
        success: null,
        error: response.error?.reason || '방 생성에 실패했습니다.' 
      };
    }
  } catch (error) {
    console.error('방 생성 오류:', error);
    return { 
      resultType: 'ERROR',
      success: null,
      error: '방 생성 중 오류가 발생했습니다.' 
    };
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
      console.log('✅ [joinRoom] 서버 방 참여 성공:', {
        guestUserId: joinData.guestUserId,
        nickname: joinData.nickname,
        role: joinData.role,
        roomCode: request.roomCode
      });
      
      // 방 정보 조회
      const roomResponse = await getRoomInfo(request.roomCode);
      if (roomResponse.success && roomResponse.room) {
        console.log('📋 [joinRoom] 방 정보 조회 성공:', {
          roomName: roomResponse.room.roomName,
          participants: roomResponse.room.participants?.length || 0,
          capacity: `${roomResponse.room.currentCapacity}/${roomResponse.room.maxCapacity}`
        });

        // 세션 정보 업데이트 전/후 상태 확인
        const beforeSession = getUserSession();
        console.log('📋 [joinRoom] 세션 업데이트 전:', {
          hasGuestUserId: !!beforeSession.guestUserId,
          hasCurrentRoom: !!beforeSession.currentRoom
        });

        updateUserSession({
          guestUserId: joinData.guestUserId,
          currentRoom: roomResponse.room
        });

        const afterSession = getUserSession();
        console.log('💾 [joinRoom] 세션 업데이트 후:', {
          guestUserId: afterSession.guestUserId,
          roomCode: afterSession.currentRoom?.roomCode,
          participantsCount: afterSession.currentRoom?.participants?.length || 0
        });

        return { success: true, room: roomResponse.room };
      } else {
        console.error('❌ [joinRoom] 방 정보 조회 실패:', roomResponse.error);
        return { success: false, error: roomResponse.error || '방 정보 조회에 실패했습니다.' };
      }
    } else {
      console.error('❌ [joinRoom] 서버 방 참여 실패:', response.error);
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
      // 완전한 세션 초기화
      clearUserSession();
      return { success: true };
    }

    console.log('🚪 방 나가기 API 호출:', { guestUserId: session.guestUserId });

    const response = await apiRequest('/rooms/leave', {
      method: 'POST',
      body: JSON.stringify({ guestUserId: session.guestUserId })
    });

    console.log('📡 방 나가기 응답:', response);

    if (response.resultType === 'SUCCESS' && response.success) {
      console.log('✅ 서버 방 나가기 성공:', response.success);
    } else {
      console.warn('⚠️ 서버 방 나가기 응답 확인 필요:', response.error);
    }

    // API 호출 성공 여부와 관계없이 로컬 세션 완전 초기화
    clearUserSession();
    
    return { 
      success: true, 
      message: response.success?.message || '방을 나갔습니다.' 
    };
  } catch (error) {
    console.error('방 나가기 오류:', error);
    
    // 네트워크 오류여도 로컬 정리는 수행
    clearUserSession();
    
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
  
  console.log('🔍 [getCurrentRoom] 세션 확인:', {
    hasSession: !!session,
    hasCurrentRoom: !!session.currentRoom,
    roomCode: session.currentRoom?.roomCode,
    sessionKeys: Object.keys(session)
  });
  
  const result = session.currentRoom || null;
  console.log('📤 [getCurrentRoom] 반환값:', { hasRoom: !!result, roomCode: result?.roomCode });
  
  return result;
};

// 현재 플레이어 조회
export const getCurrentPlayer = (): Player | null => {
  const session = getUserSession();
  return session.currentPlayer || null;
};

// 🔧 강화된 현재 사용자 ID 조회: 영속성 보장
export const getCurrentUserId = (): string | null => {
  const session = getUserSession();
  
  console.log('🔍 [getCurrentUserId] Session debug:', {
    hasSession: !!session,
    sessionKeys: Object.keys(session),
    guestUserId: session.guestUserId,
    currentRoom: !!session.currentRoom,
    currentPlayer: !!session.currentPlayer
  });
  
  // guestUserId가 있으면 반환
  if (session.guestUserId) {
    console.log('✅ [getCurrentUserId] 기존 guestUserId 사용:', session.guestUserId);
    return session.guestUserId;
  }
  
  // guestUserId가 없으면 sessionId 기반으로 생성할 수도 있지만
  // 현재는 서버에서 할당받은 guestUserId만 사용
  console.log('⚠️ [getCurrentUserId] guestUserId 없음, 새로 할당 필요', {
    sessionData: session,
    localStorage: localStorage.getItem('gamecast_user_session')
  });
  return null;
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
  console.log('🧹 [debugClearAllData] 모든 세션 데이터 완전 초기화 시작');
  
  // localStorage 모든 관련 데이터 제거
  localStorage.removeItem(SESSION_ID_KEY);
  localStorage.removeItem(USER_SESSION_KEY);
  
  // sessionStorage 모든 관련 데이터 제거
  sessionStorage.removeItem(SESSION_ID_KEY);
  sessionStorage.removeItem(USER_SESSION_KEY);
  
  console.log('✅ [debugClearAllData] 모든 세션 데이터 완전 초기화 완료');
};

export const debugLogRoomData = (): void => {
  const data = debugGetAllData();
  console.log('📊 Current Session Data:');
  console.log('Session:', data.session);
  console.log('Current Room:', data.currentRoom);
  console.log('Current Player:', data.currentPlayer);
};

// 🔧 새로운 디버깅 함수: 영속성 상태 확인
export const debugPersistentSession = (): {
  localStorage: any;
  sessionStorage: any;
  currentSession: any;
  sessionIdMatch: boolean;
} => {
  const localStorageSession = localStorage.getItem(USER_SESSION_KEY);
  const sessionStorageSessionId = sessionStorage.getItem(SESSION_ID_KEY);
  const localStorageSessionId = localStorage.getItem(SESSION_ID_KEY);
  const currentSession = getUserSession();
  
  const result = {
    localStorage: {
      userSession: localStorageSession ? JSON.parse(localStorageSession) : null,
      sessionId: localStorageSessionId
    },
    sessionStorage: {
      sessionId: sessionStorageSessionId
    },
    currentSession: currentSession,
    sessionIdMatch: localStorageSessionId === sessionStorageSessionId
  };
  
  console.log('🔍 [debugPersistentSession] 영속성 상태:', result);
  return result;
}; 