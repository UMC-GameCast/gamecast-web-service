import React from "react";
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
  playersReadyStatus = [],
}) => {
  
  // ✨ 단순화된 디버깅 (필요시만)
  if (import.meta.env.DEV && Math.random() < 0.01) {
    console.log('✨ [PlayerGrid] 단순화된 상태:', {
      participantsCount: realtimeParticipants.length || (currentRoom?.participants?.length || 0),
      timestamp: Date.now()
    });
  }
    
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
  
  // WebRTC Manager는 완전히 독립적이므로 모든 참여자가 실제 사용자

  // 중복 제거 및 필터링이 강화된 참가자 목록
  const otherPlayers = (() => {
    // 현재 플레이어만 제외 (WebRTC Manager는 완전히 분리됨)
    let filtered = convertedParticipants.filter((p) => {
      const isDifferentPlayer = p.id !== currentPlayer.id && p.guestUserId !== currentPlayer.guestUserId;
      
      return isDifferentPlayer;
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
          // ✅ 개선된 스트림 매칭 로직
          let playerStream = null;
          
          console.log(`🔍 [PlayerGrid] Searching stream for ${player.nickname}:`, {
            availableStreamKeys: Array.from(remoteStreams.keys()),
            totalStreams: remoteStreams.size,
            playerId: player.id,
            guestUserId: player.guestUserId
          });
          
          // 방법 1: 원격 스트림이 1개뿐이라면 그것을 사용 (2명만 있는 경우)
          if (remoteStreams.size === 1) {
            const [firstStreamKey, firstStream] = Array.from(remoteStreams.entries())[0];
            playerStream = firstStream;
            console.log(`🎯 [PlayerGrid] Using single remote stream for ${player.nickname}:`, {
              streamKey: firstStreamKey,
              streamId: firstStream.id
            });
          } else {
            // 방법 2: 모든 가능한 매칭 시도
            const possibleKeys = [
              player.id,
              player.guestUserId,
              player.socketId, // 혹시 있다면
              ...Array.from(remoteStreams.keys()).filter(key => 
                key.includes(player.nickname) || 
                key.includes(player.guestUserId || '') ||
                key.includes(player.id || '')
              )
            ].filter(Boolean);
            
            console.log(`🎯 [PlayerGrid] Trying to match stream for ${player.nickname}:`, {
              possibleKeys,
              availableKeys: Array.from(remoteStreams.keys())
            });
            
            for (const key of possibleKeys) {
              playerStream = remoteStreams.get(key);
              if (playerStream) {
                console.log(`✅ [PlayerGrid] Found stream for ${player.nickname} with key:`, key);
                break;
              }
            }
            
            // 방법 3: 첫 번째 스트림 사용 (임시 해결책)
            if (!playerStream && remoteStreams.size > 0) {
              const [firstKey, firstStream] = Array.from(remoteStreams.entries())[0];
              playerStream = firstStream;
              console.warn(`⚠️ [PlayerGrid] Using first available stream for ${player.nickname}:`, {
                streamKey: firstKey,
                streamId: firstStream.id
              });
            }
          }
          
          // 방장 여부 판단 로직 개선 (중복 방지)
          const isPlayerHost = player.role === 'host' || player.id === currentRoom.hostGuestId;
          
          // Stream matching 로그 제거 (무한 로그 방지)
          
          // ✨ 단순화된 캐릭터 설정 상태 체크: isCustomized만 확인
          const hasCharacter = player.characterInfo?.isCustomized || false;
          
          // ✨ 단순화된 캐릭터 데이터: isCustomized가 true일 때만 사용
          const characterData = hasCharacter ? {
            selectedOptions: player.characterInfo?.selectedOptions || {},
            selectedColors: player.characterInfo?.selectedColors || {},
            nickname: player.nickname
          } : null;
          
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