import React, { useEffect, useRef } from "react";
import type { Player } from "../../../types/room";
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

interface PlayerCardProps {
  player: Player;
  isHost: boolean;
  stream?: MediaStream | null;
  isLocalPlayer?: boolean;
  voiceChatConnected?: boolean;
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
  voiceChatConnected = false 
}: PlayerCardProps) => {
  // 오디오 재생을 위한 ref
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // 준비상태 확인 (캐릭터 설정 비활성화로 인해 isReady 필드 직접 사용)
  const isReady = !!(player.isReady || player.preparationStatus?.isReady);
  
  // 캐릭터 설정 여부 (항상 true로 설정 - 캐릭터 설정 비활성화)
  const hasCharacter = true;
  
  // 캐릭터 애니메이션 훅 사용
  const {
    topPartStyle,
    bottomPartStyle,
    characterImageStyle,
    loadingIconStyle
  } = useCharacterAnimation(hasCharacter, isReady);

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
        audioElement.playsInline = true;
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
          <img 
            src={CharacterSample}
            alt="캐릭터"
            className="object-cover object-top"
            style={{
              width: '146.04px',
              height: '193.68px'
            }}
          />
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