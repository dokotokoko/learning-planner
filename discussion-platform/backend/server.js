const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// データストレージ（本来はデータベースを使用）
const rooms = new Map();
const users = new Map();

// ルーム作成
app.post('/api/rooms', (req, res) => {
  const { title, hostName } = req.body;
  const roomId = uuidv4().substring(0, 8); // 8文字のランダムID
  const room = {
    id: roomId,
    title,
    host: hostName,
    participants: [],
    messages: [],
    createdAt: new Date()
  };
  
  rooms.set(roomId, room);
  res.json({ roomId, room });
});

// ルーム情報取得
app.get('/api/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({ error: 'ルームが見つかりません' });
  }
  
  res.json(room);
});

// Socket.io 接続処理
io.on('connection', (socket) => {
  console.log('ユーザーが接続しました:', socket.id);

  // ルーム参加
  socket.on('join_room', (data) => {
    const { roomId, userName } = data;
    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit('error', 'ルームが見つかりません');
      return;
    }

    // ユーザー情報を保存
    const user = {
      id: socket.id,
      name: userName,
      roomId: roomId
    };
    users.set(socket.id, user);

    // ルームに参加
    socket.join(roomId);
    
    // 参加者リストに追加
    if (!room.participants.some(p => p.id === socket.id)) {
      room.participants.push(user);
    }

    // 参加通知を送信
    socket.to(roomId).emit('user_joined', {
      user: user,
      participants: room.participants
    });

    // 現在の参加者リストとメッセージ履歴を送信
    socket.emit('room_joined', {
      room: room,
      participants: room.participants,
      messages: room.messages
    });
  });

  // メッセージ送信
  socket.on('send_message', (data) => {
    const user = users.get(socket.id);
    if (!user) return;

    const message = {
      id: uuidv4(),
      content: data.content,
      author: user.name,
      authorId: user.id,
      timestamp: new Date(),
      likes: [],
      replies: []
    };

    const room = rooms.get(user.roomId);
    if (room) {
      room.messages.push(message);
      
      // ルーム内の全員にメッセージを送信
      io.to(user.roomId).emit('new_message', message);
    }
  });

  // いいね機能
  socket.on('like_message', (data) => {
    const user = users.get(socket.id);
    if (!user) return;

    const room = rooms.get(user.roomId);
    if (!room) return;

    const message = room.messages.find(m => m.id === data.messageId);
    if (!message) return;

    // いいねのトグル
    const likeIndex = message.likes.findIndex(like => like.userId === user.id);
    if (likeIndex > -1) {
      message.likes.splice(likeIndex, 1);
    } else {
      message.likes.push({
        userId: user.id,
        userName: user.name,
        timestamp: new Date()
      });
    }

    // 更新されたメッセージを送信
    io.to(user.roomId).emit('message_updated', message);
  });

  // 返信機能
  socket.on('reply_message', (data) => {
    const user = users.get(socket.id);
    if (!user) return;

    const room = rooms.get(user.roomId);
    if (!room) return;

    const parentMessage = room.messages.find(m => m.id === data.parentId);
    if (!parentMessage) return;

    const reply = {
      id: uuidv4(),
      content: data.content,
      author: user.name,
      authorId: user.id,
      timestamp: new Date()
    };

    parentMessage.replies.push(reply);

    // 更新されたメッセージを送信
    io.to(user.roomId).emit('message_updated', parentMessage);
  });

  // 切断処理
  socket.on('disconnect', () => {
    console.log('ユーザーが切断しました:', socket.id);
    
    const user = users.get(socket.id);
    if (user) {
      const room = rooms.get(user.roomId);
      if (room) {
        // 参加者リストから削除
        room.participants = room.participants.filter(p => p.id !== socket.id);
        
        // 他の参加者に通知
        socket.to(user.roomId).emit('user_left', {
          user: user,
          participants: room.participants
        });
      }
      
      users.delete(socket.id);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`サーバーがポート ${PORT} で起動しました`);
}); 