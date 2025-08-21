/**
 * 브라우저 미디어 포맷 지원 확인 유틸리티
 */

export interface MediaFormatSupport {
  mp4: boolean;
  webmH264: boolean;
  wav: boolean;
  webmOpus: boolean;
  supportedVideoTypes: string[];
  supportedAudioTypes: string[];
}

export const checkMediaFormatSupport = (): MediaFormatSupport => {
  const videoTypes = [
    'video/mp4',
    'video/mp4; codecs="avc1.42E01E"', // H.264 Baseline
    'video/mp4; codecs="avc1.4D401E"', // H.264 Main
    'video/mp4; codecs="avc1.64001E"', // H.264 High
    'video/webm; codecs=vp9',
    'video/webm; codecs=vp8',
    'video/webm; codecs="vp9,opus"',
    'video/webm; codecs="h264"',
    'video/webm; codecs="avc1.42E01E"'
  ];

  const audioTypes = [
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/webm; codecs=opus',
    'audio/webm; codecs=pcm',
    'audio/mp4',
    'audio/mpeg'
  ];

  const supportedVideoTypes: string[] = [];
  const supportedAudioTypes: string[] = [];

  // MediaRecorder 지원 확인
  if (typeof MediaRecorder !== 'undefined') {
    videoTypes.forEach(type => {
      if (MediaRecorder.isTypeSupported(type)) {
        supportedVideoTypes.push(type);
      }
    });

    audioTypes.forEach(type => {
      if (MediaRecorder.isTypeSupported(type)) {
        supportedAudioTypes.push(type);
      }
    });
  }

  return {
    mp4: supportedVideoTypes.some(type => type.includes('mp4')),
    webmH264: supportedVideoTypes.some(type => type.includes('webm') && type.includes('h264')),
    wav: supportedAudioTypes.some(type => type.includes('wav')),
    webmOpus: supportedAudioTypes.some(type => type.includes('webm') && type.includes('opus')),
    supportedVideoTypes,
    supportedAudioTypes
  };
};

// 포맷 지원 상황 로깅
export const logMediaFormatSupport = (): void => {
  const support = checkMediaFormatSupport();
  
  console.log('🎬 [MediaFormat] 브라우저 미디어 포맷 지원 현황:');
  console.log('📹 비디오 포맷:', {
    'MP4 직접 녹화': support.mp4 ? '✅ 지원' : '❌ 미지원',
    'WebM H.264': support.webmH264 ? '✅ 지원' : '❌ 미지원',
    '지원되는 비디오 타입': support.supportedVideoTypes
  });
  
  console.log('🎤 오디오 포맷:', {
    'WAV 직접 녹음': support.wav ? '✅ 지원' : '❌ 미지원',
    'WebM Opus': support.webmOpus ? '✅ 지원' : '❌ 미지원',
    '지원되는 오디오 타입': support.supportedAudioTypes
  });
};