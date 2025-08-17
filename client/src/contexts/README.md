# React Context 기반 상태 관리 시스템

## 개요

GameCast 프로젝트의 복잡한 상태 관리를 React Context 기반으로 통합 정리했습니다. 기존에 여러 개의 독립적인 Hook들이 각각 관리하던 상태들을 하나의 중앙집중식 Context로 통합하여 다음과 같은 이점을 제공합니다:

- **단일 진실의 원천**: 모든 상태가 하나의 Context에서 관리됨
- **일관된 상태 동기화**: 컴포넌트 간 상태 불일치 문제 해결
- **간소화된 prop drilling**: 깊은 컴포넌트 구조에서도 쉬운 상태 접근
- **향상된 개발자 경험**: 통합된 디버깅 및 상태 추적

## 주요 구성 요소

### 1. UnifiedGamecastContext.tsx
메인 Context 파일로 다음 기능들을 제공합니다:

#### 상태 관리 영역
- **방 관련**: `currentRoom`, `currentPlayer`, `participants`
- **WebRTC/음성**: `voiceChatState`, `localStream`, `remoteStreams`, `isLocalMuted`
- **에러/로딩**: `loading`, `error`, `microphoneError`, `joinError`
- **캐릭터**: `characterData`, `showCharacterSetup`, `characterSetupComplete`
- **UI 상태**: `showMicGuide`, `screenSetupComplete`

#### Provider 컴포넌트
- `UnifiedGamecastProvider`: 애플리케이션 최상위에서 Context 제공
- 자동 초기화 및 정리 로직 포함
- WebRTC 매니저 싱글톤 관리

#### 특화된 Hook들
- `useUnifiedRoom()`: 방 관련 상태 및 액션 통합 관리
- `useUnifiedVoiceChat()`: 음성 채팅 관련 상태 및 액션  
- `useUnifiedCharacter()`: 캐릭터 관련 상태 및 액션
- `useUnifiedGameRecording()`: 게임 녹화 관련 기능

## 사용 방법

### 1. App.tsx에서 Provider 설정

```tsx
import { UnifiedGamecastProvider } from './contexts/UnifiedGamecastContext';

function App() {
  return (
    <UnifiedGamecastProvider>
      {/* 애플리케이션 라우트들 */}
    </UnifiedGamecastProvider>
  );
}
```

### 2. 컴포넌트에서 Context 사용

#### 통합된 Hook 사용 (현재 방식)
```tsx
import { 
  useUnifiedRoom, 
  useUnifiedVoiceChat, 
  useUnifiedCharacter 
} from '../contexts/UnifiedGamecastContext';

const MyComponent = () => {
  const { currentRoom, currentPlayer, loading } = useUnifiedRoom();
  const { localStream, toggleLocalAudio } = useUnifiedVoiceChat();
  const { characterData, setShowCharacterSetup } = useUnifiedCharacter();
  
  // 컴포넌트 로직...
};
```

## 통합 컨텍스트 아키텍처

### 현재 구조 (UnifiedGamecastContext)

#### 통합된 상태 관리
```tsx
const { currentRoom, currentPlayer } = useUnifiedRoom();
const { localStream, remoteStreams } = useUnifiedVoiceChat();
const { characterData } = useUnifiedCharacter();
const { startRecording, stopRecording } = useUnifiedGameRecording();
```

### 주요 변경사항

1. **자동 초기화**: WebRTC는 방 정보가 있으면 자동으로 초기화됨
2. **통합 상태**: 모든 상태가 Context에서 중앙 관리됨
3. **에러 처리**: 마이크 에러와 방 입장 에러가 분리되어 관리됨
4. **실시간 업데이트**: 참여자 상태 변경이 자동으로 모든 컴포넌트에 반영됨

## 디버깅 기능

개발 환경에서는 다음과 같은 디버깅 패널들이 제공됩니다:

- **WebRTC 상태 패널**: 연결 상태, 스트림 정보, 참여자 목록
- **캐릭터 상태 패널**: 캐릭터 설정 상태, 준비 상태
- **Context 상태 패널**: 전체 Context 상태 요약

## 성능 최적화

1. **메모이제이션**: Context 값들이 적절히 메모이제이션됨
2. **선택적 렌더링**: 필요한 상태만 구독하는 특화된 Hook들
3. **자동 정리**: 컴포넌트 언마운트 시 리소스 자동 정리
4. **싱글톤 매니저**: WebRTC 매니저의 중복 생성 방지

## 장점

### 기존 방식의 문제점
- 여러 Hook이 독립적으로 상태 관리 → 동기화 문제
- 중복된 WebRTC 연결 시도 → 리소스 낭비
- 복잡한 prop drilling → 유지보수 어려움
- 분산된 에러 처리 → 일관성 없는 UX

### Context 기반 해결책
- ✅ 단일 상태 저장소 → 일관된 상태
- ✅ 중앙집중식 WebRTC 관리 → 안정적인 연결
- ✅ Context 기반 접근 → 간단한 상태 전달
- ✅ 통합 에러 처리 → 일관된 사용자 경험

## 주의사항

1. **점진적 마이그레이션**: 기존 Hook들과 호환성 유지하며 단계별 전환
2. **WebRTC 정리**: 페이지 새로고침/언마운트 시 반드시 정리됨
3. **개발 전용 디버깅**: 프로덕션에서는 디버깅 패널 자동 제거
4. **에러 경계**: Context Provider는 에러 경계 내부에서 사용 권장