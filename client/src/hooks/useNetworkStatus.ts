import { useState, useEffect } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string | null;
}

/**
 * 네트워크 상태를 모니터링하는 훅
 * 연결 상태, 속도 등을 추적하여 사용자에게 피드백 제공
 */
export const useNetworkStatus = () => {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    isSlowConnection: false,
    connectionType: null
  });

  useEffect(() => {
    const updateNetworkStatus = () => {
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection;

      const newStatus: NetworkStatus = {
        isOnline: navigator.onLine,
        isSlowConnection: false,
        connectionType: connection?.effectiveType || null
      };

      // 느린 연결 감지 (2G 이하 또는 매우 느린 연결)
      if (connection) {
        const slowTypes = ['slow-2g', '2g'];
        newStatus.isSlowConnection = slowTypes.includes(connection.effectiveType) ||
                                   connection.downlink < 0.5;
      }

      setStatus(newStatus);
    };

    const handleOnline = () => updateNetworkStatus();
    const handleOffline = () => updateNetworkStatus();
    const handleConnectionChange = () => updateNetworkStatus();

    // 초기 상태 설정
    updateNetworkStatus();

    // 이벤트 리스너 등록
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    // 정리
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  return status;
};