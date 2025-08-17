import React, { Component, useEffect, useState } from "react";
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
import { CharacterSetupPage } from "../character-setup/CharacterSetupPage";
import { 
  useUnifiedGamecast,
  useUnifiedRoom,
  useUnifiedVoiceChat,
  useUnifiedPreparation,
  useUnifiedUI,
  useUnifiedRecording
} from "../../../contexts/UnifiedGamecastContext";
import { useNavigate } from "react-router-dom";

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
  
  // 🎯 통합 Context 사용
  const { state, actions } = useUnifiedGamecast();
  const { 
    currentRoom, 
    currentPlayer, 
    participants,
    loading, 
    error, 
    refreshRoomState, 
    handleLeaveRoom 
  } = useUnifiedRoom();

  const {
    localStream,
    remoteStreams,
    voiceChatConnected,
    isLocalMuted,
    toggleLocalAudio
  } = useUnifiedVoiceChat();

  const {
    characterSetupComplete,
    screenSetupComplete,
    isReady,
    updatePreparation
  } = useUnifiedPreparation();
  
  const {
    showCharacterSetup,
    showMicGuide,
    setUIState
  } = useUnifiedUI();

  const {
    isRecording,
    recordingTime,
    startRecording,
    stopRecording
  } = useUnifiedRecording();

  // 캐릭터 설정 상태 확인
  const hasCharacterSetup = currentPlayer?.characterInfo?.isCustomized || false;


  // 🚀 실시간 연결 초기화
  useEffect(() => {
    // 방과 플레이어 정보가 모두 있고, Socket이 연결되지 않았을 때만 초기화
    if (currentRoom && currentPlayer && !state.realtime.socket) {
      console.log('🔌 [RoomPage] Socket 초기화 요청:', { 
        roomCode: currentRoom.roomCode, 
        playerId: currentPlayer.guestUserId,
        roomId: currentRoom.id 
      });
      actions.initializeSocket(currentRoom.roomCode, currentPlayer);
    } else if (state.realtime.socket) {
      console.log('✅ [RoomPage] Socket 이미 연결됨:', { 
        socketId: state.realtime.socket.id,
        roomCode: currentRoom?.roomCode 
      });
    }
  }, [currentRoom?.id]); // roomId로 의존성 변경 (roomCode보다 안정적)

  // WebRTC 초기화 제거됨 - 나중에 구현 예정

  // 준비하기 버튼 활성화 조건
  const isReadyEnabled = characterSetupComplete && screenSetupComplete;

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

  console.log('🎮 [RoomPage] 통합 Context 렌더링:', {
    loading,
    error,
    currentRoom: !!currentRoom,
    currentPlayer: !!currentPlayer,
    roomCode: currentRoom?.roomCode,
    playerNickname: currentPlayer?.nickname,
    showCharacterSetup,
    participantsCount: participants.length,
    voiceChatConnected,
    isReadyEnabled,
    characterSetupComplete,
    screenSetupComplete,
    hasCharacterSetup,
    socketConnected: !!state.realtime.socket
  });

  return (
    <React.Fragment>
      {/* 캐릭터 설정 페이지 */}
      {showCharacterSetup && (
        <div className="fixed inset-0 z-[9999]">
          <ErrorBoundary
            fallback={
              <div className="h-screen w-screen flex flex-col items-center justify-center bg-[linear-gradient(180deg,rgba(0,0,0,1)_0%,rgba(0,6,72,1)_100%)]">
                <p className="text-white text-xl mb-4">캐릭터 설정 로딩 중 오류가 발생했습니다</p>
                <button 
                  onClick={() => setUIState({ showCharacterSetup: false })}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  돌아가기
                </button>
              </div>
            }
          >
            <CharacterSetupPage 
              onBack={() => setUIState({ showCharacterSetup: false })}
              onCharacterComplete={(characterData) => {
                console.log('🎨 [RoomPage] 캐릭터 설정 완료, Socket으로 전송:', characterData);
                actions.updateCharacter(characterData);
                updatePreparation({ characterSetup: true });
                setUIState({ showCharacterSetup: false });
              }}
            />
          </ErrorBoundary>
        </div>
      )}

      {/* 메인 룸 페이지 */}
      <div className={showCharacterSetup ? 'hidden' : ''}>
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
            
            {/* 마이크 상태 표시 - 좌상단 */}
            <div style={{ 
              position: 'fixed', 
              left: '16px', 
              top: '16px', 
              zIndex: 9999,
              background: 'rgba(0,0,0,0.95)',
              color: '#ffffff',
              padding: '12px',
              borderRadius: '8px',
              border: '2px solid #ffffff',
              fontSize: '12px',
              fontFamily: 'monospace',
              fontWeight: 'bold',
              lineHeight: '1.4'
            }}>
              <div style={{color: '#ffffff', marginBottom: '4px'}}>🎤 마이크: {localStream ? '✅ 연결됨' : '❌ 연결안됨'}</div>
              <div style={{color: '#ffffff', marginBottom: '4px'}}>🔗 WebRTC: {voiceChatConnected ? '✅ 연결됨' : '❌ 연결안됨'}</div>
              <div style={{color: '#ffffff', marginBottom: '4px'}}>🔊 음소거: {isLocalMuted ? '🔇 켜짐' : '🔊 꺼짐'}</div>
              <div style={{color: '#ffffff', marginBottom: '4px'}}>🔌 Socket: {state.realtime.socket ? '✅ 연결됨' : '❌ 연결안됨'}</div>
              {error && <div style={{color: '#ef4444', fontWeight: 'bold'}}>❌ 에러: {error}</div>}
            </div>

            {/* 기존 마이크 상태 표시 */}
            <div className="fixed left-4 top-32 z-[9999]">
              <MicrophoneStatusIndicator
                hasPermission={!!localStream}
                isConnected={voiceChatConnected}
                isLocalMuted={isLocalMuted}
                error={error && error.includes('마이크') ? error : null}
                onRequestPermission={() => setUIState({ showMicGuide: true })}
              />
            </div>

            {/* 음성 채팅 컨트롤 */}
            {localStream && (
              <div className="absolute z-50 left-[230px] top-[120px] flex flex-col space-y-2">
                <button
                  onClick={toggleLocalAudio}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isLocalMuted 
                      ? 'bg-red-500 text-white hover:bg-red-600' 
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  {isLocalMuted ? '🔇 음소거' : '🎤 음성'}
                </button>
                <div style={{
                  fontSize: '12px',
                  color: '#ffffff',
                  background: 'rgba(0,0,0,0.95)',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  border: '1px solid #ffffff'
                }}>
                  연결: {remoteStreams.size}명
                </div>
              </div>
            )}

            {/* WebRTC 디버깅 패널 */}
            {import.meta.env.DEV && (
              <div style={{ 
                position: 'fixed', 
                right: '16px', 
                top: '16px', 
                zIndex: 9999,
                background: 'rgba(0,0,0,0.95)',
                color: '#ffffff',
                padding: '12px',
                borderRadius: '8px',
                border: '2px solid #ffffff',
                fontSize: '11px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                lineHeight: '1.4',
                maxWidth: '380px'
              }}>
                <div style={{color: '#ffffff', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold'}}>🔧 WebRTC 상태</div>
                
                <div style={{marginBottom: '6px'}}>
                  <div style={{color: '#ffffff'}}>연결상태: {voiceChatConnected ? '✅' : '❌'}</div>
                  <div style={{color: '#ffffff'}}>Socket: {state.realtime.socket ? '✅' : '❌'}</div>
                </div>
                
                <div style={{marginBottom: '6px'}}>
                  <div style={{color: '#ffffff'}}>원격스트림: {remoteStreams.size}개</div>
                  <div style={{color: '#ffffff'}}>실제연결: {remoteStreams.size}명</div>
                </div>
                
                <div style={{marginBottom: '6px'}}>
                  <div style={{color: '#ffffff'}}>방 참여자: {participants.length}명</div>
                  <div style={{color: '#ffffff'}}>내가 제외: {participants.length > 0 ? participants.length - 1 : 0}명</div>
                </div>

                {remoteStreams.size > 0 && (
                  <div style={{marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #ffffff'}}>
                    <div style={{color: '#10b981', marginBottom: '4px'}}>🎵 스트림 목록:</div>
                    {Array.from(remoteStreams.entries()).map(([streamKey, stream]) => {
                      const participant = participants.find(p => p.guestUserId === streamKey);
                      return (
                        <div key={streamKey} style={{color: '#10b981', fontSize: '10px'}}>
                          • {participant?.nickname || streamKey.slice(-8)}: {stream.getAudioTracks().length}트랙
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 설정 버튼 */}
            <div 
              className="absolute z-50 cursor-pointer left-[230px] bottom-[10px] w-[59.7px] h-[59.7px]"
              onClick={() => console.log("설정 버튼 클릭")}
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
                    isHost={currentRoom.hostGuestId === currentPlayer.guestUserId} 
                    currentPlayer={currentPlayer}
                    localStream={localStream}
                    isLocalMuted={isLocalMuted}
                    voiceChatConnected={voiceChatConnected}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-[300px] bg-gray-800/50 rounded-lg animate-pulse">
                    <div className="w-24 h-24 bg-gray-600 rounded-full mb-4"></div>
                    <div className="w-32 h-4 bg-gray-600 rounded"></div>
                  </div>
                )}
                
                {/* Context 기반 캐릭터 상태 디버깅 패널 */}
                {import.meta.env.DEV && currentRoom && currentPlayer && (
                  <div style={{ 
                    position: 'fixed', 
                    bottom: '16px', 
                    left: '16px', 
                    background: 'rgba(0,50,100,0.95)', 
                    color: '#ffffff', 
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    zIndex: 10000,
                    maxWidth: '350px',
                    border: '2px solid #4ade80',
                    fontFamily: 'monospace',
                    fontWeight: 'bold'
                  }}>
                    <div style={{ 
                      fontWeight: 'bold',
                      color: '#4ade80',
                      marginBottom: '8px',
                      fontSize: '14px'
                    }}>🎮 캐릭터 상태 (Context 관리)</div>
                    
                    <div style={{ 
                      marginBottom: '8px',
                      paddingBottom: '8px',
                      borderBottom: '1px solid #ffffff'
                    }}>
                      <div style={{ 
                        fontWeight: 'bold',
                        color: '#ffffff',
                        marginBottom: '4px'
                      }}>
                        {(currentRoom.hostGuestId === currentPlayer.guestUserId) ? '👑 방장' : '👤 게스트'}
                      </div>
                      <div style={{ 
                        color: '#ffffff'
                      }}>닉네임: <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{currentPlayer.nickname}</span></div>
                    </div>
                    
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ 
                        fontWeight: 'bold',
                        color: '#ffffff',
                        marginBottom: '4px'
                      }}>캐릭터 설정</div>
                      <div style={{ 
                        color: '#ffffff'
                      }}>isCustomized: <span style={{ 
                        fontWeight: 'bold',
                        color: hasCharacterSetup ? '#10b981' : '#ef4444'
                      }}>{hasCharacterSetup ? '✅ 설정됨' : '❌ 미설정'}</span></div>
                      <div style={{ 
                        color: '#ffffff',
                        fontSize: '10px',
                        marginTop: '4px'
                      }}>캐릭터 설정 완료: {characterSetupComplete ? '✅' : '❌'}</div>
                    </div>
                  </div>
                )}
                
                {/* 닉네임 표기 컨테이너 */}
                {currentPlayer ? (
                  <NicknameContainer nickname={currentPlayer.nickname} />
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
                    realtimeParticipants={participants}
                    remoteStreams={remoteStreams}
                    voiceChatConnected={voiceChatConnected}
                    playersReadyStatus={[]}
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
                  setScreenSetup={(completed) => {
                    console.log('🖥️ [RoomPage] 화면 설정:', completed);
                    updatePreparation({ screenSetup: completed });
                  }}
                  onCharacterSetupClick={() => setUIState({ showCharacterSetup: true })}
                  onReadyToggle={(ready) => {
                    console.log('✅ [RoomPage] 준비 상태 변경:', ready);
                    updatePreparation({ isReady: ready });
                  }}
                  allPlayersReady={participants.every(p => p.preparationStatus?.isReady)}
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

                {/* Context 기반 상태 표시 */}
                <div className="mt-4 p-4 bg-gray-800 rounded-lg text-white text-sm">
                  <h3 className="font-bold mb-2">🎮 상태 정보 (Context)</h3>
                  <div className="space-y-1">
                    <div>캐릭터 설정: {characterSetupComplete ? '✅ 완료' : '❌ 미완료'}</div>
                    <div>화면 설정: {screenSetupComplete ? '✅ 완료' : '❌ 미완료'}</div>
                    <div>준비 버튼: {isReadyEnabled ? '✅ 활성화' : '❌ 비활성화'}</div>
                    <div>WebRTC 연결: {voiceChatConnected ? '✅ 연결됨' : '❌ 연결안됨'}</div>
                    <div>Socket 연결: {state.realtime.socket ? '✅ 연결됨' : '❌ 연결안됨'}</div>
                    <div className="mt-2 text-xs text-gray-400">
                      통합 Context 기반 관리
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
          
          {/* 하단 푸터 영역 */}
          <Footer />
        </div>
      </div>

      {/* 마이크 권한 가이드 모달 */}
      <MicrophonePermissionGuide
        error={error && error.includes('마이크') ? error : null}
        isVisible={showMicGuide && !!error}
        onRetry={() => {
          console.log('🔄 Retrying microphone access...');
          window.location.reload();
        }}
        onClose={() => setUIState({ showMicGuide: false })}
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

    </React.Fragment>
  );
};