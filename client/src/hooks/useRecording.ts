import { useState, useEffect, useRef, useCallback } from "react";
import type { Player, RecodeRoom } from "../types/room";

// 녹화 상태 타입 정의
export type RecordingState = 'idle' | 'preparing' | 'starting' | 'recording' | 'stopping' | 'completed';

interface RecordingStatus {
  state: RecordingState;
  startTime: number | null;
  duration: number; // 초 단위
}

interface PlayerReadyStatus {
  playerId: string;
  isReady: boolean;
  playerName: string;
}

export const useRecording = (currentRoom: RecodeRoom | null, currentPlayer: Player | null) => {
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>({
    state: 'idle',
    startTime: null,
    duration: 0
  });
  
  const [playersReadyStatus, setPlayersReadyStatus] = useState<Map<string, PlayerReadyStatus>>(new Map());
  const [allPlayersReady, setAllPlayersReady] = useState(false);
  
  const timerRef = useRef<number | null>(null);

  // 타이머 시작
  const startTimer = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    
    const startTime = Date.now();
    setRecordingStatus(prev => ({ ...prev, startTime }));
    
    timerRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setRecordingStatus(prev => ({ ...prev, duration: elapsed }));
    }, 1000);
  }, []);

  // 타이머 정지
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 시간을 mm:ss 형식으로 포맷
  const formatTime = useCallback((seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      stopTimer();
    };
  }, [stopTimer]);

  // 준비 상태 설정 (웹소켓 없이 로컬 상태만)
  const setPlayerReady = useCallback((isReady: boolean) => {
    if (!currentPlayer) return;
    
    const newStatus = new Map(playersReadyStatus);
    newStatus.set(currentPlayer.id, {
      playerId: currentPlayer.id,
      playerName: currentPlayer.name,
      isReady
    });
    setPlayersReadyStatus(newStatus);
  }, [currentPlayer, playersReadyStatus]);

  // 녹화 시작 (로컬 테스트용)
  const startRecording = useCallback(() => {
    console.log('🎬 녹화 시작 (로컬 테스트)');
    setRecordingStatus(prev => ({ ...prev, state: 'recording' }));
    startTimer();
  }, [startTimer]);

  // 녹화 종료 (로컬 테스트용)
  const stopRecording = useCallback(() => {
    console.log('🛑 녹화 종료 (로컬 테스트)');
    setRecordingStatus(prev => ({ ...prev, state: 'completed' }));
    stopTimer();
  }, [stopTimer]);

  // 영상 업로드 함수 (자막 기능 테스트용으로 단순화)
  const uploadVideo = useCallback(async (videoBlob: Blob, recordingType: 'screen' | 'audio') => {
    console.log(`📤 ${recordingType} 업로드 시뮬레이션`);
    
    // 실제 업로드 대신 성공 응답 시뮬레이션
    return {
      success: true,
      filename: `${currentPlayer?.name || 'unknown'}_${recordingType}_${Date.now()}.webm`,
      message: '업로드 성공 (시뮬레이션)'
    };
  }, [currentPlayer]);

  // 녹화 시작 트리거 (자막 기능 테스트용)
  const onRecordingStart = useCallback(() => {
    console.log('🎬 녹화 시작 트리거! (자막 기능 테스트)');
    // 자막 기능 테스트를 위해 실제 녹화는 하지 않음
  }, []);

  // 녹화 종료 트리거 (자막 기능 테스트용)
  const onRecordingEnd = useCallback(() => {
    console.log('🛑 녹화 종료 트리거! (자막 기능 테스트)');
    // 자막 기능 테스트를 위해 실제 녹화는 하지 않음
  }, []);

  return {
    recordingStatus,
    playersReadyStatus: Array.from(playersReadyStatus.values()),
    allPlayersReady,
    isHost: currentRoom?.hostId === currentPlayer?.id,
    formatTime,
    setPlayerReady,
    startRecording,
    stopRecording,
    uploadVideo,
    onRecordingStart,
    onRecordingEnd
  };
}; 