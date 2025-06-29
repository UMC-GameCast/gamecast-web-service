import React, { useState, useEffect } from "react";
import button1Default from "../../../assets/gamecast/common/button/button1_default.png";
import button1Click from "../../../assets/gamecast/common/button/button1_click.png";
import button1Error from "../../../assets/gamecast/common/button/button1_error.png";

interface Button1Props {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  className?: string;
  onValidate?: () => string | null;
  onError?: (message: string) => void;
  externalError?: boolean;
}

export const Button1 = ({ 
  children, 
  onClick, 
  disabled = false, 
  loading = false,
  loadingText = "처리 중...",
  className = "",
  onValidate,
  onError,
  externalError = false
}: Button1Props) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    if (externalError) {
      console.log("🔴 External error triggered!");
      setIsShaking(true);
      setTimeout(() => {
        setIsShaking(false);
      }, 600);
    }
  }, [externalError]);

  const handleClick = () => {
    if (disabled || loading || isShaking) return;
    
    if (onValidate) {
      const errorMessage = onValidate();
      if (errorMessage) {
        console.log("🔴 Validation error:", errorMessage);
        onError?.(errorMessage);
        setIsShaking(true);
        setTimeout(() => {
          setIsShaking(false);
        }, 600);
        return;
      }
    }
    
    setIsClicked(true);
    onClick?.();
    
    setTimeout(() => {
      setIsClicked(false);
    }, 200);
  };

  const getBackgroundImage = () => {
    if (isShaking) return button1Error;
    if (disabled) return button1Default;
    if (isClicked) return button1Click;
    return button1Default;
  };

  const getStateStyles = () => {
    if (isShaking) return "error-shake cursor-not-allowed";
    if (disabled) return "opacity-50 cursor-not-allowed";
    if (isClicked) return "scale-95";
    if (isHovered) return "scale-105 brightness-110";
    return "";
  };

  return (
    <>
      <style>{`
        @keyframes errorShake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .error-shake {
          animation: errorShake 0.6s ease-in-out !important;
        }
      `}</style>
      
      <button
        onClick={handleClick}
        onMouseEnter={() => !disabled && !isShaking && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={disabled || loading}
        className={`
          relative
          bg-transparent bg-contain bg-center bg-no-repeat
          font-semibold text-white 
          outline-none focus:outline-none
          border-none
          disabled:hover:scale-100
          ${getStateStyles()}
          ${!isShaking ? 'transition-all duration-200 transform' : ''}
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
    </>
  );
}; 