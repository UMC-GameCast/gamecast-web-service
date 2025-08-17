// useVoiceChat 초기화 상태 진단 코드
console.log("=== useVoiceChat 초기화 상태 진단 ===");

// React DevTools로 RoomPage 컴포넌트 확인
console.log("1. RoomPage 컴포넌트 상태 확인:");
console.log("현재 페이지:", window.location.pathname);

// 조건 확인
console.log("\n2. useVoiceChat 활성화 조건 확인:");
console.log("useVoiceChat 호출 조건을 확인하세요:");
console.log("- currentRoom?.roomCode: 값이 있어야 함");
console.log("- currentPlayer?.nickname: 값이 있어야 함"); 
console.log("- !!(currentRoom && currentPlayer): true여야 함");

// 강제 초기화 테스트
console.log("\n3. 강제 WebRTC Manager 생성 테스트:");

// WebRTC Manager 수동 생성 시도
try {
  // 임시로 WebRTC Manager를 수동 생성
  const { WebRTCManager } = await import('./client/src/utils/webRTCManager.js');
  const testManager = new WebRTCManager('TEST_ROOM', 'TestUser');
  
  console.log("✅ WebRTC Manager 수동 생성 성공!");
  console.log("- Manager:", testManager);
  console.log("- Socket 연결 시도 중...");
  
  // globalThis에 임시 설정
  globalThis.__webRTCManager__ = testManager;
  console.log("✅ globalThis에 임시 매니저 설정 완료");
  
} catch (error) {
  console.error("❌ WebRTC Manager 수동 생성 실패:", error);
}

console.log("\n=== 진단 완료 ===");
console.log("React DevTools에서 RoomPage 컴포넌트를 선택하고 다음을 확인하세요:");
console.log("1. currentRoom 객체의 roomCode 값");
console.log("2. currentPlayer 객체의 nickname 값");
console.log("3. useVoiceChat의 enabled 조건");