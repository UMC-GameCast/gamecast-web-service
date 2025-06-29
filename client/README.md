# 🎮 GameCast Web Service

**GameCast**는 멀티플레이어 게임을 위한 실시간 방 생성 및 참여 시스템입니다. 방장이 방을 생성하고 다른 플레이어들이 입장코드로 참여할 수 있는 웹 애플리케이션입니다.

## 📖 프로젝트 개요

현재는 **백엔드 없이 프론트엔드만으로 구현**된 상태입니다. `localStorage`를 활용하여 임시 방 시스템을 구현했으며, 실제 서비스에서는 백엔드 API로 대체될 예정입니다.

### ✨ 주요 기능

- 🏠 **방 생성**: 방 이름과 최대 인원수를 설정하여 방 생성
- 🔑 **방 참여**: 6자리 입장코드로 방 참여
- 👥 **자동 닉네임**: 참여 순서에 따른 자동 닉네임 생성 (Nickname1, Nickname2...)
- ⚠️ **에러 처리**: 입력 유효성 검사 및 진동 피드백
- 📱 **반응형 UI**: 게임 테마의 현대적인 디자인

## 🛠 기술 스택

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: React Hooks (useState)
- **Data Storage**: localStorage (임시)
- **Package Manager**: pnpm

## 📁 프로젝트 구조

```
client/
├── public/
│   └── assets/gamecast/          # 게임 관련 이미지 에셋
│       ├── common/               # 공통 컴포넌트 이미지
│       └── participate/          # 참여 페이지 이미지
├── src/
│   ├── components/gamecast/      # 게임 관련 컴포넌트
│   │   ├── common/              # 공통 컴포넌트
│   │   │   ├── Button1.tsx      # 메인 버튼 (진동 효과 포함)
│   │   │   ├── ErrorMessage.tsx # 에러 메시지 컴포넌트
│   │   │   ├── Navigation.tsx   # 상단 네비게이션
│   │   │   ├── Footer.tsx       # 하단 푸터
│   │   │   └── BackButton1.tsx  # 뒤로가기 버튼
│   │   ├── create/              # 방 생성 관련
│   │   │   └── CreateRoomCard.tsx
│   │   ├── main/                # 메인 페이지
│   │   │   └── NavigationCard.tsx
│   │   └── participate/         # 방 참여 관련
│   │       └── ParticipationCodeCard.tsx
│   ├── pages/gamecast/           # 페이지 컴포넌트
│   │   ├── main/MainPage.tsx    # 메인 페이지
│   │   ├── create/CreatePage.tsx # 방 생성 페이지
│   │   ├── participate/ParticipatePage.tsx # 방 참여 페이지
│   │   └── room/RoomPage.tsx    # 방 정보 페이지
│   ├── types/room.ts            # TypeScript 타입 정의
│   ├── utils/roomManager.ts     # 방 관리 로직 (핵심!)
│   └── App.tsx                  # 라우팅 설정
```

## 🚀 설치 및 실행

### 1. 의존성 설치
```bash
cd client
pnpm install
```

### 2. 개발 서버 실행
```bash
pnpm run dev
```

### 3. 빌드
```bash
pnpm run build
```

개발 서버는 `http://localhost:5176`에서 실행됩니다.

## 🧩 핵심 컴포넌트 설명

### 1. **Button1 컴포넌트** (`common/Button1.tsx`)
- 유효성 검사 및 에러 처리가 내장된 메인 버튼
- 에러 발생 시 0.6초간 좌우 진동 효과
- 세 가지 상태: 기본, 클릭, 에러

**주요 Props:**
```typescript
interface Button1Props {
  onValidate?: () => string | null;    // 유효성 검사 함수
  onError?: (message: string) => void; // 에러 콜백
  externalError?: boolean;             // 외부 에러 트리거
  loading?: boolean;                   // 로딩 상태
}
```

### 2. **ErrorMessage 컴포넌트** (`common/ErrorMessage.tsx`)
- 에러 아이콘과 메시지를 표시
- 11px 크기, #FF5214 색상
- 에러 상태에 따른 자동 show/hide

### 3. **roomManager 유틸리티** (`utils/roomManager.ts`)
방 관리의 핵심 로직이 담긴 파일입니다.

**주요 함수들:**
```typescript
// 방 생성
createRoom(request: CreateRoomRequest) 
// 방 참여  
joinRoom(request: JoinRoomRequest)
// 현재 방 정보 조회
getCurrentRoom(): RecodeRoom | null
// 현재 플레이어 정보 조회  
getCurrentPlayer(): Player | null
// 방 나가기
leaveRoom(): boolean
// 6자리 입장코드 생성
generateEntryCode(): string
```

### 4. **페이지 라우팅** (`App.tsx`)
```typescript
const [currentPage, setCurrentPage] = useState<'main' | 'participate' | 'create' | 'room'>('main');
```

## ⚠️ 유효성 검사 규칙

### 방 생성
- ✅ 빈 문자열 및 공백 체크
- ✅ 최소 2글자, 최대 15글자
- ✅ 인원수: 2-8명

### 방 참여
- ✅ 빈 문자열 및 공백 체크  
- ✅ 정확히 6자리
- ✅ 영문 대문자 + 숫자만 허용
- ✅ 존재하는 방 코드 확인

## 🔄 백엔드 연동 가이드

> **중요**: 백엔드 개발자는 `src/utils/roomManager.ts` 파일을 우선적으로 수정해야 합니다.

### 1. 수정해야 할 핵심 함수들

| 함수명 | 현재 (localStorage) | 변경 후 (API) |
|--------|-------------------|--------------|
| `createRoom()` | 로컬 저장 | `POST /api/rooms` |
| `joinRoom()` | 로컬 검색 | `POST /api/rooms/{code}/join` |
| `getCurrentRoom()` | 로컬 조회 | `GET /api/rooms/{roomId}` |
| `leaveRoom()` | 로컬 삭제 | `DELETE /api/rooms/{roomId}/leave` |

### 2. 예상 API 명세

#### 방 생성
```http
POST /api/rooms
Content-Type: application/json

{
  "roomName": "방 이름",
  "maxPlayers": 4
}

Response:
{
  "success": true,
  "data": {
    "roomId": "room_123",
    "entryCode": "ABC123",
    "roomName": "방 이름", 
    "maxPlayers": 4,
    "hostId": "player_456",
    "players": [
      {
        "id": "player_456",
        "name": "Nickname1",
        "isHost": true
      }
    ]
  }
}
```

#### 방 참여
```http
POST /api/rooms/join
Content-Type: application/json

{
  "entryCode": "ABC123"
}

Response:
{
  "success": true,
  "data": {
    "roomId": "room_123",
    "playerId": "player_789", 
    "playerName": "Nickname2",
    "room": { /* 방 전체 정보 */ }
  }
}
```

### 3. 실시간 업데이트 구현

**WebSocket 연결 예시:**
```typescript
// utils/websocket.ts (새로 생성 필요)
const ws = new WebSocket('ws://localhost:8080/rooms/{roomId}');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'PLAYER_JOINED') {
    // 방 정보 업데이트
    updateRoomState(data.room);
  }
};
```

### 4. 마이그레이션 체크리스트

- [ ] `roomManager.ts`의 모든 함수를 async/await로 변경
- [ ] localStorage 로직을 API 호출로 교체
- [ ] 에러 처리 로직 유지 (기존 에러 메시지 시스템 활용)
- [ ] WebSocket으로 실시간 업데이트 구현
- [ ] 인증/세션 관리 추가
- [ ] API 에러 상태 코드별 처리

## 🎯 개발 정보

### 자동 닉네임 시스템
- **방장**: "Nickname1" 고정
- **게스트**: 참여 순서대로 "Nickname2", "Nickname3"... 자동 생성
- **나가기 시**: 남은 플레이어들의 닉네임 자동 재정렬

### 진동 애니메이션
```css
@keyframes errorShake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
  20%, 40%, 60%, 80% { transform: translateX(4px); }
}
```

### 입장코드 생성 로직
```typescript
const generateEntryCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};
```
- 36진법 사용 (영문 + 숫자)
- 대문자로 변환
- 6자리 고정

## 🐛 알려진 이슈

1. **새로고침 시 데이터 손실**: localStorage 사용으로 인한 제한사항
2. **실시간 업데이트 없음**: 백엔드 WebSocket 구현 필요
3. **브라우저간 데이터 공유 불가**: 동일 브라우저 내에서만 동작

## 📞 문의사항

프로젝트 관련 문의사항이나 백엔드 연동 시 도움이 필요하면 개발팀에 연락해주세요.

---

**⚡ Quick Start**: `cd client && pnpm install && pnpm run dev`
