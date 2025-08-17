// 🗑️ Socket.IO 기반 캐릭터 시스템 제거됨 - 단순한 방식으로 리팩토링 완료
// 이제 방 정보의 participants.characterInfo.isCustomized만 사용

interface PlayerCharacter {
  guestUserId: string;
  nickname: string;
  character: Record<string, unknown>;
  updatedAt: string;
  hasCharacter: boolean;
}

/**
 * ✨ 단순화된 useCharacter 훅
 * Socket.IO 기반 캐릭터 시스템이 제거되어 빈 구현으로 대체
 * 방 정보의 participants.characterInfo.isCustomized를 직접 사용하도록 변경됨
 */
export const useCharacter = () => {
  // ✨ 빈 Map 반환 - 더 이상 Socket.IO 기반 캐릭터 데이터 관리하지 않음
  const playersCharacters = new Map<string, PlayerCharacter>();
  
  // ✨ 빈 함수들 - 호환성을 위해 유지하지만 실제 기능 없음
  const sendCharacterStatus = async (): Promise<boolean> => {
    console.log('✨ [useCharacter] 단순화됨: Socket.IO 캐릭터 전송 기능 제거됨');
    return false;
  };
  
  const getPlayerCharacter = (): PlayerCharacter | undefined => {
    return undefined;
  };
  
  const getPlayersWithCharacters = (): PlayerCharacter[] => {
    return [];
  };
  
  const clearCharacters = () => {
    // 빈 함수
  };
  
  const removePlayerCharacter = () => {
    // 빈 함수
  };

  return {
    // 상태 - 빈 Map
    playersCharacters,
    
    // 액션 - 빈 구현들
    sendCharacterStatus,
    getPlayerCharacter,
    getPlayersWithCharacters,
    clearCharacters,
    removePlayerCharacter,
    
    // 통계 - 항상 0
    totalPlayersWithCharacters: 0,
    hasAnyCharacters: false
  };
};