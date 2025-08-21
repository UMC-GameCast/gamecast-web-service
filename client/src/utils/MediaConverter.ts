/**
 * WebM to MP4/WAV 변환 유틸리티
 * FFmpeg.wasm 사용하여 클라이언트에서 변환 처리
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

export interface ConversionProgress {
  phase: 'loading' | 'converting' | 'finalizing' | 'complete';
  percentage: number;
  timeRemaining?: string;
  currentStep?: string;
}

export interface ConversionResult {
  success: boolean;
  blob?: Blob;
  filename?: string;
  originalSize: number;
  convertedSize: number;
  duration: number;
  error?: string;
}

// 추가 export (명시적)
export type { ConversionProgress as ConversionProgressType };
export type { ConversionResult as ConversionResultType };

export class MediaConverter {
  private ffmpeg: FFmpeg;
  private isLoaded: boolean = false;
  private onProgress?: (progress: ConversionProgress) => void;

  constructor() {
    this.ffmpeg = new FFmpeg();
  }

  /**
   * FFmpeg 초기화
   */
  public async initialize(): Promise<void> {
    if (this.isLoaded) return;

    try {
      console.log('🔧 [MediaConverter] FFmpeg 초기화 중...');
      
      this.ffmpeg.on('log', ({ message }) => {
        console.log('FFmpeg:', message);
        this.parseProgress(message);
      });

      await this.ffmpeg.load();
      this.isLoaded = true;
      
      console.log('✅ [MediaConverter] FFmpeg 초기화 완료');
    } catch (error) {
      console.error('❌ [MediaConverter] FFmpeg 초기화 실패:', {
        error,
        errorMessage: error instanceof Error ? error.message : '알 수 없는 오류',
        crossOriginIsolated: window.crossOriginIsolated,
        sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined'
      });
      
      let errorMessage = 'FFmpeg 로딩에 실패했습니다.';
      
      if (!window.crossOriginIsolated) {
        errorMessage += ' 브라우저에서 Cross-Origin Isolation이 비활성화되어 있습니다. 개발 서버를 재시작하고 다시 시도해주세요.';
      } else if (typeof SharedArrayBuffer === 'undefined') {
        errorMessage += ' SharedArrayBuffer가 지원되지 않습니다. HTTPS 환경이 필요합니다.';
      } else {
        errorMessage += ' 브라우저를 새로고침하고 다시 시도해주세요.';
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * 진행률 콜백 설정
   */
  public setProgressCallback(callback: (progress: ConversionProgress) => void): void {
    this.onProgress = callback;
  }

  /**
   * WebM 비디오를 MP4로 변환 (1080p 유지)
   */
  public async convertWebMToMP4(
    webmBlob: Blob,
    outputFilename: string = 'converted_video.mp4'
  ): Promise<ConversionResult> {
    try {
      console.log('🎬 [MediaConverter] WebM → MP4 변환 시작', {
        inputSize: `${Math.round(webmBlob.size / 1024 / 1024)}MB`,
        outputFilename,
        isLoaded: this.isLoaded
      });
      
      if (!this.isLoaded) {
        console.log('⚙️ [MediaConverter] FFmpeg 초기화 중...');
        await this.initialize();
        console.log('✅ [MediaConverter] FFmpeg 초기화 완료');
      }

      this.reportProgress({ phase: 'loading', percentage: 0, currentStep: 'FFmpeg 로딩 중...' });

      // 입력 파일 준비
      const inputName = 'input.webm';
      const outputName = outputFilename;
      
      console.log('📁 [MediaConverter] 파일 로딩 중...', {
        inputSize: `${Math.round(webmBlob.size / 1024 / 1024)}MB`,
        inputName,
        outputName
      });

      await this.ffmpeg.writeFile(inputName, await fetchFile(webmBlob));
      
      this.reportProgress({ phase: 'converting', percentage: 10, currentStep: '비디오 변환 중...' });

      // FFmpeg 명령어: WebM → MP4 변환 (1080p 품질 유지)
      await this.ffmpeg.exec([
        '-i', inputName,
        '-c:v', 'libx264',           // H.264 코덱
        '-preset', 'fast',           // 빠른 인코딩
        '-crf', '23',               // 품질 설정 (18-28, 낮을수록 고품질)
        '-vf', 'scale=1920:1080',   // 1080p 해상도 강제
        '-c:a', 'aac',              // AAC 오디오 코덱
        '-b:a', '128k',             // 오디오 비트레이트
        '-movflags', '+faststart',   // 웹 최적화
        outputName
      ]);

      this.reportProgress({ phase: 'finalizing', percentage: 90, currentStep: '최종 처리 중...' });

      // 결과 파일 읽기
      const data = await this.ffmpeg.readFile(outputName) as Uint8Array;
      const mp4Blob = new Blob([data.buffer], { type: 'video/mp4' });

      // 임시 파일 정리
      await this.ffmpeg.deleteFile(inputName);
      await this.ffmpeg.deleteFile(outputName);

      this.reportProgress({ phase: 'complete', percentage: 100, currentStep: '변환 완료!' });

      const result: ConversionResult = {
        success: true,
        blob: mp4Blob,
        filename: outputFilename,
        originalSize: webmBlob.size,
        convertedSize: mp4Blob.size,
        duration: 0 // TODO: 메타데이터에서 추출
      };

      console.log('✅ [MediaConverter] MP4 변환 완료:', {
        originalSize: `${Math.round(webmBlob.size / 1024 / 1024)}MB`,
        convertedSize: `${Math.round(mp4Blob.size / 1024 / 1024)}MB`,
        compressionRatio: `${Math.round((1 - mp4Blob.size / webmBlob.size) * 100)}%`
      });

      return result;

    } catch (error) {
      console.error('❌ [MediaConverter] MP4 변환 실패:', {
        error,
        errorMessage: error instanceof Error ? error.message : '알 수 없는 오류',
        errorStack: error instanceof Error ? error.stack : undefined,
        inputSize: webmBlob.size,
        isLoaded: this.isLoaded
      });
      
      // 진행률 콜백에 에러 상태 알림
      this.reportProgress({ 
        phase: 'complete', 
        percentage: 0, 
        currentStep: `변환 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}` 
      });
      
      return {
        success: false,
        originalSize: webmBlob.size,
        convertedSize: 0,
        duration: 0,
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      };
    }
  }

  /**
   * WebM 오디오를 WAV로 변환
   */
  public async convertWebMToWAV(
    webmBlob: Blob,
    outputFilename: string = 'converted_audio.wav'
  ): Promise<ConversionResult> {
    try {
      console.log('🎤 [MediaConverter] WebM → WAV 변환 시작');
      
      if (!this.isLoaded) {
        await this.initialize();
      }

      this.reportProgress({ phase: 'loading', percentage: 0, currentStep: 'FFmpeg 로딩 중...' });

      // 입력 파일 준비
      const inputName = 'input_audio.webm';
      const outputName = outputFilename;
      
      console.log('📁 [MediaConverter] 오디오 파일 로딩 중...', {
        inputSize: `${Math.round(webmBlob.size / 1024)}KB`,
        inputName,
        outputName
      });

      await this.ffmpeg.writeFile(inputName, await fetchFile(webmBlob));
      
      this.reportProgress({ phase: 'converting', percentage: 20, currentStep: '오디오 변환 중...' });

      // FFmpeg 명령어: WebM → WAV 변환 (고품질 PCM)
      await this.ffmpeg.exec([
        '-i', inputName,
        '-c:a', 'pcm_s16le',        // 16-bit PCM Little Endian
        '-ar', '44100',             // 44.1kHz 샘플링 레이트
        '-ac', '2',                 // 스테레오
        outputName
      ]);

      this.reportProgress({ phase: 'finalizing', percentage: 80, currentStep: '최종 처리 중...' });

      // 결과 파일 읽기
      const data = await this.ffmpeg.readFile(outputName) as Uint8Array;
      const wavBlob = new Blob([data.buffer], { type: 'audio/wav' });

      // 임시 파일 정리
      await this.ffmpeg.deleteFile(inputName);
      await this.ffmpeg.deleteFile(outputName);

      this.reportProgress({ phase: 'complete', percentage: 100, currentStep: '변환 완료!' });

      const result: ConversionResult = {
        success: true,
        blob: wavBlob,
        filename: outputFilename,
        originalSize: webmBlob.size,
        convertedSize: wavBlob.size,
        duration: 0 // TODO: 메타데이터에서 추출
      };

      console.log('✅ [MediaConverter] WAV 변환 완료:', {
        originalSize: `${Math.round(webmBlob.size / 1024)}KB`,
        convertedSize: `${Math.round(wavBlob.size / 1024)}KB`,
        sizeIncrease: `${Math.round((wavBlob.size / webmBlob.size - 1) * 100)}%`
      });

      return result;

    } catch (error) {
      console.error('❌ [MediaConverter] WAV 변환 실패:', error);
      return {
        success: false,
        originalSize: webmBlob.size,
        convertedSize: 0,
        duration: 0,
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      };
    }
  }

  /**
   * 파일 다운로드 트리거
   */
  public downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('📥 [MediaConverter] 파일 다운로드 시작:', filename);
  }

  /**
   * FFmpeg 로그에서 진행률 파싱
   */
  private parseProgress(message: string): void {
    // FFmpeg 진행률 메시지 파싱 (예: "frame= 1234 fps=30 q=28.0 size= 15680kB time=00:01:23.45")
    const timeMatch = message.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
    if (timeMatch && this.onProgress) {
      // TODO: 전체 길이를 알고 있다면 정확한 퍼센트 계산 가능
      // 현재는 로그 메시지 기반으로 대략적인 진행률 추정
    }
  }

  /**
   * 진행률 리포트
   */
  private reportProgress(progress: ConversionProgress): void {
    if (this.onProgress) {
      this.onProgress(progress);
    }
  }

  /**
   * 리소스 정리
   */
  public cleanup(): void {
    // FFmpeg 인스턴스는 재사용 가능하므로 특별한 정리 불필요
    console.log('🧹 [MediaConverter] 리소스 정리 완료');
  }
}