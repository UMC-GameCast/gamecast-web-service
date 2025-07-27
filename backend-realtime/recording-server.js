const WebSocket = require('ws');
const http = require('http');
const url = require('url');

// 방별 플레이어 상태 저장
const roomStates = new Map();

// 서버 생성
const server = http.createServer();
const wss = new WebSocket.Server({ server });

// 방 상태 초기화
function initializeRoom(roomId) {
  if (!roomStates.has(roomId)) {
    roomStates.set(roomId, {
      players: new Map(),
      recordingState: 'idle',
      hostId: null
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
function broadcastToRoom(roomId, message) {
  const roomState = roomStates.get(roomId);
  if (roomState) {
    roomState.players.forEach(player => {
      if (player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(JSON.stringify(message));
      }
    });
  }
}

// WebSocket 연결 처리
wss.on('connection', (ws, request) => {
  const pathname = url.parse(request.url).pathname;
  const roomIdMatch = pathname.match(/^\/recording\/(.+)$/);
  
  if (!roomIdMatch) {
    ws.close(1000, 'Invalid URL format');
    return;
  }
  
  const roomId = roomIdMatch[1];
  const roomState = initializeRoom(roomId);
  
  let playerId = null;
  
  console.log(`클라이언트가 방 ${roomId}에 연결됨`);
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'player_join':
          playerId = message.playerId;
          
          // 첫 번째 플레이어를 호스트로 설정
          if (!roomState.hostId) {
            roomState.hostId = playerId;
          }
          
          roomState.players.set(playerId, {
            id: playerId,
            name: message.playerName,
            isReady: false,
            ws: ws
          });
          
          console.log(`플레이어 ${message.playerName} (${playerId})이 방 ${roomId}에 입장`);
          
          // 현재 준비 상태를 새 플레이어에게 전송
          const readyStatusList = Array.from(roomState.players.values()).map(p => ({
            playerId: p.id,
            playerName: p.name,
            isReady: p.isReady
          }));
          
          broadcastToRoom(roomId, {
            type: 'ready_status_update',
            playersReady: readyStatusList
          });
          break;
          
        case 'set_ready':
          if (roomState.players.has(message.playerId)) {
            roomState.players.get(message.playerId).isReady = message.isReady;
            
            console.log(`플레이어 ${message.playerName} 준비 상태: ${message.isReady}`);
            
            // 모든 플레이어에게 준비 상태 업데이트 전송
            const updatedReadyStatusList = Array.from(roomState.players.values()).map(p => ({
              playerId: p.id,
              playerName: p.name,
              isReady: p.isReady
            }));
            
            broadcastToRoom(roomId, {
              type: 'ready_status_update',
              playersReady: updatedReadyStatusList
            });
            
            // 모든 플레이어가 준비되었는지 확인
            if (checkAllPlayersReady(roomState)) {
              console.log(`방 ${roomId}의 모든 플레이어가 준비 완료`);
              roomState.recordingState = 'preparing';
              
              broadcastToRoom(roomId, {
                type: 'all_players_ready'
              });
            }
          }
          break;
          
        case 'start_recording':
          // 호스트만 녹화 시작 가능
          if (playerId === roomState.hostId && roomState.recordingState === 'preparing') {
            console.log(`방 ${roomId}에서 녹화 시작 (호스트: ${playerId})`);
            roomState.recordingState = 'recording';
            
            broadcastToRoom(roomId, {
              type: 'recording_start'
            });
          }
          break;
          
        case 'stop_recording':
          // 호스트만 녹화 종료 가능
          if (playerId === roomState.hostId && roomState.recordingState === 'recording') {
            console.log(`방 ${roomId}에서 녹화 종료 (호스트: ${playerId})`);
            roomState.recordingState = 'completed';
            
            broadcastToRoom(roomId, {
              type: 'recording_stop'
            });
          }
          break;
          
        default:
          console.log('알 수 없는 메시지 타입:', message.type);
      }
    } catch (error) {
      console.error('메시지 처리 중 오류:', error);
    }
  });
  
  ws.on('close', () => {
    if (playerId && roomState.players.has(playerId)) {
      console.log(`플레이어 ${playerId}이 방 ${roomId}에서 퇴장`);
      roomState.players.delete(playerId);
      
      // 호스트가 나간 경우 다른 플레이어를 호스트로 설정
      if (playerId === roomState.hostId) {
        const remainingPlayers = Array.from(roomState.players.keys());
        roomState.hostId = remainingPlayers.length > 0 ? remainingPlayers[0] : null;
        console.log(`새 호스트: ${roomState.hostId}`);
      }
      
      // 남은 플레이어들에게 상태 업데이트 전송
      if (roomState.players.size > 0) {
        const updatedReadyStatusList = Array.from(roomState.players.values()).map(p => ({
          playerId: p.id,
          playerName: p.name,
          isReady: p.isReady
        }));
        
        broadcastToRoom(roomId, {
          type: 'ready_status_update',
          playersReady: updatedReadyStatusList
        });
      } else {
        // 방에 아무도 없으면 방 상태 삭제
        roomStates.delete(roomId);
        console.log(`방 ${roomId} 삭제됨`);
      }
    }
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket 에러:', error);
  });
});

// 서버 시작
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🎬 녹화 관리 WebSocket 서버가 포트 ${PORT}에서 실행 중입니다`);
  console.log(`WebSocket URL: ws://localhost:${PORT}/recording/{roomId}`);
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