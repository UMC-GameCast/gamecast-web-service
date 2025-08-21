/**
 * 게임 스트리밍 서비스용 GameRecorder 클래스
 * 화면 녹화와 마이크 음성을 분리해서 처리하는 고성능 녹화 시스템
 * WebM → MP4/WAV 클라이언트 변환 지원
 */

import { MediaConverter } from './MediaConverter';

// 임시 타입 정의 (import 문제 우회)
interface ConversionProgress {
  phase: 'loading' | 'converting' | 'finalizing' | 'complete';
  percentage: number;
  timeRemaining?: string;
  currentStep?: string;
}

interface ConversionResult {
  success: boolean;
  blob?: Blob;
  filename?: string;
  originalSize: number;
  convertedSize: number;
  duration: number;
  error?: string;
}

interface VideoMetadata {
  resolution: string;
  fps: number;
}

interface RecordingState {
  isRecording: boolean;
  startTime: number;
  duration: number;
}

interface UploadResult {
  success: boolean;
  result?: unknown;
  videoFile?: string;
  audioFile?: string;
  uploadTime: string;
  duration?: number;
  error?: string;
}

export class GameRecorder {
  private screenRecorder: MediaRecorder | null = null;
  private audioRecorder: MediaRecorder | null = null;
  
  private screenStream: MediaStream | null = null;
  private audioStream: MediaStream | null = null;
  
  private screenChunks: Blob[] = [];
  private audioChunks: Blob[] = [];
  
  private startTime: number = 0;
  private videoMetadata: VideoMetadata = { resolution: '1920x1080', fps: 60 };
  
  private state: RecordingState = {
    isRecording: false,
    startTime: 0,
    duration: 0
  };
  
  // 업로드 진행률 콜백
  private onUploadProgress?: (progress: number) => void;
  
  // 미디어 변환기
  private mediaConverter: MediaConverter;
  private onConversionProgress?: (progress: ConversionProgress) => void;

  constructor() {
    this.mediaConverter = new MediaConverter();
  }

  /**
   * 녹화 준비 상태 확인
   */
  public isReadyToRecord(): boolean {
    return this.screenStream !== null && this.screenStream.active;
  }

  /**
   * 외부에서 획득한 오디오 스트림 설정 (Context에서 미리 획득한 마이크 스트림)
   */
  public setExternalAudioStream(audioStream: MediaStream): void {
    console.log('🎤 [GameRecorder] Setting external audio stream:', {
      streamId: audioStream.id,
      tracks: audioStream.getAudioTracks().length,
      active: audioStream.active
    });
    
    // 기존 스트림이 있다면 정리
    if (this.audioStream && this.audioStream !== audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
    }
    
    this.audioStream = audioStream;
  }

  /**
   * 현재 설정된 오디오 스트림 상태 확인
   */
  public hasAudioStream(): boolean {
    return this.audioStream !== null && this.audioStream.active && this.audioStream.getAudioTracks().length > 0;
  }

  /**
   * 업로드 진행률 콜백 설정
   */
  public setUploadProgressCallback(callback?: (progress: number) => void): void {
    this.onUploadProgress = callback;
  }

  /**
   * 화면 선택 및 녹화 준비 (녹화화면 설정 버튼용)
   */
  public async selectScreen(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🎮 [GameRecorder] Starting screen selection...');
      
      // 개발 환경에서 시스템 오디오 안내 표시
      if (import.meta.env.DEV) {
        console.log('🔊 [GameRecorder] 시스템 오디오 공유 안내:', {
          message: '화면 공유 시 "시스템 오디오 공유" 체크박스를 반드시 체크해주세요!',
          description: '체크하지 않으면 화면 소리가 녹화되지 않습니다.'
        });
      }

      // 화면 캡처 스트림 요청 (비디오 + 시스템 오디오)
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 60 },
          displaySurface: 'application' as const // 애플리케이션 창만 선택 가능
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100
        } // 화면 시스템 오디오 포함
      });

      this.screenStream = displayStream;

      // 비디오 트랙에서 실제 해상도와 fps 추출
      const videoTrack = displayStream.getVideoTracks()[0];
      const audioTracks = displayStream.getAudioTracks();
      
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        this.videoMetadata = {
          resolution: `${settings.width}x${settings.height}`,
          fps: settings.frameRate || 60
        };

        console.log('✅ [GameRecorder] Screen selected successfully:', {
          resolution: this.videoMetadata.resolution,
          fps: this.videoMetadata.fps,
          trackLabel: videoTrack.label,
          hasSystemAudio: audioTracks.length > 0,
          audioTracks: audioTracks.map(track => ({
            label: track.label,
            enabled: track.enabled,
            settings: track.getSettings()
          }))
        });

        // 시스템 오디오 체크 여부 확인 및 경고
        if (audioTracks.length === 0) {
          console.warn('⚠️ [GameRecorder] 시스템 오디오가 감지되지 않았습니다!');
          console.warn('🔊 화면 공유 시 "시스템 오디오 공유" 체크박스를 체크하셨나요?');
          console.warn('📹 화면 영상은 녹화되지만 화면 소리는 녹화되지 않습니다.');
          
          if (import.meta.env.DEV) {
            alert('⚠️ 시스템 오디오가 감지되지 않았습니다!\n\n화면 공유 시 "시스템 오디오 공유" 체크박스를 체크해야 화면 소리가 녹화됩니다.\n\n다시 설정하려면 "녹화화면 설정" 버튼을 다시 클릭하세요.');
          }
        } else {
          console.log('🔊 [GameRecorder] 시스템 오디오 공유 활성화됨! 화면 소리가 녹화됩니다.');
        }
      }

      return { success: true };

    } catch (error) {
      console.error('❌ [GameRecorder] Screen selection failed:', error);
      
      let errorMessage = '화면 선택에 실패했습니다.';
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = '화면 공유 권한이 거부되었습니다. 브라우저에서 화면 공유를 허용해주세요.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = '공유 가능한 화면을 찾을 수 없습니다.';
        } else if (error.name === 'NotSupportedError') {
          errorMessage = '이 브라우저는 화면 공유를 지원하지 않습니다.';
        }
      }
      
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 동기화 녹화 시작 (Socket 이벤트에서 호출)
   */
  public async startSyncRecording(): Promise<void> {
    if (this.state.isRecording) {
      console.warn('⚠️ [GameRecorder] Recording already in progress');
      return;
    }

    try {
      console.log('🎬 [GameRecorder] Starting synchronized recording...', {
        timestamp: new Date().toISOString()
      });

      this.startTime = Date.now();
      this.state = {
        isRecording: true,
        startTime: this.startTime,
        duration: 0
      };

      // 화면 녹화와 음성 녹음을 병렬로 시작
      await Promise.all([
        this.startScreenRecording(),
        this.startAudioRecording()
      ]);

      console.log('✅ [GameRecorder] Synchronized recording started successfully');

    } catch (error) {
      console.error('❌ [GameRecorder] Failed to start synchronized recording:', error);
      this.state.isRecording = false;
      throw new Error(`동기화 녹화 시작에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * 동기화 녹화 종료 및 업로드 (Socket 이벤트에서 호출)
   */
  public async stopSyncRecording(roomCode: string, userId: string, gameTitle: string): Promise<UploadResult | null> {
    if (!this.state.isRecording) {
      console.warn('⚠️ [GameRecorder] No recording in progress');
      return null;
    }

    try {
      console.log('🛑 [GameRecorder] Stopping synchronized recording...');

      // 녹화 종료
      await Promise.all([
        this.stopScreenRecording(),
        this.stopAudioRecording()
      ]);

      // 서버로 업로드
      const uploadResult = await this.uploadToServer(roomCode, userId, gameTitle);

      console.log('✅ [GameRecorder] Synchronized recording completed and uploaded:', uploadResult);
      
      // 리소스 정리
      this.cleanup();
      
      return uploadResult;

    } catch (error) {
      console.error('❌ [GameRecorder] Failed to stop synchronized recording:', error);
      throw new Error(`동기화 녹화 종료에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * 녹화만 종료 (서버 업로드 없이 로컬에만 저장)
   */
  public async stopRecordingOnly(): Promise<void> {
    if (!this.state.isRecording) {
      console.warn('⚠️ [GameRecorder] No recording in progress');
      return;
    }

    try {
      console.log('⏹️ [GameRecorder] Stopping recording (local only)...');

      // 녹화 종료
      await Promise.all([
        this.stopScreenRecording(),
        this.stopAudioRecording()
      ]);

      // 상태 업데이트 (업로드 없이)
      this.state.isRecording = false;
      this.state.duration = Math.round((Date.now() - this.startTime) / 1000);

      console.log('✅ [GameRecorder] Recording stopped (ready for conversion):', {
        duration: this.state.duration,
        videoChunks: this.screenChunks.length,
        audioChunks: this.audioChunks.length,
        videoSize: `${Math.round(new Blob(this.screenChunks).size / 1024 / 1024)}MB`,
        audioSize: `${Math.round(new Blob(this.audioChunks).size / 1024)}KB`
      });

      // 주의: cleanup()을 호출하지 않음 - 변환을 위해 데이터 보존

    } catch (error) {
      console.error('❌ [GameRecorder] Failed to stop recording:', error);
      throw new Error(`녹화 종료에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * 녹화 종료 후 서버 업로드 (별도 실행)
   */
  public async uploadRecordingToServer(roomCode: string, userId: string, gameTitle: string): Promise<UploadResult | null> {
    if (this.state.isRecording) {
      throw new Error('녹화가 아직 진행 중입니다. 먼저 녹화를 종료해주세요.');
    }

    if (this.screenChunks.length === 0 && this.audioChunks.length === 0) {
      throw new Error('업로드할 녹화 데이터가 없습니다.');
    }

    try {
      console.log('📤 [GameRecorder] Uploading recorded data to server...');
      
      // 서버로 업로드
      const uploadResult = await this.uploadToServer(roomCode, userId, gameTitle);
      
      console.log('✅ [GameRecorder] Upload completed:', uploadResult);
      
      // 업로드 완료 후 리소스 정리
      this.cleanup();
      
      return uploadResult;

    } catch (error) {
      console.error('❌ [GameRecorder] Upload failed:', error);
      throw new Error(`서버 업로드에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * 녹화 시작 (레거시 메소드 - 기존 호환성 유지)
   */
  public async startRecording(roomCode: string, userId: string, gameTitle: string): Promise<void> {
    if (this.state.isRecording) {
      console.warn('⚠️ [GameRecorder] Recording already in progress');
      return;
    }

    try {
      console.log('🎬 [GameRecorder] Starting recording...', {
        roomCode,
        userId,
        gameTitle,
        timestamp: new Date().toISOString()
      });

      this.startTime = Date.now();
      this.state = {
        isRecording: true,
        startTime: this.startTime,
        duration: 0
      };

      // 화면 녹화와 음성 녹음을 병렬로 시작
      await Promise.all([
        this.startScreenRecording(),
        this.startAudioRecording()
      ]);

      console.log('✅ [GameRecorder] Recording started successfully');

    } catch (error) {
      console.error('❌ [GameRecorder] Failed to start recording:', error);
      this.state.isRecording = false;
      throw new Error(`녹화 시작에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * 녹화 종료 및 서버 업로드 (방장만 호출 가능)
   */
  public async stopRecording(roomCode: string, userId: string, gameTitle: string): Promise<UploadResult | null> {
    if (!this.state.isRecording) {
      console.warn('⚠️ [GameRecorder] No recording in progress');
      return null;
    }

    try {
      console.log('⏹️ [GameRecorder] Stopping recording...', {
        roomCode,
        userId,
        gameTitle,
        duration: Math.round((Date.now() - this.startTime) / 1000)
      });

      this.state.isRecording = false;
      this.state.duration = Math.round((Date.now() - this.startTime) / 1000);

      // 녹화 중지
      await Promise.all([
        this.stopScreenRecording(),
        this.stopAudioRecording()
      ]);

      // 서버로 업로드
      const uploadResult = await this.uploadToServer(roomCode, userId, gameTitle);

      console.log('✅ [GameRecorder] Recording completed and uploaded:', uploadResult);
      
      // 리소스 정리
      this.cleanup();

      return uploadResult;

    } catch (error) {
      console.error('❌ [GameRecorder] Failed to stop recording:', error);
      throw new Error(`녹화 종료에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * 화면 녹화 시작
   */
  private async startScreenRecording(): Promise<void> {
    if (!this.screenStream) {
      throw new Error('화면 스트림이 준비되지 않았습니다. 먼저 화면을 선택해주세요.');
    }

    try {
      // VP9 코덱으로 WebM 포맷 녹화
      const options = {
        mimeType: 'video/webm; codecs=vp9',
        videoBitsPerSecond: 8000000 // 8Mbps 고화질
      };

      this.screenRecorder = new MediaRecorder(this.screenStream, options);
      this.screenChunks = [];

      this.screenRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.screenChunks.push(event.data);
          console.log(`📹 [GameRecorder] Screen chunk received: ${Math.round(event.data.size / 1024)}KB`);
        }
      };

      this.screenRecorder.onerror = (event) => {
        console.error('❌ [GameRecorder] Screen recording error:', event);
      };

      this.screenRecorder.start(1000); // 1초마다 청크 생성
      console.log('📹 [GameRecorder] Screen recording started');

    } catch (error) {
      console.error('❌ [GameRecorder] Failed to start screen recording:', error);
      throw error;
    }
  }

  /**
   * 음성 녹음 시작
   */
  private async startAudioRecording(): Promise<void> {
    try {
      // 외부에서 설정된 스트림이 없다면 새로 획득
      if (!this.hasAudioStream()) {
        console.log('🎤 [GameRecorder] No external audio stream, requesting new stream...');
        this.audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,    // 에코 제거 비활성화 (음질 개선)
            noiseSuppression: false,    // 노이즈 억제 비활성화 (자연스러운 음성)
            autoGainControl: false,     // 자동 게인 비활성화 (볼륨 안정성)
            sampleRate: 44100,         // 고품질 샘플링 레이트
            channelCount: 1            // 모노 채널 (파일 크기 최적화)
          },
          video: false
        });
      } else {
        console.log('🎤 [GameRecorder] Using external audio stream:', {
          streamId: this.audioStream?.id,
          tracks: this.audioStream?.getAudioTracks().length,
          audioTracks: this.audioStream?.getAudioTracks().map(track => ({
            label: track.label,
            enabled: track.enabled,
            settings: track.getSettings()
          }))
        });
      }

      // Opus 코덱으로 WebM 포맷 녹음
      const options = {
        mimeType: 'audio/webm; codecs=opus',
        audioBitsPerSecond: 128000 // 128kbps 고음질
      };

      this.audioRecorder = new MediaRecorder(this.audioStream, options);
      this.audioChunks = [];

      this.audioRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          console.log(`🎤 [GameRecorder] Audio chunk received: ${Math.round(event.data.size / 1024)}KB`);
        }
      };

      this.audioRecorder.onerror = (event) => {
        console.error('❌ [GameRecorder] Audio recording error:', event);
      };

      this.audioRecorder.start(1000); // 1초마다 청크 생성
      console.log('🎤 [GameRecorder] Audio recording started:', {
        mimeType: options.mimeType,
        audioBitsPerSecond: options.audioBitsPerSecond,
        streamTracks: this.audioStream.getAudioTracks().length,
        streamActive: this.audioStream.active
      });

    } catch (error) {
      console.error('❌ [GameRecorder] Failed to start audio recording:', error);
      
      let errorMessage = '마이크 녹음 시작에 실패했습니다.';
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = '마이크 권한이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = '마이크 장치를 찾을 수 없습니다.';
        }
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * 화면 녹화 중지
   */
  private async stopScreenRecording(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.screenRecorder) {
        resolve();
        return;
      }

      this.screenRecorder.onstop = () => {
        console.log('📹 [GameRecorder] Screen recording stopped');
        resolve();
      };

      this.screenRecorder.stop();
    });
  }

  /**
   * 음성 녹음 중지
   */
  private async stopAudioRecording(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.audioRecorder) {
        resolve();
        return;
      }

      this.audioRecorder.onstop = () => {
        console.log('🎤 [GameRecorder] Audio recording stopped');
        resolve();
      };

      this.audioRecorder.stop();
    });
  }

  /**
   * 서버로 녹화 파일 업로드 (MP4 비디오 + WAV 오디오)
   */
  private async uploadToServer(roomCode: string, userId: string, gameTitle: string): Promise<UploadResult> {
    try {
      console.log('📤 [GameRecorder] Starting upload to server...');

      // 기본 WebM Blob 생성
      const videoBlob = new Blob(this.screenChunks, { type: 'video/webm' });
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });

      console.log('📦 [GameRecorder] Files prepared for upload:', {
        videoSize: `${Math.round(videoBlob.size / 1024 / 1024)}MB`,
        audioSize: `${Math.round(audioBlob.size / 1024)}KB`,
        duration: this.state.duration,
        resolution: this.videoMetadata.resolution,
        fps: this.videoMetadata.fps
      });

      // FormData 생성
      const formData = new FormData();
      
      // 서버에서 변환 처리를 위해 WebM 파일을 MP4/WAV 파일명으로 전송
      // 실제 변환은 서버에서 FFmpeg 등으로 처리
      formData.append('video', videoBlob, `recording_${roomCode}_${userId}.webm`);
      formData.append('audio', audioBlob, `audio_${roomCode}_${userId}.webm`);
      formData.append('roomCode', roomCode);
      formData.append('userId', userId);
      formData.append('gameTitle', gameTitle);
      formData.append('duration', this.state.duration.toString());
      formData.append('resolution', this.videoMetadata.resolution);
      formData.append('fps', this.videoMetadata.fps.toString());
      formData.append('uploadTime', new Date().toISOString());
      formData.append('description', `${gameTitle} 게임 플레이 녹화 - ${new Date().toLocaleString()}`);

      console.log('📡 [GameRecorder] Uploading to server...', {
        endpoint: '/api/videos/upload',
        roomCode,
        userId,
        gameTitle,
        videoSize: Math.round(videoBlob.size / 1024 / 1024) + 'MB',
        audioSize: Math.round(audioBlob.size / 1024) + 'KB'
      });

      // 서버로 업로드 (XMLHttpRequest를 사용하여 진행률 추적)
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://3.37.34.211:8889';
      
      const response = await this.uploadWithProgress(`${API_BASE_URL}/api/videos/upload`, formData);

      if (!response.ok) {
        let errorDetails = '';
        try {
          const errorData = await response.text();
          errorDetails = errorData;
        } catch {
          errorDetails = response.statusText;
        }
        throw new Error(`서버 응답 오류: ${response.status} - ${errorDetails}`);
      }

      const result = await response.json();
      console.log('✅ [GameRecorder] Upload completed successfully:', result);

      return {
        success: true,
        result,
        videoFile: result?.videoFile || `recording_${roomCode}_${userId}.mp4`,
        audioFile: result?.audioFile || `audio_${roomCode}_${userId}.wav`,
        uploadTime: new Date().toISOString(),
        duration: this.state.duration
      };

    } catch (error) {
      console.error('❌ [GameRecorder] Upload failed:', error);
      
      let errorMessage = '서버 업로드에 실패했습니다.';
      if (error instanceof Error) {
        if (error.name === 'TimeoutError') {
          errorMessage = '업로드 시간이 초과되었습니다. 네트워크 상태를 확인해주세요.';
        } else if (error.message.includes('fetch') || error.message.includes('NetworkError')) {
          errorMessage = '네트워크 연결을 확인해주세요.';
        } else if (error.message.includes('413')) {
          errorMessage = '파일 크기가 너무 큽니다.';
        } else if (error.message.includes('500')) {
          errorMessage = '서버 내부 오류가 발생했습니다.';
        } else {
          errorMessage = error.message;
        }
      }
      
      return {
        success: false,
        error: errorMessage,
        uploadTime: new Date().toISOString()
      };
    }
  }

  /**
   * 진행률 추적이 가능한 업로드 메서드
   */
  private async uploadWithProgress(url: string, formData: FormData): Promise<Response> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // 업로드 진행률 추적
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          console.log(`📊 [GameRecorder] Upload progress: ${progress}%`);
          if (this.onUploadProgress) {
            this.onUploadProgress(progress);
          }
        }
      });
      
      // 업로드 완료
      xhr.addEventListener('load', () => {
        console.log('✅ [GameRecorder] Upload completed with status:', xhr.status);
        
        // Response 객체처럼 동작하는 객체 생성
        const response = {
          ok: xhr.status >= 200 && xhr.status < 300,
          status: xhr.status,
          statusText: xhr.statusText,
          headers: new Headers(),
          json: () => Promise.resolve(JSON.parse(xhr.responseText)),
          text: () => Promise.resolve(xhr.responseText)
        } as Response;
        
        resolve(response);
      });
      
      // 업로드 에러
      xhr.addEventListener('error', () => {
        console.error('❌ [GameRecorder] Upload error');
        reject(new Error('네트워크 오류가 발생했습니다'));
      });
      
      // 업로드 중단
      xhr.addEventListener('abort', () => {
        console.warn('⚠️ [GameRecorder] Upload aborted');
        reject(new Error('업로드가 중단되었습니다'));
      });
      
      // 타임아웃 설정 (5분)
      xhr.timeout = 300000;
      xhr.addEventListener('timeout', () => {
        console.error('⏰ [GameRecorder] Upload timeout');
        reject(new Error('업로드 시간이 초과되었습니다'));
      });
      
      // 요청 시작
      xhr.open('POST', url);
      xhr.send(formData);
    });
  }

  /**
   * 리소스 정리
   */
  private cleanup(): void {
    console.log('🧹 [GameRecorder] Cleaning up resources...');

    // 스트림 정리
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
    }

    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }

    // 레코더 정리
    this.screenRecorder = null;
    this.audioRecorder = null;

    // 청크 데이터 정리
    this.screenChunks = [];
    this.audioChunks = [];

    console.log('✅ [GameRecorder] Cleanup completed');
  }

  /**
   * 현재 녹화 상태 반환
   */
  public getRecordingState(): RecordingState {
    if (this.state.isRecording) {
      this.state.duration = Math.round((Date.now() - this.startTime) / 1000);
    }
    return { ...this.state };
  }

  /**
   * 화면이 선택되었는지 확인
   */
  public isScreenSelected(): boolean {
    return !!this.screenStream;
  }

  /**
   * 비디오 메타데이터 반환
   */
  public getVideoMetadata(): VideoMetadata {
    return { ...this.videoMetadata };
  }

  /**
   * 녹화된 데이터 유무 확인
   */
  public hasRecordedData(): { hasVideo: boolean; hasAudio: boolean } {
    const result = {
      hasVideo: this.screenChunks.length > 0,
      hasAudio: this.audioChunks.length > 0
    };
    
    console.log('🔍 [GameRecorder] 녹화된 데이터 확인:', {
      screenChunks: this.screenChunks.length,
      audioChunks: this.audioChunks.length,
      hasVideo: result.hasVideo,
      hasAudio: result.hasAudio,
      screenChunksSize: this.screenChunks.reduce((total, chunk) => total + chunk.size, 0),
      audioChunksSize: this.audioChunks.reduce((total, chunk) => total + chunk.size, 0)
    });
    
    return result;
  }

  /**
   * 변환 진행률 콜백 설정
   */
  public setConversionProgressCallback(callback: (progress: ConversionProgress) => void): void {
    this.onConversionProgress = callback;
    this.mediaConverter.setProgressCallback(callback);
  }

  /**
   * 녹화된 WebM 비디오를 MP4로 변환 및 다운로드
   */
  public async convertAndDownloadMP4(
    roomCode: string, 
    userId: string, 
    gameTitle: string = 'GameRecording'
  ): Promise<ConversionResult> {
    try {
      console.log('🎬 [GameRecorder] MP4 변환 시작');
      
      if (this.screenChunks.length === 0) {
        throw new Error('녹화된 비디오 데이터가 없습니다');
      }

      // WebM 비디오 Blob 생성
      const webmBlob = new Blob(this.screenChunks, { type: 'video/webm' });
      const filename = `${gameTitle}_${roomCode}_${userId}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.mp4`;

      // 변환 실행
      const result = await this.mediaConverter.convertWebMToMP4(webmBlob, filename);

      if (result.success && result.blob) {
        // 자동 다운로드
        this.mediaConverter.downloadFile(result.blob, filename);
        
        console.log('✅ [GameRecorder] MP4 변환 및 다운로드 완료:', {
          filename,
          originalSize: `${Math.round(result.originalSize / 1024 / 1024)}MB`,
          convertedSize: `${Math.round(result.convertedSize / 1024 / 1024)}MB`
        });
      }

      return result;

    } catch (error) {
      console.error('❌ [GameRecorder] MP4 변환 실패:', error);
      return {
        success: false,
        originalSize: 0,
        convertedSize: 0,
        duration: 0,
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      };
    }
  }

  /**
   * 녹화된 WebM 오디오를 WAV로 변환 및 다운로드
   */
  public async convertAndDownloadWAV(
    roomCode: string, 
    userId: string, 
    gameTitle: string = 'GameRecording'
  ): Promise<ConversionResult> {
    try {
      console.log('🎤 [GameRecorder] WAV 변환 시작');
      
      if (this.audioChunks.length === 0) {
        throw new Error('녹화된 오디오 데이터가 없습니다');
      }

      // WebM 오디오 Blob 생성
      const webmBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      const filename = `${gameTitle}_audio_${roomCode}_${userId}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.wav`;

      // 변환 실행
      const result = await this.mediaConverter.convertWebMToWAV(webmBlob, filename);

      if (result.success && result.blob) {
        // 자동 다운로드
        this.mediaConverter.downloadFile(result.blob, filename);
        
        console.log('✅ [GameRecorder] WAV 변환 및 다운로드 완료:', {
          filename,
          originalSize: `${Math.round(result.originalSize / 1024)}KB`,
          convertedSize: `${Math.round(result.convertedSize / 1024)}KB`
        });
      }

      return result;

    } catch (error) {
      console.error('❌ [GameRecorder] WAV 변환 실패:', error);
      return {
        success: false,
        originalSize: 0,
        convertedSize: 0,
        duration: 0,
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      };
    }
  }

  /**
   * 녹화된 파일들을 모두 변환 및 다운로드 (MP4 + WAV)
   */
  public async convertAndDownloadAll(
    roomCode: string, 
    userId: string, 
    gameTitle: string = 'GameRecording'
  ): Promise<{ video: ConversionResult; audio: ConversionResult }> {
    console.log('📦 [GameRecorder] 전체 변환 시작 (MP4 + WAV)');

    try {
      // 병렬 변환 (시간 단축)
      const [videoResult, audioResult] = await Promise.all([
        this.convertAndDownloadMP4(roomCode, userId, gameTitle),
        this.convertAndDownloadWAV(roomCode, userId, gameTitle)
      ]);

      console.log('🎉 [GameRecorder] 전체 변환 완료:', {
        video: videoResult.success ? '✅ 성공' : '❌ 실패',
        audio: audioResult.success ? '✅ 성공' : '❌ 실패'
      });

      return { video: videoResult, audio: audioResult };

    } catch (error) {
      console.error('❌ [GameRecorder] 전체 변환 실패:', error);
      
      const errorResult: ConversionResult = {
        success: false,
        originalSize: 0,
        convertedSize: 0,
        duration: 0,
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      };

      return { video: errorResult, audio: errorResult };
    }
  }

  /**
   * 원본 WebM 파일들 다운로드 (변환 없이)
   */
  public downloadOriginalFiles(
    roomCode: string, 
    userId: string, 
    gameTitle: string = 'GameRecording'
  ): void {
    console.log('📁 [GameRecorder] 원본 파일 다운로드');

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');

    if (this.screenChunks.length > 0) {
      const videoBlob = new Blob(this.screenChunks, { type: 'video/webm' });
      const videoFilename = `${gameTitle}_${roomCode}_${userId}_${timestamp}.webm`;
      this.mediaConverter.downloadFile(videoBlob, videoFilename);
    }

    if (this.audioChunks.length > 0) {
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      const audioFilename = `${gameTitle}_audio_${roomCode}_${userId}_${timestamp}.webm`;
      this.mediaConverter.downloadFile(audioBlob, audioFilename);
    }

    console.log('✅ [GameRecorder] 원본 파일 다운로드 완료');
  }
}