import React, { Component, useEffect, useState, useMemo } from "react";
import type { ErrorInfo } from "react";
import { Navigation } from "../../../components/gamecast/common/Navigation";
import { Footer } from "../../../components/gamecast/common/Footer";
import { BackButton1 } from "../../../components/gamecast/common/BackButton1";
import { ButtonContainer } from "../../../components/gamecast/room/ButtonContainer.tsx";
import { RoomInfoContainer } from "../../../components/gamecast/room/RoomInfoContainer";
import { MyCharacterContainer } from "../../../components/gamecast/room/MyCharacterContainer";
import { NicknameContainer } from "../../../components/gamecast/room/NicknameContainer";
import SettingIcon from "../../../assets/gamecast/Room/setting.svg?react";
import { PlayerGrid } from "../../../components/gamecast/room/PlayerGrid.tsx";
import { MicrophonePermissionGuide } from "../../../components/gamecast/common/MicrophonePermissionGuide";
import { MicrophoneStatusIndicator } from "../../../components/gamecast/common/MicrophoneStatusIndicator";
import DevRecordingButton from "../../../components/common/DevRecordingButton";
import { logMediaFormatSupport } from "../../../utils/MediaFormatChecker";

// 올바른 닉네임을 표시하기 위한 유틸리티 함수 (participants 목록 기반)
const getDisplayNickname = (player: any, allParticipants?: any[]): string => {
  // Socket 통신에서는 호스트가 guestUserId를 닉네임으로 사용하지만
  // UI에서는 원래 의도된 닉네임 규칙을 따라야 함
  
  // 전체 참여자 목록이 있는 경우, 그것을 기준으로 순번 결정
  if (allParticipants && Array.isArray(allParticipants) && allParticipants.length > 0) {
    // 호스트 찾기 (서버에서 오는 데이터 기반)
    const hostPlayer = allParticipants.find(p => p.role === 'host' || p.isHost);
    
    // 현재 플레이어가 호스트인지 확인
    if (hostPlayer && (hostPlayer.guestUserId === player.guestUserId || hostPlayer.id === player.id)) {
      return "Nickname1";
    }
    
    // 호스트가 아닌 참여자들만 필터링
    const participantPlayers = allParticipants.filter(p => p.role !== 'host' && !p.isHost);
    
    // 현재 플레이어의 인덱스 찾기
    const playerIndex = participantPlayers.findIndex(p => 
      p.guestUserId === player.guestUserId || p.id === player.id
    );
    
    if (playerIndex >= 0) {
      return `Nickname${playerIndex + 2}`; // 참여자는 Nickname2부터 시작
    }
  }
  
  // 개별 플레이어 데이터만으로 호스트 확인
  if (player.role === 'host' || player.isHost) {
    return "Nickname1";
  }
  
  // 기존 닉네임이 올바른 형식이면 그대로 사용
  if (player.nickname && player.nickname.startsWith('Nickname') && /^Nickname\d+$/.test(player.nickname)) {
    return player.nickname;
  }
  
  // UUID 형태의 닉네임인 경우 (Socket 우회로 인한 잘못된 닉네임)
  // 기본적으로 "Nickname2"로 설정 (게스트 사용자의 기본값)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(player.nickname)) {
    return "Nickname2"; // UUID 닉네임의 경우 게스트로 간주
  }
  
  // 그 외의 경우 원래 닉네임 사용
  return player.nickname || "Nickname2";
};
import { 
  useUnifiedGamecast
} from "../../../contexts/UnifiedGamecastContext";
import { useNavigate, useLocation } from "react-router-dom";

interface ErrorBoundaryState {
  hasError: boolean;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    console.error('ErrorBoundary caught an error:', error);
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

/**
 * 방 정보 표시 페이지 컴포넌트 (Context 기반)
 * 입장코드, 방이름, 참여자 목록을 표시합니다
 */
export const RoomPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // 🎯 통합 Context 사용 (단일 소스)
  const context = useUnifiedGamecast();
  
  // 🎬 미디어 포맷 지원 확인 (한 번만 실행)
  React.useEffect(() => {
    logMediaFormatSupport();
  }, []);
  
  // Context null 체크
  if (!context) {
    console.error('❌ [RoomPage] UnifiedGamecastContext가 null입니다');
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[linear-gradient(180deg,rgba(0,0,0,1)_0%,rgba(0,6,72,1)_100%)]">
        <p className="text-white text-lg mb-4">Context 오류</p>
        <p className="text-red-400 mb-4">UnifiedGamecastContext를 찾을 수 없습니다</p>
      </div>
    );
  }
  
  const { state, actions } = context;
  const { 
    currentRoom, 
    currentPlayer, 
    participants,
    loading, 
    error
  } = state;
  
  // Context 상태 로그 제거 (준비 상태와 무관)

  // 액션들
  const { 
    refreshRoomState, 
    leaveRoom: handleLeaveRoom
    // initializeSocket은 Context에서만 사용
  } = actions;

  // 🚫 WebRTC 비활성화됨 - 기본값 사용
  const localStream = null;
  const remoteStreams = new Map<string, MediaStream>();
  const voiceChatConnected = false;
  const isLocalMuted = false;
  const toggleLocalAudio = () => false;

  // Context에서 준비 상태 가져오기 (안전한 접근)
  const { preparation, recording } = state;
  const characterSetupComplete = preparation?.characterSetup || false;
  const screenSetupComplete = preparation?.screenSetup || false;
  const isReady = preparation?.isReady || false;
  const updatePreparation = actions.updatePreparation;
  
  // 녹화 상태 가져오기 (안전한 접근)
  const isRecording = recording?.isRecording || false;
  const recordingTime = recording?.recordingTime || 0;
  const startRecording = actions.startRecording;
  const stopRecording = actions.stopRecording;
  
  // 마이크 가이드 상태만 필요
  const [showMicGuide, setShowMicGuide] = useState(false);

  // 캐릭터 설정 상태 확인 (안전한 접근)
  const hasCharacterSetup = currentPlayer?.characterInfo?.isCustomized || false;
  
  // 준비 버튼 활성화 상태 (캐릭터 설정과 화면 설정이 모두 완료되어야 함)
  const isReadyEnabled = characterSetupComplete && screenSetupComplete;
  
  // 실제 참여자 목록은 아래 useMemo에서 정의됨
  
  // 주요 상태 체크 로그 제거 (준비 상태 체크는 별도)


  // 🔗 Socket 상태 모니터링 (Context에서 관리, RoomPage는 상태만 확인)
  useEffect(() => {
    // Socket 연결 상태만 로깅 (초기화는 Context에서만 처리)
    if (currentRoom && currentPlayer) {
      console.log('🔗 [RoomPage] Socket 상태 확인:', {
        roomCode: currentRoom.roomCode,
        playerName: currentPlayer.nickname,
        playerId: currentPlayer.guestUserId,
        socketConnected: !!state.realtime.socket?.connected,
        socketId: state.realtime.socket?.id || 'none'
      });
    }
  }, [currentRoom, currentPlayer, state.realtime.socket?.connected]);

  // 🔍 임시 디버깅: participants 변화 모니터링 (강화)
  useEffect(() => {
    console.log('🚨🚨 [RoomPage] participants 변경 감지!', {
      count: participants?.length || 0,
      participants: participants?.map(p => ({
        nickname: p.nickname,
        guestUserId: p.guestUserId,
        isHost: p.isHost
      })) || [],
      participantsRef: participants,
      directStateParticipants: state.participants?.length || 0,
      areSame: participants === state.participants,
      timestamp: new Date().toLocaleTimeString()
    });
  }, [participants, state.participants]);

  // 🚀 SPA 네비게이션에서 캐릭터 업데이트 감지
  useEffect(() => {
    const navigationState = location.state as any;
    if (navigationState?.characterUpdated) {
      console.log('⚡ [RoomPage] 캐릭터 업데이트 후 SPA 복귀 감지:', {
        timestamp: navigationState.timestamp,
        currentPlayerCharacter: currentPlayer?.characterInfo,
        triggeringRefresh: true
      });
      
      // 🔄 상태 강제 새로고침
      if (refreshRoomState) {
        setTimeout(() => {
          console.log('🔄 [RoomPage] 캐릭터 업데이트 후 방 상태 강제 새로고침');
          refreshRoomState();
        }, 100);
      }
      
      // navigation state 정리 (한 번만 실행)
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, currentPlayer, refreshRoomState, navigate, location.pathname]);

  // 🔧 React 배칭 문제 해결: Context 값 직접 구독
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // 🎯 단순화: Context의 state.participants 직접 사용
  const actualParticipants = state.participants;

  // 🔧 Context 참여자 변경 감지 시 강제 리렌더링
  useEffect(() => {
    if (state.participants && state.participants !== participants) {
      console.log('🔄 [RoomPage] 강제 리렌더링 트리거:', {
        stateCount: state.participants?.length || 0,
        propsCount: participants?.length || 0,
        trigger: forceUpdate
      });
      setForceUpdate(prev => prev + 1);
    }
  }, [state.participants?.length, participants?.length]);

  // 🔍 actualParticipants 모니터링
  useEffect(() => {
    console.log('🎯 [RoomPage] actualParticipants 변경:', {
      actualCount: actualParticipants?.length || 0,
      propsCount: participants?.length || 0,
      stateCount: state.participants?.length || 0,
      usingState: !!state.participants,
      forceUpdate,
      timestamp: new Date().toLocaleTimeString()
    });
  }, [actualParticipants, participants, state.participants, forceUpdate]);

  // 🔍 추가 디버깅: state 전체 모니터링
  useEffect(() => {
    console.log('🔍 [RoomPage] state 전체 변경:', {
      participantsLength: state.participants?.length || 0,
      currentPlayerExists: !!state.currentPlayer,
      currentRoomExists: !!state.currentRoom,
      timestamp: new Date().toLocaleTimeString()
    });
  }, [state]);

  // WebRTC 초기화 제거됨 - 나중에 구현 예정

  // 로딩 상태는 무시하고 바로 진행

  // 심각한 에러만 처리
  if (error && !error.includes('음성') && !error.includes('WebRTC')) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[linear-gradient(180deg,rgba(0,0,0,1)_0%,rgba(0,6,72,1)_100%)]">
        <p className="text-white text-lg mb-4">오류가 발생했습니다</p>
        <p className="text-red-400 mb-4">{error}</p>
        <button 
          onClick={() => {
            handleLeaveRoom();
            navigate('/');
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          메인으로 돌아가기
        </button>
      </div>
    );
  }

  // 방 정보가 없어도 UI 렌더링 계속 진행 (Context에서 자동 초기화)


  return (
    <React.Fragment>
        <div className="min-h-screen w-full flex flex-col justify-between bg-[linear-gradient(180deg,rgba(0,0,0,1)_0%,rgba(0,6,72,1)_100%)] relative overflow-hidden">

          {/* 배경 장식 이미지 */}
          <img 
            src="/assets/gamecast/participate/desingBG.png"
            alt="배경 장식"
            className="absolute inset-0 w-full h-full object-fill pointer-events-none z-0 opacity-60"
            onError={(e) => {
              console.error('배경 이미지 로드 실패:', e);
              e.currentTarget.style.display = 'none';
            }}
          />
          
          {/* 상단 네비게이션 영역 */}
          <Navigation />
          
          {/* 메인 콘텐츠 영역 */}
          <main className="flex-1 flex items-center justify-center relative z-10 py-8">
            {/* 백버튼 */}
            <div className="absolute z-50 left-[230px] top-[-20px]">
              <BackButton1
                onClick={() => {
                  handleLeaveRoom();
                  navigate('/');
                }}
              />
            </div>
            

            {/* 기존 마이크 상태 표시 */}
            <div className="fixed left-4 top-32 z-[9999]">
              <MicrophoneStatusIndicator
                hasPermission={!!localStream}
                isConnected={voiceChatConnected}
                isLocalMuted={isLocalMuted}
                error={error && error.includes('마이크') ? error : null}
                onRequestPermission={() => setShowMicGuide(true)}
              />
            </div>



            {/* 설정 버튼 */}
            <div 
              className="absolute z-50 cursor-pointer left-[230px] bottom-[10px] w-[59.7px] h-[59.7px]"
              onClick={() => {/* 설정 기능 구현 예정 */}}
            >
              <SettingIcon className="w-full h-full" />
            </div>
            
            {/* 메인 콘텐츠 영역 */}
            <div className="relative bg-transparent flex gap-[35px] max-w-[1265px] w-full h-auto min-h-[775px]">
              {/* 왼쪽 세로 flex 컨테이너 */}
              <div className="flex flex-col justify-between flex-1 max-w-[609px] min-h-[775px]">
                {/* 방이름&입장코드 컨테이너 */}
                {currentRoom ? (
                  <RoomInfoContainer roomName={currentRoom.roomName} entryCode={currentRoom.roomCode} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-[120px] bg-gray-800/50 rounded-lg animate-pulse">
                    <div className="w-48 h-6 bg-gray-600 rounded mb-2"></div>
                    <div className="w-32 h-4 bg-gray-600 rounded"></div>
                  </div>
                )}
                
                {/* 내 캐릭터 컨테이너 */}
                {currentRoom && currentPlayer ? (
                  <MyCharacterContainer 
                    key={`character-${currentPlayer.guestUserId}-${currentPlayer.characterInfo?.isCustomized ? '1' : '0'}-${Object.keys(currentPlayer.characterInfo?.selectedOptions || {}).length}-${Object.keys(currentPlayer.characterInfo?.selectedColors || {}).length}`}
                    isHost={currentRoom.hostGuestId === currentPlayer.guestUserId} 
                    currentPlayer={currentPlayer}
                    localStream={localStream}
                    isLocalMuted={isLocalMuted}
                    voiceChatConnected={voiceChatConnected}
                    isReady={(() => {
                      const currentPlayerGuestId = currentPlayer.guestUserId || currentPlayer.id;
                      const currentPlayerData = actualParticipants?.find(p => 
                        p.guestUserId === currentPlayerGuestId || p.id === currentPlayerGuestId
                      );
                      return currentPlayerData?.preparationStatus?.isReady || false;
                    })()}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-[300px] bg-gray-800/50 rounded-lg animate-pulse">
                    <div className="w-24 h-24 bg-gray-600 rounded-full mb-4"></div>
                    <div className="w-32 h-4 bg-gray-600 rounded"></div>
                  </div>
                )}
                
                
                {/* 닉네임 표기 컨테이너 */}
                {currentPlayer ? (
                  <NicknameContainer nickname={getDisplayNickname(currentPlayer, actualParticipants)} />
                ) : (
                  <div className="flex justify-center">
                    <div className="w-32 h-8 bg-gray-600 rounded animate-pulse"></div>
                  </div>
                )}
              </div>
              
              {/* 오른쪽 세로 flex 컨테이너 */}
              <div className="flex flex-col items-end justify-between flex-1 max-w-[621px] min-h-[775px]">
                {/* 플레이어 목록 컨테이너 */}
                {currentRoom && currentPlayer ? (
                  <PlayerGrid 
                    currentRoom={currentRoom} 
                    currentPlayer={currentPlayer}
                    realtimeParticipants={actualParticipants}
                    remoteStreams={remoteStreams}
                    voiceChatConnected={voiceChatConnected}
                    playersReadyStatus={(actualParticipants || []).map(p => ({
                      playerId: p.guestUserId || p.id,
                      playerName: getDisplayNickname(p, actualParticipants),
                      characterSetup: p.preparationStatus?.characterSetup || false,
                      screenSetup: p.preparationStatus?.screenSetup || false,
                      isReady: p.preparationStatus?.isReady || false
                    }))}
                  />
                ) : (
                  <div className="flex flex-col space-y-4 w-full">
                    {/* 플레이어 카드 스켈레톤들 */}
                    {[1, 2].map(i => (
                      <div key={i} className="flex items-center space-x-4 p-4 bg-gray-800/50 rounded-lg animate-pulse">
                        <div className="w-16 h-16 bg-gray-600 rounded-full"></div>
                        <div className="flex-1">
                          <div className="w-24 h-4 bg-gray-600 rounded mb-2"></div>
                          <div className="w-16 h-3 bg-gray-600 rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* 버튼 컨테이너 */}
                {currentRoom && currentPlayer ? (
                  <ButtonContainer 
                  isReadyEnabled={isReadyEnabled}
                  onStateUpdate={refreshRoomState}
                  currentRoom={currentRoom}
                  currentPlayer={currentPlayer}
                  characterSetupComplete={characterSetupComplete}
                  screenSetupComplete={screenSetupComplete}
                  setCharacterSetup={(completed) => updatePreparation({ characterSetup: completed })}
                  setScreenSetup={async (completed) => {
                    await updatePreparation({ screenSetup: completed });
                  }}
                  // onCharacterSetupClick prop 제거 (이제 ButtonContainer에서 직접 navigate 사용)
                  onReadyToggle={(ready) => {
                    updatePreparation({ isReady: ready });
                  }}
                  allPlayersReady={(actualParticipants || []).every(p => p.preparationStatus?.isReady)}
                  isRecording={isRecording}
                  recordingTime={recordingTime}
                  onRecordingStart={startRecording}
                  onRecordingStop={stopRecording}
                  />
                ) : (
                  <div className="flex space-x-2">
                    <div className="w-24 h-10 bg-gray-600 rounded animate-pulse"></div>
                    <div className="w-24 h-10 bg-gray-600 rounded animate-pulse"></div>
                    <div className="w-24 h-10 bg-gray-600 rounded animate-pulse"></div>
                  </div>
                )}

              </div>
            </div>
          </main>
          
          {/* 하단 푸터 영역 */}
          <Footer />
        </div>

      {/* 마이크 권한 가이드 모달 */}
      <MicrophonePermissionGuide
        error={error && error.includes('마이크') ? error : null}
        isVisible={showMicGuide && !!error}
        onRetry={() => {
          window.location.reload();
        }}
        onClose={() => setShowMicGuide(false)}
      />

      {/* 에러 표시 */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg z-50">
          <div className="flex items-center space-x-2">
            <span>⚠️</span>
            <span className="text-sm">{error}</span>
            <button 
              onClick={() => window.location.reload()}
              className="ml-2 text-xs underline hover:no-underline"
            >
              새로고침
            </button>
          </div>
        </div>
      )}

      {/* 개발용 강제 녹화 시작 버튼 (스티키) */}
      <DevRecordingButton />

    </React.Fragment>
  );
};