import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import MessageList from './MessageList.tsx';
import MessageInput from './MessageInput.tsx';
import Sidebar from './Sidebar.tsx';

interface RoomProps {
  roomId: string;
  userName: string;
  onLeave: () => void;
}

interface Message {
  id: string;
  content: string;
  author: string;
  authorId: string;
  timestamp: string;
  likes: Array<{
    userId: string;
    userName: string;
    timestamp: string;
  }>;
  replies: Array<{
    id: string;
    content: string;
    author: string;
    authorId: string;
    timestamp: string;
  }>;
}

interface Participant {
  id: string;
  name: string;
  roomId: string;
}

interface RoomData {
  id: string;
  title: string;
  host: string;
  participants: Participant[];
  messages: Message[];
  createdAt: string;
}

const Room: React.FC<RoomProps> = ({ roomId, userName, onLeave }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // メッセージリストの最下部にスクロール
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Socket.io接続
    const newSocket = io('http://localhost:3000');
    setSocket(newSocket);

    // 接続イベント
    newSocket.on('connect', () => {
      setIsConnected(true);
      // ルームに参加
      newSocket.emit('join_room', { roomId, userName });
    });

    // ルーム参加成功
    newSocket.on('room_joined', (data: { room: RoomData; participants: Participant[]; messages: Message[] }) => {
      setRoomData(data.room);
      setParticipants(data.participants);
      setMessages(data.messages);
      setError('');
    });

    // 新しいメッセージ受信
    newSocket.on('new_message', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    // メッセージ更新（いいねや返信）
    newSocket.on('message_updated', (updatedMessage: Message) => {
      setMessages(prev => 
        prev.map(msg => msg.id === updatedMessage.id ? updatedMessage : msg)
      );
    });

    // ユーザー参加
    newSocket.on('user_joined', (data: { user: Participant; participants: Participant[] }) => {
      setParticipants(data.participants);
    });

    // ユーザー退室
    newSocket.on('user_left', (data: { user: Participant; participants: Participant[] }) => {
      setParticipants(data.participants);
    });

    // エラー処理
    newSocket.on('error', (errorMessage: string) => {
      setError(errorMessage);
    });

    // 切断処理
    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    return () => {
      newSocket.close();
    };
  }, [roomId, userName]);

  // メッセージが追加されたときに自動スクロール
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = (content: string) => {
    if (socket && content.trim()) {
      socket.emit('send_message', { content: content.trim() });
    }
  };

  const likeMessage = (messageId: string) => {
    if (socket) {
      socket.emit('like_message', { messageId });
    }
  };

  const replyToMessage = (parentId: string, content: string) => {
    if (socket && content.trim()) {
      socket.emit('reply_message', { parentId, content: content.trim() });
    }
  };

  const handleLeave = () => {
    if (socket) {
      socket.close();
    }
    onLeave();
  };

  if (error) {
    return (
      <div className="room-container">
        <div className="error-message">
          {error}
          <button onClick={handleLeave} className="btn">ホームに戻る</button>
        </div>
      </div>
    );
  }

  if (!roomData) {
    return (
      <div className="room-container">
        <div>ルームに接続中...</div>
      </div>
    );
  }

  return (
    <div className="room-container">
      <Sidebar
        roomData={roomData}
        participants={participants}
        isConnected={isConnected}
        onLeave={handleLeave}
      />
      
      <div className="chat-container">
        <div className="chat-header">
          <h2>{roomData.title}</h2>
          <div className="connection-status">
            {isConnected ? '🟢 接続中' : '🔴 切断'}
          </div>
        </div>
        
        <div className="chat-messages">
          <MessageList
            messages={messages}
            currentUserId={socket?.id || ''}
            onLike={likeMessage}
            onReply={replyToMessage}
          />
          <div ref={messagesEndRef} />
        </div>
        
        <MessageInput onSendMessage={sendMessage} />
      </div>
    </div>
  );
};

export default Room; 