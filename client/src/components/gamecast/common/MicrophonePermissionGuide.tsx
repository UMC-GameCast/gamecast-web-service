import React from 'react';

interface MicrophonePermissionGuideProps {
  error?: string | null;
  isVisible: boolean;
  onRetry?: () => void;
  onClose?: () => void;
}

export const MicrophonePermissionGuide: React.FC<MicrophonePermissionGuideProps> = ({
  error,
  isVisible,
  onRetry,
  onClose
}) => {
  if (!isVisible || !error) return null;

  const getErrorType = (errorMessage: string) => {
    if (errorMessage.includes('권한이 거부')) return 'permission-denied';
    if (errorMessage.includes('마이크를 찾을 수 없습니다')) return 'device-not-found';
    if (errorMessage.includes('다른 앱에서')) return 'device-busy';
    if (errorMessage.includes('지원하지 않습니다')) return 'not-supported';
    return 'general';
  };

  const errorType = getErrorType(error);

  const getInstructions = () => {
    switch (errorType) {
      case 'permission-denied':
        return [
          '1. 브라우저 주소창 왼쪽의 🔒 자물쇠 아이콘을 클릭하세요',
          '2. "마이크" 설정을 "허용"으로 변경하세요',
          '3. 페이지를 새로고침하거나 "다시 시도" 버튼을 클릭하세요'
        ];
      case 'device-not-found':
        return [
          '1. 마이크가 컴퓨터에 제대로 연결되어 있는지 확인하세요',
          '2. 시스템 설정에서 마이크가 인식되는지 확인하세요',
          '3. 다른 프로그램에서 마이크가 작동하는지 테스트해보세요'
        ];
      case 'device-busy':
        return [
          '1. 다른 앱(Zoom, Discord, Skype 등)에서 마이크를 사용 중이면 종료하세요',
          '2. 브라우저의 다른 탭에서 마이크를 사용 중이면 닫아주세요',
          '3. 컴퓨터를 다시 시작해보세요'
        ];
      case 'not-supported':
        return [
          '1. Chrome, Firefox, Safari 등 최신 브라우저를 사용하세요',
          '2. 브라우저를 최신 버전으로 업데이트하세요',
          '3. HTTPS 연결인지 확인하세요 (HTTP에서는 마이크 접근 불가)'
        ];
      default:
        return [
          '1. 페이지를 새로고침해보세요',
          '2. 브라우저를 다시 시작해보세요',
          '3. 다른 브라우저에서 시도해보세요'
        ];
    }
  };

  const getIcon = () => {
    switch (errorType) {
      case 'permission-denied': return '🔒';
      case 'device-not-found': return '🎤';
      case 'device-busy': return '⚠️';
      case 'not-supported': return '🌐';
      default: return '❗';
    }
  };

  const instructions = getInstructions();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getIcon()}</span>
            <h3 className="text-lg font-semibold text-gray-900">
              마이크 설정 안내
            </h3>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ×
            </button>
          )}
        </div>

        <div className="mb-4">
          <p className="text-red-600 text-sm mb-4 p-3 bg-red-50 rounded-md">
            {error}
          </p>

          <div className="space-y-2">
            <p className="font-medium text-gray-700 mb-2">해결 방법:</p>
            {instructions.map((instruction, index) => (
              <div key={index} className="flex items-start space-x-2">
                <span className="text-blue-500 text-sm font-medium min-w-[20px]">
                  {index + 1}.
                </span>
                <span className="text-sm text-gray-600">{instruction.substring(2)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex space-x-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              다시 시도
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors text-sm font-medium"
            >
              닫기
            </button>
          )}
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <p className="text-xs text-blue-600">
            💡 <strong>팁:</strong> 음성 채팅을 위해서는 마이크 권한이 필요합니다. 
            권한을 허용하면 다른 참가자들과 실시간으로 대화할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
};