import React, { useState } from "react";
import button1Default from "../../../assets/gamecast/common/button/button1_default.png";
import button1Click from "../../../assets/gamecast/common/button/button1_click.png";

interface Button1Props {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  className?: string;
}

export const Button1 = ({ 
  children, 
  onClick, 
  disabled = false, 
  loading = false,
  loadingText = "처리 중...",
  className = ""
}: Button1Props) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = () => {
    if (disabled || loading) return;
    
    setIsClicked(true);
    onClick?.();
    
    // 클릭 상태를 잠시 유지했다가 원래대로 돌리기
    setTimeout(() => {
      setIsClicked(false);
    }, 200);
  };

  // 상태에 따른 배경 이미지 선택
  const getBackgroundImage = () => {
    if (disabled) return button1Default;
    if (isClicked) return button1Click;
    return button1Default;
  };

  // 상태에 따른 추가 스타일
  const getStateStyles = () => {
    if (disabled) return "opacity-50 cursor-not-allowed";
    if (isClicked) return "scale-95";
    if (isHovered) return "scale-105 brightness-110";
    return "";
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={disabled || loading}
      className={`
        relative
        bg-transparent bg-contain bg-center bg-no-repeat
        font-semibold text-white 
        transition-all duration-200 transform
        outline-none focus:outline-none
        border-none
        disabled:hover:scale-100
        ${getStateStyles()}
        ${className}
      `}
      style={{
        backgroundImage: `url(${getBackgroundImage()})`,
        width: '200px',
        height: '60px',
        backgroundSize: '100% 100%'
      }}
    >
      <span 
        className="relative z-10 drop-shadow-sm font-bold text-white"
        style={{
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: '15px',
          lineHeight: '150%',
          letterSpacing: '-1.9%',
          color: 'white'
        }}
      >
        {loading ? loadingText : children}
      </span>
    </button>
  );
}; 