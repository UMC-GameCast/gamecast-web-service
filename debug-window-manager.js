// 브라우저 콘솔에서 실행할 Window 매니저 디버깅 코드

console.log("=== Window Manager 상태 확인 ===");

console.log("1. Window 객체 확인:");
console.log("- window 존재:", typeof window !== 'undefined');
console.log("- __GAMECAST_WEBRTC_MANAGER__:", !!(window.__GAMECAST_WEBRTC_MANAGER__));
console.log("- __GAMECAST_WEBRTC_ROOM_CODE__:", window.__GAMECAST_WEBRTC_ROOM_CODE__);
console.log("- __GAMECAST_WEBRTC_LOCK__:", window.__GAMECAST_WEBRTC_LOCK__);
console.log("- __GAMECAST_WEBRTC_CREATION_COUNT__:", window.__GAMECAST_WEBRTC_CREATION_COUNT__);

console.log("\n2. 모든 window 속성 확인:");
const gamecastKeys = Object.keys(window).filter(key => key.includes('GAMECAST'));
console.log("- Gamecast 관련 키들:", gamecastKeys);

console.log("\n3. 기존 globalThis 확인:");
console.log("- globalThis.__webRTCManager__:", !!(globalThis.__webRTCManager__));

console.log("\n4. useVoiceChat 훅 상태:");
// 활성 훅 인스턴스 확인
const voiceChatElements = document.querySelectorAll('[data-voice-chat]');
console.log("- Voice chat elements:", voiceChatElements.length);

console.log("=== 디버깅 완료 ===");