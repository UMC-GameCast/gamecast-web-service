import React from "react";
import type { Player } from "../../../types/room";
import HostSmallIcon from "../../../assets/gamecast/Room/Host_small.svg?react";
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
}

/**
 * 방 참여 플레이어 카드 컴포넌트
 * @param player - 플레이어 정보
 * @param isHost - 방장 여부
 */
export const PlayerCard = ({ player, isHost }: PlayerCardProps) => {
  // 준비상태 확인 (새로운 데이터 구조 사용)
  const isReady = !!(player.preparationStatus?.characterSetup && player.preparationStatus?.screenSetup);
  
  // 캐릭터 설정 여부
  const hasCharacter = !!player.preparationStatus?.characterSetup;
  
  // 캐릭터 애니메이션 훅 사용
  const {
    topPartStyle,
    bottomPartStyle,
    characterImageStyle,
    loadingIconStyle
  } = useCharacterAnimation(hasCharacter, isReady);

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
    </div>
  );
};