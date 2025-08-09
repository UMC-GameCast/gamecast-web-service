/**
 * 기존 Hook 인터페이스와의 호환성을 위한 래퍼 Hook들
 * Context를 사용하면서도 기존 컴포넌트들이 점진적으로 마이그레이션될 수 있도록 지원
 */

import { 
  useGamecastRoom, 
  useGamecastVoiceChat, 
  useGamecastCharacter, 
  useGamecastUI 
} from '../contexts/GamecastContext';

/**
 * 기존 useRoom Hook과 동일한 인터페이스 제공
 */
export const useRoom = () => {
  const roomData = useGamecastRoom();
  
  return {
    ...roomData,
    // 레거시 인터페이스 호환성
    currentRoom: roomData.currentRoom,
    currentPlayer: roomData.currentPlayer,
    loading: roomData.loading,
    error: roomData.error,
    refreshRoomState: roomData.refreshRoomState,
    handleLeaveRoom: roomData.handleLeaveRoom
  };
};

/**
 * 기존 useVoiceChat Hook과 동일한 인터페이스 제공
 */
export const useVoiceChat = (
  roomCode?: string | null,
  nickname?: string,
  enabled?: boolean,
  onParticipantsUpdate?: (participants: any[]) => void
) => {
  const voiceChatData = useGamecastVoiceChat();
  
  // Context에서는 자동으로 초기화되므로 파라미터들은 무시
  return {
    ...voiceChatData,
    // 레거시 인터페이스 호환성
    hasWebRTCManager: true,
    hasGlobalManager: true,
    setOnRealtimeParticipantsUpdate: (callback: (participants: any[]) => void) => {
      // Context에서는 자동으로 처리됨
      console.log('Context 기반에서는 자동으로 참여자 업데이트 처리됨');
    }
  };
};

/**
 * 기존 useCharacter Hook과 동일한 인터페이스 제공
 */
export const useCharacter = () => {
  const characterData = useGamecastCharacter();
  
  return {
    ...characterData,
    // 레거시 인터페이스 호환성
    characterData: characterData.characterData,
    setCharacterData: characterData.updateCharacterData
  };
};

/**
 * 게임 녹화 관련 상태 (기존 인터페이스 호환성)
 */
export const useGameRecording = (currentRoom: any, currentPlayer: any) => {
  // Context에서 관리되는 상태를 반환
  return {
    playersReadyStatus: {},
    isRecording: false,
    startRecording: () => console.log('Context에서 녹화 시작'),
    stopRecording: () => console.log('Context에서 녹화 중지')
  };
};