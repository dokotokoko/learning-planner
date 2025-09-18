"""
main.py 統合パッチ
このファイルには、main.pyの特定のセクションを置き換えるためのコードが含まれています。
"""

# ===================================
# 1. インポートセクションの追加
# ===================================
IMPORT_ADDITIONS = """
# 最適化モジュールのインポート
from backend.async_helpers import (
    AsyncDatabaseHelper,
    AsyncProjectContextBuilder,
    parallel_fetch_context_and_history,
    parallel_save_chat_logs
)
from module.async_llm_api import get_async_llm_client
"""

# ===================================
# 2. グローバル変数の追加
# ===================================
GLOBAL_ADDITIONS = """
# 非同期処理用グローバル変数
async_llm_client = None  # 非同期LLMクライアント
USE_OPTIMIZED_ENDPOINTS = os.environ.get("USE_OPTIMIZED_ENDPOINTS", "true").lower() == "true"
"""

# ===================================
# 3. startup_event の修正版
# ===================================
STARTUP_EVENT_MODIFICATION = """
    # 既存のコードの後に追加
    
    # 非同期LLMクライアントの初期化
    global async_llm_client
    if USE_OPTIMIZED_ENDPOINTS:
        try:
            async_llm_client = get_async_llm_client(pool_size=10)
            logger.info("✅ 非同期LLMクライアント初期化完了（プールサイズ: 10）")
        except Exception as e:
            logger.error(f"❌ 非同期LLMクライアント初期化エラー: {e}")
            async_llm_client = None
"""

# ===================================
# 4. 最適化版 /chat エンドポイント
# ===================================
OPTIMIZED_CHAT_ENDPOINT = '''
@app.post("/chat", response_model=ChatResponse, dependencies=[Depends(chat_rate_limiter)])
async def chat_with_ai(
    chat_data: ChatMessage,
    current_user: int = Depends(get_current_user_cached)
):
    """AIとのチャット（ハイブリッド版 - 最適化対応）"""
    try:
        validate_supabase()
        
        # 最適化版の使用判定
        if USE_OPTIMIZED_ENDPOINTS and async_llm_client:
            # 最適化版実装
            from backend.async_helpers import (
                AsyncDatabaseHelper,
                AsyncProjectContextBuilder,
                parallel_fetch_context_and_history
            )
            
            # パフォーマンス計測
            import time
            start_time = time.time()
            
            # ヘルパー初期化
            db_helper = AsyncDatabaseHelper(supabase)
            context_builder = AsyncProjectContextBuilder(db_helper)
            
            # ページIDの決定
            page_id = chat_data.page_id or chat_data.page or "general"
            
            # conversationの取得/作成
            conversation_id = await get_or_create_conversation(current_user, page_id)
            
            # 履歴取得数の動的調整
            history_limit = 20  # デフォルトを減らす
            if chat_data.message and len(chat_data.message) > 500:
                history_limit = 50
            elif ENABLE_CONVERSATION_AGENT and conversation_orchestrator:
                history_limit = 100
            
            # プロジェクトコンテキストと履歴を並列取得
            project_id, project_context, project, conversation_history = await parallel_fetch_context_and_history(
                db_helper=db_helper,
                context_builder=context_builder,
                page_id=page_id,
                conversation_id=conversation_id,
                user_id=current_user,
                history_limit=history_limit
            )
            
            logger.info(f"📊 並列データ取得完了: 履歴{len(conversation_history)}件, 処理時間{time.time() - start_time:.2f}秒")
            
            # システムプロンプト構築
            from prompt.prompt import system_prompt
            system_prompt_with_context = system_prompt
            if project_context:
                system_prompt_with_context += project_context
            
            # メッセージ構築
            messages = [{"role": "system", "content": system_prompt_with_context}]
            if conversation_history:
                for history_msg in conversation_history:
                    role = "user" if history_msg["sender"] == "user" else "assistant"
                    messages.append({"role": role, "content": history_msg["message"]})
            messages.append({"role": "user", "content": chat_data.message})
            
            # LLM応答生成（非同期）
            response = await async_llm_client.generate_response_async(messages)
            
            # コンテキストデータ構築
            context_data_dict = {"timestamp": datetime.now(timezone.utc).isoformat()}
            if chat_data.memo_content:
                context_data_dict["memo_content"] = chat_data.memo_content[:500]
            if project_id:
                context_data_dict["project_id"] = project_id
            if project:
                context_data_dict["project_info"] = {
                    "theme": project.get("theme"),
                    "question": project.get("question"),
                    "hypothesis": project.get("hypothesis")
                }
            
            # ログの並列保存
            from backend.async_helpers import parallel_save_chat_logs
            
            user_msg_data = {
                "user_id": current_user,
                "page_id": page_id,
                "sender": "user",
                "message": chat_data.message,
                "conversation_id": conversation_id,
                "context_data": context_data_dict
            }
            
            ai_msg_data = {
                "user_id": current_user,
                "page_id": page_id,
                "sender": "assistant",
                "message": response,
                "conversation_id": conversation_id,
                "context_data": {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "has_project_context": bool(project_context),
                    "optimized": True
                }
            }
            
            await parallel_save_chat_logs(db_helper, user_msg_data, ai_msg_data)
            
            # conversation timestamp更新（非ブロッキング）
            asyncio.create_task(update_conversation_timestamp(conversation_id))
            
            total_time = time.time() - start_time
            logger.info(f"✅ 最適化版チャット処理完了: 総処理時間{total_time:.2f}秒")
            
            return ChatResponse(
                response=response,
                timestamp=datetime.now(timezone.utc).isoformat(),
                token_usage=None,
                context_metadata={"has_project_context": bool(project_context), "optimized": True}
            )
            
        else:
            # ========== 既存の実装（フォールバック）==========
            # 以下は元のコードをそのまま使用
            # ... [既存のコード]
            pass  # 実際のコードは元のmain.pyから取得
            
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error(f"Chat API Error: {str(e)}\\nTraceback: {traceback.format_exc()}")
        handle_database_error(e, "AI応答の生成")
'''

# ===================================
# 5. .env ファイルの追加設定
# ===================================
ENV_ADDITIONS = """
# 最適化設定
USE_OPTIMIZED_ENDPOINTS=true    # 最適化エンドポイント使用フラグ
OPENAI_API_POOL_SIZE=10         # OpenAI API接続プールサイズ
ASYNC_DB_POOL_SIZE=20            # 非同期DB接続プールサイズ
PARALLEL_FETCH_ENABLED=true      # 並列データ取得有効化
CACHE_ENABLED=false              # キャッシュ有効化（将来実装）
"""

# ===================================
# 6. 簡易統合スクリプト
# ===================================
def generate_patch_instructions():
    """
    パッチ適用の手順を生成
    """
    instructions = """
    ========================================
    main.py パッチ適用手順
    ========================================
    
    1. バックアップの作成:
       cp backend/main.py backend/main.py.backup
    
    2. インポートの追加:
       - main.pyの冒頭のインポートセクションに IMPORT_ADDITIONS を追加
    
    3. グローバル変数の追加:
       - グローバル変数セクション（llm_client = None の後）に GLOBAL_ADDITIONS を追加
    
    4. startup_event の更新:
       - startup_event 関数の最後に STARTUP_EVENT_MODIFICATION を追加
    
    5. /chat エンドポイントの置き換え:
       - 既存の chat_with_ai 関数を OPTIMIZED_CHAT_ENDPOINT で置き換え
       - ただし、既存コードは else ブロック内に保持
    
    6. .env ファイルの更新:
       - ENV_ADDITIONS の内容を .env ファイルに追加
    
    7. 依存関係のインストール:
       pip install aiofiles
    
    8. テスト実行:
       python -m pytest tests/test_optimized_endpoints.py
    
    9. サービス再起動:
       uvicorn backend.main:app --reload --workers 4
    
    ========================================
    ロールバック手順
    ========================================
    
    問題が発生した場合:
    1. cp backend/main.py.backup backend/main.py
    2. .env で USE_OPTIMIZED_ENDPOINTS=false に設定
    3. サービス再起動
    
    ========================================
    """
    return instructions

if __name__ == "__main__":
    print(generate_patch_instructions())