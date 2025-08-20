import { ReactNode } from 'react';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  subMessage?: string;
  children?: ReactNode;
  blur?: boolean; // 배경 블러 여부
  allowCancel?: boolean;
  onCancel?: () => void;
}

/**
 * 로딩 중일 때 화면을 덮는 오버레이 컴포넌트
 * 캐릭터 저장, API 요청 등의 비동기 작업에 사용
 */
export const LoadingOverlay = ({
  isVisible,
  message = "처리 중입니다...",
  subMessage,
  children,
  blur = true,
  allowCancel = false,
  onCancel
}: LoadingOverlayProps) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div 
        className={`absolute inset-0 bg-black bg-opacity-50 ${blur ? 'backdrop-blur-sm' : ''}`}
        onClick={allowCancel && onCancel ? onCancel : undefined}
      />
      
      {/* 로딩 컨텐츠 */}
      <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4 text-center">
        {/* 로딩 스피너 */}
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 border-4 border-blue-200 border-top-blue-600 rounded-full animate-spin"></div>
        </div>
        
        {/* 메시지 */}
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          {message}
        </h3>
        
        {subMessage && (
          <p className="text-sm text-gray-600 mb-4">
            {subMessage}
          </p>
        )}
        
        {/* 추가 컨텐츠 */}
        {children}
        
        {/* 취소 버튼 */}
        {allowCancel && onCancel && (
          <button
            onClick={onCancel}
            className="mt-4 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 
                     border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * 간단한 인라인 로딩 스피너
 */
export const LoadingSpinner = ({ 
  size = 'md', 
  color = 'blue' 
}: { 
  size?: 'sm' | 'md' | 'lg'; 
  color?: 'blue' | 'white' | 'gray';
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3'
  };

  const colorClasses = {
    blue: 'border-blue-200 border-top-blue-600',
    white: 'border-white border-opacity-30 border-top-white',
    gray: 'border-gray-300 border-top-gray-600'
  };

  return (
    <div 
      className={`${sizeClasses[size]} ${colorClasses[color]} 
                  rounded-full animate-spin inline-block`}
    />
  );
};