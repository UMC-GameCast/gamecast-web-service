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

  // 캐릭터 상태 업데이트 핸들러 (강화된 필터링)
  const handleCharacterStatusUpdated = useCallback((data: CharacterStatusUpdate) => {
    // ⚡ 1단계: WebRTC Manager 이벤트 필터링 강화
    if (data.nickname && data.nickname.startsWith('WEBRTC_')) {
      console.log('🚫 [useCharacter] WebRTC Manager 이벤트 무시 (WEBRTC_ 접두사):', data.nickname);
      return;
    }
    
    // ⚡ 추가 필터링: WebRTC 관련 guestUserId 패턴
    if (data.guestUserId && typeof data.guestUserId === 'string' && 
        (data.guestUserId.includes('webrtc_') || data.guestUserId.includes('WEBRTC_'))) {
      console.log('🚫 [useCharacter] WebRTC Manager guestUserId 패턴 감지, 이벤트 무시:', data.guestUserId);
      return;
    }
    
    // ⚡ Socket ID 기반 필터링: WebRTC Manager Socket에서 온 이벤트인지 확인
    const manager = getWebRTCManager();
    if (manager?.socket?.id && data.socketId === manager.socket.id) {
      console.log('🚫 [useCharacter] WebRTC Manager Socket에서 발생한 이벤트 무시:', data.socketId);
      return;
    }
    
    // ⚡ 현재 플레이어 본인 이벤트 체크
    const currentUserId = currentPlayer?.guestUserId || currentPlayer?.id;
    if (currentUserId && data.guestUserId === currentUserId) {
      console.log('🔄 [useCharacter] 본인 이벤트 수신 (정상):', {
        guestUserId: data.guestUserId,
        nickname: data.nickname
      });
    }

    console.log('✅ [useCharacter] 유효한 캐릭터 상태 업데이트 수신:', {
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
      
      // 유효한 플레이어 데이터만 처리
      const finalGuestUserId = data.guestUserId;
      
      console.log('🔍 [useCharacter] 캐릭터 데이터 수신:', {
        receivedGuestUserId: finalGuestUserId,
        currentPlayerId: currentPlayer?.guestUserId || currentPlayer?.id,
        nickname: data.nickname
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

      // 플레이어 캐릭터 정보 저장
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

  // 🔄 롤백: WebRTC Manager Socket 이벤트 리스너 설정 (중복 처리 강화)
  useEffect(() => {
    const manager = getWebRTCManager();
    if (manager?.socket) {
      // 중복 처리가 강화된 Socket.IO 이벤트 리스너 등록
      const handleCharacterUpdate = (data: any) => {
        console.log('🎨 [useCharacter] WebRTC Manager Socket character-status-updated 수신:', data);
        
        // 🚫 WEBRTC_ 접두사 닉네임 필터링 (중복 방지)
        if (data.nickname && data.nickname.startsWith('WEBRTC_')) {
          console.log('🚫 [useCharacter] WebRTC Manager 이벤트 무시 (WEBRTC_ 접두사):', data.nickname);
          return;
        }
        
        // 서버에서 보내는 데이터 구조에 맞게 변환
        const convertedData: CharacterStatusUpdate = {
          guestUserId: data.guestUserId || 'unknown',
          nickname: data.nickname || 'Unknown', 
          selectedOptions: data.selectedOptions || {},
          selectedColors: data.selectedColors || {},
          updatedAt: data.updatedAt || new Date().toISOString()
        };
        
        handleCharacterStatusUpdated(convertedData);
      };
      
      manager.socket.on('character-status-updated', handleCharacterUpdate);
      console.log('✅ [useCharacter] WebRTC Manager Socket 이벤트 리스너 설정 완료 (중복 처리 강화)');

      return () => {
        manager.socket?.off('character-status-updated', handleCharacterUpdate);
        console.log('🧹 [useCharacter] WebRTC Manager Socket 이벤트 리스너 정리 완료');
      };
    } else {
      console.warn('⚠️ [useCharacter] WebRTC Manager Socket을 찾을 수 없음');
    }
  }, [handleCharacterStatusUpdated]);

  // 로컬 캐릭터 업데이트 이벤트 수신 (서버가 본인에게 이벤트를 보내지 않는 경우 대응)
  useEffect(() => {
    const handleLocalCharacterUpdate = (event: CustomEvent) => {
      console.log('🏠 [useCharacter] 로컬 캐릭터 업데이트 이벤트 수신:', event.detail);
      
      const convertedData: CharacterStatusUpdate = {
        guestUserId: event.detail.guestUserId || 'unknown',
        nickname: event.detail.nickname || 'Unknown', 
        selectedOptions: event.detail.selectedOptions || {},
        selectedColors: event.detail.selectedColors || {},
        updatedAt: event.detail.updatedAt || new Date().toISOString()
      };
      
      handleCharacterStatusUpdated(convertedData);
    };

    window.addEventListener('character-updated-local', handleLocalCharacterUpdate as EventListener);
    console.log('✅ [useCharacter] 로컬 캐릭터 업데이트 이벤트 리스너 등록');

    return () => {
      window.removeEventListener('character-updated-local', handleLocalCharacterUpdate as EventListener);
      console.log('🧹 [useCharacter] 로컬 캐릭터 업데이트 이벤트 리스너 정리');
    };
  }, [handleCharacterStatusUpdated]);

  // 🔄 롤백: WebRTC Manager Socket을 통한 캐릭터 상태 전송 (중복 방지 강화)
  const sendCharacterStatus = useCallback(async (characterData: CharacterData): Promise<boolean> => {
    console.log('🎨 [useCharacter] WebRTC Manager Socket으로 캐릭터 상태 전송:', characterData);
    
    const manager = getWebRTCManager();
    if (!manager?.socket) {
      console.error('❌ [useCharacter] WebRTC Manager Socket을 찾을 수 없음');
      return false;
    }
    
    if (!manager.socket.connected) {
      console.error('❌ [useCharacter] WebRTC Manager Socket이 연결되지 않음');
      return false;
    }
    
    try {
      // 중복 방지: 실제 사용자 정보로만 전송
      manager.socket.emit('update-character-status', {
        selectedOptions: characterData.selectedOptions,
        selectedColors: characterData.selectedColors
      });
      
      console.log('✅ [useCharacter] WebRTC Manager Socket 캐릭터 전송 성공');
      return true;
    } catch (error) {
      console.error('❌ [useCharacter] WebRTC Manager Socket 캐릭터 전송 실패:', error);
      return false;
    }
  }, []);

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