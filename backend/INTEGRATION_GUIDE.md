# 並列処理・非同期処理統合ガイド

## 🎯 概要
このガイドでは、作成した最適化コードを既存の `main.py` に統合する手順を説明します。

## 📂 作成したファイル

1. **async_helpers.py** - 非同期処理用ヘルパー関数群
2. **module/async_llm_api.py** - 非同期対応LLMクライアント
3. **optimized_endpoints.py** - 最適化されたchat_with_aiエンドポイント
4. **optimized_conversation_agent.py** - 最適化されたconversation_agentエンドポイント

## 🔧 統合手順

### Step 1: インポート追加

`main.py` の先頭部分に以下のインポートを追加：

```python
# 既存のインポートの後に追加
from backend.async_helpers import (
    AsyncDatabaseHelper,
    AsyncProjectContextBuilder,
    parallel_fetch_context_and_history,
    parallel_save_chat_logs
)
from module.async_llm_api import get_async_llm_client
from backend.optimized_endpoints import optimized_chat_with_ai
from backend.optimized_conversation_agent import optimized_chat_with_conversation_agent
```

### Step 2: グローバル変数の追加

```python
# 既存のグローバル変数の後に追加
async_llm_client = None  # 非同期LLMクライアント
```

### Step 3: 起動イベントの更新

`startup_event` 関数内に追加：

```python
@app.on_event("startup")
async def startup_event():
    global llm_client, supabase, conversation_orchestrator, async_llm_client
    
    # 既存の初期化コード...
    
    # 非同期LLMクライアントの初期化
    try:
        async_llm_client = get_async_llm_client(pool_size=10)
        logger.info("✅ 非同期LLMクライアント初期化完了")
    except Exception as e:
        logger.error(f"❌ 非同期LLMクライアント初期化エラー: {e}")
        async_llm_client = None
```

### Step 4: chat_with_aiエンドポイントの置き換え

既存の `/chat` エンドポイントを以下のように変更：

```python
@app.post("/chat", response_model=ChatResponse, dependencies=[Depends(chat_rate_limiter)])
async def chat_with_ai(
    chat_data: ChatMessage,
    current_user: int = Depends(get_current_user_cached)
):
    """AIとのチャット（最適化版）"""
    # 最適化フラグ（環境変数で制御可能）
    use_optimized = os.environ.get("USE_OPTIMIZED_CHAT", "true").lower() == "true"
    
    if use_optimized and async_llm_client:
        # 最適化版を使用
        result = await optimized_chat_with_ai(
            chat_data=chat_data,
            current_user=current_user,
            supabase=supabase,
            llm_client=llm_client,
            conversation_orchestrator=conversation_orchestrator,
            ENABLE_CONVERSATION_AGENT=ENABLE_CONVERSATION_AGENT,
            MAX_CHAT_MESSAGE_LENGTH=MAX_CHAT_MESSAGE_LENGTH
        )
        
        # 既存のChatResponseモデルに変換
        return ChatResponse(
            response=result.response,
            timestamp=result.timestamp,
            token_usage=result.token_usage,
            context_metadata=result.context_metadata,
            support_type=result.support_type,
            selected_acts=result.selected_acts,
            state_snapshot=result.state_snapshot,
            project_plan=result.project_plan,
            decision_metadata=result.decision_metadata,
            metrics=result.metrics
        )
    else:
        # 既存の処理にフォールバック
        # ... 既存のコードをそのまま使用
```

### Step 5: conversation_agent/chatエンドポイントの置き換え

同様に、`/conversation-agent/chat` エンドポイントも更新：

```python
@app.post("/conversation-agent/chat", response_model=ConversationAgentResponse)
async def chat_with_conversation_agent(
    request: ConversationAgentRequest,
    current_user: int = Depends(get_current_user_cached)
):
    """対話エージェント検証用エンドポイント（最適化版）"""
    use_optimized = os.environ.get("USE_OPTIMIZED_AGENT", "true").lower() == "true"
    
    if use_optimized:
        result = await optimized_chat_with_conversation_agent(
            request=request,
            current_user=current_user,
            supabase=supabase,
            llm_client=llm_client,
            conversation_orchestrator=conversation_orchestrator,
            CONVERSATION_AGENT_AVAILABLE=CONVERSATION_AGENT_AVAILABLE,
            ENABLE_CONVERSATION_AGENT=ENABLE_CONVERSATION_AGENT
        )
        
        # 既存のConversationAgentResponseモデルに変換
        return ConversationAgentResponse(
            response=result.response,
            timestamp=result.timestamp,
            support_type=result.support_type,
            selected_acts=result.selected_acts,
            state_snapshot=result.state_snapshot,
            project_plan=result.project_plan,
            decision_metadata=result.decision_metadata,
            metrics=result.metrics,
            debug_info=result.debug_info,
            conversation_id=result.conversation_id,
            history_count=result.history_count,
            error=result.error,
            warning=result.warning
        )
    else:
        # 既存の処理にフォールバック
        # ... 既存のコードをそのまま使用
```

## 🔍 段階的移行戦略

### Phase 1: テスト環境での検証（推奨）
```bash
# 環境変数で最適化版を有効化
export USE_OPTIMIZED_CHAT=true
export USE_OPTIMIZED_AGENT=true
```

### Phase 2: カナリアリリース
- 一部のユーザーのみ最適化版を使用
- ユーザーIDやランダム値で振り分け

### Phase 3: 全面移行
- すべてのユーザーに最適化版を適用
- 既存コードは完全に置き換え

## ⚙️ 環境変数設定

`.env` ファイルに追加：

```env
# 最適化設定
USE_OPTIMIZED_CHAT=true        # 最適化版チャットエンドポイント使用
USE_OPTIMIZED_AGENT=true       # 最適化版エージェントエンドポイント使用
OPENAI_API_POOL_SIZE=10        # OpenAI API同時接続数
CHAT_HISTORY_LIMIT_DEFAULT=20  # デフォルト履歴取得数（削減）
CHAT_HISTORY_LIMIT_MAX=50      # 最大履歴取得数（削減）
```

## 📊 パフォーマンスモニタリング

最適化版では `performance_metrics` フィールドが追加され、以下の情報が取得できます：

```json
{
  "performance_metrics": {
    "db_fetch_time": 0.23,      // DB取得時間（秒）
    "llm_response_time": 1.45,  // LLM応答時間（秒）
    "db_save_time": 0.12,        // DB保存時間（秒）
    "total_time": 1.82           // 総処理時間（秒）
  }
}
```

## 🎯 期待される改善効果

1. **応答時間の短縮**: 30-50%の改善
   - DB操作の並列化により0.5-1秒短縮
   - 非同期処理により全体的な待ち時間削減

2. **同時接続数の向上**: 2-3倍の改善
   - セマフォによるリソース管理
   - 非ブロッキング処理の実装

3. **エラー耐性の向上**
   - フォールバック機構
   - 個別エラーハンドリング

## 📝 注意事項

1. **依存関係の追加**
   ```bash
   pip install aiofiles asyncio
   ```

2. **データベース接続プール**
   - Supabaseの接続数上限を確認
   - 必要に応じて接続プール設定を調整

3. **ロギング**
   - パフォーマンスメトリクスは自動的にログに記録
   - エラー時のフォールバックも記録

## 🔄 ロールバック手順

問題が発生した場合：

1. 環境変数を無効化
   ```bash
   export USE_OPTIMIZED_CHAT=false
   export USE_OPTIMIZED_AGENT=false
   ```

2. サービス再起動
   ```bash
   uvicorn backend.main:app --reload
   ```

## 📚 トラブルシューティング

### 問題: 504 Gateway Timeoutが継続
- **解決策**: `OPENAI_API_POOL_SIZE` を減らす（5-8）
- **解決策**: タイムアウト値を調整

### 問題: メモリ使用量の増加
- **解決策**: 履歴取得数をさらに削減
- **解決策**: セマフォのプールサイズを削減

### 問題: DB接続エラー
- **解決策**: Supabase接続数上限を確認
- **解決策**: 接続プールの設定を見直し

## 🚀 さらなる最適化案

1. **Redis導入**
   - 会話履歴のキャッシュ
   - プロジェクト情報のキャッシュ

2. **CDN活用**
   - 静的コンテンツの配信

3. **ワーカープロセス増加**
   ```python
   uvicorn.run(app, workers=8)  # CPUコア数に応じて調整
   ```

## 📞 サポート

問題が発生した場合は、以下の情報と共に報告してください：
- エラーログ
- performance_metrics の値
- 環境変数の設定
- 同時接続ユーザー数