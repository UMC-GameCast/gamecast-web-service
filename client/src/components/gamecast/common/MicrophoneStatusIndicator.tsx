import React, { useState } from 'react';

interface MicrophoneStatusIndicatorProps {
  hasPermission?: boolean;
  isConnected?: boolean;
  isLocalMuted?: boolean;
  error?: string | null;
  onRequestPermission?: () => void;
}

export const MicrophoneStatusIndicator: React.FC<MicrophoneStatusIndicatorProps> = ({
  hasPermission = false,
  isConnected = false,
  isLocalMuted = false,
  error = null,
  onRequestPermission
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const getStatus = () => {
    if (error) return 'error';
    if (!hasPermission) return 'no-permission';
    if (!isConnected) return 'connecting';
    if (isLocalMuted) return 'muted';
    return 'active';
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'error':
        return {
          icon: '❌',
          color: 'text-red-500',
          bgColor: 'bg-red-100',
          text: '마이크 오류',
          description: error || '마이크 접근 중 오류가 발생했습니다'
        };
      case 'no-permission':
        return {
          icon: '🔒',
          color: 'text-orange-500',
          bgColor: 'bg-orange-100',
          text: '권한 필요',
          description: '마이크 권한을 허용해주세요'
        };
      case 'connecting':
        return {
          icon: '🔄',
          color: 'text-blue-500',
          bgColor: 'bg-blue-100',
          text: '연결 중',
          description: '음성 채팅에 연결하는 중입니다'
        };
      case 'muted':
        return {
          icon: '🔇',
          color: 'text-red-500',
          bgColor: 'bg-red-100',
          text: '음소거',
          description: '마이크가 음소거되어 있습니다'
        };
      case 'active':
        return {
          icon: '🎤',
          color: 'text-green-500',
          bgColor: 'bg-green-100',
          text: '활성',
          description: '음성 채팅이 활성화되어 있습니다'
        };
      default:
        return {
          icon: '❓',
          color: 'text-gray-500',
          bgColor: 'bg-gray-100',
          text: '알 수 없음',
          description: '상태를 확인할 수 없습니다'
        };
    }
  };

  const status = getStatus();
  const config = getStatusConfig(status);

  return (
    <div className="relative">
      <div
        className={`flex items-center space-x-2 px-3 py-2 rounded-md ${config.bgColor} cursor-pointer transition-all duration-200 hover:shadow-sm border border-white`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => {
          if (status === 'no-permission' && onRequestPermission) {
            onRequestPermission();
          }
        }}
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          border: '1px solid white'
        }}
      >
        <span className="text-sm">{config.icon}</span>
        <span className={`text-xs font-medium text-white`}>
          마이크: {config.text}
        </span>
        {status === 'connecting' && (
          <div className="animate-spin w-3 h-3 border border-white border-t-transparent rounded-full"></div>
        )}
      </div>

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-md whitespace-nowrap z-10">
          {config.description}
          {status === 'no-permission' && (
            <div className="mt-1 text-xs text-gray-300">클릭하여 권한 요청</div>
          )}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
        </div>
      )}
    </div>
  );
};