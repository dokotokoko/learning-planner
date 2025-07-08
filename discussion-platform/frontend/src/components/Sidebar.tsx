import React from 'react';

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
  messages: any[];
  createdAt: string;
}

interface SidebarProps {
  roomData: RoomData;
  participants: Participant[];
  isConnected: boolean;
  onLeave: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ roomData, participants, isConnected, onLeave }) => {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomData.id);
    // 簡単なフィードバック（本来はtoastなどを使用）
    alert('ルームIDをコピーしました！');
  };

  return (
    <div className="room-sidebar">
      <div className="room-header">
        <h3 className="room-title">{roomData.title}</h3>
        <div className="room-id" onClick={copyRoomId} style={{ cursor: 'pointer' }}>
          ルームID: {roomData.id}
          <br />
          <small>クリックでコピー</small>
        </div>
        <div className="room-host">
          <small>ホスト: {roomData.host}</small>
        </div>
      </div>

      <div className="participants-section">
        <h3>参加者 ({participants.length})</h3>
        <ul className="participants-list">
          {participants.map((participant) => (
            <li key={participant.id} className="participant-item">
              <div className="participant-avatar">
                {getInitials(participant.name)}
              </div>
              <span className="participant-name">
                {participant.name}
                {participant.name === roomData.host && ' (ホスト)'}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="connection-info">
        <div className="connection-status">
          状態: {isConnected ? '🟢 接続中' : '🔴 切断'}
        </div>
      </div>

      <button onClick={onLeave} className="btn leave-btn">
        ルームを退出
      </button>
    </div>
  );
};

export default Sidebar; 