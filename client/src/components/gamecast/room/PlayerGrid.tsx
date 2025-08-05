import React, { useEffect } from "react";
import type { Player, Room } from "../../../types/room";
import { PlayerCard } from "./PlayerCard";
import CardBlock from "../../../assets/gamecast/Room/Card_block.svg?react";
import CardEmpty from "../../../assets/gamecast/Room/Card_empty.svg?react";

interface PlayerGridProps {
  currentRoom: Room;
  currentPlayer: Player;
  realtimeParticipants?: Player[];
  remoteStreams?: Map<string, MediaStream>;
  voiceChatConnected?: boolean;
  playersCharacters?: Map<string, any>;
  playersReadyStatus?: Array<{
    playerId: string;
    playerName: string;
    characterSetup: boolean;
    screenSetup: boolean;
    isReady: boolean;
  }>;
}

export const PlayerGrid: React.FC<PlayerGridProps> = ({
  currentRoom,
  currentPlayer,
  realtimeParticipants = [],
  remoteStreams = new Map(),
  voiceChatConnected = false,
  playersCharacters,
  playersReadyStatus = [],
}) => {
  // 캐릭터 데이터 조회 함수 (RoomPage에서 전달된 props 사용)
  const getPlayerCharacter = (guestUserId: string) => {
    if (!playersCharacters) return undefined;
    return playersCharacters.get(guestUserId);
  };
  
  // 디버깅 정보 (소수만 로깅)
  if (import.meta.env.DEV && Math.random() < 0.01) {
    console.log('🎮 [PlayerGrid] 캐릭터 데이터 상태:', {
      propsPlayersCharacters: playersCharacters?.size || 0,
      timestamp: Date.now()
    });
  }

  // playersCharacters 변경 시 리렌더링 트리거
  useEffect(() => {
    if (import.meta.env.DEV && Math.random() < 0.01) {
      console.log('🔄 [PlayerGrid] playersCharacters 변경 감지');
    }
  }, [playersCharacters]);
    
  // 무한 렌더링 방지를 위해 디버깅 로그 제거
  // 서버 우선순위: Socket.IO 실시간 데이터가 절대 우선, REST API는 폴백만
  const participants = realtimeParticipants.length > 0 ? realtimeParticipants : (currentRoom?.participants || []);
  const isUsingServerData = realtimeParticipants.length > 0;
  
  // 개발 모드에서만 로깅
  if (import.meta.env.DEV) {
    console.log('PlayerGrid:', {
      source: isUsingServerData ? 'Server (Socket.IO)' : 'REST API (fallback)',
      count: participants.length
    });
  }
  
  // 서버 데이터 구조 우선 (최소 변환)
  const convertedParticipants = participants.map(p => ({
    ...p,
    guestUserId: p.guestUserId || p.id, // 서버가 제공하는 guestUserId 우선 사용
    preparationStatus: p.preparationStatus || {
      characterSetup: false,
      screenSetup: false
    },
    isHost: p.role === 'host'
  }));
  
  // WebRTC 백그라운드 참여자 필터링 함수
  const isWebRTCBackgroundParticipant = (participant: Player) => {
    const nickname = participant.nickname || '';
    return nickname.startsWith('WEBRTC_');
  };

  // 중복 제거 및 필터링이 강화된 참가자 목록
  const otherPlayers = (() => {
    // 1. 기본 필터링: 현재 플레이어와 WebRTC 백그라운드 참여자 제외
    let filtered = convertedParticipants.filter((p) => {
      const isDifferentPlayer = p.id !== currentPlayer.id && p.guestUserId !== currentPlayer.guestUserId;
      const isNotWebRTCBackground = !isWebRTCBackgroundParticipant(p);
      
      return isDifferentPlayer && isNotWebRTCBackground;
    });
    
    // 2. 중복 제거: ID 또는 guestUserId가 같은 참가자 제거
    const seenIds = new Set<string>();
    filtered = filtered.filter((p) => {
      const primaryId = p.guestUserId || p.id;
      if (seenIds.has(primaryId)) {
        console.log(`🔄 [PlayerGrid] 중복 참가자 제거:`, {
          participantId: p.id,
          guestUserId: p.guestUserId,
          nickname: p.nickname,
          duplicateOf: primaryId
        });
        return false;
      }
      seenIds.add(primaryId);
      return true;
    });
    
    // 3. 최종 로깅
    console.log(`🎮 [PlayerGrid] 최종 필터링 결과:`, {
      totalParticipants: convertedParticipants.length,
      filteredCount: filtered.length,
      participants: filtered.map(p => ({
        id: p.id,
        guestUserId: p.guestUserId,
        nickname: p.nickname,
        role: p.role
      }))
    });
    
    return filtered;
  })();
  const totalSlots = 4;
  const joinableSlots = (currentRoom?.maxCapacity || 5) - 1;

  return (
    <div className="w-full h-[628px] justify-end items-start gap-[55.98px] inline-flex flex-wrap content-start">
      {Array.from({ length: totalSlots }).map((_, index) => {
        const player = otherPlayers[index];
        const isBlocked = index >= joinableSlots;

        if (isBlocked) {
          return <CardBlock key={`block-${index}`} className="w-[230px] h-[288px]" />;
        }

        if (player) {
          // 플레이어의 음성 스트림 찾기 - 간단한 방법: 첫 번째 원격 스트림 사용
          let playerStream = null;
          
          // 원격 스트림이 1개뿐이라면 그것을 사용 (2명만 있는 경우)
          if (remoteStreams.size === 1) {
            const [firstStreamKey, firstStream] = Array.from(remoteStreams.entries())[0];
            playerStream = firstStream;
            console.log(`🎯 [PlayerGrid] Using single remote stream for ${player.nickname}:`, {
              streamKey: firstStreamKey,
              streamId: firstStream.id
            });
          } else if (remoteStreams.size > 1) {
            // 여러 스트림이 있는 경우 기존 매칭 로직 사용
            playerStream = remoteStreams.get(player.id) || remoteStreams.get(player.guestUserId || '');
            
            // 닉네임 기반 매칭도 시도
            if (!playerStream) {
              for (const [, ] of remoteStreams.entries()) {
                const remoteStreamKeys = Array.from(remoteStreams.keys());
                const matchingKey = remoteStreamKeys.find(key => 
                  key.includes('WEBRTC_') && key.includes(player.nickname)
                );
                if (matchingKey) {
                  playerStream = remoteStreams.get(matchingKey);
                  break;
                }
              }
            }
          }
          
          // 방장 여부 판단 로직 개선 (중복 방지)
          const isPlayerHost = player.role === 'host' || player.id === currentRoom.hostGuestId;
          
          // Stream matching 로그 제거 (무한 로그 방지)
          
          // 플레이어의 캐릭터 정보 조회: 서버 데이터 우선, 메모리 맵 폴백
          const playerId = player.guestUserId || player.id;
          const memoryCharacter = getPlayerCharacter(playerId);
          
          // 더 안전한 캐릭터 존재 확인
          const hasValidServerCharacter = player.characterInfo?.isCustomized && 
            player.characterInfo.selectedOptions && 
            player.characterInfo.selectedColors;
            
          const hasValidMemoryCharacter = memoryCharacter?.character && 
            memoryCharacter.character.selectedOptions && 
            memoryCharacter.character.selectedColors;
            
          const hasValidLegacyCharacter = player.character && 
            player.character.selectedOptions && 
            player.character.selectedColors;
          
          const hasCharacter = !!(
            hasValidServerCharacter ||
            hasValidMemoryCharacter ||
            hasValidLegacyCharacter
          );
          
          // 디버깅: 캐릭터 데이터 상태 (소수만 로깅)
          if (import.meta.env.DEV && !hasCharacter && Math.random() < 0.05) {
            console.log('⚠️ [PlayerGrid] 캐릭터 데이터 없음:', {
              playerId,
              nickname: player.nickname,
              hasValidServerCharacter,
              hasValidMemoryCharacter,
              hasValidLegacyCharacter,
              memoryCharacterExists: !!memoryCharacter,
              serverCharacterInfoExists: !!player.characterInfo
            });
          }
          
          // 🎯 표준화된 캐릭터 데이터 우선순위: Socket.IO 실시간 > 서버 characterInfo > 레거시 character
          const realtimeCharacterData = memoryCharacter?.character || null; // RoomPage에서 전달된 실시간 데이터
          const serverCharacterData = (player.characterInfo?.isCustomized && player.characterInfo.selectedOptions && player.characterInfo.selectedColors)
            ? {
                selectedOptions: player.characterInfo.selectedOptions,
                selectedColors: player.characterInfo.selectedColors,
                nickname: player.nickname
              } 
            : null;
          const legacyCharacterData = player.character || null;
          
          // 안전한 데이터 선택 (null 체크 강화)
          const characterData = realtimeCharacterData || serverCharacterData || legacyCharacterData;
          
          // 🎯 해당 플레이어의 preparation status 조회
          const playerPreparationStatus = playersReadyStatus.find(
            ps => ps.playerId === (player.guestUserId || player.id)
          );
          
                  // Preparation status 매칭 로그 제거 (무한 로그 방지)
          
          return (
            <PlayerCard
              key={player.id}
              player={player}
              isHost={isPlayerHost}
              stream={playerStream}
              isLocalPlayer={false}
              voiceChatConnected={voiceChatConnected}
              character={characterData}
              hasCharacter={hasCharacter}
              preparationStatus={playerPreparationStatus}
            />
          );
        }

        return <CardEmpty key={`empty-${index}`} className="w-[230px] h-[288px]" />;
      })}
    </div>
  );
}; 