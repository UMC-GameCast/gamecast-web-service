// 간단한 WebRTC 상태 확인 코드
console.log("=== WebRTC 연결 상태 확인 ===");

const manager = globalThis.__webRTCManager__;
if (!manager) {
  console.error("❌ WebRTC Manager 없음");
  return;
}

console.log("1. 기본 연결 상태:");
console.log("- Socket connected:", manager.getSocket()?.connected);
console.log("- Socket ID:", manager.getSocket()?.id);
console.log("- Local stream:", !!manager.localStream);

// getPeerConnectionsInfo 메서드 사용 (public 메서드)
console.log("2. Peer connections 정보:");
const peerInfo = manager.getPeerConnectionsInfo?.();
console.log("- Peer info:", peerInfo);

// 연결 상태 확인
console.log("3. 연결 진단:");
const connectionState = manager.getVoiceChatState?.();
console.log("- Voice chat state:", connectionState);

// 재시작 시도
console.log("4. 재시작 시도...");
if (manager.localStream) {
  console.log("✅ Local stream 있음, 연결 문제일 수 있음");
  
  // 강제로 마이크 재시작
  manager.start().then(() => {
    console.log("✅ WebRTC 재시작 성공");
  }).catch(err => {
    console.error("❌ WebRTC 재시작 실패:", err);
  });
} else {
  console.log("❌ Local stream 없음, 마이크 초기화부터 다시 필요");
}