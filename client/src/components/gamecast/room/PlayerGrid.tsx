import React from "react";
import type { Player, Room } from "../../../types/room";
import { PlayerCard } from "./PlayerCard";
import CardBlock from "../../../assets/gamecast/Room/Card_block.svg?react";
import CardEmpty from "../../../assets/gamecast/Room/Card_empty.svg?react";

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
  
  // ✨ 통합된 참여자 디버깅 (필요시만)
  if (import.meta.env.DEV && Math.random() < 0.01) {
    console.log('✨ [PlayerGrid] 통합된 참여자 상태:', {
      participantsCount: realtimeParticipants.length || (currentRoom?.participants?.length || 0),
      unifiedParticipants: realtimeParticipants.map(p => ({
        nickname: p.nickname,
        socketId: p.socketId,
        isConnected: p.isConnected,
        hasWebRTCConnection: p.hasWebRTCConnection,
        hasRemoteStream: !!p.remoteStream
      })),
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
    // 🔍 필터링 전 상세 로깅
    console.log('🔍 [PlayerGrid] 필터링 전 참여자 상세:', {
      currentPlayerId: currentPlayer.id,
      currentPlayerGuestUserId: currentPlayer.guestUserId,
      totalParticipants: convertedParticipants.length,
      participantDetails: convertedParticipants.map(p => ({
        id: p.id,
        guestUserId: p.guestUserId,
        nickname: p.nickname,
        role: p.role,
        isCurrentPlayer: p.id === currentPlayer.id || p.guestUserId === currentPlayer.guestUserId,
        isWebRTCConnection: p.nickname?.startsWith('WEBRTC_')
      }))
    });
    
    // 1. 🔧 강화된 플레이어 필터링 (ID 안전성 보장)
    let filtered = convertedParticipants.filter((p) => {
      // 🎯 guestUserId만 사용하여 현재 플레이어 식별 (통합 정책)
      const isCurrentPlayer = p.guestUserId === currentPlayer.guestUserId;
      const isNotWebRTCConnection = !p.nickname?.startsWith('WEBRTC_');
      
      const shouldInclude = !isCurrentPlayer && isNotWebRTCConnection;
      
      console.log(`🔍 [PlayerGrid] 참여자 필터링:`, {
        participant: p.nickname,
        participantGuestUserId: p.guestUserId,
        currentPlayerGuestUserId: currentPlayer.guestUserId,
        isCurrentPlayer,
        isNotWebRTCConnection,
        shouldInclude,
        reason: isCurrentPlayer ? '현재 플레이어' : !isNotWebRTCConnection ? 'WebRTC 연결' : '포함'
      });
      
      return shouldInclude;
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
          // 🎯 통합 Player 데이터에서 스트림 정보 우선 사용, 없으면 기존 remoteStreams에서 조회
          const unifiedStream = player.remoteStream;
          const fallbackStream = remoteStreams.get(player.guestUserId);
          const socketIdStream = remoteStreams.get(player.socketId);
          const playerStream = unifiedStream || fallbackStream || socketIdStream;
          
          // ✨ 항상 디버깅 (Math.random 제거)
          console.log(`🎆 [PlayerGrid] PlayerCard에 전달할 스트림 for ${player.nickname}:`, {
            guestUserId: player.guestUserId,
            socketId: player.socketId,
            hasUnifiedStream: !!unifiedStream,
            hasFallbackStream: !!fallbackStream,
            hasSocketIdStream: !!socketIdStream,
            usingStream: unifiedStream ? 'unified' : fallbackStream ? 'fallback' : socketIdStream ? 'socketId' : 'none',
            streamId: playerStream?.id,
            audioTracks: playerStream?.getAudioTracks().length,
            remoteStreamsKeys: Array.from(remoteStreams.keys()),
            willPassToPlayerCard: !!playerStream,
            playerConnectionStatus: {
              isConnected: player.isConnected,
              hasWebRTCConnection: player.hasWebRTCConnection
            }
          });
          
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
          const playerPreparationStatus = Array.isArray(playersReadyStatus) 
            ? playersReadyStatus.find(ps => ps.playerId === (player.guestUserId || player.id))
            : null;
          
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