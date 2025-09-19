"""
最適化されたAPIエンドポイント実装
並列処理と非同期処理を活用してパフォーマンスを改善
"""

import asyncio
import json
import time
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from fastapi import HTTPException, Depends, status
from pydantic import BaseModel

from async_helpers import (
    AsyncDatabaseHelper,
    AsyncProjectContextBuilder,
    parallel_fetch_context_and_history,
    parallel_save_chat_logs,
    rate_limited_openai_call
)
from module.async_llm_api import get_async_llm_client

logger = logging.getLogger(__name__)


class OptimizedChatResponse(BaseModel):
    """最適化されたチャットレスポンスモデル"""
    response: str
    timestamp: str
    token_usage: Optional[Dict[str, Any]] = None
    context_metadata: Optional[Dict[str, Any]] = None
    support_type: Optional[str] = None
    selected_acts: Optional[List[str]] = None
    state_snapshot: Optional[Dict[str, Any]] = None
    project_plan: Optional[Dict[str, Any]] = None
    decision_metadata: Optional[Dict[str, Any]] = None
    metrics: Optional[Dict[str, Any]] = None
    performance_metrics: Optional[Dict[str, Any]] = None  # パフォーマンス指標を追加

async def optimized_chat_with_ai(
    chat_data,
    current_user: int,
    supabase,
    llm_client,
    conversation_orchestrator,
    ENABLE_CONVERSATION_AGENT: bool,
    MAX_CHAT_MESSAGE_LENGTH: int = 2000
):
    """
    最適化版 chat_with_ai エンドポイント
    並列処理と非同期処理を活用
    
    Args:
        chat_data: チャットメッセージデータ
        current_user: 現在のユーザーID
        supabase: Supabaseクライアント
        llm_client: LLMクライアント（互換性のため保持）
        conversation_orchestrator: 対話オーケストレーター
        ENABLE_CONVERSATION_AGENT: 対話エージェント有効化フラグ
        MAX_CHAT_MESSAGE_LENGTH: メッセージ最大長
        
    Returns:
        OptimizedChatResponse
    """
    # パフォーマンス計測開始
    start_time = time.time()
    metrics = {
        "db_fetch_time": 0,
        "llm_response_time": 0,
        "db_save_time": 0,
        "total_time": 0
    }
    
    try:
        # 基本検証
        if not supabase:
            raise HTTPException(status_code=500, detail="データベース接続が初期化されていません")
        
        if llm_client is None and not ENABLE_CONVERSATION_AGENT:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="LLMクライアントが初期化されていません"
            )
        
        # メッセージ長検証
        if chat_data.message and len(chat_data.message) > MAX_CHAT_MESSAGE_LENGTH:
            raise HTTPException(status_code=400, detail="Message too long")
        
        # ヘルパー初期化
        db_helper = AsyncDatabaseHelper(supabase)
        context_builder = AsyncProjectContextBuilder(db_helper)
        async_llm = get_async_llm_client()
        
        # ページIDの決定（ChatMessageからpage関連フィールドが削除されたため固定値を使用）
        page_id = "general"
        
        # ====================
        # Step 1: 並列データ取得
        # ====================
        db_fetch_start = time.time()
        
        # conversationの取得/作成（既存の関数を非同期化）
        conversation_id = await asyncio.to_thread(
            lambda: get_or_create_conversation_sync(supabase, current_user, page_id)
        )
        
        # 履歴取得数の動的調整（パフォーマンス改善）
        history_limit = 20  # デフォルトを減らす
        if chat_data.message and len(chat_data.message) > 500:
            history_limit = 50  # 長いメッセージの場合は増やす
        elif ENABLE_CONVERSATION_AGENT and conversation_orchestrator:
            history_limit = 100  # 対話エージェント使用時は最大
        
        # プロジェクトコンテキストと履歴を並列取得
        project_id, project_context, project, conversation_history = await parallel_fetch_context_and_history(
            db_helper=db_helper,
            context_builder=context_builder,
            page_id=page_id,
            conversation_id=conversation_id,
            user_id=current_user,
            history_limit=history_limit
        )
        
        metrics["db_fetch_time"] = time.time() - db_fetch_start
        logger.info(f"📊 DB取得時間: {metrics['db_fetch_time']:.2f}秒 (履歴: {len(conversation_history)}件)")
        
        # ====================
        # Step 2: メッセージ構築
        # ====================
        system_prompt_with_context = build_system_prompt(project_context)
        messages = build_message_history(system_prompt_with_context, conversation_history, chat_data.message)
        
        # ====================
        # Step 3: LLM応答生成（並列化可能な場合）
        # ====================
        llm_start = time.time()
        agent_payload = {}
        
        if ENABLE_CONVERSATION_AGENT and conversation_orchestrator is not None:
            # 対話エージェント処理
            try:
                agent_result = await process_with_conversation_agent(
                    conversation_orchestrator,
                    chat_data.message,
                    conversation_history,
                    project,
                    project_id,
                    current_user,
                    conversation_id
                )
                response = agent_result["response"]
                agent_payload = extract_agent_payload(agent_result)
                
                # followupsがある場合
                if agent_result.get("followups"):
                    followup_text = "\n\n**次にできること:**\n" + "\n".join([f"• {f}" for f in agent_result["followups"][:3]])
                    response += followup_text
                
                logger.info(f"✅ 対話エージェント処理完了: {agent_result.get('support_type')}")
                
            except Exception as e:
                logger.error(f"❌ 対話エージェントエラー、フォールバック: {e}")
                # フォールバック: 非同期LLM呼び出し
                response = await async_llm.generate_with_fallback(messages)
        else:
            # 通常の非同期LLM呼び出し
            response = await async_llm.generate_response_async(messages)
        
        metrics["llm_response_time"] = time.time() - llm_start
        logger.info(f"📊 LLM応答時間: {metrics['llm_response_time']:.2f}秒")
        
        # ====================
        # Step 4: ログの並列保存
        # ====================
        save_start = time.time()
        
        # context_data構築
        user_context_data = build_context_data(
            project_id=project_id,
            project=project,
            #memo_content=chat_data.memo_content
        )
        
        ai_context_data = build_ai_context_data(
            project_context=project_context,
            project_id=project_id,
            agent_payload=agent_payload,
            is_agent=bool(agent_payload)
        )
        
        # ユーザーメッセージとAIメッセージのデータ準備
        user_msg_data = {
            "user_id": current_user,
            "page_id": page_id,
            "sender": "user",
            "message": chat_data.message,
            "conversation_id": conversation_id,
            "context_data": user_context_data
        }
        
        ai_msg_data = {
            "user_id": current_user,
            "page_id": page_id,
            "sender": "assistant",
            "message": response,
            "conversation_id": conversation_id,
            "context_data": ai_context_data
        }
        
        # 並列保存
        user_saved, ai_saved = await parallel_save_chat_logs(
            db_helper,
            user_msg_data,
            ai_msg_data
        )
        
        # conversation timestampの更新（非ブロッキング）
        asyncio.create_task(
            update_conversation_timestamp_async(db_helper, conversation_id)
        )
        
        metrics["db_save_time"] = time.time() - save_start
        logger.info(f"📊 DB保存時間: {metrics['db_save_time']:.2f}秒")
        
        # ====================
        # Step 5: レスポンス構築
        # ====================
        metrics["total_time"] = time.time() - start_time
        
        # パフォーマンスメトリクスを含めたレスポンス
        return OptimizedChatResponse(
            response=response,
            timestamp=datetime.now(timezone.utc).isoformat(),
            token_usage=None,  # トークン使用量は削除
            context_metadata={"has_project_context": bool(project_context)},
            performance_metrics=metrics,
            **agent_payload
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error(f"Chat API Error: {str(e)}\nTraceback: {traceback.format_exc()}")
        
        # エラー時もメトリクスを返す
        metrics["total_time"] = time.time() - start_time
        metrics["error"] = str(e)
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI応答の生成でエラーが発生しました: {str(e)}"
        )


# =====================================
# ヘルパー関数群
# =====================================

def get_or_create_conversation_sync(supabase, user_id: int, page_id: str) -> str:
    """既存のget_or_create_conversation関数の同期版"""
    try:
        existing_conv = supabase.table("chat_conversations").select("*").eq("user_id", user_id).eq("page_id", page_id).execute()
        
        if existing_conv.data:
            return existing_conv.data[0]["id"]
        else:
            title = f"{page_id}での相談"
            new_conv_data = {
                "user_id": user_id,
                "title": title,
                "page_id": page_id
            }
            new_conv = supabase.table("chat_conversations").insert(new_conv_data).execute()
            return new_conv.data[0]["id"] if new_conv.data else None
    except Exception as e:
        logger.error(f"conversation取得/作成エラー: {e}")
        raise


def build_system_prompt(project_context: Optional[str]) -> str:
    """システムプロンプトを構築"""
    from prompt.prompt import system_prompt
    
    system_prompt_with_context = system_prompt
    if project_context:
        system_prompt_with_context += project_context
        logger.info(f"✅ システムプロンプトにプロジェクト情報を追加")
    
    return system_prompt_with_context


def build_message_history(
    system_prompt: str, 
    conversation_history: List[Dict[str, Any]], 
    user_message: str
) -> List[Dict[str, str]]:
    """メッセージ履歴を構築"""
    messages = [{"role": "system", "content": system_prompt}]
    
    if conversation_history:
        for history_msg in conversation_history:
            role = "user" if history_msg["sender"] == "user" else "assistant"
            messages.append({"role": role, "content": history_msg["message"]})
    
    messages.append({"role": "user", "content": user_message})
    return messages


def build_context_data(
    project_id: Optional[int],
    project: Optional[Dict[str, Any]]
    #memo_content: Optional[str]
) -> Dict[str, Any]:
    """コンテキストデータを構築"""
    context_data = {"timestamp": datetime.now(timezone.utc).isoformat()}
    
    #if memo_content:
    #   context_data["memo_content"] = memo_content[:500]
    
    if project_id:
        context_data["project_id"] = project_id
    
    if project:
        context_data["project_info"] = {
            "theme": project.get('theme'),
            "question": project.get('question'),
            "hypothesis": project.get('hypothesis')
        }
    
    return context_data


def build_ai_context_data(
    project_context: Optional[str],
    project_id: Optional[int],
    agent_payload: Dict[str, Any],
    is_agent: bool
) -> Dict[str, Any]:
    """AIコンテキストデータを構築"""
    context_data = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "has_project_context": bool(project_context)
    }
    
    if project_id:
        context_data["project_id"] = project_id
    
    if is_agent:
        context_data["conversation_agent"] = True
        context_data.update(agent_payload)
    
    return context_data


async def process_with_conversation_agent(
    orchestrator,
    user_message: str,
    conversation_history: List[Dict[str, Any]],
    project: Optional[Dict[str, Any]],
    project_id: Optional[int],
    user_id: int,
    conversation_id: str
) -> Dict[str, Any]:
    """対話エージェントでの処理を非同期化"""
    # 履歴フォーマット変換
    agent_history = []
    for history_msg in conversation_history:
        sender = "user" if history_msg["sender"] == "user" else "assistant"
        agent_history.append({
            "sender": sender,
            "message": history_msg["message"]
        })
    
    # プロジェクトコンテキスト変換
    agent_project_context = None
    if project:
        agent_project_context = {
            "theme": project.get('theme'),
            "question": project.get('question'),
            "hypothesis": project.get('hypothesis'),
            "id": project_id
        }
    
    # 対話エージェント処理（非同期ラップ）
    return await asyncio.to_thread(
        orchestrator.process_turn,
        user_message=user_message,
        conversation_history=agent_history,
        project_context=agent_project_context,
        user_id=user_id,
        conversation_id=conversation_id
    )


def extract_agent_payload(agent_result: Dict[str, Any]) -> Dict[str, Any]:
    """エージェント結果からペイロードを抽出"""
    return {
        "support_type": agent_result.get("support_type"),
        "selected_acts": agent_result.get("selected_acts"),
        "state_snapshot": agent_result.get("state_snapshot"),
        "project_plan": agent_result.get("project_plan"),
        "decision_metadata": agent_result.get("decision_metadata"),
        "metrics": agent_result.get("metrics"),
    }


async def update_conversation_timestamp_async(db_helper: AsyncDatabaseHelper, conversation_id: str):
    """conversation timestampを非同期で更新（エラーは無視）"""
    try:
        await asyncio.to_thread(
            lambda: db_helper.supabase.table("chat_conversations").update({
                "updated_at": datetime.now().isoformat()
            }).eq("id", conversation_id).execute()
        )
    except Exception as e:
        logger.warning(f"conversation timestamp更新エラー（無視）: {e}")