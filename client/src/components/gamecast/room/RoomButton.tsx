import React, { useState } from "react";
import buttonDefault from "../../../assets/gamecast/common/button/button1_default.png";
import buttonClick from "../../../assets/gamecast/common/button/button1_click.png";

interface RoomButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

/**
 * 방에서 사용하는 기본 버튼 컴포넌트 (기본, 호버, 클릭 상태만 가짐)
 */
export const RoomButton = ({ children, onClick, className = "", disabled = false }: RoomButtonProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = () => {
    if (disabled) return;
    
    setIsClicked(true);
    onClick?.();
    setTimeout(() => {
      setIsClicked(false);
    }, 200);
  };

  const getBackgroundImage = () => {
    return isClicked ? buttonClick : buttonDefault;
  };

  const getStateStyles = () => {
    if (disabled) return "opacity-35 cursor-not-allowed";
    if (isClicked) return "scale-95";
    if (isHovered) return "scale-105 brightness-110";
    return "";
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => !disabled && setIsHovered(false)}
      className={`relative bg-transparent bg-contain bg-center bg-no-repeat outline-none focus:outline-none border-none transition-all duration-200 transform ${getStateStyles()} ${className}`}
      style={{
        backgroundImage: `url(${getBackgroundImage()})`,
        width: '192px',
        height: '64.6px',
        backgroundSize: '100% 100%'
      }}
      disabled={disabled}
    >
      <span className="relative z-10" style={{
        color: 'white',
        fontSize: '16.52px',
        fontFamily: 'Segoe UI, sans-serif',
        fontWeight: '600',
        lineHeight: '24.78px',
        wordWrap: 'break-word'
      }}>
        {children}
      </span>
    </button>
  );
};