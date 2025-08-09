import { useEffect, useState } from 'react';
import type { Player } from '../types/room';

interface UsePlayerCardStreamResult {
  effectiveStream: MediaStream | null;
  streamFound: boolean;
  searchLog: string[];
}

/**
 * PlayerCard의 스트림 검색 로직을 담당하는 훅
 * 여러 소스에서 스트림을 찾아서 반환
 */
export function usePlayerCardStream(
  player: Player,
  propsStream: MediaStream | null,
  isLocalPlayer: boolean
): UsePlayerCardStreamResult {
  const [effectiveStream, setEffectiveStream] = useState<MediaStream | null>(propsStream);
  const [searchLog, setSearchLog] = useState<string[]>([]);

  useEffect(() => {
    console.log(`🎯 [usePlayerCardStream] 스트림 검색 시작 for ${player.nickname}:`, {
      hasPropsStream: !!propsStream,
      isLocalPlayer,
      playerId: player.id,
      guestUserId: player.guestUserId,
      socketId: player.socketId
    });

    // 로컬 플레이어이거나 이미 스트림이 있으면 그대로 사용
    if (isLocalPlayer || propsStream) {
      setEffectiveStream(propsStream);
      setSearchLog([`Props stream: ${!!propsStream}`]);
      return;
    }

    const logs: string[] = [];
    let foundStream: MediaStream | null = null;

    // 🔍 1. 전역 WebRTC 매니저에서 검색
    const globalManager = (window as any).__webRTCManager__;
    if (globalManager?.remoteStreams) {
      const searchKeys = [player.guestUserId, player.id, player.socketId].filter(Boolean);
      
      logs.push(`전역 매니저 검색: ${globalManager.remoteStreams.size}개 스트림`);
      logs.push(`사용 가능한 키: [${Array.from(globalManager.remoteStreams.keys()).join(', ')}]`);
      
      for (const key of searchKeys) {
        const stream = globalManager.remoteStreams.get(key);
        if (stream) {
          foundStream = stream;
          logs.push(`✅ 전역 매니저에서 발견: ${key}`);
          break;
        } else {
          logs.push(`❌ 전역 매니저에서 ${key} 없음`);
        }
      }
    } else {
      logs.push('전역 매니저 없음');
    }

    // 🔍 2. VoiceChat 스트림에서 검색
    if (!foundStream) {
      const voiceChatStreams = (window as any).__voiceChatRemoteStreams__;
      if (voiceChatStreams?.size > 0) {
        const searchKeys = [player.guestUserId, player.id, player.socketId].filter(Boolean);
        
        logs.push(`VoiceChat 검색: ${voiceChatStreams.size}개 스트림`);
        logs.push(`VoiceChat 키: [${Array.from(voiceChatStreams.keys()).join(', ')}]`);
        
        for (const key of searchKeys) {
          const stream = voiceChatStreams.get(key);
          if (stream) {
            foundStream = stream;
            logs.push(`✅ VoiceChat에서 발견: ${key}`);
            break;
          } else {
            logs.push(`❌ VoiceChat에서 ${key} 없음`);
          }
        }

        // 🎯 3. 부분 매칭 시도 (마지막 수단)
        if (!foundStream) {
          const allKeys = Array.from(voiceChatStreams.keys());
          const playerIdLast8 = player.guestUserId?.slice(-8) || '';
          
          for (const availableKey of allKeys) {
            if (availableKey.includes(playerIdLast8) && playerIdLast8.length > 0) {
              foundStream = voiceChatStreams.get(availableKey);
              logs.push(`🎯 부분 매칭으로 발견: ${availableKey} (${playerIdLast8})`);
              break;
            }
          }
        }
      } else {
        logs.push('VoiceChat 스트림 없음');
      }
    }

    setEffectiveStream(foundStream);
    setSearchLog(logs);

    // 로그 출력 (확률적)
    if (Math.random() < 0.3 || foundStream) {
      console.log(`🔍 [usePlayerCardStream] 검색 결과 for ${player.nickname}:`, {
        found: !!foundStream,
        streamId: foundStream?.id,
        audioTracks: foundStream?.getAudioTracks().length || 0,
        searchLog: logs
      });
    }
  }, [propsStream, isLocalPlayer, player.nickname, player.id, player.guestUserId, player.socketId]);

  // 🔄 지연 스트림을 위한 주기적 재검색
  useEffect(() => {
    if (isLocalPlayer || effectiveStream) return;

    const recheckTimer = setTimeout(() => {
      const voiceChatStreams = (window as any).__voiceChatRemoteStreams__;
      if (voiceChatStreams && voiceChatStreams.size > 0) {
        console.log(`🔄 [usePlayerCardStream] 지연 스트림 재검색 for ${player.nickname}`);
        // 의존성 배열의 값을 변경하여 useEffect 재실행 트리거
        setSearchLog(prev => [...prev, '재검색 트리거']);
      }
    }, 1500);

    return () => clearTimeout(recheckTimer);
  }, [isLocalPlayer, effectiveStream, player.nickname]);

  return {
    effectiveStream,
    streamFound: !!effectiveStream,
    searchLog
  };
}