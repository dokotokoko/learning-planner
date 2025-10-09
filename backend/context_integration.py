"""
main.pyへのコンテキスト管理機能統合パッチ
既存のコードを最小限の変更で拡張
"""
import os
import logging
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime, timezone
import asyncio

from context_manager import ContextManager, ContextMetrics
from embedding_utils import EmbeddingClient, SemanticSearch

logger = logging.getLogger(__name__)

# 環境変数でコンテキスト管理機能の有効/無効を制御
ENABLE_CONTEXT_MANAGER = os.environ.get("ENABLE_CONTEXT_MANAGER", "false").lower() == "true"
ENABLE_EMBEDDINGS = os.environ.get("ENABLE_EMBEDDINGS", "false").lower() == "true"

# グローバルインスタンス（起動時に初期化）
context_manager: Optional[ContextManager] = None
embedding_client: Optional[EmbeddingClient] = None
semantic_search: Optional[SemanticSearch] = None


async def initialize_context_system(supabase_client=None):
    """
    コンテキスト管理システムを初期化
    main.pyのアプリケーション起動時に呼び出す
    """
    global context_manager, embedding_client, semantic_search
    
    if not ENABLE_CONTEXT_MANAGER:
        logger.info("ℹ️ コンテキスト管理機能は無効です")
        return False
    
    try:
        logger.info("🚀 コンテキスト管理システムの初期化を開始")
        
        # トークンカウンター（tiktoken使用時はここで初期化）
        token_counter = None
        try:
            import tiktoken
            encoding = tiktoken.encoding_for_model("gpt-3.5-turbo")
            token_counter = lambda text: len(encoding.encode(text))
            logger.info("✅ tiktoken を使用したトークンカウンターを初期化")
        except ImportError:
            logger.warning("⚠️ tiktoken が見つかりません。簡易カウンターを使用します")
        
        # 埋め込みクライアント（Phase 2）
        if ENABLE_EMBEDDINGS:
            provider = os.environ.get("EMBEDDING_PROVIDER", "openai")
            embedding_client = EmbeddingClient(provider=provider)
            semantic_search = SemanticSearch(embedding_client, supabase_client)
            logger.info(f"✅ 埋め込み機能を初期化: {provider}")
        
        # コンテキストマネージャー
        context_manager = ContextManager(
            supabase_client=supabase_client,
            embedding_client=embedding_client,
            token_counter=token_counter
        )
        
        logger.info("🎉 コンテキスト管理システムの初期化が完了しました")
        return True
        
    except Exception as e:
        logger.error(f"❌ コンテキスト管理システムの初期化に失敗: {e}")
        # フォールバック: システムは無効化されるが、アプリは続行
        context_manager = None
        embedding_client = None
        semantic_search = None
        return False


async def build_enhanced_messages(
    user_message: str,
    conversation_id: str,
    conversation_history: List[Dict[str, Any]],
    system_prompt: str
) -> Tuple[List[Dict[str, str]], Optional[ContextMetrics]]:
    """
    強化されたメッセージリストを構築
    
    この関数をmain.pyから呼び出して、既存のメッセージ構築を置き換える
    コンテキスト管理が無効な場合は従来の方式にフォールバック
    """
    
    # コンテキスト管理が有効な場合
    if context_manager:
        try:
            messages, metrics = await context_manager.build_context(
                user_message=user_message,
                conversation_id=conversation_id,
                system_prompt=system_prompt,
                conversation_history=conversation_history
            )
            
            # メトリクスをログ出力（デバッグ用）
            if metrics:
                logger.info(f"📊 コンテキストメトリクス:")
                logger.info(f"   総トークン: {metrics.total_tokens}")
                logger.info(f"   圧縮率: {metrics.compression_ratio:.2f}")
                if metrics.retrieval_hits > 0:
                    logger.info(f"   検索ヒット: {metrics.retrieval_hits}")
            
            return messages, metrics
            
        except Exception as e:
            logger.error(f"❌ コンテキスト構築エラー: {e}")
            # エラー時は従来方式にフォールバック
    
    # 従来の方式（フォールバック）
    messages = build_legacy_messages(
        user_message,
        conversation_history,
        system_prompt
    )
    
    return messages, None


def build_legacy_messages(
    user_message: str,
    conversation_history: List[Dict[str, Any]],
    system_prompt: str
) -> List[Dict[str, str]]:
    """
    従来のメッセージ構築方式（フォールバック用）
    main.pyの既存ロジックをそのまま使用
    """
    messages = [{"role": "system", "content": system_prompt}]
    
    if conversation_history:
        for history_msg in conversation_history:
            role = "user" if history_msg["sender"] == "user" else "assistant"
            messages.append({"role": role, "content": history_msg["message"]})
    
    messages.append({"role": "user", "content": user_message})
    
    return messages


async def save_message_with_embedding(
    supabase_client,
    message_data: Dict[str, Any],
    generate_embedding: bool = True
) -> bool:
    """
    メッセージを保存し、必要に応じて埋め込みも生成
    
    Phase 2で使用: chat_logsテーブルに埋め込みベクトルも保存
    """
    try:
        # 基本的なメッセージ保存
        result = await asyncio.to_thread(
            lambda: supabase_client.table("chat_logs").insert(message_data).execute()
        )
        
        if not result.data:
            return False
        
        message_id = result.data[0]["id"]
        
        # 埋め込み生成（有効な場合のみ）
        if ENABLE_EMBEDDINGS and embedding_client and generate_embedding:
            try:
                message_text = message_data.get("message", "")
                if message_text:
                    # 非同期で埋め込み生成
                    embedding = await embedding_client.generate_embedding(message_text)
                    
                    # 埋め込みをDBに保存
                    # 注: pgvectorの場合は配列をそのまま保存可能
                    embedding_data = {
                        "embedding": embedding.tolist()
                    }
                    
                    await asyncio.to_thread(
                        lambda: supabase_client.table("chat_logs")
                        .update(embedding_data)
                        .eq("id", message_id)
                        .execute()
                    )
                    
                    logger.info(f"✅ 埋め込みを生成・保存: メッセージID={message_id}")
                    
            except Exception as e:
                # 埋め込み生成に失敗してもメッセージ保存は成功とする
                logger.warning(f"⚠️ 埋め込み生成エラー（メッセージは保存済み）: {e}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ メッセージ保存エラー: {e}")
        return False


async def search_relevant_context(
    query: str,
    conversation_id: str,
    k: int = 3
) -> List[Dict[str, Any]]:
    """
    関連する過去の文脈を検索
    
    Phase 2で使用: 意味的類似検索を実行
    """
    if not semantic_search:
        return []
    
    try:
        results = await semantic_search.search(
            query=query,
            conversation_id=conversation_id,
            k=k,
            use_mmr=True
        )
        
        # 結果を辞書形式に変換
        context_items = []
        for result in results:
            context_items.append({
                "id": result.id,
                "message": result.text,
                "score": result.score,
                "metadata": result.metadata
            })
        
        return context_items
        
    except Exception as e:
        logger.error(f"❌ 検索エラー: {e}")
        return []


async def update_conversation_summary(
    supabase_client,
    conversation_id: str,
    conversation_history: List[Dict[str, Any]],
    force: bool = False
) -> bool:
    """
    会話の要約を更新
    
    Phase 2で使用: LLMを使って要約を生成
    """
    if not context_manager:
        return False
    
    try:
        turn_count = len(conversation_history)
        updated = await context_manager.rotate_summary_if_needed(
            conversation_id=conversation_id,
            turn_count=turn_count,
            force=force
        )
        
        if updated:
            logger.info(f"✅ 会話要約を更新: {conversation_id[:8]}...")
        
        return updated
        
    except Exception as e:
        logger.error(f"❌ 要約更新エラー: {e}")
        return False


# ==================================================
# main.pyへの統合方法
# ==================================================
"""
main.pyに以下の変更を追加:

1. インポート追加（ファイル先頭付近）:
```python
from context_integration import (
    initialize_context_system,
    build_enhanced_messages,
    save_message_with_embedding,
    ENABLE_CONTEXT_MANAGER
)
```

2. アプリケーション起動時の初期化（@app.on_event("startup")内）:
```python
@app.on_event("startup")
async def startup_event():
    # 既存の初期化コード...
    
    # コンテキスト管理システムの初期化
    if ENABLE_CONTEXT_MANAGER:
        await initialize_context_system(supabase)
```

3. /chatエンドポイントの変更（754-766行目付近）:
```python
# 既存のコード:
# messages = [{"role": "system", "content": dev_system_prompt}]
# if conversation_history:
#     for history_msg in conversation_history:
#         role = "user" if history_msg["sender"] == "user" else "assistant"
#         messages.append({"role": role, "content": history_msg["message"]})
# messages.append({"role": "user", "content": user_message})

# 新しいコード:
messages, context_metrics = await build_enhanced_messages(
    user_message=user_message,
    conversation_id=conversation_id,
    conversation_history=conversation_history,
    system_prompt=dev_system_prompt
)

# メトリクスを応答に含める場合
if context_metrics:
    # context_metadataに追加
    context_metadata = {
        "tokens_used": context_metrics.total_tokens,
        "compression_ratio": context_metrics.compression_ratio,
        # ... 他のメトリクス
    }
```

4. メッセージ保存時の変更（779行目付近）:
```python
# 既存のコード:
# await asyncio.to_thread(lambda: supabase.table("chat_logs").insert(user_message_data).execute())

# 新しいコード:
if ENABLE_CONTEXT_MANAGER:
    await save_message_with_embedding(supabase, user_message_data, generate_embedding=True)
else:
    await asyncio.to_thread(lambda: supabase.table("chat_logs").insert(user_message_data).execute())
```

これらの変更により、環境変数でコンテキスト管理機能のON/OFFを切り替え可能になります。
"""