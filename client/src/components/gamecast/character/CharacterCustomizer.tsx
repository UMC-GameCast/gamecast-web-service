import React, { useState, useRef, useEffect, useCallback } from "react";
import { getAssetsByCategory, getAssetColors, type CharacterAsset } from "../../../utils/characterAssetManager";
import { useRoom } from "../../../hooks/useRoom";
import { renderCharacterLayers } from "../../../utils/characterRenderer";
import { RoomButton } from "../room/RoomButton";
import type { CharacterData } from "../../../types/room";

interface CharacterCustomizerProps {
  onCharacterChange?: (character: CharacterData) => void;
  onComplete?: () => void;
}


const customizationCategories = [
  { id: 'face', name: '얼굴' },
  { id: 'hair', name: '머리' },
  { id: 'top', name: '상의' },
  { id: 'bottom', name: '하의' },
  { id: 'accessory', name: '장식' }
];

export const CharacterCustomizer: React.FC<CharacterCustomizerProps> = ({ onCharacterChange, onComplete }) => {
  const { currentPlayer } = useRoom();
  const [selectedCategory, setSelectedCategory] = useState('face'); // face부터 시작
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({
    face: 'face1' // 얼굴은 필수로 기본 선택
  });
  const [selectedColors, setSelectedColors] = useState<Record<string, string>>({
    face: '21' // 몸통 색상도 필수로 기본 선택
  });
  const [sliderStyle, setSliderStyle] = useState({ width: 0, left: 0 });
  const [nickname, setNickname] = useState(currentPlayer?.name || '닉네임'); // 현재 플레이어 닉네임 사용
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [hasError, setHasError] = useState(false);

  // 에러 처리
  React.useEffect(() => {
    try {
      // 필요한 함수들이 존재하는지 확인
      if (typeof getAssetsByCategory !== 'function' || typeof getAssetColors !== 'function') {
        throw new Error('Asset manager functions not available');
      }
    } catch (error) {
      console.error('CharacterCustomizer 초기화 에러:', error);
      setHasError(true);
    }
  }, []);

  if (hasError) {
    return (
      <div className="flex items-center justify-center w-full h-[557px] bg-gray-900 rounded-lg">
        <p className="text-white text-lg">캐릭터 설정 로딩 중 오류가 발생했습니다.</p>
      </div>
    );
  }
  
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // 현재 카테고리의 에셋 가져오기
  const getCurrentAssets = (): CharacterAsset[] => {
    return getAssetsByCategory(selectedCategory as 'hair' | 'top' | 'bottom' | 'accessory' | 'face');
  };

  // 현재 선택된 에셋의 색상 옵션 가져오기
  const getCurrentColors = () => {
    const selectedAssetId = selectedOptions[selectedCategory];
    if (!selectedAssetId) return [];
    return getAssetColors(selectedAssetId);
  };

  // 슬라이더 위치 업데이트 함수
  const updateSliderPosition = useCallback(() => {
    const selectedIndex = customizationCategories.findIndex(cat => cat.id === selectedCategory);
    const selectedTab = tabsRef.current[selectedIndex];
    const container = containerRef.current;
    
    if (selectedTab && container) {
      const containerRect = container.getBoundingClientRect();
      const tabRect = selectedTab.getBoundingClientRect();
      
      setSliderStyle({
        width: tabRect.width,
        left: tabRect.left - containerRect.left
      });
    }
  }, [selectedCategory]);

  // 컴포넌트 마운트 시와 선택된 카테고리 변경 시 슬라이더 위치 업데이트
  useEffect(() => {
    updateSliderPosition();
  }, [selectedCategory, updateSliderPosition]);

  // 윈도우 리사이즈 시 슬라이더 위치 재계산
  useEffect(() => {
    const handleResize = () => {
      updateSliderPosition();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateSliderPosition]);

  // currentPlayer 변경 시 닉네임 업데이트
  useEffect(() => {
    if (currentPlayer?.name) {
      setNickname(currentPlayer.name);
    }
  }, [currentPlayer]);

  // 캐릭터 데이터 변경 시 부모 컴포넌트에 전달
  useEffect(() => {
    const characterData: CharacterData = {
      selectedOptions,
      selectedColors,
      nickname
    };
    onCharacterChange?.(characterData);
  }, [selectedOptions, selectedColors, nickname]); // onCharacterChange 제거하여 무한 렌더링 방지

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const handleOptionSelect = (optionId: string) => {
    // 얼굴(face) 카테고리는 해제 불가, 이미 선택된 옵션을 다시 클릭하면 선택 해제
    if (selectedOptions[selectedCategory] === optionId && selectedCategory !== 'face') {
      setSelectedOptions(prev => ({
        ...prev,
        [selectedCategory]: ''
      }));
      setSelectedColors(prev => ({
        ...prev,
        [selectedCategory]: ''
      }));
    } else {
      // 새로운 옵션 선택 시 default 색상 자동 선택
      setSelectedOptions(prev => ({
        ...prev,
        [selectedCategory]: optionId
      }));
      
      // 카테고리별 기본 색상 설정
      let defaultColor = 'default';
      if (selectedCategory === 'hair' && (optionId === 'hair1' || optionId === 'hair3')) {
        defaultColor = 'black';
      } else if (selectedCategory === 'face') {
        defaultColor = '21'; // 기본 몸통 색상
      } else if (selectedCategory === 'top' && optionId === 'top3') {
        defaultColor = 'white';
      } else if (selectedCategory === 'accessory' && optionId === 'accessories3') {
        defaultColor = 'white';
      }
      
      setSelectedColors(prev => ({
        ...prev,
        [selectedCategory]: defaultColor
      }));
    }
  };

  const handleColorSelect = (color: string) => {
    // 얼굴(face) 카테고리의 몸통 색상은 해제 불가, 이미 선택된 색상을 다시 클릭하면 선택 해제
    if (selectedColors[selectedCategory] === color && selectedCategory !== 'face') {
      setSelectedColors(prev => ({
        ...prev,
        [selectedCategory]: ''
      }));
    } else {
      setSelectedColors(prev => ({
        ...prev,
        [selectedCategory]: color
      }));
    }
  };

  const handleNicknameClick = () => {
    setIsEditingNickname(true);
  };

  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // 한글과 영어 글자 수 체크
    const koreanCount = (value.match(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/g) || []).length;
    const englishCount = (value.match(/[a-zA-Z]/g) || []).length;
    const otherCount = value.length - koreanCount - englishCount;
    
    // 한글 7글자, 영어 12글자 제한
    if (koreanCount <= 7 && englishCount + otherCount <= 12) {
      setNickname(value);
    }
  };

  const handleNicknameSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setIsEditingNickname(false);
    }
  };

  const handleNicknameBlur = () => {
    setIsEditingNickname(false);
  };

  // 현재 선택된 에셋들로 캐릭터 미리보기 렌더링
  const renderCharacterPreview = () => {
    const characterData: CharacterData = {
      selectedOptions,
      selectedColors,
      nickname
    };
    return renderCharacterLayers(characterData);
  };

  return (
    <div className="flex gap-[39px] w-full max-w-[1320px] min-h-[557px] mx-auto px-4">
      {/* 왼쪽: 캐릭터 미리보기 */}
      <div className="flex flex-col items-center gap-[14px] flex-shrink-0 w-[531px]">
        {/* 캐릭터 이미지 */}
        <div className="w-[470px] h-[470px] relative">
          <div className="w-full h-full bg-gradient-to-b from-purple-900/30 to-transparent rounded-lg relative overflow-hidden flex items-center justify-center">
            {/* 캐릭터 레이어들 컨테이너 */}
            <div className="relative w-full h-full">
              {renderCharacterPreview()}
            </div>
          </div>
        </div>
        
        {/* 닉네임 영역 */}
        <div className="relative w-[335.86px] h-[43.38px]">
          {/* bigl_Line.svg 배경 */}
          <div 
            className="absolute w-[335.86px] h-[18.85px] top-[24.38px]"
            style={{
              backgroundImage: `url('/src/assets/gamecast/characterCustom/bigl_Line.svg')`,
              backgroundSize: 'contain',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          />
          {/* 닉네임 텍스트/입력 */}
          <div 
            className="absolute top-0"
            style={{
              left: '130px', // 200px - 100px(width의 절반) = 100px
              width: '190px'
            }}
          >
            {isEditingNickname ? (
              <input
                type="text"
                value={nickname}
                onChange={handleNicknameChange}
                onKeyDown={handleNicknameSubmit}
                onBlur={handleNicknameBlur}
                autoFocus
                className="bg-transparent border-none outline-none"
                style={{
                  color: '#E8E6FD',
                  fontSize: '28.35px',
                  fontFamily: 'Inter',
                  fontWeight: '500',
                  lineHeight: '42.53px',
                  textAlign: 'center',
                  width: '100%'
                }}
              />
            ) : (
              <div 
                className="cursor-pointer hover:opacity-80 transition-opacity duration-200"
                onClick={handleNicknameClick}
                style={{
                  color: '#E8E6FD',
                  fontSize: '28.35px',
                  fontFamily: 'Inter',
                  fontWeight: '500',
                  lineHeight: '42.53px',
                  wordWrap: 'break-word',
                  textAlign: 'center',
                  width: '100%'
                }}
              >
                {nickname}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 오른쪽: 커스터마이징 패널 */}
      <div className="flex flex-col gap-[10px] p-[10px] flex-1 min-w-[700px]">
        <div className="flex flex-col gap-[40px] w-full">
          {/* 카테고리 선택 탭 */}
          <div 
            ref={containerRef}
            className="flex items-center bg-[#221E58]/60 rounded-[20px] h-[40px] relative shadow-inner overflow-hidden"
          >
            {/* 슬라이딩 배경 */}
            <div 
              className="absolute top-0 h-[40px] transition-all duration-300 ease-out rounded-[20.52px]"
              style={{
                width: `${sliderStyle.width}px`,
                left: `${sliderStyle.left}px`,
                transform: 'translateZ(0)', // GPU 가속화
                backgroundColor: '#38337D',
                boxShadow: 'inset -3px -2px 5px rgba(4, 0, 60, 0.7), inset 3px 2px 5px rgba(0, 0, 0, 0.3)'
              }}
            />
            
            {customizationCategories.map((category, index) => (
              <button
                key={category.id}
                ref={(el) => { tabsRef.current[index] = el; }}
                onClick={() => handleCategorySelect(category.id)}
                className={`
                  relative z-10 flex-1 h-full text-[22.39px] leading-[33.59px] text-center break-words
                  transition-colors duration-200 ease-out flex items-center justify-center
                  bg-transparent border-none outline-none
                  ${selectedCategory === category.id 
                    ? 'font-semibold' 
                    : 'font-normal opacity-70 hover:opacity-90'
                  }
                `}
                style={{
                  color: 'white',
                  fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif'
                }}
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* 커스터마이징 옵션 영역 */}
          <div 
            className="w-full h-[370px] rounded-[17px] border border-[#585858] backdrop-blur-sm flex flex-col justify-center gap-[40px] px-[100px] overflow-hidden"
            style={{
              backgroundImage: `url('/src/assets/gamecast/characterCustom/bgCustom.svg')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          >
            
            {/* 형태 선택 */}
            <div className="flex flex-col gap-[20px] w-[505px]">
              <div className="relative w-[106px] h-[25px]">
                <div 
                  className="absolute top-0 left-[53px] text-center whitespace-nowrap"
                  style={{
                    color: 'white',
                    fontSize: '16.79px',
                    fontFamily: 'Segoe UI',
                    fontWeight: '400',
                    lineHeight: '25.19px',
                    wordWrap: 'break-word'
                  }}
                >
                  형태
                </div>
                <div 
                  className="absolute top-[14px] left-0 w-[106px] h-[12px]"
                  style={{
                    backgroundImage: `url('/src/assets/gamecast/characterCustom/small_Line.svg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                ></div>
              </div>
              
              {/* 형태 옵션 그리드 */}
              <div className="flex gap-[20px] flex-wrap">
                {getCurrentAssets().length > 0 ? getCurrentAssets().map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => handleOptionSelect(asset.id)}
                    className={`
                      w-[80px] h-[80px] rounded-lg border transition-all duration-200 relative overflow-hidden
                      ${selectedOptions[selectedCategory] === asset.id
                        ? 'border-purple-400'
                        : 'border-gray-600 hover:border-gray-400'
                      }
                    `}
                    style={{
                      backgroundImage: `url('/src/assets/gamecast/characterCustom/${
                        selectedOptions[selectedCategory] === asset.id 
                          ? 'Frame_choice.svg' 
                          : 'Frame.svg'
                      }')`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                      backgroundColor: 'transparent'
                    }}
                  >
                    {/* 형태 이미지 */}
                    <div 
                      className={`w-full h-full flex justify-center ${
                        selectedCategory === 'top' || selectedCategory === 'bottom'
                          ? 'items-end' // 상의, 하의는 아래 기준 정렬
                          : selectedCategory === 'accessory'
                          ? 'items-center' // 장신구는 중앙 정렬로 조금 아래로
                          : 'items-center' // 머리는 중앙 정렬
                      }`}
                    >
                      <div 
                        className={`flex justify-center bg-transparent ${
                          selectedCategory === 'top' || selectedCategory === 'bottom'
                            ? 'items-end' // 상의, 하의는 아래 기준 정렬
                            : selectedCategory === 'accessory'
                            ? 'items-center' // 장신구는 중앙 정렬로 조금 아래로
                            : 'items-center' // 머리는 중앙 정렬
                        } ${
                          selectedCategory === 'hair' 
                            ? 'w-[60px] h-[60px]'
                            : 'w-[76px] h-[76px]' // 상의, 하의, 장신구는 버튼 전체 크기로
                        }`}
                      >
                        <img 
                          src={asset.defaultImage}
                          alt={asset.name}
                          className={`object-contain bg-transparent ${
                            selectedCategory === 'hair'
                              ? 'max-w-full max-h-full'
                              : selectedCategory === 'top'
                              ? 'w-[210px] h-[210px]' // 상의
                              : selectedCategory === 'bottom'
                              ? 'w-[210px] h-[210px]' // 하의
                              : 'w-[100px] h-[100px]' // 장신구
                          }`}
                          style={{
                            transform: selectedCategory === 'top' 
                              ? 'translate(8px, 15px)' // 상의: 우측 30px, 아래 100px
                              : selectedCategory === 'bottom'
                              ? 'translate(10px, 0px)' // 하의: 우측 50px
                              : selectedCategory === 'accessory'
                              ? 'translate(5px, 10px)' // 장신구: 우측 50px
                              : undefined
                          }}
                          onError={(e) => {
                            // 이미지 로드 실패 시 텍스트로 대체
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.parentElement!.innerHTML = `<span class="text-white text-xs bg-black/50 px-1 rounded">${asset.name}</span>`;
                          }}
                        />
                      </div>
                    </div>
                  </button>
                )) : (
                  <div className="text-white/60 text-sm">
                    {selectedCategory === 'face' ? '얼굴 옵션은 별도로 구현 예정입니다' : '해당 카테고리의 옵션이 없습니다'}
                  </div>
                )}
              </div>
            </div>

            {/* 색상 선택 */}
            <div className="flex flex-col gap-[20px] w-fit">
              <div className="relative w-[106px] h-[25px]">
                <div 
                  className="absolute top-0 left-[53px] text-center whitespace-nowrap"
                  style={{
                    color: 'white',
                    fontSize: '16.79px',
                    fontFamily: 'Segoe UI',
                    fontWeight: '400',
                    lineHeight: '25.19px',
                    wordWrap: 'break-word'
                  }}
                >
                  {selectedCategory === 'face' ? '몸통' : '색상'}
                </div>
                <div 
                  className="absolute top-[14px] left-0 w-[106px] h-[12px]"
                  style={{
                    backgroundImage: `url('/src/assets/gamecast/characterCustom/small_Line.svg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                ></div>
              </div>
              
              {/* 색상 팔레트 */}
              <div className="flex gap-[12px] flex-wrap">
                {getCurrentColors().length > 0 ? getCurrentColors().map((colorOption) => {
                  // 색상값 그대로 사용 (default는 갈색 #8B7355)
                  const displayColor = colorOption.value;
                  
                  return (
                    <div
                      key={colorOption.name}
                      className={`relative w-[46px] h-[44px] cursor-pointer transition-all duration-200 ${
                        selectedColors[selectedCategory] === colorOption.name
                          ? 'scale-110'
                          : 'hover:scale-105'
                      }`}
                      onClick={() => handleColorSelect(colorOption.name)}
                      title={colorOption.name}
                    >
                      {/* 색상 표시 (Frame2.svg 뒤 레이어) */}
                      <div 
                        className="absolute w-[39px] h-[39px]"
                        style={{ 
                          backgroundColor: displayColor,
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)'
                        }}
                      />
                      
                      {/* Frame2.svg 배경 (위 레이어) */}
                      <div 
                        className="absolute top-0 left-0 w-full h-full pointer-events-none"
                        style={{
                          backgroundImage: `url('/src/assets/gamecast/characterCustom/${
                            selectedColors[selectedCategory] === colorOption.name 
                              ? 'Frame2_choice.svg' 
                              : 'Frame2.svg'
                          }')`,
                          backgroundSize: '100% 100%',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat'
                        }}
                      />
                    </div>
                  );
                }) : (
                  <div 
                    className="text-lg"
                    style={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                      fontWeight: '200',
                      fontSize: '18px'
                    }}
                  >
                    먼저 형태를 선택해주세요
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 설정 완료 버튼 */}
          <div className="flex justify-end mt-8">
            <RoomButton
              onClick={() => onComplete?.()}
              disabled={!selectedOptions.face || !selectedColors.face}
            >
              캐릭터 설정 완료
            </RoomButton>
          </div>
        </div>
      </div>
    </div>
  );
};