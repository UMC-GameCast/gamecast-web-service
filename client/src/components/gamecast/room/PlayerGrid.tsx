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
}

export const PlayerGrid: React.FC<PlayerGridProps> = ({
  currentRoom,
  currentPlayer,
  realtimeParticipants = [],
  remoteStreams = new Map(),
  voiceChatConnected = false,
}) => {
  // 실시간 참여자 데이터가 있으면 우선 사용, 없으면 REST API 데이터 사용
  const participants = realtimeParticipants.length > 0 ? realtimeParticipants : (currentRoom?.participants || []);
  
  console.log('🎮 PlayerGrid 렌더링:', {
    realtimeCount: realtimeParticipants.length,
    restApiCount: currentRoom?.participants?.length || 0,
    usingRealtime: realtimeParticipants.length > 0,
    finalParticipantsCount: participants.length
  });
  
  // 서버에서 받은 participants를 클라이언트 형식으로 변환
  const convertedParticipants = participants.map(p => ({
    ...p,
    guestUserId: p.id, // 서버의 id를 guestUserId로 매핑
    preparationStatus: p.preparationStatus || {
      characterSetup: false,
      screenSetup: false
    },
    isHost: p.role === 'host'
  }));
  
  // WebRTC 백그라운드 참여자 필터링 함수
  const isWebRTCBackgroundParticipant = (participant: any) => {
    const nickname = participant.nickname || '';
    return nickname.startsWith('WEBRTC_');
  };

  // 현재 플레이어와 WebRTC 백그라운드 참여자를 제외한 다른 플레이어들
  const otherPlayers = convertedParticipants.filter((p) => {
    const isDifferentPlayer = p.id !== currentPlayer.id;
    const isNotWebRTCBackground = !isWebRTCBackgroundParticipant(p);
    
    console.log(`🎮 [PlayerGrid] Participant filtering:`, {
      participantId: p.id,
      nickname: p.nickname,
      isDifferentPlayer,
      isNotWebRTCBackground,
      willInclude: isDifferentPlayer && isNotWebRTCBackground
    });
    
    return isDifferentPlayer && isNotWebRTCBackground;
  });
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
              for (const [socketId, stream] of remoteStreams.entries()) {
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
          
          console.log(`🎮 [PlayerGrid] Player ${player.nickname} stream matching:`, {
            playerId: player.id,
            playerGuestUserId: player.guestUserId,
            playerNickname: player.nickname,
            playerRole: player.role,
            isHost: isPlayerHost,
            currentRoomHostId: currentRoom.hostGuestId,
            hasStream: !!playerStream,
            streamId: playerStream?.id,
            totalRemoteStreams: remoteStreams.size,
            remoteStreamKeys: Array.from(remoteStreams.keys()),
            audioTracks: playerStream?.getAudioTracks().length || 0,
            streamMatchingMethod: remoteStreams.size === 1 ? 'single-stream' : 'multi-stream-matching'
          });
          
          return (
            <PlayerCard
              key={player.id}
              player={player}
              isHost={isPlayerHost}
              stream={playerStream}
              isLocalPlayer={false}
              voiceChatConnected={voiceChatConnected}
            />
          );
        }

        return <CardEmpty key={`empty-${index}`} className="w-[230px] h-[288px]" />;
      })}
    </div>
  );
}; 