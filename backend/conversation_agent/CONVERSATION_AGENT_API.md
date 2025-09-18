# Conversation Agent API Documentation

## 概要
Conversation Agent（対話エージェント）の検証用APIエンドポイントです。
通常の `/chat` エンドポイントから独立して、対話エージェントの機能を検証できます。

## エンドポイント一覧

### 1. 対話エージェントチャット
**POST** `/conversation-agent/chat`

対話エージェントを使用してメッセージを処理します。

#### リクエストボディ
```json
{
  "message": "探究テーマについて相談したいです",
  "project_id": 123,  // オプション: プロジェクトID
  "page_id": "general",  // オプション: ページID
  "include_history": true,  // デフォルト: true
  "history_limit": 50,  // デフォルト: 50
  "debug_mode": true,  // デフォルト: false
  "mock_mode": true  // デフォルト: true
}
```

#### レスポンス
```json
{
  "response": "探究テーマについてお聞きします。どのような分野に興味がありますか？",
  "timestamp": "2024-01-01T12:00:00Z",
  "support_type": "questioning",
  "selected_acts": ["質問", "傾聴"],
  "state_snapshot": {
    "theme_clarity": 0.3,
    "question_clarity": 0.0,
    "confidence": 0.4
  },
  "project_plan": null,
  "decision_metadata": {
    "reasoning": "テーマが不明確なため、まず興味分野を確認"
  },
  "metrics": {
    "processing_time": 150,
    "confidence_score": 0.8
  },
  "debug_info": {
    "processing_time_ms": 150,
    "mock_mode": true,
    "history_items": 5,
    "has_project_context": true,
    "conversation_id": "conv_123",
    "page_id": "general"
  },
  "conversation_id": "conv_123",
  "history_count": 5
}
```

### 2. ステータス確認
**GET** `/conversation-agent/status`

対話エージェントの現在のステータスを確認します。

#### レスポンス
```json
{
  "available": true,
  "enabled": false,
  "initialized": false,
  "module_path": "backend.conversation_agent",
  "environment": {
    "ENABLE_CONVERSATION_AGENT": "false",
    "mode": "mock"
  },
  "features": {
    "state_extraction": true,
    "support_typing": true,
    "policy_engine": true,
    "project_planning": true
  },
  "orchestrator_info": {
    "class": "ConversationOrchestrator",
    "has_llm_client": true,
    "mock_mode": true
  }
}
```

### 3. 手動初期化
**POST** `/conversation-agent/initialize`

対話エージェントを手動で初期化します（管理者用）。

#### リクエストパラメータ
- `mock_mode` (boolean): モックモードで初期化するか（デフォルト: true）

#### レスポンス
```json
{
  "success": true,
  "message": "対話エージェントをモックモードで初期化しました",
  "mock_mode": true,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## 使用例

### cURLでのテスト

1. **ステータス確認**
```bash
curl -X GET "http://localhost:8000/conversation-agent/status" \
  -H "Authorization: Bearer YOUR_USER_ID"
```

2. **対話エージェントでチャット（デバッグモード）**
```bash
curl -X POST "http://localhost:8000/conversation-agent/chat" \
  -H "Authorization: Bearer YOUR_USER_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "環境問題について探究したいです",
    "debug_mode": true,
    "mock_mode": true
  }'
```

3. **プロジェクトコンテキスト付きチャット**
```bash
curl -X POST "http://localhost:8000/conversation-agent/chat" \
  -H "Authorization: Bearer YOUR_USER_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "私の仮説は正しいでしょうか？",
    "project_id": 123,
    "include_history": true,
    "history_limit": 100,
    "debug_mode": true
  }'
```

### Pythonでのテスト

```python
import requests
import json

# ベースURL
BASE_URL = "http://localhost:8000"
# 認証トークン（ユーザーID）
AUTH_TOKEN = "YOUR_USER_ID"

headers = {
    "Authorization": f"Bearer {AUTH_TOKEN}",
    "Content-Type": "application/json"
}

# 1. ステータス確認
response = requests.get(
    f"{BASE_URL}/conversation-agent/status",
    headers=headers
)
print("Status:", response.json())

# 2. 対話エージェントでチャット
chat_data = {
    "message": "プラスチックごみ問題について調べたいです",
    "debug_mode": True,
    "mock_mode": True
}

response = requests.post(
    f"{BASE_URL}/conversation-agent/chat",
    headers=headers,
    json=chat_data
)

result = response.json()
print("\n=== 対話エージェントレスポンス ===")
print(f"応答: {result['response']}")
print(f"サポートタイプ: {result['support_type']}")
print(f"選択された行動: {result['selected_acts']}")
print(f"状態スナップショット: {json.dumps(result['state_snapshot'], indent=2, ensure_ascii=False)}")

if result.get('debug_info'):
    print(f"\nデバッグ情報: {json.dumps(result['debug_info'], indent=2)}")
```

## エラーハンドリング

### エラーレスポンスの例

1. **モジュール未インポート**
```json
{
  "response": "対話エージェント機能は現在利用できません。モジュールがインポートされていません。",
  "support_type": "error",
  "error": "ConversationAgent module not available",
  "metrics": {"error": "module_not_available"}
}
```

2. **初期化エラー**
```json
{
  "response": "対話エージェントの初期化に失敗しました。",
  "support_type": "error",
  "error": "Initialization error: ...",
  "metrics": {"error": "initialization_failed"}
}
```

3. **処理エラー**
```json
{
  "response": "申し訳ございません。対話処理中にエラーが発生しました。",
  "support_type": "error",
  "error": "Processing error: ...",
  "warning": "エージェント処理中にエラーが発生しました"
}
```

## デバッグのヒント

1. **デバッグモードを有効にする**
   - `debug_mode: true` を設定することで、詳細な処理情報を取得できます

2. **モックモードで安全にテスト**
   - `mock_mode: true` で実際のLLM APIを呼び出さずにテストできます

3. **履歴の制御**
   - `include_history: false` で履歴なしでテスト
   - `history_limit` で履歴の件数を調整

4. **ログの確認**
   - バックエンドログで詳細なエラー情報を確認
   - `docker-compose -f docker-compose.dev.yml logs -f backend`

## 環境変数

対話エージェントの動作は以下の環境変数で制御できます：

```bash
# .env ファイル
ENABLE_CONVERSATION_AGENT=true  # 対話エージェント機能の有効化
```

## 注意事項

1. **認証が必要**
   - すべてのエンドポイントは認証が必要です
   - AuthorizationヘッダーにユーザーIDを設定してください

2. **モックモード推奨**
   - 開発・検証時は `mock_mode: true` の使用を推奨
   - 本番環境では `mock_mode: false` に設定

3. **履歴の保存**
   - すべての対話は `chat_logs` テーブルに保存されます
   - `context_data` フィールドにエージェントのメタデータが含まれます

## トラブルシューティング

### Q: "対話エージェント機能は現在利用できません" エラー
A: conversation_agent モジュールが正しくインポートされていません。以下を確認：
- `backend/conversation_agent/` ディレクトリが存在するか
- `__init__.py` が適切に設定されているか
- 依存関係がインストールされているか

### Q: レスポンスが遅い
A: 以下を試してください：
- `mock_mode: true` でテスト（LLM APIを呼び出さない）
- `history_limit` を減らす
- `include_history: false` で履歴なしでテスト

### Q: デバッグ情報が表示されない
A: `debug_mode: true` をリクエストに含めてください

## 関連ドキュメント
- [Conversation Agent README](conversation_agent/README.md)
- [メインAPI仕様](../README.md)