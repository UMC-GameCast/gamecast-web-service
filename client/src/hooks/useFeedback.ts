import { useState, useCallback } from 'react';
import type { FeedbackMessage } from '../components/gamecast/common/FeedbackToast';

/**
 * 전역 피드백 메시지 관리 훅
 */
export const useFeedback = () => {
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);

  // 메시지 추가
  const addMessage = useCallback((
    type: FeedbackMessage['type'],
    title: string,
    message: string,
    options?: {
      duration?: number;
      canRetry?: boolean;
      onRetry?: () => void;
    }
  ) => {
    const newMessage: FeedbackMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      message,
      duration: options?.duration ?? (type === 'success' ? 3000 : 5000), // 성공: 3초, 나머지: 5초
      canRetry: options?.canRetry ?? false,
      onRetry: options?.onRetry,
    };

    setMessages(prev => [...prev, newMessage]);
    return newMessage.id;
  }, []);

  // 성공 메시지
  const showSuccess = useCallback((title: string, message: string, duration?: number) => {
    return addMessage('success', title, message, { duration });
  }, [addMessage]);

  // 에러 메시지
  const showError = useCallback((
    title: string, 
    message: string, 
    options?: { canRetry?: boolean; onRetry?: () => void; duration?: number }
  ) => {
    return addMessage('error', title, message, {
      duration: options?.duration ?? 0, // 에러는 기본적으로 자동 사라지지 않음
      canRetry: options?.canRetry,
      onRetry: options?.onRetry,
    });
  }, [addMessage]);

  // 경고 메시지
  const showWarning = useCallback((title: string, message: string, duration?: number) => {
    return addMessage('warning', title, message, { duration });
  }, [addMessage]);

  // 정보 메시지
  const showInfo = useCallback((title: string, message: string, duration?: number) => {
    return addMessage('info', title, message, { duration });
  }, [addMessage]);

  // 메시지 제거
  const dismissMessage = useCallback((id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  }, []);

  // 모든 메시지 제거
  const clearAll = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    dismissMessage,
    clearAll,
  };
};