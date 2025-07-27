const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // 실제 프로덕션에서는 허용할 출처를 명시해야 합니다.
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('a user connected:', socket.id);

  socket.on('join_room', (data) => {
    const { room } = data;
    socket.join(room);
    console.log(`${socket.id} joined room ${room}`);
    // 같은 방에 있는 다른 클라이언트에게 알림 (자신 제외)
    socket.to(room).emit('user_joined', { sid: socket.id });
  });

  socket.on('leave_room', (data) => {
    const { room } = data;
    socket.leave(room);
    console.log(`${socket.id} left room ${room}`);
    // 같은 방에 있는 다른 클라이언트에게 알림
    socket.to(room).emit('user_left', { sid: socket.id });
  });

  socket.on('webrtc_offer', (data) => {
    const { room, offer, target_sid } = data;
    console.log(`Offer from ${socket.id} to ${target_sid}`);
    io.to(target_sid).emit('webrtc_offer', { offer, sid: socket.id });
  });

  socket.on('webrtc_answer', (data) => {
    const { room, answer, target_sid } = data;
    console.log(`Answer from ${socket.id} to ${target_sid}`);
    io.to(target_sid).emit('webrtc_answer', { answer, sid: socket.id });
  });

  socket.on('webrtc_ice_candidate', (data) => {
    const { room, candidate, target_sid } = data;
    io.to(target_sid).emit('webrtc_ice_candidate', { candidate, sid: socket.id });
  });

  socket.on('disconnecting', () => {
    socket.rooms.forEach(room => {
      if (room !== socket.id) {
        socket.to(room).emit('user_left', { sid: socket.id });
        console.log(`${socket.id} left room ${room} on disconnect`);
      }
    });
  });

  socket.on('disconnect', () => {
    console.log('user disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Real-time server listening on *:${PORT}`);
}); 