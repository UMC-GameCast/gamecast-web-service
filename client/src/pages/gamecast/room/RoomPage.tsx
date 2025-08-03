import React, { useMemo, useState, useEffect, Component, useRef } from "react";
import type { ErrorInfo } from "react";
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
// import { useVoiceChat } from "../../../hooks/useVoiceChat.ts"; // 음성채팅 기능 비활성화
import { useRealTimeRoom } from "../../../hooks/useRealTimeRoom.ts";
import { VoiceStatusOverlay } from "../../../components/gamecast/room/VoiceStatusOverlay.tsx";
import type { PlayerWithStream } from "../../../components/gamecast/room/VoiceStatusOverlay.tsx";
import type { Player } from "../../../types/room";
import { CharacterSetupPage } from "../character-setup/CharacterSetupPage";

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
  
  // 음성채팅 및 WebRTC 기능 완전 비활성화 - REST API 테스트를 위해
  const localStream = null;
  const remoteStreams = new Map<string, MediaStream>();
  const joinError = null;
  
  // 실시간 참여자 업데이트 기능
  const [realtimeParticipants, setRealtimeParticipants] = useState<Player[]>([]);
  const realTimeRoom = useRealTimeRoom({
    roomCode: currentRoom?.roomCode || null,
    currentPlayer: currentPlayer,
    enabled: !!(currentRoom && currentPlayer) // 방과 플레이어 정보가 있을 때만 활성화
  });
  
  const [showCharacterSetup, setShowCharacterSetup] = useState(false);
  
  // 실시간 참여자 업데이트 콜백 설정
  useEffect(() => {
    if (realTimeRoom?.setOnParticipantsUpdate) {
      realTimeRoom.setOnParticipantsUpdate((participants) => {
        console.log('🔄 실시간 참여자 업데이트 수신:', participants);
        setRealtimeParticipants(participants);
        // 서버에서 최신 방 정보도 다시 조회
        refreshRoomState();
      });
    }
  }, [realTimeRoom?.setOnParticipantsUpdate, refreshRoomState]);
  
  // Hook들을 항상 같은 순서로 호출하기 위해 여기서 모든 데이터 준비
  const playersWithStreams = useMemo((): PlayerWithStream[] => {
    if (!currentRoom || !currentPlayer) return [];

    // 실시간으로 받은 참여자 정보가 있으면 우선 사용, 없으면 초기 방 정보 사용
    const participantsSource = realtimeParticipants.length > 0 ? realtimeParticipants : (currentRoom.participants || []);
    
    // 서버에서 받은 participants를 클라이언트 형식으로 변환
    const convertedParticipants = participantsSource.map(p => ({
      ...p,
      guestUserId: p.guestUserId || p.id, // 실시간 데이터는 guestUserId가 있을 수 있음
      preparationStatus: p.preparationStatus || {
        characterSetup: false,
        screenSetup: false
      },
      isHost: p.role === 'host'
    }));
    
    // 현재 플레이어가 이미 participants에 있는지 확인
    const currentPlayerInParticipants = convertedParticipants.find(p => p.id === currentPlayer.id);
    
    let allPlayers: Player[];
    if (currentPlayerInParticipants) {
      // 현재 플레이어가 이미 participants에 있으면 participants만 사용
      allPlayers = convertedParticipants;
    } else {
      // 현재 플레이어가 participants에 없으면 추가
      allPlayers = [currentPlayer, ...convertedParticipants];
    }
    
    return allPlayers.map(player => {
      const isLocalPlayer = player.id === currentPlayer.id;
      const stream = isLocalPlayer ? localStream : remoteStreams.get(player.id) || null;
      return { player, stream, isLocalPlayer };
    });
  }, [currentRoom, currentPlayer, localStream, remoteStreams, realtimeParticipants]);

  // 준비하기 버튼 활성화 조건: 캐릭터 설정과 녹화화면 설정이 모두 완료된 경우
  const isReadyEnabled = !!(currentPlayer?.preparationStatus?.characterSetup && currentPlayer?.preparationStatus?.screenSetup);

  // 디버깅을 위한 콘솔 로그 - 렌더링 횟수 제한
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  
  if (renderCountRef.current <= 5) { // 처음 5번만 로그 출력
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
      playersWithStreamsCount: playersWithStreams.length,
      currentPlayerId: currentPlayer?.id,
      realtimeConnected: realTimeRoom?.isConnected || false,
      realtimeError: realTimeRoom?.connectionError || null
    });
    
    console.log('👥 플레이어 목록 상세:', {
      initialParticipants: currentRoom?.participants,
      realtimeParticipants: realtimeParticipants,
      currentPlayer: currentPlayer,
      playersWithStreams: playersWithStreams
    });
  }
  
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
          onClick={() => handleLeaveRoom(realTimeRoom?.leaveRoom)}
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
        <VoiceStatusOverlay playersWithStreams={playersWithStreams} />
        
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
                onClick={() => handleLeaveRoom(realTimeRoom?.leaveRoom)}
              />
            </div>
            
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
                />
                {/* 닉네임 표기 컨테이너 */}
                <NicknameContainer nickname={currentPlayer.nickname} />
              </div>
              
              {/* 오른쪽 세로 flex 컨테이너 - 우측 정렬 */}
              <div className="flex flex-col items-end justify-between flex-1 max-w-[621px] min-h-[775px]">
                {/* 플레이어 목록 컨테이너 */}
                <PlayerGrid 
                  currentRoom={currentRoom} 
                  currentPlayer={currentPlayer}
                />
                {/* 버튼 컨테이너 */}
                <ButtonContainer 
                  isReadyEnabled={isReadyEnabled}
                  onStateUpdate={refreshRoomState}
                  currentRoom={currentRoom}
                  currentPlayer={currentPlayer}
                  onCharacterSetup={() => setShowCharacterSetup(true)}
                />

              </div>
            </div>
          </main>
          
          {/* 하단 푸터 영역 */}
          <Footer />
        </div>
      </div>
    </React.Fragment>
  );
}; 