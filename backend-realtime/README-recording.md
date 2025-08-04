# 🎬 녹화 관리 WebSocket 서버

WebSocket을 사용한 실시간 녹화 상태 관리 서버입니다.

## 🚀 서버 실행

```bash
cd backend-realtime
node recording-server.js
```

서버가 `ws://localhost:3001/recording/{roomId}` 에서 실행됩니다.

## 📡 WebSocket 메시지 프로토콜

### 클라이언트 → 서버

#### 1. 플레이어 입장
```json
{
  "type": "player_join",
  "playerId": "player123",
  "playerName": "플레이어이름",
  "roomId": "room456"
}
```

#### 2. 준비 상태 설정
```json
{
  "type": "set_ready",
  "playerId": "player123",
  "playerName": "플레이어이름",
  "isReady": true
}
```

#### 3. 녹화 시작 (호스트만)
```json
{
  "type": "start_recording"
}
```

#### 4. 녹화 종료 (호스트만)
```json
{
  "type": "stop_recording"
}
```

### 서버 → 클라이언트

#### 1. 준비 상태 업데이트
```json
{
  "type": "ready_status_update",
  "playersReady": [
    {
      "playerId": "player123",
      "playerName": "플레이어이름",
      "isReady": true
    }
  ]
}
```

#### 2. 모든 플레이어 준비 완료
```json
{
  "type": "all_players_ready"
}
```

#### 3. 녹화 시작
```json
{
  "type": "recording_start"
}
```

#### 4. 녹화 종료
```json
{
  "type": "recording_stop"
}
```

## 🎮 버튼 상태별 동작

| 상태 | 버튼 텍스트 | 클릭 가능 | 동작 |
|------|-------------|-----------|------|
| `idle` | "준비하기" | ✅ (설정 완료 시) | 준비 상태 전송 |
| `preparing` | "녹화를 시작중입니다" | ✅ (호스트만) | 녹화 시작 요청 |
| `starting` | "녹화를 시작중입니다" | ❌ | - |
| `recording` | "녹화중 00:30" / "녹화 완료하기 00:30" | ✅ (호스트만) | 녹화 종료 요청 |
| `stopping` | "녹화를 종료중입니다" | ❌ | - |
| `completed` | "녹화 완료" | ❌ | - |

## 🛠️ 녹화 트리거 수정

`useRecording.ts`의 `onRecordingStart`와 `onRecordingEnd` 함수를 수정하여 실제 녹화 로직을 구현할 수 있습니다:

```typescript
const onRecordingStart = useCallback(() => {
  console.log('🎬 녹화 시작 트리거!');
  // TODO: 여기에 실제 녹화 시작 로직 구현
  // 예: navigator.mediaDevices.getDisplayMedia() 등
}, []);

const onRecordingEnd = useCallback(() => {
  console.log('🛑 녹화 종료 트리거!');
  // TODO: 여기에 실제 녹화 종료 로직 구현
  // 예: 녹화 파일 저장, 업로드 등
}, []);
```

## 🔧 테스트 방법

1. WebSocket 서버 실행
2. 여러 브라우저 탭에서 같은 방에 입장
3. 각 플레이어가 캐릭터 설정 + 녹화화면 설정 완료
4. "준비하기" 버튼 클릭
5. 모든 플레이어가 준비되면 호스트가 녹화 시작 가능
6. 녹화 중 호스트가 녹화 종료 가능 