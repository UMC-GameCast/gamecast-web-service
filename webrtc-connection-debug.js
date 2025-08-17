// WebRTC 연결 상태 상세 진단 스크립트
console.log("=== WebRTC 연결 진단 시작 ===");

const manager = globalThis.__webRTCManager__;
if (!manager) {
  console.error("❌ WebRTC Manager 없음 - useVoiceChat이 초기화되지 않았습니다");
  console.log("해결방법:");
  console.log("1. 방 정보와 플레이어 정보가 모두 있는지 확인");
  console.log("2. useVoiceChat 활성화 조건 확인");
  console.log("3. 페이지 새로고침 후 재시도");
} else {
  console.log("✅ WebRTC Manager 발견");
  
  // 기본 연결 상태
  const diagnostics = manager.getConnectionDiagnostics();
  console.log("\n📊 기본 연결 상태:");
  console.log("- Socket 연결:", diagnostics.socketConnected);
  console.log("- Socket ID:", diagnostics.socketId);
  console.log("- 로컬 스트림:", diagnostics.localStreamActive);
  console.log("- 로컬 오디오 트랙 수:", diagnostics.localStreamTracks);
  console.log("- 방 코드:", diagnostics.roomCode);
  console.log("- 닉네임:", diagnostics.nickname);
  console.log("- 사용자 ID:", diagnostics.guestUserId);
  
  // Peer Connection 상태
  console.log("\n👥 Peer Connection 상태:");
  console.log("- 총 연결 수:", diagnostics.totalPeerConnections);
  console.log("- 연결된 피어 수:", diagnostics.connectedPeers);
  console.log("- 방 참여 중:", diagnostics.isJoining);
  console.log("- 마지막 참여 시도:", diagnostics.lastJoinAttempt);
  
  if (diagnostics.peerStates.length > 0) {
    console.log("\n🔗 개별 Peer 상태:");
    diagnostics.peerStates.forEach((peer, index) => {
      console.log(`--- Peer ${index + 1}: ${peer.nickname} ---`);
      console.log(`  Socket ID: ${peer.socketId}`);
      console.log(`  연결 상태: ${peer.connectionState}`);
      console.log(`  오디오: ${peer.hasAudio ? '✅' : '❌'}`);
      console.log(`  음소거: ${peer.isMuted ? '🔇' : '🔊'}`);
    });
  } else {
    console.log("❌ Peer Connection이 하나도 없습니다");
  }
  
  // Socket.IO 이벤트 리스너 확인
  console.log("\n📡 Socket.IO 이벤트 리스너:");
  const socket = manager.getSocket();
  const criticalEvents = [
    'user-joined', 
    'user-left', 
    'offer', 
    'answer', 
    'ice-candidate',
    'joined-room-success',
    'join-room-error'
  ];
  
  criticalEvents.forEach(eventName => {
    const listenerCount = socket.listenerCount(eventName);
    console.log(`- ${eventName}: ${listenerCount}개 리스너 ${listenerCount > 0 ? '✅' : '❌'}`);
  });
  
  // 재시도 횟수 확인
  if (Object.keys(diagnostics.reconnectionAttempts).length > 0) {
    console.log("\n🔄 재연결 시도 횟수:");
    Object.entries(diagnostics.reconnectionAttempts).forEach(([socketId, attempts]) => {
      console.log(`- ${socketId}: ${attempts}회 시도`);
    });
  }
  
  console.log("\n=== 진단 결과 분석 ===");
  
  // 문제 진단
  if (!diagnostics.socketConnected) {
    console.error("🔴 Socket.IO 연결 실패");
    console.log("해결방법: 서버 상태 확인 또는 네트워크 연결 점검");
  } else if (!diagnostics.localStreamActive) {
    console.error("🔴 마이크 스트림 없음");
    console.log("해결방법: 브라우저에서 마이크 권한 허용");
  } else if (diagnostics.totalPeerConnections === 0) {
    console.error("🔴 다른 참여자와의 연결이 전혀 없음");
    console.log("가능한 원인:");
    console.log("1. 방에 혼자 있음");
    console.log("2. user-joined 이벤트를 받지 못함");
    console.log("3. 방 참여가 제대로 되지 않음");
  } else if (diagnostics.connectedPeers < diagnostics.totalPeerConnections) {
    console.warn("⚠️ 일부 연결이 실패함");
    console.log("가능한 원인:");
    console.log("1. 네트워크 방화벽 문제");
    console.log("2. STUN 서버 접근 불가");
    console.log("3. 상대방의 마이크 문제");
  } else {
    console.log("✅ WebRTC 연결이 정상적으로 작동 중");
  }
  
  console.log("\n🔧 추가 디버깅 명령어:");
  console.log("- manager.getConnectionDiagnostics() // 상세 진단 정보");
  console.log("- manager.requestRoomUsers() // 방 사용자 목록 새로고침");
  console.log("- manager.getSocket().emit('join-room', { roomCode: 'YOUR_CODE', nickname: 'TEST', guestUserId: 'test123' }) // 수동 방 참여");
}

console.log("\n=== WebRTC 연결 진단 완료 ===");