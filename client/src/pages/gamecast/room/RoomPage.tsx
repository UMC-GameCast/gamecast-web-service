import React, { useState, useEffect, Component } from "react";
import type { ErrorInfo } from "react";
import type { Player } from "../../../types/room";
import { Navigation } from "../../../components/gamecast/common/Navigation";
import { Footer } from "../../../components/gamecast/common/Footer";
import { BackButton1 } from "../../../components/gamecast/common/BackButton1";
import { ButtonContainer } from "../../../components/gamecast/room/ButtonContainer.tsx";
import { RoomInfoContainer } from "../../../components/gamecast/room/RoomInfoContainer";
import { MyCharacterContainer } from "../../../components/gamecast/room/MyCharacterContainer";
import { NicknameContainer } from "../../../components/gamecast/room/NicknameContainer";
import SettingIcon from "../../../assets/gamecast/Room/setting.svg?react";
import { useRoom } from "../../../hooks/useRoom.ts";
import { PlayerGrid } from "../../../components/gamecast/room/PlayerGrid.tsx";
import { useVoiceChat } from "../../../hooks/useVoiceChat.ts";
import { useCharacter } from "../../../hooks/useCharacter.ts";
import { useGameRecording } from "../../../hooks/useGameRecording.ts"; // PlayerGrid에 preparation status 전달용
import { MicrophonePermissionGuide } from "../../../components/gamecast/common/MicrophonePermissionGuide";
import { MicrophoneStatusIndicator } from "../../../components/gamecast/common/MicrophoneStatusIndicator";
import { CharacterSetupPage } from "../character-setup/CharacterSetupPage";
// 롤백 완료: appSocketManager 제거

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
 * 방 정보 표시 페이지 컴포넌트
 * 입장코드, 방이름, 참여자 목록을 표시합니다
 */
export const RoomPage = () => {
  const { currentRoom, currentPlayer, loading, error, refreshRoomState, handleLeaveRoom } = useRoom();
  
  // 실시간 참여자 업데이트 상태 (초기값을 현재 방 참여자로 설정)
  const [realtimeParticipants, setRealtimeParticipants] = useState<Player[]>(currentRoom?.participants || []);
  
  // 캐릭터 상태 관리
  const { playersCharacters, getPlayerCharacter } = useCharacter();
  
  // 준비 상태 관리 (PlayerGrid에 preparation status 전달용)
  const { playersReadyStatus } = useGameRecording(currentRoom, currentPlayer);
  
  // 🎯 현재 플레이어의 캐릭터 정보 조회 - 올바른 ID 사용
  const currentPlayerCharacter = currentPlayer ? getPlayerCharacter(currentPlayer.guestUserId || currentPlayer.id) : undefined;
  
  // 🎯 최종 내 캐릭터 데이터: Socket.IO 실시간 > 서버 characterInfo > 레거시 character
  // 서버 characterInfo를 더 우선적으로 처리하여 안정성 확보
  const myCharacterData = currentPlayerCharacter?.character || 
    (currentPlayer?.characterInfo?.isCustomized && 
     currentPlayer.characterInfo.selectedOptions && 
     currentPlayer.characterInfo.selectedColors ? {
      selectedOptions: currentPlayer.characterInfo.selectedOptions,
      selectedColors: currentPlayer.characterInfo.selectedColors,
      nickname: currentPlayer.nickname
    } : null) || 
    currentPlayer?.character || null;
  
  // 🔧 디버깅: 내 캐릭터 데이터 상태 (ID 매칭 중심으로 강화된 로깅)
  console.log('🏠 [RoomPage] 내 캐릭터 데이터 상세 분석:', {
    // 플레이어 ID 정보
    currentPlayerId: currentPlayer?.guestUserId || currentPlayer?.id,
    currentPlayerNickname: currentPlayer?.nickname,
    
    // ID 매칭 분석
    queryId: currentPlayer?.guestUserId || currentPlayer?.id,
    playersCharactersMapSize: playersCharacters.size,
    playersCharactersKeys: Array.from(playersCharacters.keys()),
    isMyIdInMap: playersCharacters.has(currentPlayer?.guestUserId || currentPlayer?.id),
    
    // Socket.IO 실시간 데이터 (1순위)
    hasSocketIOData: !!currentPlayerCharacter?.character,
    socketIOCharacterData: currentPlayerCharacter?.character,
    
    // 서버 REST API 데이터 (2순위)  
    hasServerCharacterInfo: !!currentPlayer?.characterInfo?.isCustomized,
    serverCharacterInfo: currentPlayer?.characterInfo,
    
    // 레거시 데이터 (3순위)
    hasLegacyCharacter: !!currentPlayer?.character,
    legacyCharacter: currentPlayer?.character,
    
    // 최종 결과
    finalMyCharacterData: myCharacterData,
    hasFinalData: !!myCharacterData,
    
    // 문제 진단
    diagnosis: {
      socketIODataMissing: !currentPlayerCharacter?.character,
      serverDataMissing: !currentPlayer?.characterInfo?.isCustomized,
      idMismatch: !playersCharacters.has(currentPlayer?.guestUserId || currentPlayer?.id),
      totalIssues: [
        !currentPlayerCharacter?.character,
        !currentPlayer?.characterInfo?.isCustomized,
        !playersCharacters.has(currentPlayer?.guestUserId || currentPlayer?.id)
      ].filter(Boolean).length
    }
  });
  
  // 디버깅용 전역 변수 설정
  if (import.meta.env.DEV) {
    (window as any).__DEBUG_playersCharacters__ = playersCharacters;
    (window as any).__DEBUG_currentPlayerCharacter__ = currentPlayerCharacter;
    (window as any).__DEBUG_myCharacterData__ = myCharacterData;
    (window as any).__DEBUG_currentPlayer__ = currentPlayer;
  }
  
  // 닉네임 및 참여자 디버깅
  console.log('🏷️ [RoomPage] 닉네임 디버깅:', {
    currentPlayerNickname: currentPlayer?.nickname,
    realtimeParticipantsCount: realtimeParticipants.length,
    realtimeParticipants: realtimeParticipants.map(p => ({ 
      id: p.id, 
      nickname: p.nickname,
      characterInfo: p.characterInfo?.isCustomized 
    }))
  });
  
  // 음성채팅 및 실시간 업데이트 기능 (통합된 Socket.IO 연결)
  const {
    localStream,
    remoteStreams,
    joinError, // 방 입장 관련 에러
    microphoneError, // 마이크 권한 관련 에러
    voiceChatState,
    toggleLocalAudio,
    isLocalMuted,
    getConnectedPeersCount,
    // 새로 추가된 실시간 업데이트 기능
    setOnRealtimeParticipantsUpdate,
    // 디버깅용
    hasWebRTCManager,
    hasGlobalManager
  } = useVoiceChat(
    currentRoom?.roomCode || null,
    currentPlayer?.nickname || '',
    !!(currentRoom && currentPlayer) // 방과 플레이어 정보가 있을 때만 활성화
  );
  
  const [showCharacterSetup, setShowCharacterSetup] = useState(false);
  const [showMicGuide, setShowMicGuide] = useState(false);

  // 설정 상태를 RoomPage에서 직접 관리 (상태 동기화 문제 해결)
  const [characterSetupComplete, setCharacterSetupComplete] = useState(false);
  const [screenSetupComplete, setScreenSetupComplete] = useState(false);
  
  // REST API에서 초기 참여자 목록 설정 (Socket.IO 연결 전까지만)
  useEffect(() => {
    if (currentRoom?.participants && realtimeParticipants.length === 0) {
      setRealtimeParticipants(currentRoom.participants);
    }
  }, [currentRoom?.participants, realtimeParticipants.length]);
  
  // 콜백 설정 완료 상태 추적
  const [callbacksSetup, setCallbacksSetup] = useState(false);
  
  // 애플리케이션 Socket 매니저 초기화 제거 (WebRTC Manager 사용)

  // 실시간 참여자 업데이트 콜백 설정 (WebRTCManager 통합)
  useEffect(() => {
    console.log('🔧 실시간 콜백 설정 시도:', {
      hasCurrentRoom: !!currentRoom,
      hasCurrentPlayer: !!currentPlayer,
      hasSetOnRealtimeParticipantsUpdate: !!setOnRealtimeParticipantsUpdate,
      hasWebRTCManager: hasWebRTCManager,
      hasGlobalManager: hasGlobalManager,
      callbacksSetup: callbacksSetup
    });

    // 기본 조건 확인
    if (!currentRoom || !currentPlayer) {
      console.log('⏳ 방/플레이어 정보 없음, 콜백 설정 지연');
      return;
    }

    // WebRTC 매니저와 콜백 함수 확인
    if (!setOnRealtimeParticipantsUpdate || (!hasWebRTCManager && !hasGlobalManager)) {
      console.log('⏳ WebRTC 매니저 또는 콜백 함수 없음, 콜백 설정 지연');
      return;
    }

    setOnRealtimeParticipantsUpdate((participants) => {
      if (Array.isArray(participants)) {
        // 중복 제거만 수행 (WebRTC Manager는 완전히 독립적)
        // WebRTC Manager는 완전히 독립적이므로 모든 참여자가 실제 사용자
        const realParticipants = participants;

        const uniqueParticipants = realParticipants.filter((participant: any, index: number, self: any[]) => {
          return self.findIndex((p: any) => p.id === participant.id) === index;
        });
        
        setRealtimeParticipants(uniqueParticipants as Player[]);
      }
    });
    
    if (!callbacksSetup) {
      setCallbacksSetup(true);
    }
    console.log('✅ 실시간 참여자 업데이트 콜백 설정 완료');
  }, [setOnRealtimeParticipantsUpdate, currentRoom, currentPlayer, hasWebRTCManager, hasGlobalManager]);

  // 마이크 에러 모니터링 (마이크 권한 관련 에러만)
  useEffect(() => {
    if (microphoneError) {
      console.warn('🎤 Microphone error detected:', microphoneError);
      setShowMicGuide(true);
    }
  }, [microphoneError]);

  // 방 입장 에러 모니터링 (별도 처리)
  useEffect(() => {
    if (joinError) {
      console.warn('🚪 Room join error detected:', joinError);
      // 방 입장 에러는 마이크 가이드를 띄우지 않음
    }
  }, [joinError]);


  // 준비하기 버튼 활성화 조건: 캐릭터 설정과 녹화화면 설정이 모두 완료된 경우
  const isReadyEnabled = characterSetupComplete && screenSetupComplete;

  // 디버깅을 위한 콘솔 로그
  console.log('RoomPage 렌더링:', {
    loading,
    error,
    joinError,
    currentRoom: !!currentRoom,
    currentPlayer: !!currentPlayer,
    showCharacterSetup,
    roomCode: currentRoom?.roomCode,
    playerNickname: currentPlayer?.nickname,
    participantsCount: currentRoom?.participants?.length || 0,
    realtimeParticipantsCount: realtimeParticipants.length,
    currentPlayerId: currentPlayer?.id,
    voiceChatConnected: voiceChatState.isConnected,
    // 준비 상태 정보 추가
    isReadyEnabled,
    characterSetupComplete,
    screenSetupComplete
  });
  
  console.log('👥 플레이어 목록 상세:', {
    initialParticipants: currentRoom?.participants,
    realtimeParticipants: realtimeParticipants,
    currentPlayer: currentPlayer
  });

  // 로딩 중 처리
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[linear-gradient(180deg,rgba(0,0,0,1)_0%,rgba(0,6,72,1)_100%)]">
        <p className="text-white">방 정보를 불러오는 중...</p>
      </div>
    );
  }

  // 심각한 에러만 처리 (WebRTC 에러는 무시)
  if (error && !error.includes('음성') && !error.includes('WebRTC')) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[linear-gradient(180deg,rgba(0,0,0,1)_0%,rgba(0,6,72,1)_100%)]">
        <p className="text-white text-lg mb-4">오류가 발생했습니다</p>
        <p className="text-red-400 mb-4">{error}</p>
        <button 
          onClick={() => handleLeaveRoom()}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          메인으로 돌아가기
        </button>
      </div>
    );
  }

  // 방 정보가 없는 경우
  if (!currentRoom || !currentPlayer) {
    return (
      <div className="h-full flex items-center justify-center bg-[linear-gradient(180deg,rgba(0,0,0,1)_0%,rgba(0,6,72,1)_100%)]">
        <p className="text-white">방 정보를 찾을 수 없습니다.</p>
      </div>
    );
  }

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
                  onClick={() => setShowCharacterSetup(false)}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  돌아가기
                </button>
              </div>
            }
          >
            <CharacterSetupPage 
              onBack={() => setShowCharacterSetup(false)}
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
            {/* 백버튼 - 메인 콘텐츠 기준 위치 */}
            <div className="absolute z-50 left-[230px] top-[-20px]">
              <BackButton1
                onClick={() => handleLeaveRoom()}
              />
            </div>
            
            {/* 마이크 상태 표시 - 좌상단 (항상 표시) */}
            <div 
              className="fixed left-4 top-4 z-[9999]" 
              style={{ 
                position: 'fixed', 
                left: '16px', 
                top: '16px', 
                zIndex: 9999,
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '2px solid white',
                fontSize: '12px'
              }}
            >
              <div>마이크: {localStream ? '✅' : '❌'}</div>
              <div>연결: {voiceChatState.isConnected ? '✅' : '❌'}</div>
              <div>음소거: {isLocalMuted() ? '🔇' : '🔊'}</div>
              {microphoneError && <div style={{color: 'red'}}>에러: {microphoneError}</div>}
              {joinError && <div style={{color: 'orange'}}>방: {joinError}</div>}
            </div>

            {/* 기존 마이크 상태 표시 */}
            <div className="fixed left-4 top-32 z-[9999]">
              <MicrophoneStatusIndicator
                hasPermission={!microphoneError && !!localStream}
                isConnected={voiceChatState.isConnected}
                isLocalMuted={isLocalMuted()}
                error={microphoneError}
                onRequestPermission={() => setShowMicGuide(true)}
              />
            </div>

            {/* 음성 채팅 컨트롤 */}
            {localStream && (
              <div className="absolute z-50 left-[230px] top-[120px] flex flex-col space-y-2">
                <button
                  onClick={toggleLocalAudio}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isLocalMuted() 
                      ? 'bg-red-500 text-white hover:bg-red-600' 
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  {isLocalMuted() ? '🔇 음소거' : '🎤 음성'}
                </button>
                <div className="text-xs text-white bg-black bg-opacity-50 px-2 py-1 rounded">
                  연결: {getConnectedPeersCount()}명
                </div>
              </div>
            )}

            {/* 설정 버튼 */}
            <div 
              className="absolute z-50 cursor-pointer left-[230px] bottom-[10px] w-[59.7px] h-[59.7px]"
              onClick={() => console.log("설정 버튼 클릭")}
            >
              <SettingIcon className="w-full h-full" />
            </div>
            
            {/* 메인 콘텐츠 영역 - 반응형 크기 */}
            <div className="relative bg-transparent flex gap-[35px] max-w-[1265px] w-full h-auto min-h-[775px]">
              {/* 왼쪽 세로 flex 컨테이너 - 세로 중앙 정렬 */}
              <div className="flex flex-col justify-between flex-1 max-w-[609px] min-h-[775px]">
                {/* 방이름&입장코드 컨테이너 */}
                <RoomInfoContainer roomName={currentRoom.roomName} entryCode={currentRoom.roomCode} />
                {/* 내 캐릭터 컨테이너 */}
                <MyCharacterContainer 
                  isHost={currentRoom.hostGuestId === currentPlayer.guestUserId} 
                  currentPlayer={currentPlayer}
                  characterData={myCharacterData}
                  localStream={localStream}
                  isLocalMuted={isLocalMuted()}
                  voiceChatConnected={voiceChatState.isConnected}
                />
                
                {/* 🔧 개선된 디버깅 패널: 캐릭터 데이터 흐름 실시간 모니터링 */}
                {import.meta.env.DEV && (
                  <div className="fixed bottom-4 left-4 bg-gray-900 text-white p-3 rounded-lg text-xs z-[10000] max-w-md border border-gray-600">
                    <div className="font-bold text-green-400 mb-2">🔧 캐릭터 데이터 디버깅</div>
                    
                    {/* ID 매칭 정보 */}
                    <div className="mb-2 pb-2 border-b border-gray-600">
                      <div className={`font-semibold ${(currentRoom.hostGuestId === currentPlayer.guestUserId) ? 'text-yellow-400' : 'text-blue-400'}`}>
                        {(currentRoom.hostGuestId === currentPlayer.guestUserId) ? '👑 방장' : '👤 게스트'}
                      </div>
                      <div>방장 ID: <span className="text-yellow-300">{currentRoom.hostGuestId}</span></div>
                      <div>내 Guest ID: <span className="text-blue-300">{currentPlayer.guestUserId}</span></div>
                      <div>내 ID: <span className="text-blue-300">{currentPlayer.id}</span></div>
                    </div>
                    
                    {/* 캐릭터 데이터 상태 */}
                    <div className="mb-2 pb-2 border-b border-gray-600">
                      <div className="font-semibold text-purple-400">캐릭터 데이터 상태</div>
                      <div>최종 데이터: <span className={myCharacterData ? 'text-green-400' : 'text-red-400'}>{myCharacterData ? '✅ 있음' : '❌ 없음'}</span></div>
                      <div>Socket.IO: <span className={currentPlayerCharacter?.character ? 'text-green-400' : 'text-orange-400'}>{currentPlayerCharacter?.character ? '✅ 있음' : '⚠️ 없음'}</span></div>
                      <div>서버 DB: <span className={currentPlayer?.characterInfo?.isCustomized ? 'text-green-400' : 'text-orange-400'}>{currentPlayer?.characterInfo?.isCustomized ? '✅ 있음' : '⚠️ 없음'}</span></div>
                    </div>
                    
                    {/* ID 매칭 진단 */}
                    <div className="mb-2">
                      <div className="font-semibold text-cyan-400">ID 매칭 진단</div>
                      <div>Map 크기: <span className="text-cyan-300">{playersCharacters.size}</span></div>
                      <div>Map 키: <span className="text-cyan-300">[{Array.from(playersCharacters.keys()).join(', ')}]</span></div>
                      <div>내 ID 매칭: <span className={playersCharacters.has(currentPlayer.guestUserId || currentPlayer.id) ? 'text-green-400' : 'text-red-400'}>
                        {playersCharacters.has(currentPlayer.guestUserId || currentPlayer.id) ? '✅ 성공' : '❌ 실패'}
                      </span></div>
                    </div>
                  </div>
                )}
                {/* 닉네임 표기 컨테이너 */}
                <NicknameContainer nickname={currentPlayer.nickname} />
              </div>
              
              {/* 오른쪽 세로 flex 컨테이너 - 우측 정렬 */}
              <div className="flex flex-col items-end justify-between flex-1 max-w-[621px] min-h-[775px]">
                {/* 플레이어 목록 컨테이너 */}
                <PlayerGrid 
                  currentRoom={currentRoom} 
                  currentPlayer={currentPlayer}
                  realtimeParticipants={realtimeParticipants}
                  remoteStreams={remoteStreams}
                  voiceChatConnected={voiceChatState.isConnected}
                  playersCharacters={playersCharacters}
                  playersReadyStatus={playersReadyStatus}
                />
                {/* 버튼 컨테이너 */}
                <ButtonContainer 
                  isReadyEnabled={isReadyEnabled}
                  onStateUpdate={refreshRoomState}
                  currentRoom={currentRoom}
                  currentPlayer={currentPlayer}
                  // 설정 상태 props 전달
                  characterSetupComplete={characterSetupComplete}
                  screenSetupComplete={screenSetupComplete}
                  setCharacterSetup={setCharacterSetupComplete}
                  setScreenSetup={setScreenSetupComplete}
                  // 캐릭터 설정 페이지 이동 콜백
                  onCharacterSetupClick={() => setShowCharacterSetup(true)}
                />

                {/* 개발용 상태 표시 */}
                <div className="mt-4 p-4 bg-gray-800 rounded-lg text-white text-sm">
                  <h3 className="font-bold mb-2">🔧 개발 상태 정보</h3>
                  <div className="space-y-1">
                    <div>캐릭터 설정: {characterSetupComplete ? '✅ 완료' : '❌ 미완료'}</div>
                    <div>화면 설정: {screenSetupComplete ? '✅ 완료' : '❌ 미완료'}</div>
                    <div>준비 버튼: {isReadyEnabled ? '✅ 활성화' : '❌ 비활성화'}</div>
                    <div className="mt-2 text-xs text-gray-400">
                      준비 조건: 캐릭터 설정 ({characterSetupComplete ? 'OK' : 'X'}) && 화면 설정 ({screenSetupComplete ? 'OK' : 'X'}) = {isReadyEnabled ? 'OK' : 'X'}
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
        error={microphoneError}
        isVisible={showMicGuide && !!microphoneError}
        onRetry={() => {
          console.log('🔄 Retrying microphone access...');
          window.location.reload(); // 페이지 새로고침으로 다시 시도
        }}
        onClose={() => setShowMicGuide(false)}
      />

      {/* 방 입장 에러 표시 (별도) */}
      {joinError && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg z-50">
          <div className="flex items-center space-x-2">
            <span>⚠️</span>
            <span className="text-sm">{joinError}</span>
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