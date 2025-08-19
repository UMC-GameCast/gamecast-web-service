/**
 * GameRecorder와 WebRTC Manager를 통합한 게임 녹화 훅
 * WebRTC Manager의 Socket.IO 연결을 재사용하여 중복 연결 방지
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { GameRecorder } from "../utils/GameRecorder";
import type { Player, Room } from "../types/room";

// 로그 지속성을 위한 백업 시스템
const logBackup: { timestamp: string; level: string; message: string; data?: any }[] = [];
const MAX_LOG_BACKUP = 100; // 최대 100개 로그 보관

const persistentLog = (level: 'log' | 'warn' | 'error', message: string, data?: any) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data
  };
  
  // 콘솔 출력
  console[level](message, data || '');
  
  // 백업 저장
  logBackup.push(logEntry);
  if (logBackup.length > MAX_LOG_BACKUP) {
    logBackup.shift(); // 오래된 로그 제거
  }
  
  // localStorage에도 중요 로그 저장
  if (level === 'error' || message.includes('준비') || message.includes('WebRTC')) {
    try {
      const savedLogs = JSON.parse(localStorage.getItem('gamecast_debug_logs') || '[]');
      savedLogs.push(logEntry);
      if (savedLogs.length > 50) savedLogs.shift(); // 최대 50개만 유지
      localStorage.setItem('gamecast_debug_logs', JSON.stringify(savedLogs));
    } catch (e) {
      // localStorage 오류 무시
    }
  }
};

// console.clear 방지
const originalClear = console.clear;
console.clear = () => {
  console.warn('🚫 Console.clear() 호출이 차단되었습니다. 디버깅을 위해 로그를 유지합니다.');
  console.log('📋 백업된 로그 확인:', logBackup.slice(-10)); // 최근 10개 로그 표시
};

// WebRTC 매니저 싱글톤 인스턴스 가져오기
let webRTCManager: any = null;
export const getWebRTCManager = (retryCount = 0, maxRetries = 3) => {
  persistentLog('log', '🔍 [getWebRTCManager] 매니저 접근 시도:', {
    retryCount,
    maxRetries,
    cachedManager: !!webRTCManager,
    globalManager: !!(globalThis as any).__webRTCManager__,
    timestamp: new Date().toISOString()
  });
  
  if (!webRTCManager) {
    // useVoiceChat에서 초기화된 매니저 인스턴스 가져오기
    webRTCManager = (globalThis as any).__webRTCManager__;
    
    if (webRTCManager) {
      console.log('✅ [getWebRTCManager] 글로벌 매니저에서 인스턴스 획득 성공');
      return webRTCManager;
    } else {
      console.warn(`⚠️ [getWebRTCManager] 글로벌 매니저 인스턴스가 없음 (시도 ${retryCount + 1}/${maxRetries + 1})`);
      
      // 재시도 로직
      if (retryCount < maxRetries) {
        console.log(`🔄 [getWebRTCManager] ${200 * (retryCount + 1)}ms 후 재시도`);
        setTimeout(() => {
          webRTCManager = null; // 캐시 초기화
          return getWebRTCManager(retryCount + 1, maxRetries);
        }, 200 * (retryCount + 1)); // 점진적 지연
        return null;
      } else {
        console.error('❌ [getWebRTCManager] 최대 재시도 횟수 초과. useVoiceChat 초기화 상태 확인 필요');
        return null;
      }
    }
  } else {
    console.log('✅ [getWebRTCManager] 캐시된 매니저 인스턴스 사용');
    return webRTCManager;
  }
};

// 매니저 초기화 대기 함수
const waitForWebRTCManager = async (timeoutMs = 5000): Promise<any> => {
  console.log('⏳ [waitForWebRTCManager] 매니저 초기화 대기 시작');
  
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkManager = () => {
      const manager = (globalThis as any).__webRTCManager__;
      if (manager) {
        console.log('✅ [waitForWebRTCManager] 매니저 초기화 완료');
        webRTCManager = manager; // 캐시 업데이트
        resolve(manager);
        return;
      }
      
      const elapsed = Date.now() - startTime;
      if (elapsed >= timeoutMs) {
        console.error('❌ [waitForWebRTCManager] 매니저 초기화 대기 시간 초과');
        reject(new Error('WebRTC Manager initialization timeout'));
        return;
      }
      
      // 100ms마다 다시 확인
      setTimeout(checkManager, 100);
    };
    
    checkManager();
  });
};

// 녹화 상태 타입 정의
export type RecordingState = 'idle' | 'preparing' | 'starting' | 'recording' | 'stopping' | 'completed';

interface RecordingStatus {
  state: RecordingState;
  startTime: number | null;
  duration: number; // 초 단위
  autoStartCountdown?: number; // 자동 시작 카운트다운 (초)
}

interface PlayerReadyStatus {
  playerId: string;
  isReady: boolean;
  playerName: string;
  characterSetup?: boolean;
  screenSetup?: boolean;
}

export const useGameRecording = (currentRoom: Room | null, currentPlayer: Player | null) => {

  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>({
    state: 'idle',
    startTime: null,
    duration: 0,
    autoStartCountdown: undefined
  });
  
  const [playersReadyStatus, setPlayersReadyStatus] = useState<PlayerReadyStatus[]>([]);
  const [allPlayersReady, setAllPlayersReady] = useState(false);
  
  // 개별 설정 상태 추적
  const [characterSetupComplete, setCharacterSetupComplete] = useState(false);
  const [screenSetupComplete, setScreenSetupComplete] = useState(false);
  
  // 중복 호출 방지를 위한 상태
  const [lastReadyCallTime, setLastReadyCallTime] = useState<number>(0);
  const [isProcessingReady, setIsProcessingReady] = useState(false);
  
  const gameRecorderRef = useRef<GameRecorder | null>(null);
  const timerRef = useRef<number | null>(null);

  // WebRTC 매니저 콜백 설정 (초기화 대기 포함)
  useEffect(() => {
    console.log('🚀 [useGameRecording] useEffect 시작:', {
      hasCurrentRoom: !!currentRoom,
      roomCode: currentRoom?.roomCode,
      playerInfo: {
        id: currentPlayer?.id,
        guestUserId: currentPlayer?.guestUserId,
        nickname: currentPlayer?.nickname
      }
    });
    
    if (!currentRoom) {
      console.log('❌ [useGameRecording] currentRoom이 없음, useEffect 종료');
      return;
    }

    // WebRTC가 비활성화된 경우 빠른 종료
    if (!(globalThis as any).__webRTCManager__) {
      console.log('ℹ️ [useGameRecording] WebRTC 기능이 비활성화됨, 기본 플레이어 상태만 초기화');
      
      // 현재 플레이어를 playersReadyStatus에 초기화 (WebRTC 없이도 동작하도록)
      if (currentPlayer) {
        const unifiedUserId = currentPlayer.guestUserId || currentPlayer.id;
        const unifiedNickname = currentPlayer.nickname || '익명';
        
        setPlayersReadyStatus(prev => {
          const existingPlayer = prev.find(p => 
            p.playerId === unifiedUserId || p.playerId === currentPlayer.id
          );
          
          if (!existingPlayer) {
            console.log('➕ [useGameRecording] 현재 플레이어를 준비 상태 목록에 초기화 (WebRTC 없음):', {
              playerId: unifiedUserId,
              playerName: unifiedNickname
            });
            
            return [...prev, {
              playerId: unifiedUserId,
              playerName: unifiedNickname,
              characterSetup: false,
              screenSetup: false,
              isReady: false
            }];
          } else {
            return prev;
          }
        });
      }
      return;
    }

    // 비동기 매니저 초기화 및 콜백 설정
    const setupManager = async () => {
      try {
        console.log('⏳ [useGameRecording] WebRTC Manager 초기화 대기 중...');
        
        // 먼저 즉시 확인
        let manager = getWebRTCManager();
        
        // 매니저가 없으면 대기
        if (!manager) {
          console.log('🔄 [useGameRecording] 매니저 없음, 초기화 대기 중...');
          manager = await waitForWebRTCManager();
        }

        if (!manager) {
          console.error('❌ [useGameRecording] WebRTC Manager 초기화 실패');
          return;
        }

        console.log('🔗 [useGameRecording] WebRTC Manager 콜백 설정 시작:', {
          managerExists: !!manager,
          managerType: typeof manager,
          socketConnected: manager.isSocketConnected ? manager.isSocketConnected() : 'method not available'
        });

        // 기존 콜백 상태 확인
        console.log('📋 [useGameRecording] 기존 콜백 상태:', {
          onRecordingStatusUpdate: typeof manager.onRecordingStatusUpdate,
          onPlayersReadyStatus: typeof manager.onPlayersReadyStatus,
          onPreparationStatusUpdated: typeof manager.onPreparationStatusUpdated
        });

        // 녹화 관련 이벤트 콜백 설정
        manager.onRecordingStatusUpdate = handleRecordingStatusUpdate;
        manager.onPlayersReadyStatus = handlePlayersReadyStatus;
        manager.onAllPlayersReady = handleAllPlayersReady;
        manager.onRecordingStartCountdown = handleRecordingStartCountdown;
        manager.onRecordingStarted = handleRecordingStarted;
        manager.onRecordingStopped = handleRecordingStopped;
        manager.onPreparationStatusUpdated = handlePreparationStatusUpdated;

        console.log('✅ [useGameRecording] 모든 콜백 설정 완료');
        
        // 현재 플레이어를 playersReadyStatus에 초기화 (서버 응답 대기 중에도 UI 표시)
        if (currentPlayer) {
          const unifiedUserId = currentPlayer.guestUserId || currentPlayer.id;
          const unifiedNickname = currentPlayer.nickname || '익명';
          
          setPlayersReadyStatus(prev => {
            // 이미 현재 플레이어가 목록에 있는지 확인
            const existingPlayer = prev.find(p => 
              p.playerId === unifiedUserId || p.playerId === currentPlayer.id
            );
            
            if (!existingPlayer) {
              console.log('➕ [useGameRecording] 현재 플레이어를 준비 상태 목록에 초기화:', {
                playerId: unifiedUserId,
                playerName: unifiedNickname
              });
              
              return [...prev, {
                playerId: unifiedUserId,
                playerName: unifiedNickname,
                characterSetup: false,
                screenSetup: false,
                isReady: false
              }];
            } else {
              console.log('🔄 [useGameRecording] 현재 플레이어가 이미 준비 상태 목록에 존재함');
              return prev;
            }
          });
        }
        
      } catch (error) {
        console.error('❌ [useGameRecording] 매니저 설정 중 오류:', error);
      }
    };

    setupManager();

    return () => {
      // 콜백 정리
      const manager = getWebRTCManager();
      if (manager) {
        console.log('🧹 [useGameRecording] 콜백 정리 중...');
        manager.onRecordingStatusUpdate = () => {};
        manager.onPlayersReadyStatus = () => {};
        manager.onAllPlayersReady = () => {};
        manager.onRecordingStartCountdown = () => {};
        manager.onRecordingStarted = () => {};
        manager.onRecordingStopped = () => {};
        manager.onPreparationStatusUpdated = () => {};
        console.log('✅ [useGameRecording] 콜백 정리 완료');
      }
      
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
    
    // 준비 상황 로그 제거
  }, []);

  // 실시간 준비 상태 업데이트 핸들러 (강화된 필터링 적용)
  const handlePreparationStatusUpdated = useCallback((data: {
    guestUserId: string;
    nickname: string;
    characterSetup: boolean;
    screenSetup: boolean;
  }) => {
    // ⚡ 1단계: WebRTC Manager 이벤트 필터링 강화
    if (data.nickname && data.nickname.startsWith('WEBRTC_')) {
      console.log('🚫 [useGameRecording] WebRTC Manager 이벤트 무시 (WEBRTC_ 접두사):', data.nickname);
      return;
    }
    
    // ⚡ 추가 필터링: WebRTC 관련 guestUserId 패턴
    if (data.guestUserId && typeof data.guestUserId === 'string' && 
        (data.guestUserId.includes('webrtc_') || data.guestUserId.includes('WEBRTC_'))) {
      console.log('🚫 [useGameRecording] WebRTC Manager guestUserId 패턴 감지, 이벤트 무시:', data.guestUserId);
      return;
    }
    
    // ⚡ Socket ID 기반 필터링
    const manager = getWebRTCManager();
    if (manager?.socket?.id && data.socketId === manager.socket.id) {
      console.log('🚫 [useGameRecording] WebRTC Manager Socket에서 발생한 이벤트 무시:', data.socketId);
      return;
    }
    
    const currentUserId = currentPlayer?.guestUserId || currentPlayer?.id;
    
    // 🚫 본인 이벤트 처리 여부 확인 및 무시 (실제 사용자만)
    if (data.guestUserId === currentUserId) {
      if (import.meta.env.DEV && Math.random() < 0.01) {
        console.log('🚫 [handlePreparationStatusUpdated] 본인 이벤트 무시:', {
          receivedId: data.guestUserId,
          currentId: currentUserId,
          isEqual: data.guestUserId === currentUserId,
          playerName: data.nickname
        });
      }
      return; // 본인 이벤트 완전 무시
    }
    
    // 🔄 다른 플레이어 준비 상태 업데이트 수신 (로그 최소화)
    if (import.meta.env.DEV && Math.random() < 0.1) {
      console.log('🔄 [useGameRecording] 다른 플레이어 준비 상태 업데이트:', {
        playerId: data.guestUserId,
        playerName: data.playerName,
        characterSetup: data.characterSetup,
        currentPlayersCount: playersReadyStatus.length
      });
    }
    
    setPlayersReadyStatus(prev => {
      // 다른 플레이어 상태 업데이트 로그 제거 (무한 로그 방지)
      
      const updatedPlayers = prev.map(player => 
        player.playerId === data.guestUserId
          ? { 
              ...player, 
              characterSetup: data.characterSetup,
              screenSetup: data.screenSetup,
              isReady: data.characterSetup && data.screenSetup
            }
          : player
      );
      
      // 해당 플레이어가 목록에 없으면 추가 (새로 입장한 플레이어)
      const existingPlayer = prev.find(p => p.playerId === data.guestUserId);
      if (!existingPlayer) {
        if (import.meta.env.DEV) {
          console.log('➕ [handlePreparationStatusUpdated] 새 플레이어 추가:', {
            playerId: data.guestUserId,
            playerName: data.playerName
          });
        }
        updatedPlayers.push({
          playerId: data.guestUserId,
          playerName: data.playerName,
          characterSetup: data.characterSetup,
          screenSetup: data.screenSetup,
          isReady: data.characterSetup && data.screenSetup
        });
      }
      
      // 최종 업데이트된 플레이어 목록 로그 제거 (무한 로그 방지)
      return updatedPlayers;
    });
  }, [currentPlayer]); // currentPlayer만 의존성으로 유지

  // 모든 플레이어 준비 완료 핸들러
  const handleAllPlayersReady = useCallback(() => {
    console.log('모든 플레이어 준비 완료 - 녹화 시작 준비');
    setRecordingStatus(prev => ({ ...prev, state: 'preparing' }));
  }, []);

  // 녹화 시작 카운트다운 핸들러
  const handleRecordingStartCountdown = useCallback((/* data: { countdown: number } */) => {
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
      const manager = getWebRTCManager();
      if (manager) {
        manager.emitRecordingError({
          roomCode: currentRoom?.roomCode || '',
          playerId: currentPlayer?.guestUserId || '',
          error: error instanceof Error ? error.message : '녹화 시작 실패'
        });
      }
      
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

  // 플레이어 준비 상태 설정 (setup 상태를 외부에서 전달받도록 수정)
  const setPlayerReady = useCallback((isReady: boolean, characterSetup?: boolean, screenSetup?: boolean) => {
    const currentTime = Date.now();
    
    // 중복 호출 방지 (500ms 디바운싱)
    if (isProcessingReady || (currentTime - lastReadyCallTime) < 500) {
      persistentLog('log', '⏸️ [setPlayerReady] 중복 호출 방지 - 무시됨:', {
        isProcessingReady,
        timeSinceLastCall: currentTime - lastReadyCallTime,
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    setIsProcessingReady(true);
    setLastReadyCallTime(currentTime);
    
    persistentLog('log', '🎯 [setPlayerReady] 함수 호출:', {
      isReady,
      characterSetup,
      screenSetup,
      hasCurrentPlayer: !!currentPlayer,
      hasCurrentRoom: !!currentRoom,
      timestamp: new Date().toISOString()
    });
    
    if (!currentPlayer || !currentRoom) {
      console.error('❌ [setPlayerReady] 준비 상태 설정 실패: 플레이어 또는 방 정보 없음', {
        currentPlayer: !!currentPlayer,
        currentRoom: !!currentRoom
      });
      return;
    }

    // 카운트다운 중 준비 취소 시 카운트다운도 취소
    if (!isReady && recordingStatus.autoStartCountdown !== undefined) {
      console.log('🛑 [setPlayerReady] 카운트다운 중 준비 취소 - 자동 시작 취소');
      setRecordingStatus(prev => ({ ...prev, autoStartCountdown: undefined }));
    }

    // 통합된 사용자 식별 사용
    const unifiedUserId = currentPlayer.guestUserId || currentPlayer.id;
    const unifiedNickname = currentPlayer.nickname || '익명';

    // 전달받은 setup 상태 우선 사용, 없으면 내부 상태 사용
    const finalCharacterSetup = characterSetup !== undefined ? characterSetup : characterSetupComplete;
    const finalScreenSetup = screenSetup !== undefined ? screenSetup : screenSetupComplete;

    const prepStatusData = {
      roomCode: currentRoom.roomCode,
      playerId: unifiedUserId,
      playerName: unifiedNickname,
      characterSetup: isReady ? finalCharacterSetup : false, // 준비 취소시 false
      screenSetup: isReady ? finalScreenSetup : false, // 준비 취소시 false
      isReady: isReady
    };

    persistentLog('log', `🎯 [setPlayerReady] 준비 상태 ${isReady ? '설정' : '취소'} 데이터:`, prepStatusData);

    const manager = getWebRTCManager();
    if (manager) {
      persistentLog('log', '✅ [setPlayerReady] WebRTC Manager 확인됨, 이벤트 전송 시작');
      
      // Socket.IO 연결 상태 확인
      const isConnected = manager.isSocketConnected ? manager.isSocketConnected() : 'unknown';
      persistentLog('log', '🔗 [setPlayerReady] Socket.IO 연결 상태:', { isConnected });
      
      // 서버 응답 대기를 위한 임시 리스너 추가 (5초 후 자동 제거)
      const tempListener = (responseData: any) => {
        persistentLog('log', '🔄 [setPlayerReady] 서버에서 preparation-status-updated 응답 수신:', responseData);
        manager.socket.off('preparation-status-updated', tempListener);
      };
      manager.socket.on('preparation-status-updated', tempListener);
      
      // 5초 후 리스너 자동 제거 (메모리 누수 방지)
      setTimeout(() => {
        if (manager.socket) {
          manager.socket.off('preparation-status-updated', tempListener);
          persistentLog('log', '⏰ [setPlayerReady] 임시 리스너 제거됨 (5초 타임아웃)');
        }
      }, 5000);
      
      manager.emitUpdatePreparationStatus(prepStatusData);
      persistentLog('log', '📤 [setPlayerReady] emitUpdatePreparationStatus 호출 완료 - 서버 응답 대기 중...');
    } else {
      persistentLog('log', 'ℹ️ [setPlayerReady] WebRTC Manager가 비활성화됨, 로컬 상태만 업데이트');
    }
    
    // WebRTC 유무에 관계없이 로컬 상태 업데이트 (UI 반응성을 위해)
    persistentLog('log', '🔄 [setPlayerReady] 로컬 상태 업데이트 시작:', {
      playerId: unifiedUserId,
      isReady,
      characterSetup: finalCharacterSetup,
      screenSetup: finalScreenSetup,
      hasWebRTC: !!manager
    });
    
    // 현재 플레이어 상태 업데이트
    setPlayersReadyStatus(prev => {
      const updatedPlayers = prev.map(player => 
        (player.playerId === unifiedUserId || player.playerId === currentPlayer.id)
          ? { 
              ...player, 
              characterSetup: isReady ? finalCharacterSetup : false,
              screenSetup: isReady ? finalScreenSetup : false,
              isReady: isReady && finalCharacterSetup && finalScreenSetup
            }
          : player
      );
      
      // 플레이어가 목록에 없으면 추가 (방 입장 시 초기화되지 않은 경우)
      const existingPlayer = prev.find(p => 
        p.playerId === unifiedUserId || p.playerId === currentPlayer.id
      );
      if (!existingPlayer) {
        persistentLog('log', '➕ [setPlayerReady] 현재 플레이어를 목록에 추가');
        updatedPlayers.push({
          playerId: unifiedUserId,
          playerName: currentPlayer.nickname || '익명',
          characterSetup: isReady ? finalCharacterSetup : false,
          screenSetup: isReady ? finalScreenSetup : false,
          isReady: isReady && finalCharacterSetup && finalScreenSetup
        });
      }
      
      persistentLog('log', '✅ [setPlayerReady] 현재 플레이어 로컬 상태 업데이트 완료:', updatedPlayers);
      return updatedPlayers;
    });
    
    // 처리 상태 리셋 (1초 후)
    setTimeout(() => {
      setIsProcessingReady(false);
      persistentLog('log', '✅ [setPlayerReady] 처리 상태 리셋 완료');
    }, 1000);
  }, [currentPlayer, currentRoom, characterSetupComplete, screenSetupComplete, recordingStatus.autoStartCountdown, isProcessingReady, lastReadyCallTime]);

  // 녹화 종료 (방장 전용)
  const stopRecording = useCallback(() => {
    if (!currentRoom || !isHost()) return;

    console.log('⏹️ [useGameRecording] Host stopping recording...');
    
    const manager = getWebRTCManager();
    if (manager) {
      manager.emitStopRecording({
        roomCode: currentRoom.roomCode,
        hostId: currentPlayer?.guestUserId || ''
      });
    } else {
      console.log('ℹ️ [useGameRecording] WebRTC Manager가 비활성화됨, 로컬 녹화 종료만 실행');
      // WebRTC가 비활성화된 경우에도 로컬 녹화는 종료할 수 있도록 함
      if (gameRecorderRef.current) {
        handleRecordingStopped();
      }
    }
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

  // 설정 상태 업데이트 함수들
  const setCharacterSetup = useCallback((completed: boolean) => {
    setCharacterSetupComplete(completed);
    console.log('🎭 [useGameRecording] 캐릭터 설정 상태:', completed);
  }, []);

  const setScreenSetup = useCallback((completed: boolean) => {
    setScreenSetupComplete(completed);
    console.log('🖥️ [useGameRecording] 화면 설정 상태:', completed);
  }, []);

  // 호스트 전용 자동 녹화 시작 로직 (카운트다운 포함)
  useEffect(() => {
    // 호스트가 아니거나 이미 녹화 중이면 return
    if (!isHost() || recordingStatus.state !== 'idle') {
      return;
    }

    // 모든 플레이어가 실제 플레이어 (WebRTC Manager는 완전히 독립적)
    const realPlayers = playersReadyStatus;

    // 최소 1명 이상의 실제 플레이어가 있고, 모두 준비되었는지 확인
    const allRealPlayersReady = realPlayers.length > 0 && 
      realPlayers.every(player => player.isReady);

    if (allRealPlayersReady) {
      console.log('🚀 [useGameRecording] 모든 플레이어 준비 완료! 자동 녹화 카운트다운 시작:', {
        totalPlayers: realPlayers.length,
        readyPlayers: realPlayers.filter(p => p.isReady).length,
        playersInfo: realPlayers.map(p => ({ name: p.playerName, ready: p.isReady }))
      });

      // 3초 카운트다운 시작
      let countdown = 3;
      setRecordingStatus(prev => ({ ...prev, autoStartCountdown: countdown }));
      
      const countdownInterval = setInterval(() => {
        countdown -= 1;
        if (countdown > 0) {
          setRecordingStatus(prev => ({ ...prev, autoStartCountdown: countdown }));
        } else {
          // 카운트다운 완료 - 녹화 시작
          clearInterval(countdownInterval);
          setRecordingStatus(prev => ({ ...prev, autoStartCountdown: undefined }));
          
          if (currentRoom && recordingStatus.state === 'idle') {
            console.log('⏰ [useGameRecording] 자동 녹화 시작 실행');
            const manager = getWebRTCManager();
            if (manager) {
              manager.emitStartRecording({
                roomCode: currentRoom.roomCode,
                hostId: currentPlayer?.guestUserId || ''
              });
            } else {
              console.log('ℹ️ [useGameRecording] WebRTC Manager가 비활성화됨, 로컬 녹화만 시작');
              // WebRTC가 비활성화된 경우에도 로컬 녹화는 시작할 수 있도록 함
              handleRecordingStarted();
            }
          }
        }
      }, 1000);

      return () => {
        clearInterval(countdownInterval);
        setRecordingStatus(prev => ({ ...prev, autoStartCountdown: undefined }));
      };
    } else {
      // 모든 플레이어가 준비되지 않았으면 카운트다운 취소
      if (recordingStatus.autoStartCountdown !== undefined) {
        setRecordingStatus(prev => ({ ...prev, autoStartCountdown: undefined }));
      }
    }
  }, [playersReadyStatus, recordingStatus.state, currentRoom, currentPlayer]);

  // 준비 상태 통계 계산 함수 제거 (ButtonContainer에서 더 이상 사용하지 않음)

  // 자동 시작 취소 함수
  const cancelAutoStart = useCallback(() => {
    if (recordingStatus.autoStartCountdown !== undefined) {
      console.log('🛑 [useGameRecording] 자동 시작 수동 취소');
      setRecordingStatus(prev => ({ ...prev, autoStartCountdown: undefined }));
    }
  }, [recordingStatus.autoStartCountdown]);

  return {
    recordingStatus,
    playersReadyStatus,
    allPlayersReady,
    isHost: isHost(),
    formatTime,
    setPlayerReady,
    stopRecording,
    getGameRecorder,
    cancelAutoStart,
    // 설정 상태 관련
    characterSetupComplete,
    screenSetupComplete,
    setCharacterSetup,
    setScreenSetup
  };
};