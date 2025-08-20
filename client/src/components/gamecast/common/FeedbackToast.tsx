import { useState, useEffect } from 'react';

export interface FeedbackMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number; // ms, 0이면 자동으로 사라지지 않음
  canRetry?: boolean;
  onRetry?: () => void;
}

interface FeedbackToastProps {
  messages: FeedbackMessage[];
  onDismiss: (id: string) => void;
}

/**
 * 사용자 피드백을 위한 토스트 컴포넌트
 * 성공, 오류, 경고, 정보 메시지를 화면에 표시
 */
export const FeedbackToast = ({ messages, onDismiss }: FeedbackToastProps) => {
  const [visibleMessages, setVisibleMessages] = useState<FeedbackMessage[]>(messages);

  useEffect(() => {
    setVisibleMessages(messages);
    
    // 자동 해제 타이머 설정
    messages.forEach(message => {
      if (message.duration && message.duration > 0) {
        setTimeout(() => {
          onDismiss(message.id);
        }, message.duration);
      }
    });
  }, [messages, onDismiss]);

  if (visibleMessages.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2">
      {visibleMessages.map(message => (
        <FeedbackToastItem
          key={message.id}
          message={message}
          onDismiss={() => onDismiss(message.id)}
        />
      ))}
    </div>
  );
};

interface FeedbackToastItemProps {
  message: FeedbackMessage;
  onDismiss: () => void;
}

const FeedbackToastItem = ({ message, onDismiss }: FeedbackToastItemProps) => {
  const getStyles = () => {
    switch (message.type) {
      case 'success':
        return 'bg-green-600 border-green-500 text-green-50';
      case 'error':
        return 'bg-red-600 border-red-500 text-red-50';
      case 'warning':
        return 'bg-amber-600 border-amber-500 text-amber-50';
      case 'info':
      default:
        return 'bg-blue-600 border-blue-500 text-blue-50';
    }
  };

  const getIcon = () => {
    switch (message.type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className={`${getStyles()} border rounded-lg p-4 shadow-lg max-w-sm animate-slide-in-right`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <span className="text-xl flex-shrink-0 mt-0.5">{getIcon()}</span>
          <div className="flex-1">
            <h4 className="font-semibold text-sm mb-1">{message.title}</h4>
            <p className="text-sm opacity-90">{message.message}</p>
            
            {message.canRetry && message.onRetry && (
              <button
                onClick={message.onRetry}
                className="mt-2 text-xs bg-white bg-opacity-20 hover:bg-opacity-30 
                         px-3 py-1 rounded transition-colors"
              >
                다시 시도
              </button>
            )}
          </div>
        </div>
        
        <button
          onClick={onDismiss}
          className="text-white hover:bg-white hover:bg-opacity-20 
                   rounded-full p-1 ml-2 transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
};