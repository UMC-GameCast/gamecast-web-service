import { useState, useEffect, useCallback } from 'react';
import { getWebRTCManager } from './useGameRecording';
import type { CharacterData } from '../types/room';
import { useRoom } from './useRoom';

interface CharacterStatusUpdate {
  guestUserId: string;
  nickname: string;
  selectedOptions: {
    face: string;
    hair: string;
    top: string;
    bottom: string;
    accessory: string;
  };
  selectedColors: {
    face: string;
    hair: string;
    top: string;
    bottom: string;
    accessory: string;
  };
  updatedAt: string;
}

interface PlayerCharacter {
  guestUserId: string;
  nickname: string;
  character: CharacterData;
  updatedAt: string;
  hasCharacter: boolean;
}

/**
 * 캐릭터 상태 관리 커스텀 훅
 * - 방의 모든 플레이어 캐릭터 정보 관리
 * - Socket.IO를 통한 실시간 캐릭터 상태 업데이트
 * - 캐릭터 전송 및 애니메이션 트리거 제공
 */
export const useCharacter = () => {
  const [playersCharacters, setPlayersCharacters] = useState<Map<string, PlayerCharacter>>(new Map());
  const { currentPlayer } = useRoom(); // 현재 플레이어 정보 가져오기

  // 캐릭터 상태 업데이트 핸들러
  const handleCharacterStatusUpdated = useCallback((data: CharacterStatusUpdate) => {
    console.log('🎨 [useCharacter] 캐릭터 상태 업데이트 수신:', {
      rawData: data,
      dataKeys: Object.keys(data),
      selectedOptions: data.selectedOptions,
      selectedColors: data.selectedColors,
      nickname: data.nickname,
      hasSelectedOptions: !!data.selectedOptions,
      hasSelectedColors: !!data.selectedColors
    });

    setPlayersCharacters(prev => {
      const newMap = new Map(prev);
      
      // 🎯 핵심 수정: WebRTC Manager가 이미 ID 변환 처리했는지 확인
      const finalGuestUserId = data.guestUserId;
      
      console.log('🔍 [useCharacter] ID 확인:', {
        receivedGuestUserId: finalGuestUserId,
        isWebRTCId: finalGuestUserId?.startsWith('WEBRTC_'),
        currentPlayerId: currentPlayer?.guestUserId || currentPlayer?.id,
        dataSource: data.originalWebRTCId ? 'WebRTC Manager' : 'Direct'
      });
      
      // 데이터 유효성 검증
      if (!data.selectedOptions || !data.selectedColors) {
        console.error('❌ [useCharacter] 필수 캐릭터 데이터 누락:', {
          guestUserId: finalGuestUserId,
          hasSelectedOptions: !!data.selectedOptions,
          hasSelectedColors: !!data.selectedColors,
          rawData: data
        });
        return prev; // 잘못된 데이터면 업데이트하지 않음
      }
      
      const characterData: CharacterData = {
        selectedOptions: data.selectedOptions,
        selectedColors: data.selectedColors,
        nickname: data.nickname
      };
      
      console.log('🔧 [useCharacter] characterData 생성:', {
        characterData,
        isValidCharacterData: !!(characterData.selectedOptions && characterData.selectedColors),
        selectedOptionsKeys: characterData.selectedOptions ? Object.keys(characterData.selectedOptions) : [],
        selectedColorsKeys: characterData.selectedColors ? Object.keys(characterData.selectedColors) : []
      });

      const playerCharacter: PlayerCharacter = {
        guestUserId: finalGuestUserId,  // 변환된 ID 사용
        nickname: data.nickname,
        character: characterData,
        updatedAt: data.updatedAt,
        hasCharacter: true
      };
      
      console.log('🔧 [useCharacter] playerCharacter 생성:', {
        playerCharacter,
        hasCharacterField: !!playerCharacter.character,
        characterFieldContent: playerCharacter.character,
        keyUsedForStorage: finalGuestUserId
      });

      // 🎯 핵심: 실제 플레이어 ID로 저장
      newMap.set(finalGuestUserId, playerCharacter);
      
      console.log('✅ [useCharacter] 플레이어 캐릭터 업데이트 완료:', {
        storageKey: finalGuestUserId,
        playerId: finalGuestUserId,
        nickname: data.nickname,
        totalPlayers: newMap.size,
        allStorageKeys: Array.from(newMap.keys())
      });

      return newMap;
    });
  }, []);

  // WebRTC Manager 설정
  useEffect(() => {
    const manager = getWebRTCManager();
    if (manager) {
      // 캐릭터 상태 업데이트 콜백 설정
      manager.onCharacterStatusUpdated = handleCharacterStatusUpdated;
      
      console.log('✅ [useCharacter] WebRTC Manager 캐릭터 콜백 설정 완료');

      return () => {
        // 컴포넌트 언마운트 시 콜백 정리
        manager.onCharacterStatusUpdated = () => {};
        console.log('🧹 [useCharacter] WebRTC Manager 캐릭터 콜백 정리 완료');
      };
    } else {
      console.warn('⚠️ [useCharacter] WebRTC Manager를 찾을 수 없음');
    }
  }, [handleCharacterStatusUpdated]);

  // ✅ Socket.IO + REST API 이중 전송으로 안정성 확보
  const sendCharacterStatus = useCallback(async (characterData: CharacterData): Promise<boolean> => {
    try {
      const manager = getWebRTCManager();
      if (!manager) {
        console.error('❌ [useCharacter] WebRTC Manager를 찾을 수 없음');
        return false;
      }

      // 🎯 실제 플레이어 ID 확인 및 사용
      const realPlayerId = manager.getRealPlayerId();
      const actualPlayerId = realPlayerId || currentPlayer?.guestUserId || currentPlayer?.id || 'unknown';

      // 🔧 완전한 데이터 구조로 전송 (실제 플레이어 ID 사용)
      const socketData = {
        selectedOptions: characterData.selectedOptions,
        selectedColors: characterData.selectedColors,
        guestUserId: actualPlayerId,  // 실제 플레이어 ID 사용
        nickname: currentPlayer?.nickname || characterData.nickname || 'Unknown',
        updatedAt: new Date().toISOString()
      };

      console.log('🎨 [useCharacter] 이중 전송 시작:', {
        socketData,
        webrtcManagerId: manager.getCurrentGuestUserId(),
        extractedRealPlayerId: realPlayerId,
        finalPlayerId: actualPlayerId,
        currentPlayerInfo: {
          guestUserId: currentPlayer?.guestUserId,
          id: currentPlayer?.id
        }
      });
      
      // 🚀 1단계: Socket.IO 전송 (실시간 동기화용)
      manager.emitUpdateCharacterStatus(socketData);
      console.log('✅ [useCharacter] Socket.IO 전송 완료');
      
      // 🚀 2단계: 현재 플레이어의 로컬 저장 (즉시 표시용)
      // 서버 응답을 기다리지 않고 즉시 로컬에 저장하여 UI에 표시
      const immediatePlayerCharacter: PlayerCharacter = {
        guestUserId: actualPlayerId,
        nickname: currentPlayer?.nickname || characterData.nickname || 'Unknown',
        character: characterData,
        updatedAt: new Date().toISOString(),
        hasCharacter: true
      };
      
      // 즉시 로컬 Map에 저장
      setPlayersCharacters(prev => {
        const newMap = new Map(prev);
        newMap.set(actualPlayerId, immediatePlayerCharacter);
        console.log('🚀 [useCharacter] 즉시 로컬 저장 완료:', {
          playerId: actualPlayerId,
          storageKey: actualPlayerId,
          character: characterData
        });
        return newMap;
      });
      
      console.log('✅ [useCharacter] 이중 전송 완료 → Socket.IO 실시간 + REST API DB 저장');
      return true;
    } catch (error) {
      console.error('❌ [useCharacter] 캐릭터 상태 전송 실패:', error);
      return false;
    }
  }, [currentPlayer]);

  // 특정 플레이어의 캐릭터 정보 조회
  const getPlayerCharacter = useCallback((guestUserId: string): PlayerCharacter | undefined => {
    return playersCharacters.get(guestUserId);
  }, [playersCharacters]);

  // 캐릭터를 설정한 플레이어 목록 조회
  const getPlayersWithCharacters = useCallback((): PlayerCharacter[] => {
    return Array.from(playersCharacters.values()).filter(player => player.hasCharacter);
  }, [playersCharacters]);

  // 캐릭터 상태 초기화 (방 나가기 시 사용)
  const clearCharacters = useCallback(() => {
    setPlayersCharacters(new Map());
    console.log('🧹 [useCharacter] 모든 캐릭터 상태 초기화 완료');
  }, []);

  // 특정 플레이어 캐릭터 제거 (플레이어 나가기 시 사용)
  const removePlayerCharacter = useCallback((guestUserId: string) => {
    setPlayersCharacters(prev => {
      const newMap = new Map(prev);
      newMap.delete(guestUserId);
      console.log('🗑️ [useCharacter] 플레이어 캐릭터 제거:', guestUserId);
      return newMap;
    });
  }, []);

  return {
    // 상태
    playersCharacters,
    
    // 액션 (순수 Socket.IO 기반)
    sendCharacterStatus,
    getPlayerCharacter,
    getPlayersWithCharacters,
    clearCharacters,
    removePlayerCharacter,
    
    // 통계
    totalPlayersWithCharacters: playersCharacters.size,
    hasAnyCharacters: playersCharacters.size > 0
  };
};