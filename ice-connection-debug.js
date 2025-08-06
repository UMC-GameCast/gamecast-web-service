// ICE 연결 실패 디버깅 코드
console.log("=== ICE 연결 상태 진단 ===");

const manager = globalThis.__webRTCManager__;
if (!manager) {
  console.error("❌ WebRTC Manager 없음");
  return;
}

console.log("1. 기본 연결 상태:");
console.log("- Socket 연결:", manager.getSocket()?.connected);
console.log("- Socket ID:", manager.getSocket()?.id);
console.log("- 로컬 스트림:", !!manager.localStream);

// Peer Connection 진단
const peerInfo = manager.getPeerConnectionsInfo?.() || {};
console.log("\n2. Peer Connection 진단:");
console.log("- 총 Peer 수:", Object.keys(peerInfo).length);

Object.entries(peerInfo).forEach(([socketId, info]) => {
  console.log(`\n--- Peer: ${socketId} ---`);
  console.log("- Connection State:", info.connectionState);
  console.log("- ICE Connection State:", info.iceConnectionState);
  console.log("- ICE Gathering State:", info.iceGatheringState);
  console.log("- Signaling State:", info.signalingState);
  
  // 문제 진단
  if (info.connectionState === 'failed') {
    console.error("❌ 연결 실패 원인:");
    console.error("  1. 방화벽/NAT 문제");
    console.error("  2. STUN 서버 접근 불가"); 
    console.error("  3. ICE candidate 교환 실패");
  }
  
  if (info.iceConnectionState === 'failed') {
    console.error("❌ ICE 연결 실패:");
    console.error("  - 네트워크 연결 문제");
    console.error("  - STUN/TURN 서버 필요");
  }
});

// ICE 서버 확인
console.log("\n3. ICE 서버 테스트:");
const testICE = async () => {
  try {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
      ]
    });
    
    pc.createDataChannel('test');
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    console.log("✅ ICE 서버 접근 가능");
    pc.close();
  } catch (error) {
    console.error("❌ ICE 서버 접근 실패:", error);
  }
};

testICE();

// Socket.IO 이벤트 모니터링
console.log("\n4. Socket.IO 이벤트 상태:");
const socket = manager.getSocket();
const events = ['new-user-joined', 'webrtc-offer', 'webrtc-answer', 'webrtc-ice-candidate'];

events.forEach(event => {
  const listeners = socket.listeners(event).length;
  console.log(`- ${event}: ${listeners}개 리스너`);
});

console.log("\n=== 해결 방안 ===");
console.log("1. 다른 네트워크에서 테스트 (모바일 핫스팟)");
console.log("2. 브라우저 시크릿 모드 사용");
console.log("3. TURN 서버 추가 고려");
console.log("4. 방화벽 설정 확인");