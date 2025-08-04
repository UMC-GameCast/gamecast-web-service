/**
 * GameRecorder와 Socket.IO를 통합한 게임 녹화 훅
 * 실시간 상태 동기화와 녹화 관리를 담당
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { GameRecorder } from "../utils/GameRecorder";
import type { Player, Room } from "../types/room";

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

const SOCKET_SERVER_URL = "http://3.37.34.211:8889";

export const useGameRecording = (currentRoom: Room | null, currentPlayer: Player | null) => {

  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>({
    state: 'idle',
    startTime: null,
    duration: 0
  });
  
  const [playersReadyStatus, setPlayersReadyStatus] = useState<PlayerReadyStatus[]>([]);
  const [allPlayersReady, setAllPlayersReady] = useState(false);
  
  const socketRef = useRef<Socket | null>(null);
  const gameRecorderRef = useRef<GameRecorder | null>(null);
  const timerRef = useRef<number | null>(null);

  // Socket.IO 연결 초기화
  useEffect(() => {
    if (!currentRoom) return;
    
    socketRef.current = io(SOCKET_SERVER_URL, {
      transports: ['websocket'],
      forceNew: true
    });

    const socket = socketRef.current;

    // 연결 상태 모니터링 (에러만 로그)
    socket.on('connect_error', (error) => {
      console.error('Socket.IO 연결 오류:', error);
    });

    // 방에 참여 - 통합된 사용자 식별
    const unifiedUserId = currentPlayer?.guestUserId || currentPlayer?.id;
    const unifiedNickname = currentPlayer?.nickname || '익명';
    
    socket.emit('join-room', {
      roomCode: currentRoom.roomCode,
      guestUserId: unifiedUserId,
      nickname: unifiedNickname
    });

    // 이벤트 리스너 설정
    socket.on('recording-status-update', handleRecordingStatusUpdate);
    socket.on('players-ready-status', handlePlayersReadyStatus);
    socket.on('all-players-ready', handleAllPlayersReady);
    socket.on('recording-start-countdown', handleRecordingStartCountdown);
    socket.on('recording-started', handleRecordingStarted);
    socket.on('recording-stopped', handleRecordingStopped);

    return () => {
      socket.disconnect();
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [currentRoom?.roomCode, currentPlayer?.guestUserId]);

  // 녹화 상태 업데이트 핸들러
  const handleRecordingStatusUpdate = useCallback((data: any) => {
    console.log('📊 [useGameRecording] Recording status update:', data);
    setRecordingStatus(prev => ({
      ...prev,
      state: data.state,
      startTime: data.startTime || prev.startTime
    }));
  }, []);

  // 플레이어 준비 상태 핸들러
  const handlePlayersReadyStatus = useCallback((players: PlayerReadyStatus[]) => {
    const readyCount = players.filter(p => p.isReady).length;
    const totalCount = players.length;
    
    setPlayersReadyStatus(players);
    
    // 모든 플레이어가 준비되었는지 확인
    const ready = players.length > 0 && players.every(p => p.isReady);
    setAllPlayersReady(ready);
    
    console.log(`준비 상황: ${readyCount}/${totalCount}명 ${ready ? '✅ 모두 준비됨!' : '⏳ 대기중...'}`);
  }, []);

  // 모든 플레이어 준비 완료 핸들러
  const handleAllPlayersReady = useCallback(() => {
    console.log('모든 플레이어 준비 완료 - 녹화 시작 준비');
    setRecordingStatus(prev => ({ ...prev, state: 'preparing' }));
  }, []);

  // 녹화 시작 카운트다운 핸들러
  const handleRecordingStartCountdown = useCallback((data: { countdown: number }) => {
    setRecordingStatus(prev => ({ ...prev, state: 'starting' }));
  }, []);

  // 녹화 시작 핸들러
  const handleRecordingStarted = useCallback(async () => {
    console.log('🎬 [useGameRecording] Recording started by server!');
    
    try {
      // GameRecorder 인스턴스 생성 (없으면)
      if (!gameRecorderRef.current) {
        gameRecorderRef.current = new GameRecorder();
      }

      // 화면이 선택되지 않았으면 에러
      if (!gameRecorderRef.current.isScreenSelected()) {
        throw new Error('화면이 선택되지 않았습니다. 먼저 녹화화면 설정을 해주세요.');
      }

      // 녹화 시작
      await gameRecorderRef.current.startRecording(
        currentRoom?.roomCode || '',
        currentPlayer?.guestUserId || '',
        currentRoom?.gameTitle || '게임'
      );

      // 상태 업데이트 및 타이머 시작
      setRecordingStatus(prev => ({ ...prev, state: 'recording' }));
      startTimer();

      console.log('✅ [useGameRecording] Local recording started successfully');

    } catch (error) {
      console.error('❌ [useGameRecording] Failed to start local recording:', error);
      
      // 에러를 서버에 알림
      socketRef.current?.emit('recording-error', {
        roomCode: currentRoom?.roomCode,
        playerId: currentPlayer?.guestUserId,
        error: error instanceof Error ? error.message : '녹화 시작 실패'
      });
      
      setRecordingStatus(prev => ({ ...prev, state: 'idle' }));
      alert(`녹화 시작에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }, [currentRoom, currentPlayer]);

  // 녹화 종료 핸들러
  const handleRecordingStopped = useCallback(async () => {
    console.log('⏹️ [useGameRecording] Recording stopped by server!');
    
    try {
      setRecordingStatus(prev => ({ ...prev, state: 'stopping' }));
      stopTimer();

      if (gameRecorderRef.current) {
        // 녹화 종료 및 서버 업로드
        const uploadResult = await gameRecorderRef.current.stopRecording(
          currentRoom?.roomCode || '',
          currentPlayer?.guestUserId || '',
          currentRoom?.gameTitle || '게임'
        );

        console.log('✅ [useGameRecording] Recording completed and uploaded:', uploadResult);
        setRecordingStatus(prev => ({ ...prev, state: 'completed' }));
        
        // 성공 알림
        alert('녹화가 완료되어 서버에 업로드되었습니다!');
      }

    } catch (error) {
      console.error('❌ [useGameRecording] Failed to stop recording:', error);
      
      setRecordingStatus(prev => ({ ...prev, state: 'idle' }));
      alert(`녹화 종료에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }, [currentRoom, currentPlayer]);

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

  // 플레이어 준비 상태 설정
  const setPlayerReady = useCallback((isReady: boolean) => {
    if (!currentPlayer || !currentRoom) {
      console.error('준비 상태 설정 실패: 플레이어 또는 방 정보 없음');
      return;
    }

    // 통합된 사용자 식별 사용
    const unifiedUserId = currentPlayer.guestUserId || currentPlayer.id;
    const unifiedNickname = currentPlayer.nickname || '익명';

    socketRef.current?.emit('update-preparation-status', {
      roomCode: currentRoom.roomCode,
      playerId: unifiedUserId,
      playerName: unifiedNickname,
      characterSetup: true, // 캐릭터 설정은 항상 true (현재 비활성화)
      screenSetup: true, // 화면 설정도 항상 true로 설정
      isReady: isReady
    });
  }, [currentPlayer, currentRoom]);

  // 녹화 종료 (방장 전용)
  const stopRecording = useCallback(() => {
    if (!currentRoom || !isHost()) return;

    console.log('⏹️ [useGameRecording] Host stopping recording...');
    
    socketRef.current?.emit('stop-recording', {
      roomCode: currentRoom.roomCode,
      hostId: currentPlayer?.guestUserId
    });
  }, [currentRoom, currentPlayer]);

  // 방장 여부 확인
  const isHost = useCallback(() => {
    return currentPlayer?.role === 'host' || currentPlayer?.guestUserId === currentRoom?.hostGuestId;
  }, [currentPlayer, currentRoom]);

  // 시간 포맷팅
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // GameRecorder 인스턴스 반환 (외부에서 화면 선택용)
  const getGameRecorder = useCallback(() => {
    if (!gameRecorderRef.current) {
      gameRecorderRef.current = new GameRecorder();
    }
    return gameRecorderRef.current;
  }, []);

  return {
    recordingStatus,
    playersReadyStatus,
    allPlayersReady,
    isHost: isHost(),
    formatTime,
    setPlayerReady,
    stopRecording,
    getGameRecorder
  };
};