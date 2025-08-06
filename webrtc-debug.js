// WebRTC 연결 상태 자세히 디버깅하는 코드
// 브라우저 콘솔에서 실행

console.log("=== WebRTC 연결 상태 상세 진단 ===");

const manager = globalThis.__webRTCManager__;
if (!manager) {
  console.error("❌ WebRTC Manager가 없습니다!");
  return;
}

console.log("1. WebRTC Manager 기본 정보:");
console.log("- Socket connected:", manager.getSocket()?.connected);
console.log("- Socket ID:", manager.getSocket()?.id);
console.log("- Room code:", manager.roomCode);

console.log("\n2. Local Stream 상태:");
console.log("- Local stream:", !!manager.localStream);
if (manager.localStream) {
  console.log("- Audio tracks:", manager.localStream.getAudioTracks().length);
  console.log("- Audio track enabled:", manager.localStream.getAudioTracks()[0]?.enabled);
  console.log("- Audio track ready:", manager.localStream.getAudioTracks()[0]?.readyState);
}

console.log("\n3. Peer Connections 상태:");
const peerInfo = manager.getPeerConnectionsInfo?.() || {};
console.log("- Peer connections count:", Object.keys(peerInfo).length);

// Peer connection들의 상세 상태 확인
if (manager.peerConnections) {
  manager.peerConnections.forEach((pc, socketId) => {
    console.log(`\n--- Peer: ${socketId} ---`);
    console.log("- Connection State:", pc.connectionState);
    console.log("- ICE Connection State:", pc.iceConnectionState);
    console.log("- ICE Gathering State:", pc.iceGatheringState);
    console.log("- Signaling State:", pc.signalingState);
    
    // 로컬 스트림이 추가되었는지 확인
    const senders = pc.getSenders();
    console.log("- Senders count:", senders.length);
    senders.forEach((sender, index) => {
      console.log(`  Sender ${index}:`, {
        track: sender.track ? `${sender.track.kind} (${sender.track.readyState})` : null
      });
    });
    
    // 원격 스트림이 수신되었는지 확인
    const receivers = pc.getReceivers();
    console.log("- Receivers count:", receivers.length);
    receivers.forEach((receiver, index) => {
      console.log(`  Receiver ${index}:`, {
        track: receiver.track ? `${receiver.track.kind} (${receiver.track.readyState})` : null
      });
    });
  });
} else {
  console.log("❌ peerConnections Map에 접근할 수 없습니다");
}

console.log("\n4. 해결책 제안:");
console.log("- 두 브라우저 모두 페이지 새로고침 후 재시도");
console.log("- 방 코드로 다시 참여해보기");
console.log("- 브라우저 개발자 도구 > Application > Local Storage 클리어");

console.log("\n=== 진단 완료 ===");