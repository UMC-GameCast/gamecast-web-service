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

# Run main video processing script (highlight generation)
python main.py

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
- Main branch: `main` (production/stable)
- Development branch: `develop` (integration branch)
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
2. Start frontend dev server: `cd client && npm run dev` (runs on port 3000)
3. ~~For audio processing~~ (별도 환경에서 실행 중)

**Note**: Frontend dev server supports ngrok tunneling with allowed hosts configured in vite.config.ts

The application focuses on real-time voice communication for gaming sessions with automatic highlight generation through audio analysis.

## Critical Rules for Code Modifications

### FRONTEND-ONLY DEVELOPMENT
- **백엔드 서버**: 별도 환경에서 실행 중이며 수정하지 않음
- **프론트엔드만 개발**: `client/` 폴더 내의 React/TypeScript 코드만 수정
- **서버 에러**: 백엔드에서 발생하는 에러(인원 초과 등)는 프론트엔드에서 적절히 처리
- **API 통신**: Socket.IO 및 REST API는 기존 인터페이스 유지

### Video Processing (Python Scripts)
- **main.py**: Automated video highlight generation from MP4 files
- **Input/Output**: Uses `input/` and `output/` directories for video processing
- **Processing Flow**: Audio extraction → Loudest point detection → Video cutting → Subtitle generation
- **Dependencies**: Requires ffmpeg, whisper, moviepy, pydub (see requirements.txt)

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

## Character System Architecture

### Simple Server-based Character Data Flow
- **Single Source of Truth**: Server API responses (`participants.characterInfo.isCustomized`)
- **Data Flow**: Server API → useRoom hook → React components → UI rendering
- **No Real-time Sync**: Character updates require page refresh to see changes

### Character Data Structure
```typescript
interface CharacterData {
  selectedOptions: Record<string, string>; // 캐릭터 외형 선택사항
  selectedColors: Record<string, string>;  // 색상 선택사항
  nickname: string;                        // 플레이어 닉네임
}
```

### Character Setup Flow
1. **CharacterSetupPage**: User customizes character → Sends to server API
2. **Server Storage**: Character data saved in server database
3. **Room Refresh**: Other users see changes only after page refresh or room state refresh
4. **UI Components**: PlayerCard animations + MyCharacterContainer based on `isCustomized` flag

### Rendering System
- **Unified Rendering**: All components use `renderCharacterLayers()` from `characterRenderer.tsx`
- **Consistent Data**: Same CharacterData interface across PlayerCard, MyCharacterContainer
- **Simple Logic**: Components check `player.characterInfo?.isCustomized` to show/hide character

### Character Data Sources
- **Server characterInfo**: Only source from REST API responses
- **Local State**: Managed by `useRoom` hook, no Socket.IO events

## Server Connection Configuration

### Environment Variables
- **VITE_API_BASE_URL**: Backend API base URL (default: http://3.37.34.211:8889)
- **VITE_SOCKET_URL**: Socket.IO server URL (default: http://3.37.34.211:8889)
- **VITE_MODE**: Environment mode (development/staging/production)

### API URL Construction
- `API_BASE_URL` contains base server URL without `/api` path
- API requests append `/api` + endpoint (e.g., `/api/rooms`)
- Health check endpoint: `${API_BASE_URL}/health`

### Real-time Communication
- Socket.IO events: `join-room`, `offer`, `answer`, `ice-candidate`
- WebRTC signaling through dedicated Socket.IO connection
- Separate paths for different services (main: `/`, voice: `/webrtc-voice`)

## Type System Structure

### Type Organization
- **types/room.ts**: Legacy types for backward compatibility
- **types/api.ts**: API request/response interfaces
- **types/webrtc.ts**: WebRTC and real-time communication types
- **types/game.ts**: Game-specific types (Room, Player, CharacterData)

### WebRTC Manager
- Handles P2P audio connections between users
- Socket ID to guestUserId mapping for participant tracking
- Connection quality monitoring and error handling
- Automatic reconnection and cleanup on page unload