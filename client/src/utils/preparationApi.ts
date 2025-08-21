/**
 * 준비 상태 API 유틸리티
 * REST API와 Socket.IO를 통한 이중 저장 방식 지원
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://3.37.34.211:8889";

export interface PreparationUpdateData {
  guestUserId: string;
  characterSetup?: boolean;
  screenSetup?: boolean;
  isReady?: boolean;
}

export interface DualPreparationSaveResult {
  overall: 'success' | 'partial' | 'failed';
  restApi: {
    success: boolean;
    error?: string;
  };
  socketIO: {
    success: boolean;
    error?: string;
  };
  message: string;
}

/**
 * REST API를 통한 준비 상태 업데이트
 */
export const updatePreparationAPI = async (
  roomCode: string,
  preparationData: PreparationUpdateData
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 서버가 기대하는 필드명으로 변환
    const serverPayload: any = { roomCode, guestUserId: preparationData.guestUserId };
    
    // 필드명 매핑: 클라이언트 -> 서버
    if (preparationData.characterSetup !== undefined) {
      serverPayload.characterReady = preparationData.characterSetup;
    }
    if (preparationData.screenSetup !== undefined) {
      serverPayload.screenReady = preparationData.screenSetup;
    }
    if (preparationData.isReady !== undefined) {
      serverPayload.finalReady = preparationData.isReady;
    }
    
    const requestPayload = serverPayload;
    
    console.log('📤 [PreparationAPI] REST API 요청 (필드명 매핑):', {
      url: `${API_BASE_URL}/api/rooms/preparation`,
      roomCode,
      originalClientData: preparationData,
      mappedServerPayload: requestPayload,
      fieldMapping: {
        'characterSetup → characterReady': preparationData.characterSetup,
        'screenSetup → screenReady': preparationData.screenSetup,
        'isReady → finalReady': preparationData.isReady
      },
      requestPayloadStringified: JSON.stringify(requestPayload, null, 2)
    });

    const response = await fetch(`${API_BASE_URL}/api/rooms/preparation`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ [PreparationAPI] REST API 실패:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      return {
        success: false,
        error: `서버 오류 (${response.status}): ${errorData}`
      };
    }

    const result = await response.json();
    console.log('✅ [PreparationAPI] REST API 성공:', result);
    
    return { success: true };

  } catch (error) {
    console.error('💥 [PreparationAPI] REST API 예외:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    };
  }
};

/**
 * 이중 저장: REST API + Socket.IO
 */
export const saveDualPreparation = async (
  roomCode: string,
  preparationData: PreparationUpdateData,
  socketUpdateFunction: (updates: any) => void
): Promise<DualPreparationSaveResult> => {
  console.log('🚀 [PreparationAPI] 이중 저장 시작:', {
    roomCode,
    preparationData
  });

  // 1. REST API 호출
  const restResult = await updatePreparationAPI(roomCode, preparationData);
  
  // 2. Socket.IO 업데이트 (항상 실행 - 실시간 동기화)
  let socketResult = { success: true, error: undefined };
  try {
    // characterSetup, screenSetup, isReady 중 전달된 것만 업데이트
    const socketUpdates: any = {};
    if (preparationData.characterSetup !== undefined) {
      socketUpdates.characterSetup = preparationData.characterSetup;
    }
    if (preparationData.screenSetup !== undefined) {
      socketUpdates.screenSetup = preparationData.screenSetup;
    }
    if (preparationData.isReady !== undefined) {
      socketUpdates.isReady = preparationData.isReady;
    }
    
    socketUpdateFunction(socketUpdates);
    console.log('📡 [PreparationAPI] Socket.IO 업데이트 완료:', socketUpdates);
    
  } catch (error) {
    console.error('❌ [PreparationAPI] Socket.IO 실패:', error);
    socketResult = {
      success: false,
      error: error instanceof Error ? error.message : 'Socket.IO 오류'
    };
  }

  // 3. 결과 종합
  let overall: DualPreparationSaveResult['overall'];
  let message: string;

  if (restResult.success && socketResult.success) {
    overall = 'success';
    message = '준비 상태가 성공적으로 업데이트되었습니다.';
  } else if (restResult.success || socketResult.success) {
    overall = 'partial';
    message = '준비 상태가 부분적으로 업데이트되었습니다. 일부 동기화가 실패했을 수 있습니다.';
  } else {
    overall = 'failed';
    message = '준비 상태 업데이트에 실패했습니다.';
  }

  const result: DualPreparationSaveResult = {
    overall,
    restApi: restResult,
    socketIO: socketResult,
    message
  };

  console.log('🏁 [PreparationAPI] 이중 저장 결과:', result);
  return result;
};

/**
 * 유니코드 문자열 정리 (캐릭터 API와 동일)
 */
export const sanitizeUnicodeString = (str: string): string => {
  if (!str) return str;
  return str.replace(/[\uD800-\uDFFF]/g, '');
};