import React, { useState } from 'react';

interface Reply {
  id: string;
  content: string;
  author: string;
  authorId: string;
  timestamp: string;
}

interface Like {
  userId: string;
  userName: string;
  timestamp: string;
}

interface Message {
  id: string;
  content: string;
  author: string;
  authorId: string;
  timestamp: string;
  likes: Like[];
  replies: Reply[];
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  onLike: (messageId: string) => void;
  onReply: (parentId: string, content: string) => void;
}

const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  currentUserId, 
  onLike, 
  onReply 
}) => {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleReply = (messageId: string) => {
    if (replyContent.trim()) {
      onReply(messageId, replyContent);
      setReplyContent('');
      setReplyingTo(null);
    }
  };

  const isLikedByCurrentUser = (likes: Like[]) => {
    return likes.some(like => like.userId === currentUserId);
  };

  if (messages.length === 0) {
    return (
      <div className="chat-messages">
        <div style={{ textAlign: 'center', color: '#666', marginTop: '50px' }}>
          まだメッセージがありません。最初のメッセージを送信してみましょう！
        </div>
      </div>
    );
  }

  return (
    <>
      {messages.map((message) => (
        <div key={message.id} className="message">
          <div className="message-header">
            <span className="message-author">{message.author}</span>
            <span className="message-time">{formatTime(message.timestamp)}</span>
          </div>
          
          <div className="message-content">{message.content}</div>
          
          <div className="message-actions">
            <button
              className={`like-btn ${isLikedByCurrentUser(message.likes) ? 'liked' : ''}`}
              onClick={() => onLike(message.id)}
            >
              👍 {message.likes.length}
            </button>
            
            <button
              className="reply-btn"
              onClick={() => setReplyingTo(replyingTo === message.id ? null : message.id)}
            >
              💬 返信 ({message.replies.length})
            </button>
          </div>

          {/* 返信表示 */}
          {message.replies.length > 0 && (
            <div className="replies">
              {message.replies.map((reply) => (
                <div key={reply.id} className="reply">
                  <div className="reply-header">
                    <span className="reply-author">{reply.author}</span>
                    <span className="reply-time">{formatTime(reply.timestamp)}</span>
                  </div>
                  <div className="reply-content">{reply.content}</div>
                </div>
              ))}
            </div>
          )}

          {/* 返信入力 */}
          {replyingTo === message.id && (
            <div className="reply-input" style={{ marginTop: '10px' }}>
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="返信を入力してください..."
                rows={2}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  resize: 'vertical'
                }}
              />
              <div style={{ marginTop: '5px', display: 'flex', gap: '5px' }}>
                <button
                  onClick={() => handleReply(message.id)}
                  disabled={!replyContent.trim()}
                  style={{
                    padding: '5px 10px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  返信
                </button>
                <button
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyContent('');
                  }}
                  style={{
                    padding: '5px 10px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </>
  );
};

export default MessageList; 