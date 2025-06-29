import React from "react";
import errorIcon from "../../../assets/gamecast/common/button/error_icon.png";

interface ErrorMessageProps {
  message: string;
  show: boolean;
  className?: string;
}

/**
 * 에러 메시지 컴포넌트
 * 11px 크기, #FF5214 색상, 오른쪽에 에러 아이콘 표시
 */
export const ErrorMessage = ({ message, show, className = "" }: ErrorMessageProps) => {
  if (!show) return null;

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <span 
        className="font-medium"
        style={{
          fontSize: '11px',
          color: '#FF5214',
          lineHeight: '1.2'
        }}
      >
        {message}
      </span>
      <img 
        src={errorIcon} 
        alt="error" 
        className="w-[12px] h-[12px] flex-shrink-0"
      />
    </div>
  );
}; 