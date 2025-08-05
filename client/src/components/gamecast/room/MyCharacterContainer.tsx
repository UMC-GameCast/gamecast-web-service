import React from "react";
import type { Player } from "../../../types/room";
import HostBig from "../../../assets/gamecast/Room/Host_big.svg?react";
import { renderCharacterLayers } from "../../../utils/characterRenderer";
import type { CharacterData } from "../../../types/room";
import { VoiceIndicator } from "../common/VoiceIndicator";

/**
 * MyCharacterContainer Props 인터페이스
 */
interface MyCharacterContainerProps {
  isHost: boolean;
  currentPlayer: Player | null;
  localStream?: MediaStream | null;
  isLocalMuted?: boolean;
  voiceChatConnected?: boolean;
  // 🎯 실시간 캐릭터 데이터 추가
  characterData?: CharacterData | null;
}

/**
 * 내 캐릭터와 관련된 UI 요소들을 포함하는 컨테이너 컴포넌트
 */
export const MyCharacterContainer: React.FC<MyCharacterContainerProps> = ({ 
  isHost, 
  currentPlayer,
  localStream = null,
  isLocalMuted = false,
  voiceChatConnected = false,
  characterData = null // 🎯 실시간 캐릭터 데이터
}) => {
  // 🎯 캐릭터 데이터 우선순위: 실시간 props > 서버 characterInfo > 서버 character
  const finalCharacterData = characterData || 
    (currentPlayer?.characterInfo?.isCustomized ? {
      selectedOptions: currentPlayer.characterInfo.selectedOptions!,
      selectedColors: currentPlayer.characterInfo.selectedColors!,
      nickname: currentPlayer.nickname
    } : null) || 
    currentPlayer?.character;
  
  // 🛡️ 안전한 캐릭터 데이터 검증
  const hasValidCharacterData = !!(finalCharacterData && 
    finalCharacterData.selectedOptions && 
    finalCharacterData.selectedColors &&
    typeof finalCharacterData.selectedOptions === 'object' &&
    typeof finalCharacterData.selectedColors === 'object' &&
    Object.keys(finalCharacterData.selectedOptions).length > 0 &&
    Object.keys(finalCharacterData.selectedColors).length > 0
  );
  
  const hasCharacter = hasValidCharacterData;
  
  // 🔧 디버깅: 캐릭터 데이터 상태 (표준화된 로깅)
  console.log('🏠 [MyCharacterContainer] 캐릭터 데이터 상세 분석:', {
    // 현재 플레이어 ID 정보
    currentPlayerInfo: {
      guestUserId: currentPlayer?.guestUserId,
      id: currentPlayer?.id,
      nickname: currentPlayer?.nickname
    },
    
    // 데이터 우선순위별 분석 (표준화된 순서)
    dataSource1_socketIOProps: {
      available: !!characterData,
      data: characterData,
      valid: !!(characterData?.selectedOptions && characterData?.selectedColors)
    },
    
    dataSource2_serverCharacterInfo: {
      available: !!currentPlayer?.characterInfo?.isCustomized,
      data: currentPlayer?.characterInfo,
      valid: !!(currentPlayer?.characterInfo?.selectedOptions && currentPlayer?.characterInfo?.selectedColors)
    },
    
    dataSource3_legacyCharacter: {
      available: !!currentPlayer?.character,
      data: currentPlayer?.character,
      valid: !!(currentPlayer?.character?.selectedOptions && currentPlayer?.character?.selectedColors)
    },
    
    // 최종 결정된 데이터 분석
    finalDecision: {
      selectedDataSource: characterData ? 'socketIO-props' : 
                         (currentPlayer?.characterInfo?.isCustomized ? 'server-characterInfo' : 
                         (currentPlayer?.character ? 'legacy-character' : 'none')),
      finalData: finalCharacterData,
      isValid: hasValidCharacterData,
      willRenderCharacter: hasCharacter
    },
    
    // 상세 검증 정보
    validation: {
      hasSelectedOptions: !!finalCharacterData?.selectedOptions,
      hasSelectedColors: !!finalCharacterData?.selectedColors,
      selectedOptionsKeys: finalCharacterData?.selectedOptions ? Object.keys(finalCharacterData.selectedOptions) : [],
      selectedColorsKeys: finalCharacterData?.selectedColors ? Object.keys(finalCharacterData.selectedColors) : [],
      selectedOptionsCount: finalCharacterData?.selectedOptions ? Object.keys(finalCharacterData.selectedOptions).length : 0,
      selectedColorsCount: finalCharacterData?.selectedColors ? Object.keys(finalCharacterData.selectedColors).length : 0
    }
  });

  return (
    <div className="w-[579px] h-[499px] pl-[30px] justify-end items-center inline-flex relative">
      <div className="flex-col justify-start items-center flex gap-[-50px] relative" style={{ width: '480px', height: '477.87px' }}>
        <div className="justify-center items-center gap-[10.67px] inline-flex" style={{ width: '480px', height: '477.87px' }}>

         

          {/* 캐릭터가 설정되지 않았을 때 - 텍스트 표시 */}
          {!hasCharacter && (
            <div 
              className="flex flex-col justify-center"
              style={{
                opacity: '0.5',
                textAlign: 'center',
                color: '#ffffff',
                fontSize: '23.86px',
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                fontWeight: '500',
                lineHeight: '35.80px',
                wordWrap: 'break-word',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              캐릭터를 설정 해주세요
            </div>
          )}
          
          {/* 캐릭터가 설정되었을 때 - 안전한 실시간 캐릭터 표시 */}
          {hasCharacter && (
            <div 
              className="absolute"
              style={{
                width: '480px',
                height: '480px',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                overflow: 'hidden'
              }}
            >
              {/* 🎨 안전한 캐립터 렌더링 */}
              <div className="relative w-full h-full">
                {(() => {
                  try {
                    return renderCharacterLayers({
                      selectedOptions: finalCharacterData!.selectedOptions,
                      selectedColors: finalCharacterData!.selectedColors,
                      nickname: finalCharacterData!.nickname || currentPlayer?.nickname || 'Me'
                    });
                  } catch (error) {
                    if (import.meta.env.DEV) {
                      console.error('❌ [MyCharacterContainer] 캐릭터 렌더링 오류:', error);
                    }
                    return (
                      <div className="flex items-center justify-center w-full h-full text-white opacity-50">
                        캐릭터 렌더링 오류
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
          )}
        </div>
        <div className="self-stretch pr-[30px] flex-col justify-start items-start gap-[10px] flex">
          <div 
            style={{
              width: '450px', 
              height: '71.03px', 
              borderRadius: '9999px',
              background: 'radial-gradient(ellipse 55.37% 55.37% at 50.00% 50.00%, rgba(32, 35, 245, 0.81) 0%, rgba(134, 219, 255, 0.10) 56%, rgba(0, 4, 57, 0) 100%)'
            }}
          />
        </div>
      </div>
      {/* 음성 표시기 */}
      {voiceChatConnected && (
        <div
          style={{
            position: 'absolute',
            right: '20px',
            top: '20px',
            zIndex: 10
          }}
        >
          <VoiceIndicator
            stream={localStream}
            isMuted={isLocalMuted}
            isConnected={voiceChatConnected}
            nickname={currentPlayer?.nickname || ''}
            size="large"
          />
        </div>
      )}

      {/* 현재 플레이어가 방장일 때만 아이콘 표시 */}
      {isHost && (
        <div
          style={{
            position: 'absolute',
            width: '52.24px',
            height: '52.91px',
            left: '-36.41px',
            top: '-64.52px'
          }}
        >
          {/*방장 표시 아이콘*/}
          <HostBig

            style={{
              position: 'absolute',
              width: '43.54px',
              height: '41.93px',
              left: '42.35px',
              top: '11.61px'
            }}
          />
        </div>
      )}
    </div>
  );
}; 