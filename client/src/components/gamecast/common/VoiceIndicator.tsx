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

const useIsSpeaking = (stream: MediaStream | null): boolean => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    if (!stream) {
      return;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as CustomWindow).webkitAudioContext)();
    }
    const audioContext = audioContextRef.current;
    
    if (!analyserRef.current) {
      analyserRef.current = audioContext.createAnalyser();
    }
    const analyser = analyserRef.current;
    
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    
    analyser.fftSize = 512;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const SPEAKING_THRESHOLD = 5; // 말하는 것으로 간주할 볼륨 임계값
    let speakingTimer: ReturnType<typeof setTimeout> | null = null;
    
    const checkSpeaking = () => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((acc, val) => acc + val, 0) / bufferLength;
      
      if (average > SPEAKING_THRESHOLD) {
        if (!isSpeaking) setIsSpeaking(true);
        if (speakingTimer) clearTimeout(speakingTimer);
        speakingTimer = setTimeout(() => setIsSpeaking(false), 500); // 0.5초간 소리가 없으면 멈춤
      }
      
      animationFrameRef.current = requestAnimationFrame(checkSpeaking);
    };
    
    checkSpeaking();

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      source.disconnect();
      if (speakingTimer) clearTimeout(speakingTimer);
    };
  }, [stream, isSpeaking]);

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
    if (!isConnected) {
      return {
        bg: 'bg-gray-400',
        opacity: 'opacity-50',
        scale: 'scale-100',
        shadow: '0 0 5px rgba(156, 163, 175, 0.5)',
        icon: '❌'
      };
    }
    
    if (isMuted) {
      return {
        bg: 'bg-red-500',
        opacity: 'opacity-75',
        scale: 'scale-100',
        shadow: '0 0 8px rgba(239, 68, 68, 0.6)',
        icon: '🔇'
      };
    }
    
    if (isSpeaking) {
      return {
        bg: 'bg-green-500',
        opacity: 'opacity-90',
        scale: 'scale-110',
        shadow: '0 0 12px rgba(74, 222, 128, 0.8)',
        icon: '🎤'
      };
    }
    
    return {
      bg: 'bg-blue-500',
      opacity: 'opacity-60',
      scale: 'scale-100',
      shadow: '0 0 6px rgba(59, 130, 246, 0.5)',
      icon: '🎧'
    };
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