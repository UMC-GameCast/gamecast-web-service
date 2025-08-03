import { useState, useEffect } from 'react';

/**
 * 캐릭터 카드 애니메이션 관련 로직을 관리하는 커스텀 훅
 * 
 * @param hasCharacter - 캐릭터가 선택되었는지 여부
 * @param isReady - 준비 상태 여부 (선택적)
 * @returns 애니메이션 상태와 스타일 객체들
 */
export const useCharacterAnimation = (hasCharacter: boolean, isReady: boolean = true) => {
  // 회전 각도 상태 (로딩 애니메이션용)
  const [rotation, setRotation] = useState(0);

  // 준비하지 않은 상태일 때 회전 애니메이션
  useEffect(() => {
    if (!isReady) {
      const interval = setInterval(() => {
        setRotation(prev => prev - 3); // 3도씩 반시계방향 회전
      }, 16); // 약 60fps
      
      return () => clearInterval(interval);
    }
  }, [isReady]);

  // 카드 상단 부분 스타일 (위로 사라지는 애니메이션)
  const topPartStyle = {
    transform: hasCharacter ? 'translateY(-100%)' : 'translateY(0)',
    transition: 'transform 0.5s ease-in-out'
  };

  // 카드 하단 부분 스타일 (아래로 사라지는 애니메이션)
  const bottomPartStyle = {
    transform: hasCharacter ? 'translateY(100%)' : 'translateY(0)',
    transition: 'transform 0.5s ease-in-out'
  };

  // 캐릭터 이미지 스타일 (페이드인 애니메이션)
  const characterImageStyle = {
    opacity: hasCharacter ? 1 : 0,
    transition: 'opacity 0.7s ease-in-out',
    transitionDelay: hasCharacter ? '300ms' : '0ms' // 카드가 열린 후 나타나도록 지연
  };

  // 로딩 아이콘 회전 스타일
  const loadingIconStyle = {
    transform: !isReady ? `rotate(${rotation}deg)` : 'none',
    transition: isReady ? 'transform 0.3s ease-out' : 'none'
  };

  return {
    rotation,
    topPartStyle,
    bottomPartStyle,
    characterImageStyle,
    loadingIconStyle,
    hasCharacter,
    isReady
  };
};