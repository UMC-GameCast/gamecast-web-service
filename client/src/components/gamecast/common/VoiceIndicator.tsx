import React, { useState, useEffect, useRef } from 'react';

interface VoiceIndicatorProps {
  stream: MediaStream;
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


export const VoiceIndicator: React.FC<VoiceIndicatorProps> = ({ stream }) => {
  const isSpeaking = useIsSpeaking(stream);

  return (
    <div
      className={`absolute w-6 h-6 rounded-full bg-green-500 transition-all duration-150 ${
        isSpeaking ? 'opacity-75 scale-110' : 'opacity-0 scale-0'
      }`}
      style={{
        boxShadow: '0 0 10px rgba(74, 222, 128, 0.7)',
        // 위치는 부모 컴포넌트에서 설정합니다.
      }}
    />
  );
}; 