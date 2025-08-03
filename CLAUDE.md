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
```bash
cd backend-realtime
npm start            # Start with nodemon (auto-restart)
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
- **Hooks**: Custom hooks for WebRTC (`useVoiceChat`), recording (`useRecording`), and room management (`useRoom`)
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
1. Start backend realtime server: `cd backend-realtime && npm start`
2. Start frontend dev server: `cd client && npm run dev`
3. For audio processing: Install Python requirements and run relevant scripts

The application focuses on real-time voice communication for gaming sessions with automatic highlight generation through audio analysis.

## Critical Rules for Code Modifications

### NEVER REMOVE: Real-time Participant Update System
- **File**: `client/src/hooks/useRealTimeRoom.ts` - Socket.IO based real-time participant tracking
- **File**: `client/src/pages/gamecast/room/RoomPage.tsx` - Real-time participant UI updates
- **Features**: 
  - Socket.IO events: `participant-update`, `user-joined`, `user-left`
  - Live participant list synchronization
  - Automatic UI refresh when users join/leave rooms
- **Rule**: This functionality is ESSENTIAL and must NEVER be disabled or removed during debugging
- **Debugging**: If errors occur, fix the errors while preserving real-time functionality
- **Import Requirements**: Always ensure `useEffect` is imported in RoomPage.tsx