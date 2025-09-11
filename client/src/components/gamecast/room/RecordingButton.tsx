import React, { useState, useEffect, useCallback, useRef } from "react";
import { RoomButton } from "./RoomButton";
import { useUnifiedGamecast } from "../../../contexts/UnifiedGamecastContext";

interface RecordingButtonProps {
  isHost: boolean;
  isPlayerReady: boolean;
  allPlayersReady: boolean;
  isReadyEnabled: boolean;
  characterSetupComplete: boolean;
  screenSetupComplete: boolean;
  onReadyToggle?: () => void;
}

/**
 * 녹화/준비 상태를 담당하는 전용 버튼 컴포넌트
 * 렌더링 최적화를 위해 ButtonContainer에서 분리
 */
export const RecordingButton: React.FC<RecordingButtonProps> = ({
  isHost,
  isPlayerReady,
  allPlayersReady,
  isReadyEnabled,
  characterSetupComplete,
  screenSetupComplete,
  onReadyToggle
}) => {
  // 렌더링 카운트 증가 (useRef로 무한루프 방지)
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  
  console.log('🚀 [RecordingButton] 컴포넌트 시작됨 - 렌더링 #' + renderCountRef.current);
  
  const [isHoveringHostButton, setIsHoveringHostButton] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [forceUpdate, setForceUpdate] = useState(0);
  
  const context = useUnifiedGamecast();
  console.log('🔗 [RecordingButton] Context 연결 상태:', !!context);
  
  if (!context) {
    console.error('❌ [RecordingButton] UnifiedGamecastContext not found');
    return <div>Context Not Found</div>;
  }
  
  const { state, actions } = context;
  const { preparation, recording, ui } = state;
  
  console.log('🎯 [RecordingButton] 렌더링:', {
    isRecording: recording.isRecording,
    startTime: recording.startTime,
    forceUpdate,
    contextForceRender: ui.forceRender,
    fullRecordingObject: recording,
    contextObjectReference: context,
    stateObjectReference: state,
    timestamp: new Date().toLocaleTimeString()
  });
  
  // Context 상태와 실제 화면 표시값 비교
  console.log('🔍 [RecordingButton] Context vs 실제 표시값 비교:', {
    contextIsRecording: recording.isRecording,
    contextStartTime: recording.startTime,
    screenDisplayValue: `isRecording=${recording.isRecording ? 'true' : 'false'}, startTime=${recording.startTime || 'null'}`,
    timestamp: new Date().toLocaleTimeString()
  });
  
  // Context 상태 변화 감지 및 강제 리렌더링 - 모든 recording 객체 변화 추적
  useEffect(() => {
    console.log('🔄 [RecordingButton] Context 상태 변화 감지:', {
      isRecording: recording.isRecording,
      startTime: recording.startTime,
      uploading: recording.uploading,
      uploadProgress: recording.uploadProgress,
      allPlayersReady,
      uiForceRender: ui.forceRender,
      recordingObjectReference: recording,
      timestamp: new Date().toLocaleTimeString()
    });
    
    // 녹화 상태가 변경되면 강제 리렌더링
    if (recording.isRecording && recording.startTime) {
      console.log('⚡ [RecordingButton] 녹화 시작 감지 - 강제 리렌더링');
      setForceUpdate(prev => prev + 1);
    }
  }, [recording, allPlayersReady, ui.forceRender, context, state, preparation]); // 더 많은 Context 값을 의존성에 추가
  
  // 추가로 recording.isRecording만 따로 추적
  useEffect(() => {
    console.log('🎬 [RecordingButton] isRecording 단독 변화 감지:', recording.isRecording);
  }, [recording.isRecording]);
  
  // Context state 전체 변화 감지 (Socket 제외한 주요 상태만)
  useEffect(() => {
    console.log('🌐 [RecordingButton] Context state 전체 변화 감지:', {
      recordingKeys: Object.keys(recording),
      preparationKeys: Object.keys(preparation),
      uiKeys: Object.keys(ui)
    });
  }, [recording, preparation, ui, state.participants?.length]);
  
  // 녹화 시간 계산 (실시간 업데이트)
  useEffect(() => {
    console.log('🔍 [RecordingButton] 녹화 시간 useEffect 실행:', {
      isRecording: recording.isRecording,
      startTime: recording.startTime,
      hasStartTime: !!recording.startTime,
      timestamp: new Date().toLocaleTimeString()
    });
    
    let interval: NodeJS.Timeout;
    if (recording.isRecording && recording.startTime) {
      console.log('⏰ [RecordingButton] 녹화 시간 계산 시작');
      interval = setInterval(() => {
        const duration = Date.now() - recording.startTime!;
        setRecordingDuration(duration);
        if (Math.random() < 0.1) { // 10% 확률로만 로깅
          console.log('⏱️ [RecordingButton] 녹화 시간 업데이트:', formatTime(duration));
        }
      }, 100);
    } else {
      console.log('⏹️ [RecordingButton] 녹화 시간 리셋');
      setRecordingDuration(0);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
        console.log('🔄 [RecordingButton] 녹화 시간 인터벌 정리');
      }
    };
  }, [recording.isRecording, recording.startTime]);
  
  // 시간 포맷팅 함수
  const formatTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // 버튼 클릭 핸들러
  const handleClick = () => {
    console.log('🎮 [RecordingButton] 클릭:', {
      isRecording: recording.isRecording,
      uploading: recording.uploading,
      isHost,
      allPlayersReady,
      timestamp: new Date().toISOString()
    });
    
    if (recording.uploading) {
      console.log('⚠️ [RecordingButton] 업로드 중이므로 클릭 무시');
      return;
    }
    
    if (recording.isRecording) {
      // 녹화 중 - 호스트만 종료 가능
      if (isHost) {
        console.log('🛑 [RecordingButton] 호스트가 녹화 종료 요청');
        try {
          // 서버에 host-stop-recording 이벤트 발송 (모든 플레이어 동기화)
          actions.hostStopRecording();
          console.log('✅ [RecordingButton] 호스트 녹화 종료 이벤트 발송 완료');
        } catch (error) {
          console.error('❌ [RecordingButton] 호스트 녹화 종료 실패:', error);
        }
      } else {
        console.log('⚠️ [RecordingButton] 게스트는 녹화를 종료할 수 없음');
      }
      return;
    }
    
    if (allPlayersReady) {
      // 자동 녹화 시스템 활성화 상태 - 클릭 무시
      console.log('⚠️ [RecordingButton] 모든 플레이어 준비 완료 - 자동 녹화 대기 중');
      return;
    } else {
      // 준비 상태 토글
      if (isReadyEnabled) {
        const newReadyState = !isPlayerReady;
        console.log(`🔄 [RecordingButton] 준비 상태 변경: ${isPlayerReady} → ${newReadyState}`);
        
        actions.updatePreparation({
          characterSetup: characterSetupComplete,
          screenSetup: screenSetupComplete,
          isReady: newReadyState
        });
        
        onReadyToggle?.();
      } else {
        console.warn('⚠️ [RecordingButton] 준비 버튼이 비활성화 상태');
      }
    }
  };
  
  // 버튼 텍스트 결정
  const getButtonText = (): string => {
    console.log('🎯 [RecordingButton] getButtonText 호출:', {
      uploading: recording.uploading,
      isRecording: recording.isRecording,
      hasStartTime: !!recording.startTime,
      startTime: recording.startTime,
      recordingDuration,
      allPlayersReady,
      isHost,
      timestamp: new Date().toLocaleTimeString()
    });
    
    // 1순위: 업로드 중
    if (recording.uploading) {
      console.log('📤 [RecordingButton] 업로드 중 텍스트 반환');
      const progressPercent = recording.uploadProgress || 0;
      return `업로드 중 ${progressPercent}%`;
    }
    
    // 2순위: 녹화 중 (강화된 조건)
    if (recording.isRecording && recording.startTime) {
      const timeText = formatTime(recordingDuration);
      console.log('🎬 [RecordingButton] 녹화 중 텍스트 반환:', {
        timeText,
        recordingDuration,
        isHost,
        isHoveringHostButton
      });
      
      if (isHost) {
        // 호스트가 마우스 호버 시 "녹화 종료" 표시
        return isHoveringHostButton ? "녹화 종료" : `녹화중 ${timeText}`;
      } else {
        // 게스트는 항상 시간만 표시
        return `녹화중 ${timeText}`;
      }
    }
    
    // 3순위: 모든 플레이어 준비 완료
    if (allPlayersReady && !recording.isRecording) {
      console.log('✅ [RecordingButton] 모든 플레이어 준비 완료 텍스트');
      return "녹화가 곧 시작됩니다";
    }
    
    // 4순위: 기본 준비 상태 텍스트
    const basicText = isPlayerReady ? "준비 취소" : "준비하기";
    console.log(`🎮 [RecordingButton] 기본 준비 상태 텍스트: ${basicText}`);
    return basicText;
  };
  
  // 버튼 비활성화 상태 결정
  const getButtonDisabled = (): boolean => {
    // 업로드 중에는 비활성화
    if (recording.uploading) return true;
    
    // 녹화 중에는 호스트만 종료 가능
    if (recording.isRecording) return !isHost;
    
    // 모든 플레이어 준비 완료 시에는 자동 시스템 활성화
    if (allPlayersReady) return true;
    
    // 기본적으로 준비 상태 토글은 설정 완료 시에만 가능
    return !isReadyEnabled;
  };
  
  return (
    <div
      onMouseEnter={() => {
        // 호스트 버튼 호버 상태 관리
        if (recording.isRecording && isHost) {
          setIsHoveringHostButton(true);
        }
      }}
      onMouseLeave={() => {
        setIsHoveringHostButton(false);
      }}
    >
      
      <RoomButton 
        key={`recording-${recording.isRecording ? '1' : '0'}-${recording.startTime || 0}-${Math.floor(recordingDuration/1000)}-${allPlayersReady ? '1' : '0'}-${forceUpdate}-${ui.forceRender}`}
        onClick={handleClick}
        disabled={getButtonDisabled()}
        isReady={isPlayerReady && !allPlayersReady && !recording.isRecording}
      >
        {getButtonText()}
      </RoomButton>
    </div>
  );
};