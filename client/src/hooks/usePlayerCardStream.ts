import { useEffect, useState } from 'react';
import type { Player } from '../types/room';

interface UsePlayerCardStreamResult {
  effectiveStream: MediaStream | null;
  streamFound: boolean;
  searchLog: string[];
}

/**
 * PlayerCard의 스트림 검색 로직을 담당하는 훅
 * TODO: WebRTC 기능 비활성화 - 나중에 구현 예정
 */
export function usePlayerCardStream(
  player: Player,
  propsStream: MediaStream | null,
  isLocalPlayer: boolean
): UsePlayerCardStreamResult {
  // TODO: WebRTC 기능 비활성화 - 기본값 반환

  const [effectiveStream] = useState<MediaStream | null>(null);
  const [searchLog] = useState<string[]>(['WebRTC 기능 비활성화됨']);

  /*
  TODO: WebRTC 재구현 시 다음 기능들이 포함되어야 합니다:
  - 여러 소스에서 스트림 검색
  - 전역 WebRTC 매니저 연동
  - VoiceChat 스트림 매핑
  - 부분 매칭 및 지연 스트림 처리
  
  원래 구현:
  - 🔍 1. 전역 WebRTC 매니저에서 검색
  - 🔍 2. VoiceChat 스트림에서 검색  
  - 🎯 3. 부분 매칭 시도 (마지막 수단)
  - 🔄 지연 스트림을 위한 주기적 재검색
  */

  return {
    effectiveStream,
    streamFound: false,
    searchLog
  };
}