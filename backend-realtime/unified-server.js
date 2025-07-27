const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const app = express();
app.use(cors());
app.use(express.json());

// 파일 저장을 위한 디렉토리 생성
const ensureDirectories = async () => {
  const dirs = ['storage/raw-videos', 'storage/processed', 'storage/subtitles'];
  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      console.error(`디렉토리 생성 실패: ${dir}`, error);
    }
  }
};

// 파일 업로드 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'storage/raw-videos/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB 제한
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['video/mp4', 'video/webm', 'video/avi', 'audio/wav', 'audio/mp3'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('지원하지 않는 파일 형식입니다.'));
    }
  }
});

const server = http.createServer(app);

// Socket.IO 설정
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 방별 상태 저장
const roomStates = new Map();

// 방 상태 초기화
function initializeRoom(roomId) {
  if (!roomStates.has(roomId)) {
    roomStates.set(roomId, {
      players: new Map(),
      recordingState: 'idle',
      hostId: null,
      recordings: new Map() // 플레이어별 녹화 파일 정보
    });
  }
  return roomStates.get(roomId);
}

// 모든 플레이어가 준비되었는지 확인
function checkAllPlayersReady(roomState) {
  const players = Array.from(roomState.players.values());
  return players.length > 0 && players.every(player => player.isReady);
}

// 방의 모든 클라이언트에게 메시지 전송
function broadcastToRoom(roomId, message, excludeSocketId = null) {
  const roomState = roomStates.get(roomId);
  if (roomState) {
    roomState.players.forEach(player => {
      if (player.socketId !== excludeSocketId && player.socket.connected) {
        player.socket.emit(message.type, message.data);
      }
    });
  }
}

// ==================== Socket.IO 이벤트 처리 ====================
io.on('connection', (socket) => {
  console.log('클라이언트 연결됨:', socket.id);
  
  let currentRoomId = null;
  let currentPlayerId = null;

  // ===== WebRTC 시그널링 =====
  socket.on('join_room', (data) => {
    const { room } = data;
    currentRoomId = room;
    socket.join(room);
    console.log(`${socket.id} joined WebRTC room ${room}`);
    socket.to(room).emit('user_joined', { sid: socket.id });
  });

  socket.on('leave_room', (data) => {
    const { room } = data;
    socket.leave(room);
    console.log(`${socket.id} left WebRTC room ${room}`);
    socket.to(room).emit('user_left', { sid: socket.id });
  });

  socket.on('webrtc_offer', (data) => {
    const { offer, target_sid } = data;
    console.log(`WebRTC Offer: ${socket.id} → ${target_sid}`);
    io.to(target_sid).emit('webrtc_offer', { offer, sid: socket.id });
  });

  socket.on('webrtc_answer', (data) => {
    const { answer, target_sid } = data;
    console.log(`WebRTC Answer: ${socket.id} → ${target_sid}`);
    io.to(target_sid).emit('webrtc_answer', { answer, sid: socket.id });
  });

  socket.on('webrtc_ice_candidate', (data) => {
    const { candidate, target_sid } = data;
    io.to(target_sid).emit('webrtc_ice_candidate', { candidate, sid: socket.id });
  });

  // ===== 녹화 관리 =====
  socket.on('recording_join', (data) => {
    const { roomId, playerId, playerName } = data;
    currentRoomId = roomId;
    currentPlayerId = playerId;
    
    const roomState = initializeRoom(roomId);
    
    // 첫 번째 플레이어를 호스트로 설정
    if (!roomState.hostId) {
      roomState.hostId = playerId;
    }
    
    roomState.players.set(playerId, {
      id: playerId,
      name: playerName,
      isReady: false,
      socket: socket,
      socketId: socket.id
    });
    
    console.log(`📹 플레이어 ${playerName} (${playerId})이 녹화 방 ${roomId}에 입장`);
    
    // 현재 준비 상태를 새 플레이어에게 전송
    const readyStatusList = Array.from(roomState.players.values()).map(p => ({
      playerId: p.id,
      playerName: p.name,
      isReady: p.isReady
    }));
    
    broadcastToRoom(roomId, {
      type: 'ready_status_update',
      data: { playersReady: readyStatusList }
    });
  });

  socket.on('set_ready', (data) => {
    const { playerId, playerName, isReady } = data;
    if (!currentRoomId) return;
    
    const roomState = roomStates.get(currentRoomId);
    if (roomState && roomState.players.has(playerId)) {
      roomState.players.get(playerId).isReady = isReady;
      
      console.log(`📋 플레이어 ${playerName} 준비 상태: ${isReady}`);
      
      // 모든 플레이어에게 준비 상태 업데이트 전송
      const updatedReadyStatusList = Array.from(roomState.players.values()).map(p => ({
        playerId: p.id,
        playerName: p.name,
        isReady: p.isReady
      }));
      
      broadcastToRoom(currentRoomId, {
        type: 'ready_status_update',
        data: { playersReady: updatedReadyStatusList }
      });
      
      // 모든 플레이어가 준비되었는지 확인
      if (checkAllPlayersReady(roomState)) {
        console.log(`🎬 방 ${currentRoomId}의 모든 플레이어가 준비 완료`);
        roomState.recordingState = 'preparing';
        
        // 클라이언트에게 모든 플레이어 준비 완료 알림
        broadcastToRoom(currentRoomId, {
          type: 'all_players_ready',
          data: {}
        });

        // 3초 후 자동으로 녹화 시작
        setTimeout(() => {
          const currentRoomState = roomStates.get(currentRoomId);
          if (currentRoomState && currentRoomState.recordingState === 'preparing') {
            console.log(`🎬 방 ${currentRoomId}에서 3초 후 자동 녹화 시작`);
            currentRoomState.recordingState = 'recording';
            
            broadcastToRoom(currentRoomId, {
              type: 'recording_start',
              data: {}
            });
          } else {
            console.log(`❌ 녹화 시작 실패: 방이 삭제되었거나 상태가 변경됨 (${currentRoomId})`);
          }
        }, 3000);
      }
    }
  });

  socket.on('start_recording', () => {
    if (!currentRoomId || !currentPlayerId) return;
    
    const roomState = roomStates.get(currentRoomId);
    if (roomState && currentPlayerId === roomState.hostId && roomState.recordingState === 'preparing') {
      console.log(`🎬 방 ${currentRoomId}에서 녹화 시작 (호스트: ${currentPlayerId})`);
      roomState.recordingState = 'recording';
      
      broadcastToRoom(currentRoomId, {
        type: 'recording_start',
        data: {}
      });
    }
  });

  socket.on('stop_recording', () => {
    if (!currentRoomId || !currentPlayerId) return;
    
    const roomState = roomStates.get(currentRoomId);
    if (roomState && currentPlayerId === roomState.hostId && roomState.recordingState === 'recording') {
      console.log(`🛑 방 ${currentRoomId}에서 녹화 종료 (호스트: ${currentPlayerId})`);
      roomState.recordingState = 'completed';
      
      broadcastToRoom(currentRoomId, {
        type: 'recording_stop',
        data: {}
      });
    }
  });

  // ===== 연결 해제 처리 =====
  socket.on('disconnect', () => {
    console.log('클라이언트 연결 해제됨:', socket.id);
    
    if (currentRoomId && currentPlayerId) {
      const roomState = roomStates.get(currentRoomId);
      if (roomState && roomState.players.has(currentPlayerId)) {
        console.log(`📤 플레이어 ${currentPlayerId}이 방 ${currentRoomId}에서 퇴장`);
        roomState.players.delete(currentPlayerId);
        
        // 호스트가 나간 경우 다른 플레이어를 호스트로 설정
        if (currentPlayerId === roomState.hostId) {
          const remainingPlayers = Array.from(roomState.players.keys());
          roomState.hostId = remainingPlayers.length > 0 ? remainingPlayers[0] : null;
          console.log(`👑 새 호스트: ${roomState.hostId}`);
        }
        
        // 남은 플레이어들에게 상태 업데이트 전송
        if (roomState.players.size > 0) {
          const updatedReadyStatusList = Array.from(roomState.players.values()).map(p => ({
            playerId: p.id,
            playerName: p.name,
            isReady: p.isReady
          }));
          
          broadcastToRoom(currentRoomId, {
            type: 'ready_status_update',
            data: { playersReady: updatedReadyStatusList }
          });
        } else {
          // 방에 아무도 없으면 방 상태 삭제
          roomStates.delete(currentRoomId);
          console.log(`🗑️ 방 ${currentRoomId} 삭제됨`);
        }
      }
    }
  });
});

// ==================== REST API 엔드포인트 ====================

// 📤 영상 업로드
app.post('/api/upload-video', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '파일이 없습니다.' });
    }

    const { roomId, playerId, playerName, recordingType } = req.body;
    
    const fileInfo = {
      originalName: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadTime: new Date(),
      roomId,
      playerId,
      playerName,
      recordingType // 'screen' 또는 'audio'
    };

    console.log(`📤 영상 업로드 완료: ${playerName} (${recordingType})`);

    // 방 상태에 녹화 파일 정보 저장
    const roomState = roomStates.get(roomId);
    if (roomState) {
      if (!roomState.recordings.has(playerId)) {
        roomState.recordings.set(playerId, {});
      }
      roomState.recordings.get(playerId)[recordingType] = fileInfo;
    }

    // 같은 방의 다른 플레이어들에게 업로드 완료 알림
    if (roomState) {
      broadcastToRoom(roomId, {
        type: 'video_uploaded',
        data: { 
          playerId, 
          playerName, 
          recordingType,
          filename: req.file.filename
        }
      }, req.socketId);
    }

    res.json({ 
      success: true, 
      fileId: req.file.filename,
      message: '업로드 완료' 
    });

  } catch (error) {
    console.error('업로드 에러:', error);
    res.status(500).json({ error: '서버 에러가 발생했습니다.' });
  }
});

// 📥 처리된 영상 다운로드
app.get('/api/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, 'storage/processed', filename);
    
    // 파일 존재 확인
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
    }

    res.download(filePath);
  } catch (error) {
    console.error('다운로드 에러:', error);
    res.status(500).json({ error: '서버 에러가 발생했습니다.' });
  }
});

// 📊 방 상태 조회
app.get('/api/room/:roomId/status', (req, res) => {
  const { roomId } = req.params;
  const roomState = roomStates.get(roomId);
  
  if (!roomState) {
    return res.status(404).json({ error: '방을 찾을 수 없습니다.' });
  }

  const players = Array.from(roomState.players.values()).map(p => ({
    id: p.id,
    name: p.name,
    isReady: p.isReady
  }));

  const recordings = {};
  roomState.recordings.forEach((playerRecordings, playerId) => {
    recordings[playerId] = playerRecordings;
  });

  res.json({
    roomId,
    recordingState: roomState.recordingState,
    hostId: roomState.hostId,
    players,
    recordings
  });
});

// 🎬 영상 처리 요청 (TODO: 실제 영상 분석 로직 구현)
app.post('/api/process-video', async (req, res) => {
  try {
    const { roomId, fileIds } = req.body;
    
    console.log(`🎬 영상 처리 요청: 방 ${roomId}, 파일들: ${fileIds.join(', ')}`);
    
    // TODO: 실제 영상 분석 및 하이라이트 추출 로직 구현
    // 현재는 더미 응답
    
    setTimeout(() => {
      // 처리 완료 알림
      const roomState = roomStates.get(roomId);
      if (roomState) {
        broadcastToRoom(roomId, {
          type: 'processing_complete',
          data: { 
            highlightVideo: 'highlight_' + Date.now() + '.mp4',
            message: '재미있는 부분 추출 완료!' 
          }
        });
      }
    }, 5000); // 5초 후 완료 시뮬레이션

    res.json({ 
      success: true, 
      message: '영상 처리를 시작했습니다.',
      estimatedTime: '약 5분'
    });

  } catch (error) {
    console.error('영상 처리 에러:', error);
    res.status(500).json({ error: '서버 에러가 발생했습니다.' });
  }
});

// ==================== 서버 시작 ====================
const PORT = process.env.PORT || 3000;

// 디렉토리 생성 후 서버 시작
ensureDirectories().then(() => {
  server.listen(PORT, () => {
    console.log(`🎮 통합 게임캐스트 서버가 포트 ${PORT}에서 실행 중입니다`);
    console.log(`📡 Socket.IO: http://localhost:${PORT}`);
    console.log(`🌐 REST API: http://localhost:${PORT}/api`);
    console.log(`📁 파일 업로드: POST /api/upload-video`);
    console.log(`📥 파일 다운로드: GET /api/download/:filename`);
  });
}).catch(error => {
  console.error('서버 시작 실패:', error);
});

// 에러 처리
server.on('error', (error) => {
  console.error('서버 에러:', error);
});

process.on('SIGTERM', () => {
  console.log('서버 종료 중...');
  server.close(() => {
    console.log('서버가 종료되었습니다');
  });
}); 