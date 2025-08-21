/**
 * 오디오 덕킹 방지 및 마이크 최적화 유틸리티
 * 브라우저의 자동 오디오 처리로 인한 음질 저하 문제 해결
 */

interface AudioOptimizationOptions {
  preventDucking?: boolean;
  optimalMicSettings?: boolean;
  debugLogging?: boolean;
}

export class AudioManager {
  private static instance: AudioManager;
  private audioContext: AudioContext | null = null;
  private microphoneStream: MediaStream | null = null;
  private gainNode: GainNode | null = null;
  private options: AudioOptimizationOptions;

  private constructor(options: AudioOptimizationOptions = {}) {
    this.options = {
      preventDucking: true,
      optimalMicSettings: true,
      debugLogging: true,
      ...options
    };
  }

  public static getInstance(options?: AudioOptimizationOptions): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager(options);
    }
    return AudioManager.instance;
  }

  /**
   * 최적화된 마이크 스트림 획득
   */
  public async getOptimizedMicrophoneStream(): Promise<MediaStream> {
    try {
      if (this.options.debugLogging) {
        console.log('🎤 [AudioManager] 최적화된 마이크 스트림 요청');
      }

      // 오디오 덕킹 방지를 위한 최적화된 설정
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: false,      // 에코 제거 비활성화
          noiseSuppression: false,      // 노이즈 억제 비활성화  
          autoGainControl: false,       // 자동 게인 컨트롤 비활성화
          sampleRate: 44100,           // 고품질 샘플링 레이트
          channelCount: 1,             // 모노 채널
          latency: 0.01,               // 낮은 지연시간
          volume: 1.0                  // 최대 볼륨
        },
        video: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.microphoneStream = stream;

      if (this.options.debugLogging) {
        console.log('✅ [AudioManager] 마이크 스트림 획득 성공:', {
          streamId: stream.id,
          tracks: stream.getAudioTracks().length,
          settings: stream.getAudioTracks()[0]?.getSettings()
        });
      }

      // 오디오 컨텍스트 설정
      if (this.options.preventDucking) {
        await this.setupAudioContext(stream);
      }

      return stream;

    } catch (error) {
      console.error('❌ [AudioManager] 마이크 스트림 획득 실패:', error);
      throw error;
    }
  }

  /**
   * 오디오 덕킹 방지를 위한 오디오 컨텍스트 설정
   */
  private async setupAudioContext(stream: MediaStream): Promise<void> {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // 오디오 컨텍스트 재개 (브라우저 정책 준수)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // 마이크 스트림을 오디오 컨텍스트에 연결
      const source = this.audioContext.createMediaStreamSource(stream);
      
      // 게인 노드 생성 (볼륨 조절용)
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 1.0; // 원본 볼륨 유지
      
      // 연결: 마이크 → 게인 (destination 연결 제거로 마이크 모니터링 방지)
      source.connect(this.gainNode);
      // this.gainNode.connect(this.audioContext.destination); // ❌ 제거: 마이크 모니터링 방지

      if (this.options.debugLogging) {
        console.log('✅ [AudioManager] 오디오 컨텍스트 설정 완료:', {
          state: this.audioContext.state,
          sampleRate: this.audioContext.sampleRate,
          baseLatency: this.audioContext.baseLatency
        });
      }

    } catch (error) {
      console.warn('⚠️ [AudioManager] 오디오 컨텍스트 설정 실패:', error);
      // 오디오 컨텍스트 실패해도 마이크는 작동하도록 계속 진행
    }
  }

  /**
   * 시스템 오디오 덕킹 방지 안내
   */
  public showAudioDuckingPreventionGuide(): void {
    const guideMessage = `
🔊 오디오 품질 최적화 안내

마이크 사용 시 다른 소리가 먹먹하게 들린다면:

💻 Windows 설정:
1. 설정 → 시스템 → 소리 → 소리 제어판
2. "통신" 탭 → "아무 작업 안 함" 선택
3. 적용 후 브라우저 재시작

🌐 브라우저 설정:
1. 주소창: chrome://flags/#audio-service-sandbox
2. "Disabled"로 설정 후 재시작

🎤 권장사항:
- 헤드셋 사용 (스피커 사용 시 에코 발생 가능)
- 마이크와 스피커 거리 유지
- 방 소음 최소화
    `;

    console.log(guideMessage);
    
    // 개발 환경에서만 알림 표시
    if (import.meta.env.DEV) {
      alert('오디오 최적화 설정이 콘솔에 표시되었습니다. F12를 눌러 확인해주세요.');
    }
  }

  /**
   * 오디오 리소스 정리
   */
  public cleanup(): void {
    if (this.options.debugLogging) {
      console.log('🧹 [AudioManager] 오디오 리소스 정리');
    }

    // 마이크 스트림 정리
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(track => track.stop());
      this.microphoneStream = null;
    }

    // 오디오 컨텍스트 정리
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.gainNode = null;
  }

  /**
   * 현재 오디오 상태 확인
   */
  public getAudioStatus(): {
    hasMicrophone: boolean;
    audioContextState?: string;
    gainValue?: number;
  } {
    return {
      hasMicrophone: !!this.microphoneStream,
      audioContextState: this.audioContext?.state,
      gainValue: this.gainNode?.gain.value
    };
  }
}

/**
 * 전역 AudioManager 인스턴스
 */
export const audioManager = AudioManager.getInstance({
  preventDucking: true,
  optimalMicSettings: true,
  debugLogging: import.meta.env.DEV
});