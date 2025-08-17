import React, { useState, useEffect, useRef } from 'react';

interface VoiceIndicatorProps {
  stream: MediaStream | null;
  isMuted?: boolean;
  isConnected?: boolean;
  nickname?: string;
  size?: 'small' | 'medium' | 'large';
}

// webkit 브라우저 호환성을 위한 타입 확장
interface CustomWindow extends Window {
  webkitAudioContext: typeof AudioContext
}

// TODO: WebRTC 기능 비활성화 - 오디오 분석 비활성화
const useIsSpeaking = (stream: MediaStream | null): boolean => {
  const [isSpeaking] = useState(false);
  
  // TODO: WebRTC 재구현 시 다음 기능 복원:
  // - AudioContext를 사용한 실시간 오디오 분석
  // - 말하는 상태 감지 (볼륨 임계값 기반)
  // - 애니메이션 프레임을 이용한 지속적 모니터링
  
  console.log('🚫 [useIsSpeaking] 오디오 분석 기능이 비활성화되어 있습니다.', {
    hasStream: !!stream
  });
  
  /*
  원래 구현:
  - AudioContext/webkitAudioContext 생성
  - MediaStreamSource 연결
  - AnalyserNode를 통한 주파수 분석
  - 볼륨 임계값 기반 말하기 감지
  - requestAnimationFrame으로 실시간 업데이트
  */

  return isSpeaking;
};


export const VoiceIndicator: React.FC<VoiceIndicatorProps> = ({ 
  stream, 
  isMuted = false, 
  isConnected = true,
  nickname = '',
  size = 'medium'
}) => {
  const isSpeaking = useIsSpeaking(stream && !isMuted ? stream : null);

  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6', 
    large: 'w-8 h-8'
  };

  const getIndicatorState = () => {
    // TODO: WebRTC 기능 비활성화 - 비활성화 상태 표시
    return {
      bg: 'bg-gray-500',
      opacity: 'opacity-40',
      scale: 'scale-100',
      shadow: '0 0 5px rgba(107, 114, 128, 0.3)',
      icon: '🚫'
    };
    
    /*
    원래 상태 로직:
    - 연결 안됨: 회색, ❌
    - 음소거: 빨강, 🔇  
    - 말하는 중: 초록, 🎤
    - 연결됨: 파랑, 🎧
    
    TODO: WebRTC 재구현 시 위 로직 복원
    */
  };

  const state = getIndicatorState();

  return (
    <div className="relative inline-flex items-center">
      <div
        className={`${sizeClasses[size]} rounded-full ${state.bg} transition-all duration-200 ${state.opacity} ${state.scale} flex items-center justify-center`}
        style={{
          boxShadow: state.shadow
        }}
        title={nickname ? `${nickname} - ${isMuted ? 'Muted' : isConnected ? (isSpeaking ? 'Speaking' : 'Connected') : 'Disconnected'}` : undefined}
      >
        {size === 'large' && (
          <span className="text-xs">{state.icon}</span>
        )}
      </div>
      
      {nickname && size === 'large' && (
        <span className="ml-2 text-xs text-gray-600 dark:text-gray-300">
          {nickname}
        </span>
      )}
    </div>
  );
}; 