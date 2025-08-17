import React from 'react';
import type { CharacterData } from '../types/room';

/**
 * 캐릭터 데이터로부터 레이어드 이미지를 렌더링하는 유틸리티
 */
export const renderCharacterLayers = (characterData: CharacterData): React.ReactNode[] => {
  const layers = [];
  const basePath = '/src/assets/gamecast/characterCustom/charactorasset';
  const { selectedOptions, selectedColors } = characterData;

  // 1. 몸통 (body) - 얼굴 카테고리에서 선택된 몸통 색상
  const selectedBodyColor = selectedColors['face'];
  if (selectedBodyColor) {
    layers.push(
      <img
        key="body"
        src={`${basePath}/body/${selectedBodyColor}.png`}
        alt="몸통"
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full object-contain"
        style={{ zIndex: 1 }}
      />
    );
  }

  // 2. 머리 (hair)
  const selectedHair = selectedOptions['hair'];
  const selectedHairColor = selectedColors['hair'];
  if (selectedHair && selectedHairColor) {
    layers.push(
      <img
        key="hair"
        src={`${basePath}/${selectedHair}/${selectedHairColor}.png`}
        alt="머리"
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full object-contain"
        style={{ zIndex: 2 }}
      />
    );
  }

  // 3. 얼굴 (face) - 얼굴 카테고리에서 선택된 얼굴 형태
  const selectedFace = selectedOptions['face'];
  if (selectedFace) {
    layers.push(
      <img
        key="face"
        src={`${basePath}/${selectedFace}/default.png`}
        alt="얼굴"
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full object-contain"
        style={{ zIndex: 3 }}
      />
    );
  }

  // 4. 상의 (top)
  const selectedTop = selectedOptions['top'];
  const selectedTopColor = selectedColors['top'];
  if (selectedTop && selectedTopColor) {
    const topImage = selectedTop === 'top3' 
      ? `${basePath}/${selectedTop}/상의3_${selectedTopColor === 'white' ? '화이트' : selectedTopColor === 'green' ? '그린' : selectedTopColor === 'red' ? '레드' : selectedTopColor === 'blue' ? '블루' : '옐로우'}.png`
      : `${basePath}/${selectedTop}/${selectedTopColor}.png`;
    
    layers.push(
      <img
        key="top"
        src={topImage}
        alt="상의"
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full object-contain"
        style={{ zIndex: 4 }}
      />
    );
  }

  // 5. 하의 (bottom)
  const selectedBottom = selectedOptions['bottom'];
  const selectedBottomColor = selectedColors['bottom'];
  if (selectedBottom && selectedBottomColor) {
    layers.push(
      <img
        key="bottom"
        src={`${basePath}/${selectedBottom}/${selectedBottomColor}.png`}
        alt="하의"
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full object-contain"
        style={{ zIndex: 5 }}
      />
    );
  }

  // 6. 장신구 (accessory)
  const selectedAccessory = selectedOptions['accessory'];
  const selectedAccessoryColor = selectedColors['accessory'];
  if (selectedAccessory && selectedAccessoryColor) {
    const accessoryImage = selectedAccessory === 'accessories1' && selectedAccessoryColor === 'default'
      ? `${basePath}/${selectedAccessory}/default.PNG`
      : selectedAccessory === 'accessories1' && selectedAccessoryColor === 'yellow'
      ? `${basePath}/${selectedAccessory}/yellow.PNG`
      : selectedAccessory === 'accessories3' && selectedAccessoryColor === 'white'
      ? `${basePath}/${selectedAccessory}/white.png`
      : `${basePath}/${selectedAccessory}/${selectedAccessoryColor}.png`;
    
    layers.push(
      <img
        key="accessory"
        src={accessoryImage}
        alt="장신구"
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full object-contain"
        style={{ zIndex: 6 }}
      />
    );
  }

  return layers;
};

/**
 * 캐릭터 렌더러 컴포넌트
 */
interface CharacterRendererProps {
  characterData: CharacterData;
  className?: string;
  style?: React.CSSProperties;
}

export const CharacterRenderer: React.FC<CharacterRendererProps> = ({ 
  characterData, 
  className = "relative w-full h-full",
  style 
}) => {
  return (
    <div className={className} style={style}>
      {renderCharacterLayers(characterData)}
    </div>
  );
};