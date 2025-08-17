import { useEffect, useRef, useState } from "react";
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
import { usePlayerCardStream } from "../../../hooks/usePlayerCardStream";

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
  hasCharacter,
  preparationStatus
}: PlayerCardProps) => {
  // 오디오 재생을 위한 ref
  const audioRef = useRef<HTMLAudioElement>(null);
  const [needsAudioActivation, setNeedsAudioActivation] = useState(false);
  
  // TODO: WebRTC 기능 비활성화 - 스트림 검색 비활성화
  const { effectiveStream, streamFound } = usePlayerCardStream(player, stream, isLocalPlayer);
  
  const playerId = player.guestUserId || player.id;
  
  // ✨ 단순화된 캐릭터 데이터: PlayerGrid에서 계산된 데이터 사용
  const finalCharacterData = character;
  const playerHasCharacter = hasCharacter ?? (player.characterInfo?.isCustomized || false);
  
  // 디버깅 로그 제거 (콘솔 스팸 방지)
  
  // ✨ 단순화된 캐릭터 존재 여부: preparation status 우선, 그 다음 isCustomized 
  const finalPlayerHasCharacter = preparationStatus?.characterSetup ?? playerHasCharacter;

  // ✨ 단순화 완료: 복잡한 디버깅 로그 제거됨
  
  // 준비상태 확인: preparation status 우선, 그 다음 player의 기존 필드
  const isReady = preparationStatus?.isReady ?? !!(player.isReady || player.preparationStatus?.isReady);
  
  // 무한 렌더링 방지를 위해 디버깅 로그 제거
  
  // 🎨 안전한 캐릭터 렌더링 함수
  const renderCharacterPreview = () => {
    // 🛡️ 단계별 안전 검증
    if (!finalCharacterData || !finalPlayerHasCharacter) {
      if (import.meta.env.DEV && Math.random() < 0.01) {
        console.warn('⚠️ [PlayerCard] 캐릭터 데이터 없음:', {
          playerId,
          nickname: player.nickname,
          hasCharacterData: !!finalCharacterData,
          hasCharacter: finalPlayerHasCharacter
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
  } = useCharacterAnimation(finalPlayerHasCharacter, isReady);

  // TODO: WebRTC 기능 비활성화 - 오디오 스트림 처리 비활성화
  /*
  useEffect(() => {
    const audioElement = audioRef.current;
    
    if (audioElement && effectiveStream && !isLocalPlayer) {
      console.log(`🎆 [PlayerCard] 스트림을 오디오 엘리먼트에 연결 for ${player.nickname}:`, {
        streamId: effectiveStream.id,
        audioTracks: effectiveStream.getAudioTracks().length,
        streamFound
      });
      
      try {
        // 스트림을 오디오 엘리먼트에 연결 (최적화된 설정)
        audioElement.srcObject = effectiveStream;
        audioElement.autoplay = true;
        audioElement.muted = false; // 음소거 해제
        
        // 오디오 품질 최적화 설정
        audioElement.volume = 1.0; // 최대 볼륨으로 설정
        audioElement.preload = 'auto';
        
        // 지연 시간 최소화
        if ('mozAudioChannelType' in audioElement) {
          (audioElement as any).mozAudioChannelType = 'content';
        }
        
        // 오디오 트랙 활성화 확인
        const audioTracks = effectiveStream.getAudioTracks();
        audioTracks.forEach(track => {
          if (!track.enabled) {
            console.warn(`⚠️ [PlayerCard] Audio track disabled for ${player.nickname}`);
          }
        });
        
        // 오디오 엘리먼트 상태 확인 (확률적 로깅으로 무한 루프 방지)
        if (Math.random() < 0.1) {
          console.log(`🎆 [PlayerCard] 오디오 엘리먼트 설정 완료 for ${player.nickname}:`, {
            audioElementSrc: audioElement.srcObject?.id,
            audioElementVolume: audioElement.volume,
            audioElementMuted: audioElement.muted,
            audioElementAutoplay: audioElement.autoplay,
            audioElementPaused: audioElement.paused,
            audioElementReadyState: audioElement.readyState,
            streamTracks: effectiveStream.getTracks().map(track => ({
              kind: track.kind,
              enabled: track.enabled,
              readyState: track.readyState,
              muted: track.muted
            }))
          });
        }
        
        // 강화된 오디오 재생 시도
        const attemptPlay = async () => {
          try {
            // 먼저 오디오 컨텍스트 상태 확인
            if (window.AudioContext) {
              const audioContext = new AudioContext();
              if (audioContext.state === 'suspended') {
                // console.log(`🔄 [PlayerCard] AudioContext suspended, attempting resume for ${player.nickname}`);
                await audioContext.resume();
              }
              audioContext.close();
            }
            
            await audioElement.play();
            console.log(`✅ [PlayerCard] Audio playing successfully for ${player.nickname}:`, {
              currentTime: audioElement.currentTime,
              duration: audioElement.duration,
              paused: audioElement.paused,
              volume: audioElement.volume,
              muted: audioElement.muted
            });
          } catch (error) {
            console.warn(`⚠️ [PlayerCard] Auto-play failed for ${player.nickname}:`, error);
            
            // UI에 활성화 필요 상태 표시
            setNeedsAudioActivation(true);
            
            // 화면에 재생 버튼 표시 또는 사용자 클릭 대기
            const enableAudio = async () => {
              try {
                await audioElement.play();
                // console.log(`✅ [PlayerCard] Audio enabled after user interaction for ${player.nickname}`);
                
                // UI 상태 업데이트
                setNeedsAudioActivation(false);
                
                // 이벤트 리스너 정리
                document.removeEventListener('click', enableAudio);
                document.removeEventListener('touchstart', enableAudio);
                document.removeEventListener('keydown', enableAudio);
                
                // 성공 후 다른 오디오 엘리먼트들도 시도
                const otherAudios = document.querySelectorAll('audio');
                otherAudios.forEach(async (otherAudio) => {
                  if (otherAudio !== audioElement && otherAudio.paused && otherAudio.srcObject) {
                    try {
                      await otherAudio.play();
                      // console.log('✅ [PlayerCard] Other audio also enabled');
                    } catch (err) {
                      console.warn('⚠️ [PlayerCard] Other audio still blocked');
                    }
                  }
                });
                
              } catch (err) {
                console.error(`❌ [PlayerCard] Failed to enable audio after interaction:`, err);
              }
            };
            
            // 더 많은 이벤트 타입으로 사용자 인터랙션 감지
            document.addEventListener('click', enableAudio, { once: true });
            document.addEventListener('touchstart', enableAudio, { once: true });
            document.addEventListener('keydown', enableAudio, { once: true });
            
            // console.log(`👆 [PlayerCard] Waiting for user interaction to enable audio for ${player.nickname}`);
          }
        };
        
        // 재생 시도
        attemptPlay();
        
        // ✨ 전역 디버깅 함수 등록
        if (typeof window !== 'undefined') {
          (window as any).testAudioFor = (nickname: string) => {
            if (nickname === player.nickname) {
              console.log(`🎆 [DEBUG] Testing audio for ${nickname}:`, {
                hasAudioElement: !!audioElement,
                hasStream: !!stream,
                audioTracks: stream?.getAudioTracks().length || 0,
                audioElement: {
                  paused: audioElement.paused,
                  muted: audioElement.muted,
                  volume: audioElement.volume,
                  srcObject: !!audioElement.srcObject
                }
              });
              
              if (audioElement && !audioElement.paused) {
                console.log('🔊 [DEBUG] Audio should be playing!');
              } else {
                console.log('⚠️ [DEBUG] Audio is paused, attempting to play...');
                audioElement.play().catch(e => console.error('Play failed:', e));
              }
            }
          };
        }
        
        // console.log(`✅ [PlayerCard] Audio setup completed for ${player.nickname}`);
      } catch (error) {
        console.error(`❌ [PlayerCard] Audio setup failed for ${player.nickname}:`, error);
      }
    } else if (audioElement && !stream) {
      // 스트림이 없으면 오디오 정리
      audioElement.srcObject = null;
      // console.log(`🧹 [PlayerCard] Audio cleaned up for ${player.nickname}`);
    }
    
    // 정리 함수
    return () => {
      if (audioElement) {
        audioElement.srcObject = null;
      }
    };
  }, [effectiveStream, isLocalPlayer, player.nickname]);
  */
  
  // TODO: WebRTC 재구현 시 위 오디오 스트림 처리 로직 복원 필요

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
          {(voiceChatConnected || effectiveStream) && (
            <div className="ml-2">
              <VoiceIndicator
                stream={effectiveStream}
                isConnected={voiceChatConnected || streamFound}
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
          {finalPlayerHasCharacter && finalCharacterData ? (
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
          {player.name || player.nickname}
        </div>
      </div>
      
      {/* TODO: WebRTC 기능 비활성화 - 오디오 엘리먼트 비활성화 */}
      {/*
      원격 오디오 재생을 위한 숨겨진 audio 엘리먼트 (비활성화됨)
      {!isLocalPlayer && (effectiveStream || import.meta.env.DEV) && (
        <audio 
          ref={audioRef}
          style={{ display: import.meta.env.DEV ? 'block' : 'none' }}
          autoPlay
          playsInline
          controls={import.meta.env.DEV}
        />
      )}
      */}
      
      {/* TODO: WebRTC 기능 비활성화 - 디버깅 정보 업데이트 */}
      {import.meta.env.DEV && !isLocalPlayer && (
        <div style={{ 
          position: 'absolute', 
          top: '2px', 
          right: '2px', 
          background: 'rgba(0,0,0,0.95)', 
          color: '#ffffff', 
          fontSize: '11px', 
          padding: '4px 6px',
          borderRadius: '3px',
          border: '1px solid #333',
          fontFamily: 'monospace',
          fontWeight: 'bold',
          zIndex: 1000
        }}>
          🚫 WebRTC: DISABLED | 🎮 Local: {isLocalPlayer ? '✅' : '❌'}
        </div>
      )}

      {/* TODO: WebRTC 기능 비활성화 - 오디오 활성화 알림 비활성화 */}
      {/*
      오디오 활성화 필요 알림 (비활성화됨)
      {(needsAudioActivation || import.meta.env.DEV) && !isLocalPlayer && effectiveStream && (
        <div style={{...}} onClick={...}>
          🔊 클릭하여<br />음성 활성화
        </div>
      )}
      */}
    </div>
  );
};