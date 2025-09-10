# 探Qメイト AI対話エージェント機能 - 実装ドキュメント

## 📋 概要

学習支援システム「探Qメイト」に統合された高度な対話エージェント機能です。学習者の状態を理解し、適切な支援タイプを判定して、最適な発話アクトで応答する統合システムを提供しています。

## 🏗️ システムアーキテクチャ

### 処理フロー

```
1. [理解フェーズ] 状態抽出 → 2. [思考フェーズ] 計画思考 → 3. [判定フェーズ] 支援タイプ判定 → 4. [選択フェーズ] アクト選択 → 5. [生成フェーズ] 応答生成
```

### コアコンポーネント

1. **ConversationOrchestrator** (`orchestrator.py`)
   - 全体フローの統合制御
   - 各コンポーネント間の連携調整
   - メトリクス収集・管理

2. **StateExtractor** (`state_extractor.py`) - 理解フェーズ
   - 学習者の現在状態を抽出・分析
   - 目標、目的、ブロッカー、不確実性の特定
   - LLMベース＋ヒューリスティックフォールバック

3. **ProjectPlanner** (`project_planner.py`) - 思考フェーズ
   - プロジェクトの戦略的計画生成
   - 北極星（最重要指標）の設定
   - 次の行動とマイルストーンの提案

4. **SupportTyper** (`support_typer.py`) - 判定フェーズ
   - 6種類の支援タイプ自動判定
   - 理解深化/道筋提示/視点転換/行動活性化/絞り込み/意思決定

5. **PolicyEngine** (`policies.py`) - 選択フェーズ
   - 8種類の発話アクト最適選択
   - Socratic優先のポリシー実装
   - 動的組み合わせ選択

## 🎯 支援タイプと発話アクト

### 支援タイプ (6種類)
- **理解深化**: 概念や背景の深い理解を促進
- **道筋提示**: 具体的な進め方やステップを提示
- **視点転換**: 異なる角度からの考察を促進
- **行動活性化**: 次の具体的行動への動機づけ
- **絞り込み**: 選択肢や焦点の絞り込み支援
- **意思決定**: 決断や選択のための支援

### 発話アクト (8種類)
- **Acknowledge**: 学習者の状況や感情を認識・受容
- **Probe**: 深掘り質問で思考を促進
- **Reframe**: 視点や枠組みの転換提案
- **Guide**: 具体的な手順やアプローチの提示
- **Encourage**: 動機づけと励まし
- **Focus**: 注意や焦点の方向づけ
- **Reflect**: 振り返りや内省の促進
- **Summarize**: 整理とまとめの提供

## 🔌 APIエンドポイント

### 1. 基本チャットエンドポイント (`/chat`)

```http
POST /chat
Content-Type: application/json
Authorization: Bearer <user_id>

{
  "message": "学習についての質問",
  "page_id": "conversation-agent-test",
  "memo_content": "プロジェクト情報: ..."
}
```

**Response:**
```json
{
  "response": "AI応答テキスト",
  "timestamp": "2025-01-01T12:00:00Z",
  "conversation_agent": true,
  "support_type": "理解深化",
  "selected_acts": ["Probe", "Acknowledge"],
  "state_snapshot": {
    "goal": "学習目標",
    "purpose": "学習目的",
    "blockers": ["ブロッカー1"],
    "uncertainties": ["不確実性1"]
  },
  "project_plan": {
    "north_star": "最重要指標",
    "next_actions": [
      {
        "action": "具体的な行動",
        "urgency": 4,
        "importance": 5,
        "expected_outcome": "期待される結果"
      }
    ],
    "milestones": [...]
  },
  "decision_metadata": {
    "support_confidence": 0.85,
    "support_reason": "判定理由",
    "act_reason": "アクト選択理由"
  },
  "metrics": {
    "turns_count": 5,
    "momentum_delta": 0.2
  }
}
```

### 2. 対話エージェント専用エンドポイント (`/conversation-agent/chat`)

```http
POST /conversation-agent/chat
Content-Type: application/json
Authorization: Bearer <user_id>

{
  "message": "ユーザーメッセージ",
  "page_id": "conversation-agent-test",
  "project_id": 123,
  "mock_mode": true,
  "debug_mode": true,
  "include_history": true,
  "history_limit": 20
}
```

**特徴:**
- モック/実モードの切り替え可能
- デバッグ情報の詳細取得
- 対話履歴の動的制御
- プロジェクト情報の自動取得

### 3. エージェント状態確認 (`/conversation-agent/status`)

```http
GET /conversation-agent/status
Authorization: Bearer <user_id>
```

### 4. エージェント初期化 (`/conversation-agent/initialize`)

```http
POST /conversation-agent/initialize?mock_mode=true
Authorization: Bearer <user_id>
```

## 💾 データベース連携

### テーブル拡張
- `chat_logs.context_data`: エージェント情報を JSON で格納
- `conversations`: セッション管理機能

### 保存情報
```sql
-- chat_logsテーブルのcontext_dataに保存
{
  "timestamp": "2025-01-01T12:00:00Z",
  "agent_endpoint": true,
  "support_type": "理解深化",
  "selected_acts": ["Probe", "Acknowledge"],
  "state_snapshot": {...},
  "project_plan": {...},
  "decision_metadata": {...},
  "metrics": {...}
}
```

## 🔧 環境設定

### 環境変数

| 変数名 | デフォルト | 説明 |
|--------|------------|------|
| `ENABLE_CONVERSATION_AGENT` | `false` | エージェント機能の有効化 |
| `CONVERSATION_AGENT_MODE` | `mock` | 動作モード (mock/real) |

### 有効化手順

```bash
# 1. 環境変数設定
export ENABLE_CONVERSATION_AGENT=true

# 2. アプリケーション再起動
cd backend
python main.py
```

## 🧪 テスト・デバッグ

### ログ監視
```bash
# 対話エージェント関連ログの確認
grep "対話エージェント\|ConversationAgent\|✅\|❌" logs/app.log

# リアルタイム監視
tail -f logs/app.log | grep -E "(対話|agent|Agent)"
```

### 動作確認
```bash
# テストスイート実行
cd backend
python -m pytest tests/test_conversation_agent.py -v

# 手動テスト
curl -X POST "http://localhost:8000/conversation-agent/chat" \
  -H "Authorization: Bearer <user_id>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "プロジェクトの進め方がわからない",
    "debug_mode": true,
    "mock_mode": true
  }'
```

## 📁 ファイル構成

```
backend/conversation_agent/
├── __init__.py              # モジュール初期化・エクスポート
├── README.md               # このドキュメント
├── schema.py               # データモデル・型定義
├── orchestrator.py         # 統合制御エンジン
├── state_extractor.py      # 状態抽出エンジン（理解フェーズ）
├── project_planner.py      # プロジェクト計画エンジン（思考フェーズ）
├── support_typer.py        # 支援タイプ判定エンジン（判定フェーズ）
└── policies.py             # 発話アクト選択ポリシー（選択フェーズ）

backend/tests/
└── test_conversation_agent.py  # テストスイート

schema/
└── conversation_agent.sql      # DB拡張スクリプト
```

## 🚀 実装状況

### ✅ Phase 1 完了項目
- [x] コアアーキテクチャ設計
- [x] 5フェーズ処理フロー実装
- [x] モック版全コンポーネント
- [x] API統合（/chat, /conversation-agent/chat）
- [x] データベース連携
- [x] エラーハンドリング・フォールバック
- [x] テストスイート基盤
- [x] ログ・メトリクス収集
- [x] フロントエンド連携（ConversationAgentTestPage）

### 🔄 Phase 2 計画項目
- [ ] LLM統合（実モード実装）
- [ ] レンズシステム動的生成
- [ ] 学習機能・統計分析
- [ ] 高度な思考チェーン実装
- [ ] パフォーマンス最適化

## 💡 使用例

### 基本的な対話
```python
# エージェント初期化
orchestrator = ConversationOrchestrator(llm_client, use_mock=True)

# 対話処理
result = orchestrator.process_turn(
    user_message="実験のやり方がわからない",
    conversation_history=[],
    project_context={
        "theme": "AIと学習効果",
        "question": "AIはどう学習を改善するか？",
        "hypothesis": "AIが個別最適化を実現する"
    }
)

# 結果取得
print(result["response"])        # AI応答
print(result["support_type"])    # 判定された支援タイプ
print(result["selected_acts"])   # 選択された発話アクト
```

### API呼び出し例（フロントエンド）
```javascript
const response = await fetch(`${API_BASE}/chat`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userId}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: "研究の進め方について相談したい",
    page_id: "conversation-agent-test",
    memo_content: "プロジェクト情報: テーマ=AI学習支援..."
  })
});

const data = await response.json();
console.log('支援タイプ:', data.support_type);
console.log('プロジェクト計画:', data.project_plan);
```

## 🔍 トラブルシューティング

### よくある問題

**Q: エージェント機能が動作しない**
```bash
# モジュール確認
python -c "from conversation_agent import ConversationOrchestrator; print('OK')"

# 環境変数確認
echo $ENABLE_CONVERSATION_AGENT

# ログ確認
grep "対話エージェント" logs/app.log
```

**Q: モック応答しか返らない**
```bash
# 実モード設定確認
export CONVERSATION_AGENT_MODE=real

# LLMクライアント確認
python -c "from module.llm_api import learning_plannner; print(learning_plannner)"
```

**Q: フロントエンドでUI更新されない**
- AIChat コンポーネントの `onMessageSend` プロパティ設定確認
- `forceRefresh` プロパティでリセット機能確認
- ブラウザコンソールのエラーログ確認

## 🎉 まとめ

探Qメイトの対話エージェント機能は、学習者の状態を深く理解し、最適な支援を提供する高度なシステムです。5つの処理フェーズを通じて、単なる質問応答を超えた学習支援体験を実現しています。

現在のPhase 1では安定したモック版を提供しており、Phase 2でのLLM統合により更なる高度化を予定しています。