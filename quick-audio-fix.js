// 브라우저 콘솔에서 실행할 음성 디버깅 코드

console.log("=== 음성채팅 상태 확인 ===");

// 1. WebRTC Manager 확인
const manager = globalThis.__webRTCManager__;
console.log("WebRTC Manager:", manager);
console.log("Local Stream:", manager?.localStream);
console.log("Local Audio Tracks:", manager?.localStream?.getAudioTracks());

// 2. 로컬 오디오 트랙 활성화 확인
if (manager?.localStream) {
  const audioTracks = manager.localStream.getAudioTracks();
  console.log("Audio Tracks Status:", audioTracks.map(track => ({
    id: track.id,
    enabled: track.enabled,
    readyState: track.readyState,
    muted: track.muted
  })));
  
  // 오디오 트랙 강제 활성화
  audioTracks.forEach(track => {
    track.enabled = true;
    console.log("✅ Audio track enabled:", track.id);
  });
}

// 3. 모든 audio 엘리먼트 찾아서 재생 시도  
const audioElements = document.querySelectorAll('audio');
console.log("Audio elements found:", audioElements.length);

audioElements.forEach((audio, index) => {
  console.log(`Audio ${index}:`, {
    src: audio.src,
    srcObject: audio.srcObject,
    paused: audio.paused,
    muted: audio.muted,
    volume: audio.volume
  });
  
  // 강제 재생 시도
  audio.muted = false;
  audio.volume = 0.8;
  audio.play().then(() => {
    console.log(`✅ Audio ${index} playing`);
  }).catch(err => {
    console.log(`❌ Audio ${index} play failed:`, err);
  });
});

// 4. 마이크 권한 재확인
navigator.mediaDevices.getUserMedia({audio: true})
  .then(stream => {
    console.log("✅ 마이크 테스트 성공:", stream);
    // 테스트 스트림 정리
    stream.getTracks().forEach(track => track.stop());
  })
  .catch(err => console.error("❌ 마이크 테스트 실패:", err));

console.log("=== 디버깅 완료 ===");