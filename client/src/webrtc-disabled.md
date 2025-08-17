# WebRTC 기능 분리 및 비활성화 문서

## 개요

WebRTC 관련 기능들을 나중에 구현하기 위해 주석 처리하고 비활성화했습니다.
모든 인터페이스는 유지되며, 기본값이나 빈 구현을 반환합니다.

## 비활성화된 파일들

### 1. 훅 (Hooks)

#### `src/hooks/useVoiceChat.ts`
- **변경사항**: WebRTC 매니저 초기화 및 모든 WebRTC 로직 비활성화
- **반환값**: 모든 상태는 기본값 (null, 빈 Map, false 등)
- **함수들**: 모든 함수는 로그만 출력하고 기본값 반환

```typescript
// 비활성화된 함수들
- sendChatMessage() → 로그만 출력
- startRecording() → 로그만 출력
- muteLocalAudio() → false 반환
- toggleLocalAudio() → false 반환
- getConnectedPeersCount() → 0 반환
```

#### `src/hooks/usePlayerCardStream.ts`
- **변경사항**: 스트림 검색 로직 비활성화
- **반환값**: effectiveStream = null, streamFound = false
- **기능**: WebRTC 매니저 및 VoiceChat 스트림 검색 비활성화

### 2. 유틸리티 (Utils)

#### `src/utils/webRTCManager.ts`
- **백업파일**: `webRTCManager.ts.backup`에 원본 보관
- **변경사항**: 전체 클래스를 스텁으로 교체
- **상태**: 모든 메서드가 로그만 출력하고 기본값 반환

```typescript
// 비활성화된 주요 메서드들
- start() → null 반환
- close() → 빈 구현
- muteLocalAudio() → false 반환
- getSocket() → null 반환
- getConnectedPeersCount() → 0 반환
```

### 3. UI 컴포넌트

#### `src/components/gamecast/common/VoiceIndicator.tsx`
- **오디오 분석**: `useIsSpeaking` 훅 비활성화
- **표시 상태**: 항상 "비활성화" 상태 (회색, 🚫 아이콘)
- **기능**: AudioContext 기반 실시간 분석 비활성화

#### `src/components/gamecast/room/PlayerCard.tsx`
- **오디오 스트림**: 오디오 엘리먼트 렌더링 비활성화
- **스트림 처리**: useEffect로 스트림 연결 로직 주석 처리
- **디버깅 표시**: "🚫 WebRTC: DISABLED" 표시

#### `src/components/gamecast/room/VoiceStatusOverlay.tsx`
- **현재 상태**: 별도 수정 없음 (stream이 null이므로 자동으로 비활성화)

## 나중에 구현할 때 복원해야 할 기능들

### 1. WebRTC 핵심 기능
```typescript
// 시그널링 서버 (Socket.IO)
- 방 참여/퇴장 관리
- WebRTC Offer/Answer 교환  
- ICE Candidate 교환
- 참여자 상태 동기화

// 피어 투 피어 연결 (RTCPeerConnection)
- 오디오 스트림 교환
- 연결 상태 모니터링
- 품질 최적화
```

### 2. 미디어 처리
```typescript
- 마이크 권한 요청
- 오디오 트랙 관리
- Mute/Unmute 기능
- 볼륨 조절
- 실시간 오디오 분석 (VoiceIndicator)
```

### 3. 상태 관리
```typescript
- 로컬/원격 스트림 추적
- 참여자 목록 동기화
- 연결 품질 표시
- 에러 처리
```

### 4. UI 통합
```typescript
- VoiceIndicator 실시간 상태
- PlayerCard 스트림 표시
- 오디오 활성화 알림
- 연결 품질 표시
```

## 복원 방법

### 1. 백업 파일에서 복원
```bash
# WebRTC Manager 복원
cp src/utils/webRTCManager.ts.backup src/utils/webRTCManager.ts
```

### 2. 주석 제거
각 파일에서 `TODO: WebRTC` 주석을 찾아서 주석 처리된 코드를 복원

### 3. import 문 복원
```typescript
// useVoiceChat.ts에서
import { WebRTCManager } from "../utils/webRTCManager";
```

### 4. 로직 복원
- useEffect 주석 해제
- 실제 WebRTC 로직 구현
- 오디오 분석 로직 복원

## 현재 동작

### 사용자에게 보이는 동작
1. **음성 표시기**: 모든 VoiceIndicator가 비활성화 상태 (🚫)
2. **PlayerCard**: WebRTC 디버깅 정보에 "DISABLED" 표시
3. **오디오**: 실제 음성 채팅 기능 없음
4. **로그**: 개발자 콘솔에 비활성화 메시지 표시

### 백엔드 연동
- Socket.IO 기반 방 관리는 정상 작동
- 실시간 참여자 업데이트는 정상 작동
- WebRTC 시그널링만 비활성화

## 장점

1. **인터페이스 호환성**: 기존 코드 수정 없이 WebRTC만 비활성화
2. **점진적 구현**: 나중에 단계별로 기능 복원 가능
3. **디버깅 용이**: 명확한 비활성화 상태 표시
4. **백업 보장**: 원본 코드 안전하게 보관

## 주의사항

- `webRTCManager.ts.backup` 파일을 삭제하지 마세요
- TODO 주석을 제거하기 전에 실제 구현을 완료하세요
- 복원 시 TypeScript 타입 호환성 확인 필요