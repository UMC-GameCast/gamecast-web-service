/**
 * 캐릭터 API 관련 유틸리티 함수들
 * REST API + Socket.IO 듀얼 저장 방식 구현
 */

import type { 
  CharacterData, 
  CharacterSetup, 
  PreparationStatusUpdate, 
  ApiResponse, 
  SaveCharacterError 
} from '../types/game';
import { backupCharacter } from './characterBackup';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://3.37.34.211:8889";

/**
 * 문자열에서 유효하지 않은 유니코드 문자 제거
 */
function sanitizeUnicodeString(str: string): string {
  if (!str) return str;
  
  // 유효하지 않은 서로게이트 쌍 제거
  return str.replace(/[\uD800-\uDFFF]/g, '');
}

/**
 * CharacterData를 서버 CharacterSetup 형식으로 변환
 */
export function convertToCharacterSetup(characterData: CharacterData): CharacterSetup {
  // 빈 값이 아닌 필드만 포함하도록 필터링
  const selectedOptions: Record<string, string> = {};
  const selectedColors: Record<string, string> = {};

  // selectedOptions 필터링 (빈 값 제외)
  if (characterData.selectedOptions.face) {
    selectedOptions.face = sanitizeUnicodeString(characterData.selectedOptions.face);
  }
  if (characterData.selectedOptions.hair) {
    selectedOptions.hair = sanitizeUnicodeString(characterData.selectedOptions.hair);
  }
  if (characterData.selectedOptions.top) {
    selectedOptions.top = sanitizeUnicodeString(characterData.selectedOptions.top);
  }
  if (characterData.selectedOptions.bottom) {
    selectedOptions.bottom = sanitizeUnicodeString(characterData.selectedOptions.bottom);
  }
  if (characterData.selectedOptions.accessory) {
    selectedOptions.accessory = sanitizeUnicodeString(characterData.selectedOptions.accessory);
  }

  // selectedColors 필터링 (빈 값 제외)
  if (characterData.selectedColors.face) {
    selectedColors.face = sanitizeUnicodeString(characterData.selectedColors.face);
  }
  if (characterData.selectedColors.hair) {
    selectedColors.hair = sanitizeUnicodeString(characterData.selectedColors.hair);
  }
  if (characterData.selectedColors.top) {
    selectedColors.top = sanitizeUnicodeString(characterData.selectedColors.top);
  }
  if (characterData.selectedColors.bottom) {
    selectedColors.bottom = sanitizeUnicodeString(characterData.selectedColors.bottom);
  }
  if (characterData.selectedColors.accessory) {
    selectedColors.accessory = sanitizeUnicodeString(characterData.selectedColors.accessory);
  }

  return {
    selectedOptions,
    selectedColors
  };
}

/**
 * REST API를 통해 캐릭터 데이터 저장
 */
export async function saveCharacterToAPI(
  guestUserId: string, 
  characterData: CharacterData
): Promise<ApiResponse> {
  const characterSetup = convertToCharacterSetup(characterData);
  
  const requestBody: PreparationStatusUpdate = {
    guestUserId,
    characterSetup
  };

  console.log('📡 [CharacterAPI] REST API로 캐릭터 저장 요청:', {
    url: `${API_BASE_URL}/api/rooms/preparation`,
    guestUserId,
    characterSetup,
    timestamp: new Date().toISOString()
  });

  try {
    // JSON 직렬화 안전성 검사
    let jsonBody: string;
    try {
      jsonBody = JSON.stringify(requestBody);
    } catch (jsonError) {
      console.error('❌ [CharacterAPI] JSON 직렬화 에러:', jsonError);
      throw new Error('캐릭터 데이터에 유효하지 않은 문자가 포함되어 있습니다.');
    }

    const response = await fetch(`${API_BASE_URL}/api/rooms/preparation`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: jsonBody
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = await response.text();
      }
      
      console.error('❌ [CharacterAPI] REST API 에러:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });

      throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    console.log('✅ [CharacterAPI] REST API 저장 성공:', result);

    return {
      success: true,
      data: result,
      message: 'REST API 저장 완료'
    };

  } catch (error) {
    console.error('❌ [CharacterAPI] REST API 저장 실패:', error);
    
    const saveError: SaveCharacterError = {
      type: isNetworkError(error) ? 'network' : 'server',
      message: error instanceof Error ? error.message : 'Unknown error',
      canRetry: true
    };

    return {
      success: false,
      error: saveError.message,
      data: saveError
    };
  }
}

/**
 * 네트워크 오류 여부 판단
 */
function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return error.message.includes('fetch') || error.message.includes('network');
  }
  return false;
}

/**
 * 재시도 로직이 포함된 캐릭터 저장
 */
export async function saveCharacterWithRetry(
  guestUserId: string,
  characterData: CharacterData,
  maxRetries: number = 2
): Promise<ApiResponse> {
  let lastError: ApiResponse | null = null;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    console.log(`🔄 [CharacterAPI] 저장 시도 ${attempt}/${maxRetries + 1}`);
    
    const result = await saveCharacterToAPI(guestUserId, characterData);
    
    if (result.success) {
      return result;
    }
    
    lastError = result;
    const errorData = result.data as SaveCharacterError;
    
    if (!errorData?.canRetry || attempt > maxRetries) {
      break;
    }
    
    // 지수 백오프 (1초, 2초, 4초...)
    const delay = Math.pow(2, attempt - 1) * 1000;
    console.log(`⏳ [CharacterAPI] ${delay}ms 후 재시도...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  return lastError || {
    success: false,
    error: 'All retry attempts failed'
  };
}

/**
 * 듀얼 저장 로직 (REST API + Socket.IO)
 */
export interface DualSaveResult {
  apiResult: ApiResponse;
  socketResult: boolean;
  overall: 'success' | 'partial' | 'failed';
  message: string;
  userMessage: string;  // 사용자에게 표시할 메시지
  canRetry: boolean;    // 재시도 가능 여부
  details?: {           // 상세 정보
    apiError?: string;
    socketError?: string;
    timestamp: string;
  };
}

export async function saveDualCharacter(
  guestUserId: string,
  characterData: CharacterData,
  socketUpdateFn: (data: CharacterData) => void
): Promise<DualSaveResult> {
  const results: DualSaveResult = {
    apiResult: { success: false },
    socketResult: false,
    overall: 'failed',
    message: ''
  };

  // 0. 백업 먼저 수행 (저장 시도 전에)
  console.log('💾 [DualSave] 0단계: 데이터 백업');
  try {
    backupCharacter(guestUserId, characterData, { source: 'auto' });
  } catch (error) {
    console.warn('⚠️ [DualSave] 백업 실패 (계속 진행):', error);
  }

  // 1. REST API로 영구 저장 시도
  console.log('🔄 [DualSave] 1단계: REST API 저장');
  results.apiResult = await saveCharacterWithRetry(guestUserId, characterData);
  
  // 2. Socket.IO로 실시간 업데이트
  console.log('🔄 [DualSave] 2단계: Socket.IO 실시간 업데이트');
  try {
    socketUpdateFn(characterData);
    results.socketResult = true;
    console.log('✅ [DualSave] Socket.IO 업데이트 완료');
  } catch (error) {
    console.error('❌ [DualSave] Socket.IO 업데이트 실패:', error);
    results.socketResult = false;
  }

  // 3. 전체 결과 판단 및 사용자 친화적 메시지 생성
  const timestamp = new Date().toISOString();
  
  if (results.apiResult.success && results.socketResult) {
    results.overall = 'success';
    results.message = '데이터베이스 저장 및 실시간 업데이트 모두 성공';
    results.userMessage = '캐릭터 설정이 완료되었습니다!';
    results.canRetry = false;
  } else if (results.socketResult) {
    results.overall = 'partial';
    results.message = '실시간 업데이트는 성공했지만 데이터베이스 저장 실패';
    results.userMessage = '캐릭터가 임시로 저장되었습니다. 완전한 저장을 위해 다시 한 번 시도해주세요.';
    results.canRetry = true;
    results.details = {
      apiError: results.apiResult.error || 'API 저장 실패',
      timestamp
    };
  } else if (results.apiResult.success) {
    results.overall = 'partial';
    results.message = '데이터베이스 저장은 성공했지만 실시간 업데이트 실패';
    results.userMessage = '캐릭터가 저장되었습니다. 다른 플레이어에게 보이지 않을 수 있습니다.';
    results.canRetry = false;
    results.details = {
      socketError: '실시간 업데이트 실패',
      timestamp
    };
  } else {
    results.overall = 'failed';
    results.message = '저장 중 오류가 발생했습니다';
    const isNetworkError = results.apiResult.data && 
      (results.apiResult.data as SaveCharacterError).type === 'network';
    
    if (isNetworkError) {
      results.userMessage = '네트워크 연결을 확인하고 다시 시도해주세요.';
      results.canRetry = true;
    } else {
      results.userMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      results.canRetry = true;
    }
    
    results.details = {
      apiError: results.apiResult.error || 'API 저장 실패',
      socketError: '실시간 업데이트 실패',
      timestamp
    };
  }

  console.log('📊 [DualSave] 최종 결과:', results);
  return results;
}