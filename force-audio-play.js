// 브라우저 콘솔에서 실행할 강제 오디오 재생 코드

console.log("=== 강제 오디오 재생 시도 ===");

// 1. 모든 audio 엘리먼트 찾기
const audioElements = document.querySelectorAll('audio');
console.log(`발견된 audio 엘리먼트: ${audioElements.length}개`);

// 2. 각 audio 엘리먼트 상태 확인 및 강제 재생
audioElements.forEach((audio, index) => {
  console.log(`Audio ${index} 상태:`, {
    src: audio.src,
    srcObject: !!audio.srcObject,
    paused: audio.paused,
    muted: audio.muted,
    volume: audio.volume,
    readyState: audio.readyState,
    networkState: audio.networkState
  });
  
  // 강제 설정
  audio.muted = false;
  audio.volume = 1.0; // 최대 볼륨
  
  // 강제 재생 시도
  const playPromise = audio.play();
  if (playPromise) {
    playPromise
      .then(() => {
        console.log(`✅ Audio ${index} 재생 성공!`);
      })
      .catch(err => {
        console.log(`❌ Audio ${index} 재생 실패:`, err.message);
      });
  }
});

// 3. WebRTC 원격 스트림 확인
const manager = globalThis.__webRTCManager__;
if (manager) {
  console.log("WebRTC Manager 상태:");
  console.log("- Socket connected:", manager.getSocket()?.connected);
  console.log("- Peer connections:", manager.getPeerConnectionsInfo?.());
}

// 4. 사용자 클릭 이벤트로 오디오 활성화 (자동실행됨)
const enableAllAudio = () => {
  console.log("🔊 사용자 클릭으로 오디오 활성화 시도...");
  audioElements.forEach((audio, index) => {
    audio.play()
      .then(() => console.log(`✅ 클릭 후 Audio ${index} 재생 성공`))
      .catch(err => console.log(`❌ 클릭 후 Audio ${index} 재생 실패:`, err.message));
  });
};

// 즉시 실행
enableAllAudio();

console.log("=== 페이지 아무곳이나 클릭해보세요! ===");