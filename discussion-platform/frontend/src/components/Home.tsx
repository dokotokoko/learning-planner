import React, { useState } from 'react';

interface HomeProps {
  onJoinRoom: (roomId: string, userName: string) => void;
}

const Home: React.FC<HomeProps> = ({ onJoinRoom }) => {
  // ルーム作成用の状態
  const [roomTitle, setRoomTitle] = useState('');
  const [hostName, setHostName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // ルーム参加用の状態
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const [error, setError] = useState('');

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomTitle.trim() || !hostName.trim()) {
      setError('タイトルとホスト名を入力してください');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3000/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: roomTitle.trim(),
          hostName: hostName.trim()
        }),
      });

      if (!response.ok) {
        throw new Error('ルームの作成に失敗しました');
      }

      const data = await response.json();
      onJoinRoom(data.roomId, hostName.trim());
    } catch (err) {
      setError('ルームの作成に失敗しました');
      console.error('Error creating room:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId.trim() || !userName.trim()) {
      setError('ルームIDとユーザー名を入力してください');
      return;
    }

    setIsJoining(true);
    setError('');

    try {
      const response = await fetch(`http://localhost:3000/api/rooms/${roomId.trim()}`);
      
      if (!response.ok) {
        throw new Error('ルームが見つかりません');
      }

      onJoinRoom(roomId.trim(), userName.trim());
    } catch (err) {
      setError('ルームが見つかりません。ルームIDを確認してください。');
      console.error('Error joining room:', err);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="home-container">
      <h1 className="home-title">議論プラットフォーム</h1>
      
      {error && <div className="error-message">{error}</div>}

      {/* ルーム作成セクション */}
      <div className="home-section">
        <h2 className="section-title">新しいルームを作成</h2>
        <form onSubmit={handleCreateRoom}>
          <div className="input-group">
            <label htmlFor="roomTitle">ルームタイトル</label>
            <input
              type="text"
              id="roomTitle"
              value={roomTitle}
              onChange={(e) => setRoomTitle(e.target.value)}
              placeholder="議論のテーマを入力してください"
              disabled={isCreating}
            />
          </div>
          <div className="input-group">
            <label htmlFor="hostName">あなたの名前（ホスト）</label>
            <input
              type="text"
              id="hostName"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              placeholder="ホスト名を入力してください"
              disabled={isCreating}
            />
          </div>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={isCreating || !roomTitle.trim() || !hostName.trim()}
          >
            {isCreating ? '作成中...' : 'ルームを作成'}
          </button>
        </form>
      </div>

      <div className="divider">
        <span>または</span>
      </div>

      {/* ルーム参加セクション */}
      <div className="home-section">
        <h2 className="section-title">既存のルームに参加</h2>
        <form onSubmit={handleJoinRoom}>
          <div className="input-group">
            <label htmlFor="roomId">ルームID</label>
            <input
              type="text"
              id="roomId"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="8文字のルームIDを入力してください"
              disabled={isJoining}
            />
          </div>
          <div className="input-group">
            <label htmlFor="userName">あなたの名前</label>
            <input
              type="text"
              id="userName"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="参加者名を入力してください"
              disabled={isJoining}
            />
          </div>
          <button 
            type="submit" 
            className="btn btn-secondary"
            disabled={isJoining || !roomId.trim() || !userName.trim()}
          >
            {isJoining ? '参加中...' : 'ルームに参加'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Home; 