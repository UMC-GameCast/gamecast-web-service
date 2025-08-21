import React, { useState } from 'react';
import { useUnifiedGamecast } from '../../contexts/UnifiedGamecastContext';

// 임시 타입 정의 (import 문제 우회)
interface ConversionProgress {
  phase: 'loading' | 'converting' | 'finalizing' | 'complete';
  percentage: number;
  timeRemaining?: string;
  currentStep?: string;
}

/**
 * 개발용 강제 녹화 시작 버튼
 * - 스티키 형태로 화면 우하단에 고정
 * - 기존 UI 레이아웃에 영향 없음
 * - 개발 환경에서만 표시
 */
const DevRecordingButton: React.FC = () => {
  const { state, actions } = useUnifiedGamecast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState<ConversionProgress | null>(null);

  // 개발 환경에서만 표시
  const isDevelopment = import.meta.env.DEV;
  
  // 디버깅: 일시적으로 항상 표시
  console.log('🔍 [DevButton] 렌더링 체크:', {
    isDevelopment,
    currentRoom: !!state.currentRoom,
    realtimeSocket: !!state.realtime.socket,
    socketConnected: !!state.realtime.socket?.connected,
    isRecording: state.recording.isRecording,
    env: import.meta.env
  });
  
  // if (!isDevelopment) {
  //   return null;
  // }

  // 방에 참여하지 않으면 표시 안함 (소켓 조건 일시 제거)
  if (!state.currentRoom) {
    return null;
  }

  // 녹화 상태에 관계없이 항상 표시 (시작/종료 토글)

  const handleToggleRecording = async () => {
    if (isProcessing || state.recording.uploading) return;
    
    setIsProcessing(true);
    
    try {
      if (state.recording.isRecording) {
        // 녹화 중 - 종료
        console.log('🛑 [DevButton] 개발용 녹화 종료 요청');
        await actions.stopRecording();
        console.log('✅ [DevButton] 녹화 종료 완료');
        alert('녹화가 종료되었습니다! 파일이 업로드되었습니다.');
      } else {
        // 녹화 중 아님 - 시작
        console.log('🚨 [DevButton] 개발용 녹화 시작 요청');
        
        // 화면 설정 상태 확인
        const gameRecorderRef = actions.gameRecorder;
        console.log('🖥️ [DevButton] 녹화 시작 전 상태 확인:', {
          hasGameRecorder: !!gameRecorderRef,
          isScreenSelected: gameRecorderRef?.isScreenSelected?.(),
          hasScreenMethod: typeof gameRecorderRef?.isScreenSelected === 'function',
          timestamp: new Date().toLocaleTimeString()
        });
        
        await actions.startRecording();
        console.log('✅ [DevButton] 녹화 시작 완료');
        alert('녹화가 시작되었습니다!');
      }
    } catch (error) {
      console.error('❌ [DevButton] 녹화 토글 실패:', error);
      alert(`녹화 ${state.recording.isRecording ? '종료' : '시작'} 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      // 3초 후 버튼 재활성화 (연속 클릭 방지)
      setTimeout(() => {
        setIsProcessing(false);
      }, 3000);
    }
  };

  const handleTestConversion = async () => {
    if (isConverting) return;
    
    setIsConverting(true);
    setConversionProgress({ phase: 'loading', percentage: 0 });

    try {
      console.log('🧪 [DevButton] 변환 테스트 시작');
      
      // GameRecorder 인스턴스 가져오기 (UnifiedGamecastContext에서)
      const gameRecorderRef = actions.gameRecorder;
      if (!gameRecorderRef) {
        throw new Error('GameRecorder 인스턴스가 없습니다');
      }

      // 변환 진행률 콜백 설정
      gameRecorderRef.setConversionProgressCallback((progress: ConversionProgress) => {
        setConversionProgress(progress);
        console.log('📊 [DevButton] 변환 진행률:', progress);
      });

      // 녹화된 데이터가 있는지 확인
      const recordedData = gameRecorderRef.hasRecordedData();
      const hasVideoData = recordedData.hasVideo;
      const hasAudioData = recordedData.hasAudio;
      
      if (!hasVideoData && !hasAudioData) {
        throw new Error('녹화된 데이터가 없습니다. 먼저 화면 녹화를 진행해주세요.');
      }

      // 테스트용 룸/유저 정보
      const roomCode = state.currentRoom?.roomCode || 'TEST_ROOM';
      const userId = state.currentPlayer?.guestUserId || 'TEST_USER';
      const gameTitle = 'TestGame';

      console.log('📊 [DevButton] 변환할 데이터 확인:', {
        hasVideoData,
        hasAudioData,
        roomCode,
        userId
      });

      let results: { video: any; audio: any };

      if (hasVideoData && hasAudioData) {
        // 비디오와 오디오 모두 변환
        results = await gameRecorderRef.convertAndDownloadAll(roomCode, userId, gameTitle);
      } else if (hasVideoData) {
        // 비디오만 변환
        const videoResult = await gameRecorderRef.convertAndDownloadMP4(roomCode, userId, gameTitle);
        results = { video: videoResult, audio: { success: false, error: '오디오 데이터 없음' } };
      } else {
        // 오디오만 변환
        const audioResult = await gameRecorderRef.convertAndDownloadWAV(roomCode, userId, gameTitle);
        results = { video: { success: false, error: '비디오 데이터 없음' }, audio: audioResult };
      }

      if (results.video.success || results.audio.success) {
        console.log('🎉 [DevButton] 변환 테스트 성공!');
        alert(`변환 완료! ${results.video.success ? 'MP4' : ''}${results.video.success && results.audio.success ? ' + ' : ''}${results.audio.success ? 'WAV' : ''} 파일이 다운로드되었습니다.`);
      } else {
        throw new Error(`변환 실패: Video=${results.video.error}, Audio=${results.audio.error}`);
      }

    } catch (error) {
      console.error('❌ [DevButton] 변환 테스트 실패:', error);
      alert(`변환 테스트 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsConverting(false);
      setConversionProgress(null);
    }
  };

  // 녹화된 원본 파일 다운로드 (WebM)
  const handleDownloadOriginal = () => {
    try {
      console.log('📥 [DevButton] 원본 파일 다운로드 시작');
      
      const gameRecorderRef = actions.gameRecorder;
      if (!gameRecorderRef) {
        throw new Error('GameRecorder 인스턴스가 없습니다');
      }

      const recordedData = gameRecorderRef.hasRecordedData();
      if (!recordedData.hasVideo && !recordedData.hasAudio) {
        throw new Error('녹화된 데이터가 없습니다. 먼저 녹화를 진행해주세요.');
      }

      const roomCode = state.currentRoom?.roomCode || 'TEST_ROOM';
      const userId = state.currentPlayer?.guestUserId || 'TEST_USER';
      const gameTitle = 'DevTest';

      gameRecorderRef.downloadOriginalFiles(roomCode, userId, gameTitle);
      
      console.log('✅ [DevButton] 원본 파일 다운로드 시작됨');
      alert('원본 WebM 파일 다운로드가 시작되었습니다!');

    } catch (error) {
      console.error('❌ [DevButton] 원본 파일 다운로드 실패:', error);
      alert(`원본 파일 다운로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  };

  // 서버 업로드 핸들러
  const handleUploadToServer = async () => {
    if (isProcessing || isConverting) return;

    setIsProcessing(true);

    try {
      console.log('📤 [DevButton] 서버 업로드 시작');
      
      const gameRecorderRef = actions.gameRecorder;
      if (!gameRecorderRef) {
        throw new Error('GameRecorder 인스턴스가 없습니다');
      }

      const recordedData = gameRecorderRef.hasRecordedData();
      if (!recordedData.hasVideo && !recordedData.hasAudio) {
        throw new Error('업로드할 녹화 데이터가 없습니다. 먼저 녹화를 진행해주세요.');
      }

      await actions.uploadRecordingToServer();
      
      console.log('✅ [DevButton] 서버 업로드 완료');
      alert('서버 업로드가 완료되었습니다!');

    } catch (error) {
      console.error('❌ [DevButton] 서버 업로드 실패:', error);
      alert(`서버 업로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
      }, 3000);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col space-y-2">
      {/* 변환 진행률 표시 */}
      {conversionProgress && (
        <div className="bg-black/80 text-white p-3 rounded-lg max-w-64">
          <div className="text-xs mb-1">{conversionProgress.currentStep || '변환 중...'}</div>
          <div className="bg-gray-700 rounded-full h-2 mb-1">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${conversionProgress.percentage}%` }}
            />
          </div>
          <div className="text-xs text-gray-300">{conversionProgress.percentage}%</div>
        </div>
      )}

      {/* 버튼들 */}
      <div className="flex space-x-2">
        {/* 녹화 시작/종료 토글 버튼 */}
        <button
          onClick={handleToggleRecording}
          disabled={isProcessing || isConverting || state.recording.uploading}
          className={`
            px-3 py-2 rounded-lg text-white font-medium text-sm shadow-lg
            transition-all duration-200 ease-in-out
            ${isProcessing || isConverting || state.recording.uploading
              ? 'bg-gray-500 cursor-not-allowed opacity-70' 
              : state.recording.isRecording
                ? 'bg-red-600 hover:bg-red-700 hover:shadow-xl active:scale-95'
                : 'bg-green-600 hover:bg-green-700 hover:shadow-xl active:scale-95'
            }
          `}
          title={`개발용: 녹화 ${state.recording.isRecording ? '종료' : '시작'}`}
        >
          {isProcessing || state.recording.uploading ? (
            <div className="flex items-center space-x-1">
              <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
              <span>{state.recording.uploading ? '업로드중' : '처리중'}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1">
              <span>{state.recording.isRecording ? '🛑' : '🎬'}</span>
              <span>{state.recording.isRecording ? '종료' : '녹화'}</span>
            </div>
          )}
        </button>

        {/* 변환 테스트 버튼 */}
        <button
          onClick={handleTestConversion}
          disabled={isProcessing || isConverting}
          className={`
            px-3 py-2 rounded-lg text-white font-medium text-sm shadow-lg
            transition-all duration-200 ease-in-out
            ${isProcessing || isConverting
              ? 'bg-gray-500 cursor-not-allowed opacity-70' 
              : 'bg-blue-600 hover:bg-blue-700 hover:shadow-xl active:scale-95'
            }
          `}
          title="개발용: MP4/WAV 변환 테스트"
        >
          {isConverting ? (
            <div className="flex items-center space-x-1">
              <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
              <span>변환중</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1">
              <span>🔄</span>
              <span>변환</span>
            </div>
          )}
        </button>

        {/* 원본 파일 다운로드 버튼 */}
        <button
          onClick={handleDownloadOriginal}
          disabled={isProcessing || isConverting}
          className={`
            px-3 py-2 rounded-lg text-white font-medium text-sm shadow-lg
            transition-all duration-200 ease-in-out
            ${isProcessing || isConverting
              ? 'bg-gray-500 cursor-not-allowed opacity-70' 
              : 'bg-purple-600 hover:bg-purple-700 hover:shadow-xl active:scale-95'
            }
          `}
          title="개발용: 녹화된 원본 WebM 파일 다운로드"
        >
          <div className="flex items-center space-x-1">
            <span>📥</span>
            <span>원본</span>
          </div>
        </button>

        {/* 서버 업로드 버튼 */}
        <button
          onClick={handleUploadToServer}
          disabled={isProcessing || isConverting || state.recording.uploading}
          className={`
            px-3 py-2 rounded-lg text-white font-medium text-sm shadow-lg
            transition-all duration-200 ease-in-out
            ${isProcessing || isConverting || state.recording.uploading
              ? 'bg-gray-500 cursor-not-allowed opacity-70' 
              : 'bg-orange-600 hover:bg-orange-700 hover:shadow-xl active:scale-95'
            }
          `}
          title="개발용: 녹화된 데이터를 서버로 업로드"
        >
          {state.recording.uploading ? (
            <div className="flex items-center space-x-1">
              <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
              <span>업로드</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1">
              <span>📤</span>
              <span>서버</span>
            </div>
          )}
        </button>
      </div>
      
      {/* 개발용임을 알리는 작은 라벨 */}
      <div className="absolute -top-6 right-0 text-xs text-gray-500 bg-yellow-100 px-2 py-1 rounded">
        DEV ONLY
      </div>
    </div>
  );
};

export default DevRecordingButton;