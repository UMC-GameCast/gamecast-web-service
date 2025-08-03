import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
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
  
  const socketRef = useRef<Socket | null>(null);
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

  // Socket.IO 연결 및 이벤트 처리 - 완전 비활성화
  useEffect(() => {
    if (!currentRoom?.id || !currentPlayer?.id) return;

    // 녹화 기능 임시 비활성화 - REST API 테스트를 위해
    console.log('🎬 녹화 기능 비활성화 상태');
    return;

    // Socket.IO 클라이언트 연결 - 서버 주소 변경
    const socket = io('http://3.37.34.211:8889');
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔗 녹화 관리 Socket.IO 연결됨');
      
      // 녹화 방에 입장
      socket.emit('recording_join', {
        roomId: currentRoom.id,
        playerId: currentPlayer.id,
        playerName: currentPlayer.name
      });
    });

    // ===== 서버 이벤트 리스너 =====
    socket.on('ready_status_update', (data) => {
      const { playersReady } = data;
      setPlayersReadyStatus(new Map(playersReady.map((p: PlayerReadyStatus) => [p.playerId, p])));
    });

    socket.on('all_players_ready', () => {
      console.log('🎯 모든 플레이어 준비 완료 - 3초 후 녹화 시작');
      setAllPlayersReady(true);
      setRecordingStatus(prev => ({ ...prev, state: 'preparing' }));
    });

    socket.on('recording_start', () => {
      console.log('🎬 서버로부터 녹화 시작 신호 받음');
      setRecordingStatus(prev => ({ ...prev, state: 'recording' }));
      startTimer();
      // 녹화 시작 트리거
      onRecordingStart();
    });

    socket.on('recording_stop', () => {
      setRecordingStatus(prev => ({ ...prev, state: 'completed' }));
      stopTimer();
      // 녹화 종료 트리거
      onRecordingEnd();
    });

    socket.on('video_uploaded', (data) => {
      const { playerName, recordingType, filename } = data;
      console.log(`📤 ${playerName}의 ${recordingType} 업로드 완료: ${filename}`);
    });

    socket.on('processing_complete', (data) => {
      const { highlightVideo, message } = data;
      console.log(`🎬 영상 처리 완료: ${highlightVideo} - ${message}`);
    });

    socket.on('disconnect', () => {
      console.log('🔌 녹화 관리 Socket.IO 연결 해제됨');
    });

    socket.on('connect_error', (error) => {
      console.error('🚨 Socket.IO 연결 에러:', error);
    });

    return () => {
      socket.disconnect();
      stopTimer();
    };
  }, [currentRoom?.id, currentPlayer?.id, startTimer, stopTimer]);

  // 모든 플레이어 준비 상태 확인
  useEffect(() => {
    if (playersReadyStatus.size === 0) return;
    
    // 서버에서 받은 실제 접속 플레이어 수로 계산
    const totalPlayers = playersReadyStatus.size;
    const readyPlayers = Array.from(playersReadyStatus.values()).filter(p => p.isReady).length;
    
    const allReady = totalPlayers > 0 && readyPlayers === totalPlayers;
    setAllPlayersReady(allReady);
    
    console.log(`🎯 준비 상태 체크: ${readyPlayers}/${totalPlayers} 준비됨, 모든 플레이어 준비: ${allReady}`);
    
    // 서버에서 즉시 녹화 시작하므로 클라이언트 상태 변경 불필요
    // if (allReady && recordingStatus.state === 'idle') {
    //   setRecordingStatus(prev => ({ ...prev, state: 'preparing' }));
    // }
  }, [playersReadyStatus]);

  // 준비 상태 전송
  const setPlayerReady = useCallback((isReady: boolean) => {
    if (socketRef.current && currentPlayer) {
      socketRef.current.emit('set_ready', {
        playerId: currentPlayer.id,
        playerName: currentPlayer.name,
        isReady
      });
    }
  }, [currentPlayer]);

  // 녹화 시작 요청 (호스트만)
  const startRecording = useCallback(() => {
    if (socketRef.current && currentRoom?.hostId === currentPlayer?.id) {
      socketRef.current.emit('start_recording');
    }
  }, [currentRoom?.hostId, currentPlayer?.id]);

  // 녹화 종료 요청 (호스트만)
  const stopRecording = useCallback(() => {
    if (socketRef.current && currentRoom?.hostId === currentPlayer?.id) {
      socketRef.current.emit('stop_recording');
    }
  }, [currentRoom?.hostId, currentPlayer?.id]);

  // 영상 업로드 함수
  const uploadVideo = useCallback(async (videoBlob: Blob, recordingType: 'screen' | 'audio') => {
    if (!currentRoom || !currentPlayer) {
      throw new Error('방 정보나 플레이어 정보가 없습니다.');
    }

    const formData = new FormData();
    formData.append('video', videoBlob, `${currentPlayer.name}_${recordingType}_${Date.now()}.webm`);
    formData.append('roomId', currentRoom.id);
    formData.append('playerId', currentPlayer.id);
    formData.append('playerName', currentPlayer.name);
    formData.append('recordingType', recordingType);

    try {
      const response = await fetch('http://3.37.34.211:8889/api/upload-video', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`업로드 실패: ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ ${recordingType} 업로드 성공:`, result);
      return result;

    } catch (error) {
      console.error(`❌ ${recordingType} 업로드 실패:`, error);
      throw error;
    }
  }, [currentRoom, currentPlayer]);

  // === 녹화 트리거 함수들 (쉽게 수정 가능) ===
  const onRecordingStart = useCallback(() => {
    console.log('🎬 녹화 시작 트리거!');
    
    // TODO: 실제 녹화 시작 로직 구현
    // 예시: 화면 녹화 + 음성 녹음 동시 시작
    /*
    // 화면 녹화
    navigator.mediaDevices.getDisplayMedia({ 
      video: true, 
      audio: true 
    }).then(screenStream => {
      // MediaRecorder로 화면 녹화 시작
    });
    
    // 음성 녹음 (마이크 전용)
    navigator.mediaDevices.getUserMedia({ 
      audio: true 
    }).then(audioStream => {
      // MediaRecorder로 음성 녹음 시작
    });
    */
    
  }, []);

  const onRecordingEnd = useCallback(() => {
    console.log('🛑 녹화 종료 트리거!');
    
    // TODO: 실제 녹화 종료 로직 구현
    // 예시: MediaRecorder 정지 및 파일 업로드
    /*
    // 화면 녹화 정지
    screenRecorder.stop();
    screenRecorder.ondataavailable = (event) => {
      uploadVideo(event.data, 'screen');
    };
    
    // 음성 녹음 정지
    audioRecorder.stop();
    audioRecorder.ondataavailable = (event) => {
      uploadVideo(event.data, 'audio');
    };
    */
    
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
    // 트리거 함수들을 외부에서 수정할 수 있도록 노출
    onRecordingStart,
    onRecordingEnd
  };
}; 