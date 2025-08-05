# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Architecture

GameCast is a real-time web-based game streaming service with multiple components:

### Main Components
- **client/**: React + TypeScript frontend using Vite, TailwindCSS
- **backend-realtime/**: Node.js/Express WebRTC signaling server with Socket.IO
- **backend-processing/**: Python FastAPI for audio processing and analysis
- **audio_highlight/**: Python scripts for audio analysis, diarization, and subtitle generation

### Key Technologies
- **Frontend**: React 19, TypeScript, TailwindCSS, Socket.IO client, WebRTC
- **Real-time Backend**: Node.js, Express, Socket.IO, WebSocket
- **Processing Backend**: Python, FastAPI
- **Audio Processing**: Whisper, PyDub for audio analysis and subtitles

## Development Commands

### Client (React Frontend)
```bash
cd client
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues automatically  
npm run type-check   # TypeScript type checking without emit
npm run preview      # Preview production build
```

### Backend Realtime Server
**NOTE: 백엔드 서버는 별도로 실행 중이며, 프론트엔드만 개발/수정합니다.**
```bash
# 백엔드 서버는 별도 환경에서 실행 중
# 프론트엔드만 개발하므로 백엔드 서버 실행 불필요
```

### Audio Processing
```bash
# Install Python dependencies
pip install -r requirements.txt
pip install -r audio_highlight/requirements.txt

# Run main processing API
python backend-processing/main_api.py

# Run individual audio processing scripts
python audio_highlight/analyze_audio.py
python audio_highlight/diarize_with_whisper.py
python audio_highlight/generate_subtitle.py
```

## Architecture Overview

### WebRTC + Socket.IO Real-time System
- **WebRTC**: Handles peer-to-peer audio/video communication between users
- **Socket.IO**: Manages signaling for WebRTC connections and room management
- **Room System**: Users join rooms via 6-digit entry codes, with host/guest roles

### Key WebRTC Flow
1. Users join rooms via Socket.IO (`join_room` event)
2. WebRTC peer connections established through signaling server
3. Direct P2P audio streams between participants
4. Room state managed on backend with player roles and recording status

### Frontend Structure
- **Pages**: Main navigation between different app states (create, join, room, etc.)
- **Components**: Reusable UI components organized by feature (gamecast/common, gamecast/room)
- **Hooks**: Custom hooks for WebRTC (`useVoiceChat`), recording (`useGameRecording`), room management (`useRoom`), character system (`useCharacter`), and animations (`useCharacterAnimation`)
- **Utils**: Core managers for WebRTC connections, room state, and subtitle generation

### Data Flow
- Room creation/joining through REST-like Socket.IO events
- Real-time voice communication via WebRTC
- Audio recording and processing for highlight generation
- Character selection and player state synchronization

## Development Notes

### Git Workflow
- Main development branch: `develop` (not `dev`)
- Feature branches: `feature/(기능명)`
- Commit convention: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `add:`

### WebRTC Configuration
- Uses Google STUN servers for NAT traversal
- Audio-only streams (video: false in getUserMedia)
- P2P connections managed through centralized signaling server

### Important File Locations
- Room types: `client/src/types/room.ts`
- WebRTC manager: `client/src/utils/webRTCManager.ts`
- Socket server: `backend-realtime/server.js`
- Audio processing: `audio_highlight/` directory

### Development Setup
**프론트엔드 개발 환경만 설정:**
1. ~~Start backend realtime server~~ (별도 환경에서 실행 중)
2. Start frontend dev server: `cd client && npm run dev`
3. ~~For audio processing~~ (별도 환경에서 실행 중)

The application focuses on real-time voice communication for gaming sessions with automatic highlight generation through audio analysis.

## Critical Rules for Code Modifications

### FRONTEND-ONLY DEVELOPMENT
- **백엔드 서버**: 별도 환경에서 실행 중이며 수정하지 않음
- **프론트엔드만 개발**: `client/` 폴더 내의 React/TypeScript 코드만 수정
- **서버 에러**: 백엔드에서 발생하는 에러(인원 초과 등)는 프론트엔드에서 적절히 처리
- **API 통신**: Socket.IO 및 REST API는 기존 인터페이스 유지

### NEVER REMOVE: Real-time Participant Update System
- **File**: `client/src/pages/gamecast/room/RoomPage.tsx` - Real-time participant UI updates
- **File**: `client/src/utils/webRTCManager.ts` - WebRTC 연결과 실시간 업데이트 통합
- **Features**: 
  - Socket.IO events: `participant-update`, `user-joined`, `user-left`
  - Live participant list synchronization
  - Automatic UI refresh when users join/leave rooms
- **Rule**: This functionality is ESSENTIAL and must NEVER be disabled or removed during debugging
- **Debugging**: If errors occur, fix the errors while preserving real-time functionality
- **Import Requirements**: Always ensure `useEffect` is imported in RoomPage.tsx

### Backend Error Handling
- **인원 초과 에러**: 서버에서 방 참여 제한 시 적절한 사용자 안내 메시지 표시
- **연결 실패**: WebRTC/Socket.IO 연결 실패 시 재시도 로직 및 사용자 피드백
- **권한 에러**: 마이크 권한 거부 등의 경우 명확한 해결 방법 안내

### Performance Optimization Rules
- **Logging**: Use probabilistic logging (`Math.random() < 0.01`) to prevent console spam
- **Component Optimization**: Avoid infinite re-renders with proper `useMemo` and `useCallback` dependencies
- **Event Filtering**: Always filter WebRTC Manager events to prevent unnecessary processing

## CRITICAL: Socket.IO Connection Management

### 단일 연결 원칙 (NEVER VIOLATE)
- **한 방당 하나의 Socket.IO 연결만 유지**: 중복 연결은 인원 초과 문제 발생
- **WebRTC 매니저 중심**: 모든 Socket.IO 통신은 `webRTCManager.ts`를 통해 처리
- **중복 연결 절대 금지**: `useGameRecording`, `useRoom` 등에서 별도 Socket.IO 연결 생성 금지
- **글로벌 매니저 접근**: `globalThis.__webRTCManager__`를 통해 WebRTC 매니저 재사용

### Socket.IO 연결 생성 규칙
```typescript
// ❌ 잘못된 방법 - 별도 Socket.IO 연결 생성
const socket = io(SOCKET_SERVER_URL);
socket.emit('join-room', { roomCode, guestUserId });

// ✅ 올바른 방법 - WebRTC 매니저 재사용
const manager = getWebRTCManager();
if (manager) {
  manager.emitUpdatePreparationStatus(data);
}
```

### 이벤트 콜백 시스템
- **WebRTC 매니저에서 이벤트 수신**: Socket.IO 이벤트를 매니저에서 처리
- **React 컴포넌트로 콜백 전달**: 매니저 → 콜백 → React 상태 → UI 업데이트
- **콜백 정리**: 컴포넌트 언마운트 시 콜백 함수 초기화

### Auto-Recording System Architecture
- **Core Manager**: `webRTCManager.ts`가 모든 Socket.IO 이벤트 처리
- **React Integration**: `useGameRecording.ts`는 WebRTC 매니저의 래퍼 역할
- **State Flow**: WebRTC Manager → Callbacks → React State → UI Update  
- **Event Types**: `preparation-status-updated`, `recording-started`, `recording-stopped`
- **WebRTC 필터링**: `WEBRTC_` 접두사 연결은 실제 참가자 수에서 제외

### 문제 발생 시 점검사항
1. **인원 초과 문제**: Socket.IO 연결이 중복되었는지 확인
2. **이벤트 미수신**: WebRTC 매니저 콜백이 올바르게 설정되었는지 확인  
3. **상태 동기화 문제**: `globalThis.__webRTCManager__`에 접근 가능한지 확인
4. **퇴행 방지**: 기존 WebRTC 음성 통신 기능이 정상 작동하는지 확인

## Character System Architecture

### Real-time Character Data Flow
- **Single Source of Truth**: Only `RoomPage.tsx` uses `useCharacter` hook to prevent callback conflicts
- **Data Priority**: Socket.IO real-time data > Server characterInfo > Legacy character data
- **Props-based Distribution**: Character data flows from RoomPage → PlayerGrid → PlayerCard and MyCharacterContainer

### Character Data Structure
```typescript
interface CharacterData {
  selectedOptions: Record<string, string>; // 캐릭터 외형 선택사항
  selectedColors: Record<string, string>;  // 색상 선택사항
  nickname: string;                        // 플레이어 닉네임
}
```

### Character Setup Flow
1. **CharacterSetupPage**: User customizes character → Sends complete data via Socket.IO
2. **Socket.IO Events**: `update-character-status` + `update-preparation-status` transmitted
3. **RoomPage useCharacter**: Receives events, updates local state
4. **UI Components**: PlayerCard animations + MyCharacterContainer preview updated

### CRITICAL: WebRTC Manager Event Filtering
- **Problem**: WebRTC Manager connections use `WEBRTC_` prefix but share same `guestUserId`
- **Solution**: Filter out events where `playerName.startsWith('WEBRTC_')` to prevent duplicate processing
- **Rule**: WebRTC Manager events must NEVER be processed as real player events

### Hook Usage Restrictions
- **useCharacter**: ONLY use in `RoomPage.tsx` to prevent callback overwrites
- **useGameRecording**: ONLY use in `RoomPage.tsx` and `ButtonContainer.tsx`
- **Other Components**: Receive character data via props, never direct hook usage

### Rendering System
- **Unified Rendering**: All components use `renderCharacterLayers()` from `characterRenderer.tsx`
- **Consistent Data**: Same CharacterData interface across PlayerCard, MyCharacterContainer
- **Animation Integration**: `useCharacterAnimation` hook handles card opening animations based on `preparationStatus.characterSetup`

### Character Data Sources (Priority Order)
1. **Real-time Socket.IO**: `useCharacter` hook managed data
2. **Server characterInfo**: From REST API responses
3. **Legacy character**: Fallback compatibility data