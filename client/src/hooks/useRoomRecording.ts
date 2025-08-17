import { useCallback, useRef } from 'react';
import { GameRecorder } from '../utils/GameRecorder';
import type { Player, Room } from '../types/room';

interface UseRoomRecordingProps {
  currentRoom: Room | null;
  currentPlayer: Player | null;
  isRecording: boolean;
  onRecordingStateChange: (isRecording: boolean) => void;
}

export function useRoomRecording({
  currentRoom,
  currentPlayer,
  isRecording,
  onRecordingStateChange
}: UseRoomRecordingProps) {
  const gameRecorderRef = useRef<GameRecorder | null>(null);

  // GameRecorder 인스턴스 가져오기
  const getGameRecorder = useCallback((): GameRecorder => {
    if (!gameRecorderRef.current) {
      gameRecorderRef.current = new GameRecorder();
      console.log('🎬 [useRoomRecording] 새 GameRecorder 인스턴스 생성');
    }
    return gameRecorderRef.current;
  }, []);

  // 화면 선택 (설정 단계)
  const selectScreen = useCallback(async (): Promise<boolean> => {
    try {
      const recorder = getGameRecorder();
      const result = await recorder.selectScreen();
      
      if (result.success) {
        console.log('✅ [useRoomRecording] 화면 선택 성공');
        return true;
      } else {
        console.error('❌ [useRoomRecording] 화면 선택 실패:', result.error);
        alert(`화면 선택에 실패했습니다: ${result.error}`);
        return false;
      }
    } catch (error) {
      console.error('❌ [useRoomRecording] 화면 선택 오류:', error);
      alert('화면 선택 중 오류가 발생했습니다.');
      return false;
    }
  }, [getGameRecorder]);

  // 녹화 시작
  const startRecording = useCallback(async () => {
    if (!currentRoom || !currentPlayer) {
      console.error('❌ [useRoomRecording] 방 또는 플레이어 정보 없음');
      return;
    }

    if (isRecording) {
      console.warn('⚠️ [useRoomRecording] 이미 녹화 중');
      return;
    }

    try {
      console.log('🎬 [useRoomRecording] 녹화 시작 요청');
      
      const recorder = getGameRecorder();
      await recorder.startRecording(
        currentRoom.roomCode,
        currentPlayer.guestUserId || currentPlayer.id || '',
        currentRoom.gameName || 'Unknown Game'
      );

      onRecordingStateChange(true);
      console.log('✅ [useRoomRecording] 녹화 시작 완료');

    } catch (error) {
      console.error('❌ [useRoomRecording] 녹화 시작 실패:', error);
      alert(`녹화 시작에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      onRecordingStateChange(false);
    }
  }, [currentRoom, currentPlayer, isRecording, getGameRecorder, onRecordingStateChange]);

  // 녹화 종료 및 파일 업로드
  const stopRecording = useCallback(async () => {
    if (!currentRoom || !currentPlayer) {
      console.error('❌ [useRoomRecording] 방 또는 플레이어 정보 없음');
      return;
    }

    if (!isRecording) {
      console.warn('⚠️ [useRoomRecording] 녹화 중이 아님');
      return;
    }

    try {
      console.log('⏹️ [useRoomRecording] 녹화 종료 및 업로드 시작');
      
      const recorder = getGameRecorder();
      const uploadResult = await recorder.stopRecording(
        currentRoom.roomCode,
        currentPlayer.guestUserId || currentPlayer.id || '',
        currentRoom.gameName || 'Unknown Game'
      );

      onRecordingStateChange(false);
      console.log('✅ [useRoomRecording] 녹화 종료 및 업로드 완료:', uploadResult);

      // 업로드 결과에 따른 사용자 피드백
      if (uploadResult?.success) {
        const duration = uploadResult.duration || 0;
        const durationText = `${Math.floor(duration / 60)}분 ${duration % 60}초`;
        
        console.log('🎉 [useRoomRecording] 업로드 성공:', {
          videoFile: uploadResult.videoFile,
          audioFile: uploadResult.audioFile,
          duration: durationText,
          uploadTime: uploadResult.uploadTime
        });
        
        alert(`✅ 녹화 완료!\n\n` +
              `📹 비디오: ${uploadResult.videoFile || 'recording.mp4'}\n` +
              `🎵 오디오: ${uploadResult.audioFile || 'audio.wav'}\n` +
              `⏱️ 녹화 시간: ${durationText}\n\n` +
              `파일이 서버에 성공적으로 업로드되었습니다.`);
      } else {
        const errorMsg = uploadResult?.error || '알 수 없는 오류';
        console.error('❌ [useRoomRecording] 업로드 실패:', errorMsg);
        
        alert(`⚠️ 업로드 실패\n\n` +
              `녹화는 완료되었지만 서버 업로드에 실패했습니다.\n` +
              `오류: ${errorMsg}\n\n` +
              `로컬에 저장된 파일은 유지됩니다.`);
      }

    } catch (error) {
      console.error('❌ [useRoomRecording] 녹화 종료 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      
      alert(`❌ 녹화 종료 실패\n\n` +
            `${errorMessage}\n\n` +
            `다시 시도해주세요.`);
      
      // 에러가 발생해도 상태는 초기화
      onRecordingStateChange(false);
    }
  }, [currentRoom, currentPlayer, isRecording, getGameRecorder, onRecordingStateChange]);

  // 녹화 상태 확인
  const getRecordingState = useCallback(() => {
    const recorder = gameRecorderRef.current;
    return recorder ? recorder.getState() : null;
  }, []);

  // cleanup
  const cleanup = useCallback(() => {
    if (gameRecorderRef.current) {
      // 녹화 중이면 강제 종료 (데이터 손실 방지)
      const recorder = gameRecorderRef.current;
      const state = recorder.getState();
      if (state?.isRecording) {
        console.warn('⚠️ [useRoomRecording] cleanup 시 녹화 강제 종료');
        recorder.stopRecording(
          currentRoom?.roomCode || '',
          currentPlayer?.guestUserId || '',
          currentRoom?.gameName || ''
        ).catch(console.error);
      }
      gameRecorderRef.current = null;
    }
  }, [currentRoom, currentPlayer]);

  return {
    selectScreen,
    startRecording,
    stopRecording,
    getRecordingState,
    cleanup,
    gameRecorder: gameRecorderRef.current
  };
}