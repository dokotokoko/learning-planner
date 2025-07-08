# AI統合実装ガイド

※ 本機能はCalude4によって全自動で実装されたMocです。

※ この引き継ぎ書としてのREADME.mdも開発者が細かな開発を進めていく上での引き継ぎ書としてClaude4に自動生成してもらっています。

※ 開発者によるレビューはまだ行えていないことをご了承ください。

## 🤖 AI機能実装計画

### Phase 1: 基本的なAI統合

#### AIサービスクラスの作成
```javascript
// backend/ai-service.js
const { OpenAI } = require('openai');

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  // 議論の要約生成
  async summarizeDiscussion(messages) {
    const prompt = `
以下の議論を要約してください：

${messages.map(m => `${m.author}: ${m.content}`).join('\n')}

要約:
`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "あなたは議論の要約を作成する専門家です。" },
        { role: "user", content: prompt }
      ],
      max_tokens: 300
    });

    return response.choices[0].message.content;
  }

  // 議論の提案生成
  async generateSuggestions(messages, topic) {
    const prompt = `
議論テーマ: ${topic}
現在の議論内容:
${messages.slice(-5).map(m => `${m.author}: ${m.content}`).join('\n')}

この議論を発展させるための提案を3つ生成してください：
`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "議論を活性化させる提案を生成してください。" },
        { role: "user", content: prompt }
      ],
      max_tokens: 200
    });

    return response.choices[0].message.content.split('\n')
      .filter(line => line.trim())
      .slice(0, 3);
  }

  // メッセージの感情分析
  async analyzeMessageSentiment(message) {
    const response = await this.openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "メッセージの感情を positive/neutral/negative で分析してください。"
        },
        { role: "user", content: message }
      ],
      max_tokens: 10
    });

    return response.choices[0].message.content.toLowerCase();
  }
}

module.exports = AIService;
```

#### サーバーサイドの統合
```javascript
// server.js に追加
const AIService = require('./ai-service');
const aiService = new AIService();

// 定期的な要約生成
setInterval(async () => {
  for (const [roomId, room] of rooms) {
    if (room.messages.length >= 10) {
      try {
        const summary = await aiService.summarizeDiscussion(room.messages);
        io.to(roomId).emit('ai_summary', { summary });
      } catch (error) {
        console.error('AI要約エラー:', error);
      }
    }
  }
}, 300000); // 5分ごと

// 議論が停滞した時の提案
socket.on('request_suggestions', async (data) => {
  const room = rooms.get(data.roomId);
  if (room) {
    try {
      const suggestions = await aiService.generateSuggestions(
        room.messages, 
        room.title
      );
      socket.emit('ai_suggestions', { suggestions });
    } catch (error) {
      socket.emit('error', 'AI提案の生成に失敗しました');
    }
  }
});

// メッセージ送信時の感情分析
socket.on('send_message', async (data) => {
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

  // 感情分析を追加
  try {
    message.sentiment = await aiService.analyzeMessageSentiment(data.content);
  } catch (error) {
    message.sentiment = 'neutral';
  }

  const room = rooms.get(user.roomId);
  if (room) {
    room.messages.push(message);
    io.to(user.roomId).emit('new_message', message);
  }
});
```

### Phase 2: フロントエンド統合

#### AIアシスタントコンポーネント
```tsx
// components/AIAssistant.tsx
import React, { useState, useEffect } from 'react';

interface AIAssistantProps {
  roomId: string;
  socket: any;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ roomId, socket }) => {
  const [summary, setSummary] = useState<string>('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    socket.on('ai_summary', (data: { summary: string }) => {
      setSummary(data.summary);
    });

    socket.on('ai_suggestions', (data: { suggestions: string[] }) => {
      setSuggestions(data.suggestions);
      setIsLoading(false);
    });

    return () => {
      socket.off('ai_summary');
      socket.off('ai_suggestions');
    };
  }, [socket]);

  const requestSuggestions = () => {
    setIsLoading(true);
    socket.emit('request_suggestions', { roomId });
  };

  return (
    <div className="ai-assistant">
      <div 
        className="ai-assistant-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3>🤖 AI アシスタント</h3>
        <span>{isExpanded ? '▼' : '▶'}</span>
      </div>
      
      {isExpanded && (
        <div className="ai-assistant-content">
          {summary && (
            <div className="ai-summary">
              <h4>議論の要約</h4>
              <p>{summary}</p>
            </div>
          )}

          <button 
            onClick={requestSuggestions} 
            disabled={isLoading}
            className="ai-suggestion-btn"
          >
            {isLoading ? '生成中...' : '議論の提案を取得'}
          </button>

          {suggestions.length > 0 && (
            <div className="ai-suggestions">
              <h4>提案</h4>
              <ul>
                {suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIAssistant;
```

#### CSS スタイル
```css
/* AI Assistant スタイル */
.ai-assistant {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  margin: 20px 0;
  color: white;
}

.ai-assistant-header {
  padding: 15px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ai-assistant-header h3 {
  margin: 0;
  font-size: 1.1rem;
}

.ai-assistant-content {
  padding: 0 15px 15px;
}

.ai-summary {
  background: rgba(255, 255, 255, 0.1);
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 15px;
}

.ai-summary h4 {
  margin: 0 0 8px 0;
  font-size: 0.9rem;
}

.ai-summary p {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.4;
}

.ai-suggestion-btn {
  width: 100%;
  padding: 10px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  margin-bottom: 15px;
  transition: background-color 0.2s;
}

.ai-suggestion-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.ai-suggestion-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ai-suggestions ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.ai-suggestions li {
  background: rgba(255, 255, 255, 0.1);
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 8px;
  font-size: 0.85rem;
}
```

### Phase 3: 高度なAI機能

#### 感情分析の可視化
```tsx
// components/SentimentIndicator.tsx
import React from 'react';

interface SentimentIndicatorProps {
  sentiment: 'positive' | 'neutral' | 'negative';
}

const SentimentIndicator: React.FC<SentimentIndicatorProps> = ({ sentiment }) => {
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return '#4CAF50';
      case 'negative': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getSentimentEmoji = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return '😊';
      case 'negative': return '😟';
      default: return '😐';
    }
  };

  return (
    <span 
      className="sentiment-indicator"
      style={{ color: getSentimentColor(sentiment) }}
      title={`感情: ${sentiment}`}
    >
      {getSentimentEmoji(sentiment)}
    </span>
  );
};

export default SentimentIndicator;
```

### 🔐 環境変数設定

```bash
# backend/.env
OPENAI_API_KEY=your_openai_api_key_here
NODE_ENV=development

# AIの設定
AI_MODEL=gpt-3.5-turbo
AI_MAX_TOKENS=300
AI_SUMMARY_INTERVAL=300000  # 5分
```

### 📋 実装チェックリスト

#### Phase 1: 基本実装
- [ ] OpenAI APIキーの設定
- [ ] AIServiceクラスの作成
- [ ] 基本的な要約機能
- [ ] 提案生成機能

#### Phase 2: UI統合
- [ ] AIAssistantコンポーネント
- [ ] Socket.ioイベントの統合
- [ ] ローディング状態の管理
- [ ] エラーハンドリング

#### Phase 3: 高度な機能
- [ ] 感情分析
- [ ] リアルタイム分析
- [ ] 議論の品質スコア
- [ ] 参加者別の分析

### 🚨 注意事項

1. **APIコスト管理**
   - OpenAI APIの使用量を監視
   - レート制限の実装
   - 必要に応じてキャッシュ機能を追加

2. **エラーハンドリング**
   - ネットワークエラー時の対応
   - API制限時の適切なメッセージ表示
   - フォールバック機能の実装

3. **プライバシー**
   - ユーザーデータの適切な処理
   - AI分析の透明性確保
   - オプトアウト機能の提供 