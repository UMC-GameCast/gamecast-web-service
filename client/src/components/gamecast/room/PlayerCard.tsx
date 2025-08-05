import { useEffect, useRef, useMemo } from "react";
import type { Player, CharacterData } from "../../../types/room";
import HostSmallIcon from "../../../assets/gamecast/Room/Host_small.svg?react";
import { VoiceIndicator } from "../common/VoiceIndicator";
import CardTop from "../../../assets/gamecast/Room/Card_top.svg?react";
import CardBottomUnready from "../../../assets/gamecast/Room/Card_bottom_unready.svg?react";
import CardBottomReady from "../../../assets/gamecast/Room/Card_bottom_ready.svg?react";
import CardTopUnready from "../../../assets/gamecast/Room/Card_top_unready.svg?react";
import CardTopReady from "../../../assets/gamecast/Room/Card_top_ready.svg?react";
import NonSelectTop from "../../../assets/gamecast/Room/nonselect_top.svg?react";
import NonSelectBottom from "../../../assets/gamecast/Room/nonselect_bottom.svg?react";
import CharacterSample from "../../../assets/gamecast/Room/캐릭터 샘플.png";
import { useCharacterAnimation } from "../../../hooks/useCharacterAnimation";
import { renderCharacterLayers } from "../../../utils/characterRenderer";

interface PlayerCardProps {
  player: Player;
  isHost: boolean;
  stream?: MediaStream | null;
  isLocalPlayer?: boolean;
  voiceChatConnected?: boolean;
  character?: CharacterData;
  hasCharacter?: boolean;
  preparationStatus?: {
    characterSetup: boolean;
    screenSetup: boolean;
    isReady: boolean;
  };
}

/**
 * 방 참여 플레이어 카드 컴포넌트
 * @param player - 플레이어 정보
 * @param isHost - 방장 여부
 */
export const PlayerCard = ({ 
  player, 
  isHost, 
  stream = null, 
  isLocalPlayer = false,
  voiceChatConnected = false,
  character,
  preparationStatus
}: PlayerCardProps) => {
  // 오디오 재생을 위한 ref
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const playerId = player.guestUserId || player.id;
  
  // 캐립터 데이터 우선순위: Props (RoomPage에서 전달) > 서버 API
  const finalCharacterData = character || 
    (player.characterInfo?.isCustomized ? {
      selectedOptions: player.characterInfo.selectedOptions!,
      selectedColors: player.characterInfo.selectedColors!,
      nickname: player.nickname
    } : null);
  
  // 디버깅: 캐릭터 데이터 상태 (소수만 로깅)
  if (import.meta.env.DEV && !finalCharacterData && Math.random() < 0.05) {
    console.log('⚠️ [PlayerCard] 캐릭터 데이터 없음:', {
      playerId,
      nickname: player.nickname,
      hasCharacterInfo: !!player.characterInfo,
      characterInfoCustomized: player.characterInfo?.isCustomized,
      propsCharacter: !!character
    });
  }
  
  // 🛡️ 안전한 캐릭터 데이터 검증
  const hasValidCharacterData = !!(finalCharacterData && 
    finalCharacterData.selectedOptions && 
    finalCharacterData.selectedColors &&
    typeof finalCharacterData.selectedOptions === 'object' &&
    typeof finalCharacterData.selectedColors === 'object' &&
    Object.keys(finalCharacterData.selectedOptions).length > 0 &&
    Object.keys(finalCharacterData.selectedColors).length > 0
  );
  
  // 🎯 캐릭터 존재 여부 결정: preparation status 우선, 그 다음 실제 데이터 유효성
  const playerHasCharacter = preparationStatus?.characterSetup ?? hasValidCharacterData;
  
  // 개발 모드에서만 로깅 (무한 로그 방지)
  if (import.meta.env.DEV && Math.random() < 0.01) { // 1% 확률로만 로깅
    console.log('🎨 [PlayerCard] 캐릭터 데이터 최종 결정:', {
      playerId: player.guestUserId || player.id,
      nickname: player.nickname,
      socketCharacterData: socketCharacterData?.character,
      serverCharacterInfo: player.characterInfo,
      propsCharacter: character,
      finalCharacterData,
      preparationStatusCharacterSetup: preparationStatus?.characterSetup,
      playerHasCharacter,
      hasCharacterSource: preparationStatus?.characterSetup ? 'preparation-status' : 'character-data'
    });
  }
  
  // 준비상태 확인: preparation status 우선, 그 다음 player의 기존 필드
  const isReady = preparationStatus?.isReady ?? !!(player.isReady || player.preparationStatus?.isReady);
  
  // 무한 렌더링 방지를 위해 디버깅 로그 제거
  
  // 🎨 안전한 캐릭터 렌더링 함수
  const renderCharacterPreview = () => {
    // 🛡️ 단계별 안전 검증
    if (!finalCharacterData || !hasValidCharacterData) {
      if (import.meta.env.DEV && Math.random() < 0.01) {
        console.warn('⚠️ [PlayerCard] 캐릭터 데이터 없음 또는 불완전:', {
          playerId,
          hasFinalCharacterData: !!finalCharacterData,
          hasValidCharacterData,
          selectedOptions: finalCharacterData?.selectedOptions,
          selectedColors: finalCharacterData?.selectedColors
        });
      }
      return null;
    }
    
    const characterForRender: CharacterData = {
      selectedOptions: finalCharacterData.selectedOptions,
      selectedColors: finalCharacterData.selectedColors,
      nickname: finalCharacterData.nickname || player.nickname
    };
    
    try {
      return renderCharacterLayers(characterForRender);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('❌ [PlayerCard] 캐릭터 렌더링 오류:', error);
      }
      return null;
    }
  };

  // 캐릭터 애니메이션 훅 사용
  const {
    topPartStyle,
    bottomPartStyle,
    characterImageStyle,
    loadingIconStyle
  } = useCharacterAnimation(playerHasCharacter, isReady);

  // 원격 오디오 스트림 재생 처리
  useEffect(() => {
    const audioElement = audioRef.current;
    
    if (audioElement && stream && !isLocalPlayer) {
      console.log(`🔊 [PlayerCard] Setting up audio for ${player.nickname}:`, {
        streamId: stream.id,
        audioTracks: stream.getAudioTracks().length,
        hasAudioElement: !!audioElement
      });
      
      try {
        // 스트림을 오디오 엘리먼트에 연결
        audioElement.srcObject = stream;
        audioElement.autoplay = true;
        (audioElement as any).playsInline = true; // playsInline은 video 전용이지만 호환성을 위해 유지
        audioElement.muted = false; // 음소거 해제
        
        // 볼륨 설정
        audioElement.volume = 0.8; // 80% 볼륨으로 설정
        
        // 오디오 트랙 활성화 확인
        const audioTracks = stream.getAudioTracks();
        audioTracks.forEach(track => {
          if (!track.enabled) {
            console.warn(`⚠️ [PlayerCard] Audio track disabled for ${player.nickname}`);
          }
        });
        
        // 재생 시작 시도
        const playPromise = audioElement.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            console.log(`✅ [PlayerCard] Audio playing for ${player.nickname}`);
          }).catch(error => {
            console.warn(`⚠️ [PlayerCard] Auto-play failed for ${player.nickname}:`, error);
            
            // 사용자 인터랙션이 필요한 경우, 전역 이벤트 리스너 추가
            const enableAudio = () => {
              audioElement.play()
                .then(() => {
                  console.log(`✅ [PlayerCard] Audio enabled after user interaction for ${player.nickname}`);
                  document.removeEventListener('click', enableAudio);
                  document.removeEventListener('touchstart', enableAudio);
                })
                .catch(err => console.error(`❌ [PlayerCard] Failed to enable audio:`, err));
            };
            
            document.addEventListener('click', enableAudio, { once: true });
            document.addEventListener('touchstart', enableAudio, { once: true });
          });
        }
        
        console.log(`✅ [PlayerCard] Audio setup completed for ${player.nickname}`);
      } catch (error) {
        console.error(`❌ [PlayerCard] Audio setup failed for ${player.nickname}:`, error);
      }
    } else if (audioElement && !stream) {
      // 스트림이 없으면 오디오 정리
      audioElement.srcObject = null;
      console.log(`🧹 [PlayerCard] Audio cleaned up for ${player.nickname}`);
    }
    
    // 정리 함수
    return () => {
      if (audioElement) {
        audioElement.srcObject = null;
      }
    };
  }, [stream, isLocalPlayer, player.nickname]);

  return (
    <div className="w-[230px] h-[288px] flex flex-col items-center justify-between">
      {/* 상단 부분 */}
      <div className="w-full h-[50px] relative">
        <CardTop className="w-full h-full" />
        
        {/* 로딩바 - left 25, top 13, 크기 24*24 */}
        <div 
          className="absolute" 
          style={{ 
            left: '25px', 
            top: '13px', 
            width: '24px', 
            height: '24px',
            ...loadingIconStyle
          }}
        >
          {isReady ? (
            <CardTopReady className="w-full h-full" />
          ) : (
            <CardTopUnready className="w-full h-full" />
          )}
        </div>
        
        {/* 닉네임 레이블 영역 */}
        <div className="absolute flex items-center" style={{ left: '97.67px', top: '7.45px' }}>
          {/* 방장 아이콘 - 방장일 때만 표시 */}
          {isHost && (
            <HostSmallIcon 
              className="mr-[11.46px]" 
              style={{ width: '13px', height: '13px' }} 
            />
          )}
          {/* 닉네임 텍스트 */}
          <span 
            style={{
              color: '#103FA2',
              fontSize: '16px',
              fontFamily: 'Segoe UI',
              fontWeight: '600',
              lineHeight: '24px',
              wordWrap: 'break-word'
            }}
          >
            {player.nickname}
          </span>
          
          {/* 음성 표시기 */}
          {voiceChatConnected && (
            <div className="ml-2">
              <VoiceIndicator
                stream={stream}
                isConnected={voiceChatConnected}
                nickname={player.nickname}
                size="small"
              />
            </div>
          )}
        </div>
      </div>

      {/* 캐릭터 표시 영역 */}
      <div className="w-[230px] h-[175px] relative border-[1.37px] border-[#96bbff] rounded-[5.04px] overflow-hidden">
        {/* 상단 부분 - 위로 사라짐 */}
        <div 
          className="absolute top-0 left-0 w-full flex justify-center"
          style={{ 
            height: '109px',
            ...topPartStyle
          }}
        >
          <NonSelectTop 
            className="w-full h-full"
          />
        </div>
        
        {/* 하단 부분 - 아래로 사라짐 */}
        <div 
          className="absolute left-0 w-full flex justify-center"
          style={{ 
            top: '107.63px',
            height: '67.37px',
            ...bottomPartStyle
          }}
        >
          <NonSelectBottom 
            className="w-full h-full"
          />
        </div>
        
        {/* 캐릭터 이미지 - 항상 렌더링하되 opacity로 제어 */}
        <div 
          className="absolute flex justify-center items-start"
          style={{
            width: '139px',
            height: '139px',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            overflow: 'hidden',
            ...characterImageStyle
          }}
        >
          {hasValidCharacterData ? (
            // 🎨 실제 캐릭터 렌더링 (CharacterSetupPage와 동일한 방식)
            <div className="relative w-full h-full">
              <div 
                className="w-full h-full"
                style={{
                  transform: 'scale(0.4) translate(-0%, -20%)', // 작은 카드에 맞게 스케일 조정
                  transformOrigin: 'center center'
                }}
              >
                {renderCharacterPreview()}
              </div>
            </div>
          ) : (
            // 기본 캐릭터 이미지 (데이터 없음 또는 캐릭터 설정 전)
            <img 
              src={CharacterSample}
              alt="기본 캐릭터"
              className="object-cover object-top"
              style={{
                width: '146.04px',
                height: '193.68px'
              }}
            />
          )}
          {/* 캐릭터 정보 디버그 (개발 모드에서만 표시) */}
          {import.meta.env.DEV && finalCharacterData && (
            <div className="absolute top-2 right-2 text-xs bg-black bg-opacity-50 text-white p-1 rounded">
              {finalCharacterData.selectedOptions?.face || 'N/A'}
            </div>
          )}
        </div>
      </div>

      {/* 하단 부분  */}
      <div className="w-full h-[48.22px] relative">
        {isReady ? (
          <CardBottomReady className="w-full h-full" />
        ) : (
          <CardBottomUnready className="w-full h-full" />
        )}
        <div className="absolute inset-0 flex items-center justify-center text-white text-lg font-medium">
          {player.name}
        </div>
      </div>
      
      {/* 원격 오디오 재생을 위한 숨겨진 audio 엘리먼트 */}
      {!isLocalPlayer && (
        <audio 
          ref={audioRef}
          style={{ display: 'none' }}
          autoPlay
          playsInline
        />
      )}
    </div>
  );
};