# 음성채팅 문제 진단 체크리스트

## 1. 마이크 권한 확인
브라우저 콘솔에서 다음 로그를 찾아보세요:
- `✅ [WebRTC] Microphone initialized successfully`
- `🎤 [WebRTC] Initializing microphone...`

**문제시**: 브라우저 주소창의 마이크 아이콘을 클릭해서 권한을 허용하세요.

## 2. 로컬 스트림 생성 확인
콘솔에서 다음을 확인:
- `streamId: ...` 
- `audioTracks: 1` (0이 아니어야 함)

## 3. WebRTC 연결 확인  
콘솔에서 다음 로그 찾기:
- `🎵 [WebRTC] Remote stream received`
- `✅ [WebRTC] LOCAL TRACK ADDED`
- `ICE candidate sent/received`

## 4. 오디오 재생 확인
PlayerCard에서 다음 로그:
- `🔊 [PlayerCard] Setting up audio for [nickname]`  
- `✅ [PlayerCard] Audio playing for [nickname]`

**문제시**: 페이지 아무곳이나 클릭해보세요 (브라우저 auto-play 정책)

## 5. 일반적인 해결방법

### 방법 1: 브라우저 새로고침
- 두 브라우저 모두 새로고침 후 다시 방 참여

### 방법 2: 다른 브라우저 사용  
- Chrome + Edge 또는 Chrome + Firefox 조합으로 테스트

### 방법 3: 마이크 권한 재설정
1. 브라우저 주소창 왼쪽 자물쇠/마이크 아이콘 클릭
2. 마이크 권한을 "허용"으로 설정
3. 페이지 새로고침

### 방법 4: 시크릿 모드 테스트
- 한쪽은 일반 모드, 다른 쪽은 시크릿 모드로 테스트

## 6. 콘솔 명령어로 직접 확인

브라우저 개발자도구 콘솔에서 실행:

```javascript
// WebRTC Manager 상태 확인
console.log('WebRTC Manager:', globalThis.__webRTCManager__);
console.log('Local Stream:', globalThis.__webRTCManager__?.localStream);
console.log('Audio Tracks:', globalThis.__webRTCManager__?.localStream?.getAudioTracks());

// 마이크 직접 테스트
navigator.mediaDevices.getUserMedia({audio: true})
  .then(stream => console.log('Mic OK:', stream))
  .catch(err => console.error('Mic Error:', err));
```