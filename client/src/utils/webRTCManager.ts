// 자막 기능 테스트용으로 단순화된 WebRTCManager
export class WebRTCManager {
  private localStream: MediaStream | null = null;
  private roomId: string;

  public onRemoteStream: (sid: string, stream: MediaStream) => void = () => {};
  public onUserLeft: (sid: string) => void = () => {};

  constructor(roomId: string) {
    this.roomId = roomId;
    console.log(`WebRTCManager 초기화 (자막 테스트용): ${roomId}`);
  }

  public async start(): Promise<MediaStream | null> {
    try {
      console.log('마이크 접근 시도 (자막 테스트용)');
      this.localStream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: false 
      });
      console.log('마이크 접근 성공 (자막 테스트용)');
      return this.localStream;
    } catch (error) {
      console.error("마이크 접근 실패 (자막 테스트용):", error);
      // 자막 테스트를 위해 더미 스트림 반환
      return null;
    }
  }

  public close() {
    console.log("WebRTCManager 종료 (자막 테스트용)");
    this.localStream?.getTracks().forEach(track => track.stop());
  }
} 