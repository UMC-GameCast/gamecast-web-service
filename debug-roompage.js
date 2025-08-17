// RoomPage 상태 디버깅 코드
console.log("=== RoomPage useVoiceChat 활성화 조건 확인 ===");

// React DevTools를 통해 현재 상태 확인
console.log("현재 페이지:", window.location.pathname);

// RoomPage 컴포넌트의 props/state 확인 (개발자 도구에서)
console.log("React DevTools에서 RoomPage 컴포넌트를 선택하고 다음을 확인하세요:");
console.log("1. currentRoom 값");
console.log("2. currentPlayer 값");  
console.log("3. !!(currentRoom && currentPlayer) 결과");

console.log("\n수동으로 useVoiceChat 활성화 테스트:");
console.log("다음 조건들을 콘솔에서 확인:");
console.log("- currentRoom?.roomCode:", "방 코드가 있는지");
console.log("- currentPlayer?.nickname:", "플레이어 닉네임이 있는지");
console.log("- enabled 조건:", "true여야 함");

console.log("=== 확인 완료 ===");