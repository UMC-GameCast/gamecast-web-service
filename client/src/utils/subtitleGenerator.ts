// 클라이언트용 자막 생성 유틸리티
// 서버 비용 절약을 위해 브라우저의 Web Speech API 사용

interface SubtitleSegment {
  start: number;      // 시작 시간 (초)
  end: number;        // 종료 시간 (초)
  text: string;       // 자막 텍스트
  confidence: number; // 인식 신뢰도 (0-1)
}

interface SubtitleOptions {
  language: string;   // 언어 코드 ('ko-KR', 'en-US' 등)
  continuous: boolean; // 연속 인식 여부
  interimResults: boolean; // 중간 결과 반환 여부
}

export class ClientSubtitleGenerator {
  private recognition: unknown | null = null;
  private segments: SubtitleSegment[] = [];
  private isRecording = false;
  private startTime = 0;

  constructor() {
    // 브라우저 지원 확인
    if (!this.isSpeechRecognitionSupported()) {
      console.warn('⚠️ 이 브라우저는 음성 인식을 지원하지 않습니다.');
      return;
    }

    this.initializeSpeechRecognition();
  }

  /**
   * 브라우저가 음성 인식을 지원하는지 확인
   */
  private isSpeechRecognitionSupported(): boolean {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  }

  /**
   * 음성 인식 엔진 초기화
   */
  private initializeSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
  }

  /**
   * 실시간 자막 생성 시작
   */
  async startRealTimeSubtitles(
    audioStream: MediaStream,
    options: Partial<SubtitleOptions> = {},
    onSubtitle?: (segment: SubtitleSegment) => void
  ): Promise<void> {
    if (!this.recognition) {
      throw new Error('음성 인식이 지원되지 않습니다.');
    }

    const defaultOptions: SubtitleOptions = {
      language: 'ko-KR',
      continuous: true,
      interimResults: true,
      ...options
    };

    this.recognition.lang = defaultOptions.language;
    this.recognition.continuous = defaultOptions.continuous;
    this.recognition.interimResults = defaultOptions.interimResults;

    this.segments = [];
    this.isRecording = true;
    this.startTime = Date.now();

    return new Promise((resolve, reject) => {
      if (!this.recognition) return reject(new Error('Recognition not initialized'));

      this.recognition.onstart = () => {
        console.log('🎤 실시간 자막 생성 시작');
      };

      this.recognition.onresult = (event: unknown) => {
        const currentTime = (Date.now() - this.startTime) / 1000;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          const confidence = result[0].confidence || 0.5;

          const segment: SubtitleSegment = {
            start: Math.max(0, currentTime - transcript.length * 0.1), // 대략적인 시작 시간
            end: currentTime,
            text: transcript.trim(),
            confidence
          };

          if (result.isFinal) {
            this.segments.push(segment);
            console.log(`📝 자막: ${segment.text} (신뢰도: ${(confidence * 100).toFixed(1)}%)`);
          }

          // 실시간 콜백 호출
          onSubtitle?.(segment);
        }
      };

      this.recognition.onerror = (event: unknown) => {
        console.error('🚨 음성 인식 에러:', event.error);
        reject(new Error(`음성 인식 에러: ${event.error}`));
      };

      this.recognition.onend = () => {
        console.log('🏁 실시간 자막 생성 종료');
        this.isRecording = false;
        resolve();
      };

      this.recognition.start();
    });
  }

  /**
   * 녹음된 오디오 파일에서 자막 생성
   * (Web Speech API는 실시간만 지원하므로 대안 방법 제시)
   */
  async generateFromAudioFile(audioFile: File): Promise<SubtitleSegment[]> {
    console.log('🎵 오디오 파일에서 자막 생성 중...');
    
    // Web Speech API는 파일 처리를 직접 지원하지 않으므로
    // 오디오를 재생하면서 실시간으로 인식하는 방법 사용
    
    return new Promise((resolve, reject) => {
      const audio = new Audio(URL.createObjectURL(audioFile));
      const segments: SubtitleSegment[] = [];

      // MediaDevices API를 사용해 시스템 오디오 캡처 시도
      navigator.mediaDevices.getDisplayMedia({ 
        audio: true, 
        video: false 
      }).then(stream => {
        this.startRealTimeSubtitles(stream, {}, (segment) => {
          segments.push(segment);
        });

        audio.play();
        
        audio.onended = () => {
          this.stopSubtitleGeneration();
          resolve(segments);
        };

        audio.onerror = () => {
          reject(new Error('오디오 재생 실패'));
        };

      }).catch(error => {
        reject(new Error(`오디오 캡처 실패: ${error.message}`));
      });
    });
  }

  /**
   * 자막 생성 중지
   */
  stopSubtitleGeneration(): void {
    if (this.recognition && this.isRecording) {
      this.recognition.stop();
    }
  }

  /**
   * 생성된 자막 반환
   */
  getSubtitles(): SubtitleSegment[] {
    return [...this.segments];
  }

  /**
   * 자막을 SRT 형식으로 내보내기
   */
  exportToSRT(): string {
    return this.segments
      .map((segment, index) => {
        const startTime = this.formatSRTTime(segment.start);
        const endTime = this.formatSRTTime(segment.end);
        
        return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text}\n`;
      })
      .join('\n');
  }

  /**
   * 자막을 VTT 형식으로 내보내기
   */
  exportToVTT(): string {
    const header = 'WEBVTT\n\n';
    const subtitles = this.segments
      .map(segment => {
        const startTime = this.formatVTTTime(segment.start);
        const endTime = this.formatVTTTime(segment.end);
        
        return `${startTime} --> ${endTime}\n${segment.text}`;
      })
      .join('\n\n');
    
    return header + subtitles;
  }

  /**
   * SRT 시간 형식으로 변환 (00:00:00,000)
   */
  private formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
  }

  /**
   * VTT 시간 형식으로 변환 (00:00:00.000)
   */
  private formatVTTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }

  /**
   * 자막 파일 다운로드
   */
  downloadSubtitles(filename: string, format: 'srt' | 'vtt' = 'srt'): void {
    const content = format === 'srt' ? this.exportToSRT() : this.exportToVTT();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  /**
   * 브라우저 지원 상태 확인
   */
  static checkBrowserSupport(): {
    speechRecognition: boolean;
    mediaDevices: boolean;
    recommended: string[];
  } {
    const speechRecognition = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    const mediaDevices = 'mediaDevices' in navigator;

    return {
      speechRecognition,
      mediaDevices,
      recommended: speechRecognition && mediaDevices 
        ? ['Chrome', 'Edge', 'Safari (부분 지원)']
        : ['Chrome 권장', '다른 브라우저에서는 제한적 지원']
    };
  }
}

// 타입 확장 (TypeScript용)
declare global {
  interface Window {
    SpeechRecognition: unknown;
    webkitSpeechRecognition: unknown;
  }
}

// 사용 예시 주석
/*
// 사용법 1: 실시간 자막 생성
const subtitleGenerator = new ClientSubtitleGenerator();

navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => {
    subtitleGenerator.startRealTimeSubtitles(stream, 
      { language: 'ko-KR' },
      (segment) => {
        console.log(`실시간 자막: ${segment.text}`);
        // UI에 실시간 자막 표시
      }
    );
  });

// 사용법 2: 녹화 완료 후 자막 생성
const audioFile = new File([audioBlob], 'recording.wav');
subtitleGenerator.generateFromAudioFile(audioFile)
  .then(subtitles => {
    console.log('생성된 자막:', subtitles);
    // SRT 파일로 다운로드
    subtitleGenerator.downloadSubtitles('my-video-subtitles', 'srt');
  });
*/ 