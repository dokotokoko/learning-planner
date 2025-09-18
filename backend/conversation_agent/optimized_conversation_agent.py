"""
最適化された対話エージェントエンドポイント
並列処理を活用してパフォーマンスを改善
"""

import asyncio
import json
import time
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from fastapi import HTTPException, status
from pydantic import BaseModel

from backend.async_helpers import (
    AsyncDatabaseHelper,
    AsyncProjectContextBuilder,
    parallel_fetch_context_and_history,
    parallel_save_chat_logs
)

logger = logging.getLogger(__name__)


class OptimizedConversationAgentResponse(BaseModel):
    """最適化された対話エージェントレスポンスモデル"""
    response: str
    timestamp: str
    support_type: str
    selected_acts: List[str]
    state_snapshot: Dict[str, Any]
    project_plan: Optional[Dict[str, Any]]
    decision_metadata: Dict[str, Any]
    metrics: Dict[str, Any]
    debug_info: Optional[Dict[str, Any]] = None
    conversation_id: Optional[str] = None
    history_count: int = 0
    error: Optional[str] = None
    warning: Optional[str] = None
    performance_metrics: Optional[Dict[str, Any]] = None


async def optimized_chat_with_conversation_agent(
    request,
    current_user: int,
    supabase,
    llm_client,
    conversation_orchestrator,
    CONVERSATION_AGENT_AVAILABLE: bool,
    ENABLE_CONVERSATION_AGENT: bool
):
    """
    最適化版 conversation agent エンドポイント
    並列処理と非同期処理を活用
    
    Args:
        request: ConversationAgentRequest
        current_user: 現在のユーザーID
        supabase: Supabaseクライアント
        llm_client: LLMクライアント
        conversation_orchestrator: 対話オーケストレーター
        CONVERSATION_AGENT_AVAILABLE: エージェントモジュール利用可能フラグ
        ENABLE_CONVERSATION_AGENT: エージェント有効化フラグ
        
    Returns:
        OptimizedConversationAgentResponse
    """
    start_time = time.time()
    metrics = {
        "db_fetch_time": 0,
        "agent_processing_time": 0,
        "db_save_time": 0,
        "total_time": 0
    }
    
    try:
        # 基本検証
        if not supabase:
            raise HTTPException(status_code=500, detail="データベース接続が初期化されていません")
        
        # エージェントの可用性チェック
        if not CONVERSATION_AGENT_AVAILABLE:
            return OptimizedConversationAgentResponse(
                response="対話エージェント機能は現在利用できません。",
                timestamp=datetime.now(timezone.utc).isoformat(),
                support_type="error",
                selected_acts=[],
                state_snapshot={},
                decision_metadata={},
                metrics={"error": "module_not_available"},
                error="ConversationAgent module not available",
                history_count=0
            )
        
        # オーケストレーター初期化（必要な場合）
        if conversation_orchestrator is None:
            try:
                # 動的インポートで初期化を試みる
                from backend.conversation_agent import ConversationOrchestrator
                temp_orchestrator = ConversationOrchestrator(
                    llm_client=llm_client,
                    use_mock=request.mock_mode
                )
                logger.info(f"✅ 対話エージェント一時初期化完了（mock={request.mock_mode}）")
            except Exception as e:
                logger.error(f"❌ 対話エージェント初期化エラー: {e}")
                return OptimizedConversationAgentResponse(
                    response="対話エージェントの初期化に失敗しました。",
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    support_type="error",
                    selected_acts=[],
                    state_snapshot={},
                    decision_metadata={},
                    metrics={"error": "initialization_failed"},
                    error=f"Initialization error: {str(e)}",
                    history_count=0
                )
        else:
            temp_orchestrator = conversation_orchestrator
        
        # ヘルパー初期化
        db_helper = AsyncDatabaseHelper(supabase)
        context_builder = AsyncProjectContextBuilder(db_helper)
        
        # ページIDの決定
        page_id = request.page_id or (f"project-{request.project_id}" if request.project_id else "general")
        
        # ====================
        # Step 1: 並列データ取得
        # ====================
        db_fetch_start = time.time()
        
        # 以下の処理を並列実行:
        # 1. conversationの取得/作成
        # 2. プロジェクト情報の取得（必要な場合）
        # 3. 対話履歴の取得（必要な場合）
        
        async def get_conversation_id_async():
            return await asyncio.to_thread(
                lambda: get_or_create_conversation_sync(supabase, current_user, page_id)
            )
        
        async def get_project_context_async():
            if request.project_id:
                if request.mock_mode:
                    # モックモードではダミーデータを返す
                    return {
                        "theme": "AI技術の教育への応用",
                        "question": "AIを活用した個別最適化学習システムはどのように学習効果を向上させるか？",
                        "hypothesis": "AIが学習者の理解度と学習パターンを分析することで、個別に最適化された学習経験を提供し、学習効果を向上させる",
                        "id": request.project_id
                    }
                else:
                    project_info = await db_helper.get_project_info(request.project_id, current_user)
                    if project_info:
                        return {
                            "theme": project_info.get('theme'),
                            "question": project_info.get('question'),
                            "hypothesis": project_info.get('hypothesis'),
                            "id": request.project_id
                        }
            return None
        
        # 並列実行タスク構築
        tasks = [get_conversation_id_async()]
        
        if request.project_id:
            tasks.append(get_project_context_async())
        
        # 並列実行
        results = await asyncio.gather(*tasks)
        conversation_id = results[0]
        project_context = results[1] if len(results) > 1 else None
        
        # 対話履歴取得（プロジェクトコンテキスト取得と並列化可能）
        conversation_history = []
        if request.include_history:
            conversation_history = await db_helper.get_conversation_history(
                conversation_id,
                request.history_limit
            )
            logger.info(f"📜 対話履歴取得: {len(conversation_history)}件")
        
        metrics["db_fetch_time"] = time.time() - db_fetch_start
        logger.info(f"📊 DB取得時間: {metrics['db_fetch_time']:.2f}秒")
        
        # ====================
        # Step 2: エージェント処理
        # ====================
        agent_start = time.time()
        
        try:
            # 履歴フォーマット変換
            agent_history = []
            for msg in conversation_history:
                agent_history.append({
                    "sender": msg["sender"],
                    "message": msg["message"]
                })
            
            # エージェント処理（非同期ラップ）
            agent_result = await asyncio.to_thread(
                temp_orchestrator.process_turn,
                user_message=request.message,
                conversation_history=agent_history,
                project_context=project_context,
                user_id=current_user,
                conversation_id=conversation_id
            )
            
            metrics["agent_processing_time"] = time.time() - agent_start
            logger.info(f"📊 エージェント処理時間: {metrics['agent_processing_time']:.2f}秒")
            
            # デバッグ情報構築
            debug_info = None
            if request.debug_mode:
                debug_info = {
                    "processing_time_ms": int(metrics["agent_processing_time"] * 1000),
                    "mock_mode": request.mock_mode,
                    "history_items": len(conversation_history),
                    "has_project_context": bool(project_context),
                    "conversation_id": conversation_id,
                    "page_id": page_id,
                    "raw_state": agent_result.get("state_snapshot", {}),
                    "raw_decision": agent_result.get("decision_metadata", {}),
                    "raw_metrics": agent_result.get("metrics", {})
                }
            
            # ====================
            # Step 3: ログの並列保存
            # ====================
            save_start = time.time()
            
            # メッセージデータ準備
            user_msg_data = {
                "user_id": current_user,
                "page_id": page_id,
                "sender": "user",
                "message": request.message,
                "conversation_id": conversation_id,
                "context_data": {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "agent_endpoint": True,
                    "project_id": request.project_id
                }
            }
            
            ai_msg_data = {
                "user_id": current_user,
                "page_id": page_id,
                "sender": "assistant",
                "message": agent_result["response"],
                "conversation_id": conversation_id,
                "context_data": {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "agent_endpoint": True,
                    "support_type": agent_result.get("support_type"),
                    "selected_acts": agent_result.get("selected_acts"),
                    "state_snapshot": agent_result.get("state_snapshot", {}),
                    "project_plan": agent_result.get("project_plan"),
                    "decision_metadata": agent_result.get("decision_metadata", {}),
                    "metrics": agent_result.get("metrics", {})
                }
            }
            
            # 並列保存
            user_saved, ai_saved = await parallel_save_chat_logs(
                db_helper,
                user_msg_data,
                ai_msg_data
            )
            
            # conversation timestamp更新（非ブロッキング）
            asyncio.create_task(
                asyncio.to_thread(
                    lambda: supabase.table("chat_conversations").update({
                        "updated_at": datetime.now().isoformat()
                    }).eq("id", conversation_id).execute()
                )
            )
            
            metrics["db_save_time"] = time.time() - save_start
            logger.info(f"📊 DB保存時間: {metrics['db_save_time']:.2f}秒")
            
            # ====================
            # Step 4: レスポンス構築
            # ====================
            metrics["total_time"] = time.time() - start_time
            
            return OptimizedConversationAgentResponse(
                response=agent_result["response"],
                timestamp=datetime.now(timezone.utc).isoformat(),
                support_type=agent_result.get("support_type", "unknown"),
                selected_acts=agent_result.get("selected_acts", []),
                state_snapshot=agent_result.get("state_snapshot", {}),
                project_plan=agent_result.get("project_plan"),
                decision_metadata=agent_result.get("decision_metadata", {}),
                metrics=agent_result.get("metrics", {}),
                debug_info=debug_info,
                conversation_id=conversation_id,
                history_count=len(conversation_history),
                performance_metrics=metrics
            )
            
        except Exception as e:
            logger.error(f"❌ 対話エージェント処理エラー: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            
            metrics["total_time"] = time.time() - start_time
            
            return OptimizedConversationAgentResponse(
                response="申し訳ございません。対話処理中にエラーが発生しました。",
                timestamp=datetime.now(timezone.utc).isoformat(),
                support_type="error",
                selected_acts=[],
                state_snapshot={},
                decision_metadata={},
                metrics={"error": "processing_failed"},
                error=f"Processing error: {str(e)}",
                warning="エージェント処理中にエラーが発生しました",
                conversation_id=conversation_id,
                history_count=len(conversation_history) if 'conversation_history' in locals() else 0,
                performance_metrics=metrics
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ エンドポイントエラー: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        
        metrics["total_time"] = time.time() - start_time
        
        return OptimizedConversationAgentResponse(
            response="システムエラーが発生しました。",
            timestamp=datetime.now(timezone.utc).isoformat(),
            support_type="error",
            selected_acts=[],
            state_snapshot={},
            decision_metadata={},
            metrics={"error": "system_error"},
            error=f"System error: {str(e)}",
            history_count=0,
            performance_metrics=metrics
        )


def get_or_create_conversation_sync(supabase, user_id: int, page_id: str) -> str:
    """既存のget_or_create_conversation関数の同期版（共通化）"""
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