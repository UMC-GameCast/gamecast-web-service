import React, { useEffect } from "react";
import type { Player, Room } from "../../../types/room";
import { PlayerCard } from "./PlayerCard";
import CardBlock from "../../../assets/gamecast/Room/Card_block.svg?react";
import CardEmpty from "../../../assets/gamecast/Room/Card_empty.svg?react";

// 올바른 닉네임을 표시하기 위한 유틸리티 함수 (participants 목록 기반) - RoomPage와 동일한 로직
const getDisplayNickname = (player: Player, allParticipants: Player[], currentRoom: Room): string => {
  // Socket 통신에서는 호스트가 guestUserId를 닉네임으로 사용하지만
  // UI에서는 원래 의도된 닉네임 규칙을 따라야 함
  
  // 전체 참여자 목록이 있는 경우, 그것을 기준으로 순번 결정
  if (Array.isArray(allParticipants) && allParticipants.length > 0) {
    // 호스트 찾기 (서버에서 오는 데이터 기반)
    const hostPlayer = allParticipants.find(p => p.role === 'host' || p.isHost || p.id === currentRoom.hostGuestId);
    
    // 현재 플레이어가 호스트인지 확인
    if (hostPlayer && (hostPlayer.guestUserId === player.guestUserId || hostPlayer.id === player.id)) {
      return "Nickname1";
    }
    
    // 호스트가 아닌 참여자들만 필터링
    const participantPlayers = allParticipants.filter(p => p.role !== 'host' && !p.isHost && p.id !== currentRoom.hostGuestId);
    
    // 현재 플레이어의 인덱스 찾기
    const playerIndex = participantPlayers.findIndex(p => 
      p.guestUserId === player.guestUserId || p.id === player.id
    );
    
    if (playerIndex >= 0) {
      return `Nickname${playerIndex + 2}`; // 참여자는 Nickname2부터 시작
    }
  }
  
  // 개별 플레이어 데이터만으로 호스트 확인
  if (player.role === 'host' || player.isHost || player.id === currentRoom.hostGuestId) {
    return "Nickname1";
  }
  
  // 기존 닉네임이 올바른 형식이면 그대로 사용
  if (player.nickname && player.nickname.startsWith('Nickname') && /^Nickname\d+$/.test(player.nickname)) {
    return player.nickname;
  }
  
  // UUID 형태의 닉네임인 경우 (Socket 우회로 인한 잘못된 닉네임)
  // 기본적으로 "Nickname2"로 설정 (게스트 사용자의 기본값)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(player.nickname)) {
    return "Nickname2"; // UUID 닉네임의 경우 게스트로 간주
  }
  
  // 그 외의 경우 원래 닉네임 사용
  return player.nickname || "Nickname2";
};

interface PlayerGridProps {
  currentRoom: Room;
  currentPlayer: Player;
  realtimeParticipants?: Player[]; // 🎯 통합된 참여자 데이터 (이름 유지하되 내용은 통합됨)
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
  
  // 🔍 PlayerGrid 입력 데이터 디버깅 (캐릭터 정보 포함)
  console.log('🎯 [PlayerGrid] 입력 데이터 확인:', {
    realtimeParticipantsCount: realtimeParticipants?.length || 0,
    realtimeParticipants: realtimeParticipants?.map(p => ({
      nickname: p.nickname,
      guestUserId: p.guestUserId,
      isHost: p.isHost,
      hasCharacter: p.characterInfo?.isCustomized || false
    })) || [],
    currentRoomParticipantsCount: currentRoom?.participants?.length || 0,
    timestamp: new Date().toLocaleTimeString()
  });
    
  // 서버 우선순위: Socket.IO 실시간 데이터가 절대 우선, REST API는 폴백만
  const participants = realtimeParticipants.length > 0 ? realtimeParticipants : (currentRoom?.participants || []);
  const isUsingServerData = realtimeParticipants.length > 0;
  
  console.log('🎯 [PlayerGrid] 사용할 participants 결정:', {
    finalParticipantsCount: participants.length,
    isUsingRealtimeData: isUsingServerData,
    finalParticipants: participants.map(p => ({
      nickname: p.nickname,
      guestUserId: p.guestUserId,
      isHost: p.isHost,
      hasCharacter: p.characterInfo?.isCustomized || false,
      characterSetupStatus: p.preparationStatus?.characterSetup || false
    }))
  });

  // 🎨 캐릭터 정보 변경 감지를 위한 useEffect
  useEffect(() => {
    const participantsWithCharacter = participants.filter(p => p.characterInfo?.isCustomized);
    
    // 🚫 디버깅 로그 제거 (무한 렌더링 방지)
    if (import.meta.env.DEV && participantsWithCharacter.length > 0 && Math.random() < 0.01) {
      console.log('🎨 [PlayerGrid] 캐릭터 데이터 변경:', participantsWithCharacter.length);
    }
  }, [
    participants.map(p => p.characterInfo?.isCustomized ? '1' : '0').join(''),
    participants.map(p => p.guestUserId).join(','),
    participants.length,
    // 🚀 실제 캐릭터 데이터 변경도 감지하도록 추가 (JSON 대신 안전한 문자열 해시)
    participants.map(p => {
      const options = p.characterInfo?.selectedOptions || {};
      const colors = p.characterInfo?.selectedColors || {};
      return `${Object.keys(options).sort().join(',')}-${Object.values(options).sort().join(',')}`;
    }).join('|'),
    participants.map(p => {
      const colors = p.characterInfo?.selectedColors || {};
      return `${Object.keys(colors).sort().join(',')}-${Object.values(colors).sort().join(',')}`;
    }).join('|')
  ]);
  
  
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
    // 1. 강화된 플레이어 필터링 (ID 안전성 보장)
    let filtered = convertedParticipants.filter((p) => {
      // guestUserId만 사용하여 현재 플레이어 식별 (통합 정책)
      const isNotWebRTCConnection = !p.nickname?.startsWith('WEBRTC_');
      
      // 현재 플레이어 제외 로직 (현재 플레이어는 MyCharacterContainer에서 표시됨)
      const isNotCurrentPlayer = p.guestUserId !== currentPlayer.guestUserId && p.id !== currentPlayer.id;
      
      const shouldInclude = isNotWebRTCConnection && isNotCurrentPlayer;
      
      return shouldInclude;
    });
    
    // 2. 중복 제거: ID 또는 guestUserId가 같은 참가자 제거
    const seenIds = new Set<string>();
    filtered = filtered.filter((p) => {
      const primaryId = p.guestUserId || p.id;
      if (seenIds.has(primaryId)) {
        return false;
      }
      seenIds.add(primaryId);
      return true;
    });
    
    return filtered;
  })();
  const totalSlots = 4;
  const joinableSlots = (currentRoom?.maxCapacity || 4) - 1; // 전체 인원에서 현재 플레이어 제외

  return (
    <div className="w-full h-[628px] justify-end items-start gap-[55.98px] inline-flex flex-wrap content-start">
      {Array.from({ length: totalSlots }).map((_, index) => {
        const player = otherPlayers[index];
        const isBlocked = index >= joinableSlots;

        if (isBlocked) {
          return <CardBlock key={`block-${index}`} className="w-[230px] h-[288px]" />;
        }

        if (player) {
          // 통합 Player 데이터에서 스트림 정보 우선 사용, 없으면 기존 remoteStreams에서 조회
          const unifiedStream = player.remoteStream;
          const fallbackStream = remoteStreams.get(player.guestUserId);
          const socketIdStream = remoteStreams.get(player.socketId);
          const playerStream = unifiedStream || fallbackStream || socketIdStream;
          
          // 방장 여부 판단 로직 개선 (중복 방지) - 더 강화된 체크
          const isPlayerHost = player.role === 'host' || player.isHost || player.id === currentRoom.hostGuestId || player.guestUserId === currentRoom.hostGuestId;
          
          // Stream matching 로그 제거 (무한 로그 방지)
          
          // ✨ 단순화된 캐릭터 설정 상태 체크: isCustomized만 확인
          const hasCharacter = player.characterInfo?.isCustomized || false;
          
          // ✨ 단순화된 캐릭터 데이터: isCustomized가 true일 때만 사용
          const characterData = hasCharacter ? {
            selectedOptions: player.characterInfo?.selectedOptions || {},
            selectedColors: player.characterInfo?.selectedColors || {},
            nickname: getDisplayNickname(player, realtimeParticipants || [], currentRoom)
          } : null;
          
          // 🚫 디버깅 로그 제거 (무한 렌더링 방지)
          
          // 🎯 해당 플레이어의 preparation status 조회 (participants 데이터에서 직접 가져오기)
          const playerPreparationStatus = player.preparationStatus || null;
          
          console.log('🔍 [PlayerGrid] PlayerCard에 전달할 준비 상태:', {
            guestUserId: player.guestUserId,
            nickname: player.nickname,
            preparationStatus: playerPreparationStatus,
            isReady: playerPreparationStatus?.isReady,
            timestamp: new Date().toLocaleTimeString()
          });
          
                  // Preparation status 매칭 로그 제거 (무한 로그 방지)
          
          // 🔍 PlayerCard 렌더링 디버깅 (일시적)
          const cardKey = `player-${player.guestUserId || player.id}-${player.characterInfo?.isCustomized ? '1' : '0'}-${Object.keys(player.characterInfo?.selectedOptions || {}).length}-${Object.keys(player.characterInfo?.selectedColors || {}).length}-${index}`;
          
          if (hasCharacter && Math.random() < 0.3) {
            console.log('🎭 [PlayerGrid] PlayerCard 캐릭터와 함께 렌더링:', {
              playerId: player.guestUserId || player.id,
              nickname: player.nickname,
              hasCharacter,
              isCustomized: player.characterInfo?.isCustomized,
              characterData: characterData,
              key: cardKey
            });
          }

          return (
            <PlayerCard
              key={cardKey}
              player={player}
              isHost={isPlayerHost}
              stream={playerStream}
              isLocalPlayer={false}
              voiceChatConnected={voiceChatConnected}
              character={characterData || undefined}
              hasCharacter={hasCharacter}
              preparationStatus={playerPreparationStatus || undefined}
            />
          );
        }

        return <CardEmpty key={`empty-${index}`} className="w-[230px] h-[288px]" />;
      })}
    </div>
  );
}; 