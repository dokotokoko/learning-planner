"""
非同期処理用ヘルパー関数群
既存のコードベースとの互換性を保ちながら、パフォーマンスを改善するための関数を提供します。
"""

import asyncio
import json
import logging
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, timezone
from supabase import Client

logger = logging.getLogger(__name__)


class AsyncDatabaseHelper:
    """データベース操作の非同期化を支援するヘルパークラス"""
    
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
    
    async def get_project_info(self, project_id: int, user_id: int) -> Optional[Dict[str, Any]]:
        """
        プロジェクト情報を非同期で取得
        
        Args:
            project_id: プロジェクトID
            user_id: ユーザーID
            
        Returns:
            プロジェクト情報のDict、または None
        """
        try:
            result = await asyncio.to_thread(
                lambda: self.supabase.table('projects')
                .select('*')
                .eq('id', project_id)
                .eq('user_id', user_id)
                .execute()
            )
            
            if result.data:
                return result.data[0]
            return None
            
        except Exception as e:
            logger.error(f"プロジェクト情報取得エラー (async): {e}")
            return None
    
    async def get_memo_project_id(self, memo_id: int, user_id: int) -> Optional[int]:
        """
        メモIDからプロジェクトIDを非同期で取得
        
        Args:
            memo_id: メモID
            user_id: ユーザーID
            
        Returns:
            プロジェクトID、または None
        """
        try:
            result = await asyncio.to_thread(
                lambda: self.supabase.table('memos')
                .select('project_id')
                .eq('id', memo_id)
                .eq('user_id', user_id)
                .execute()
            )
            
            if result.data and result.data[0].get('project_id'):
                return result.data[0]['project_id']
            return None
            
        except Exception as e:
            logger.warning(f"メモからのプロジェクトID取得エラー (async): {e}")
            return None
    
    async def get_latest_project(self, user_id: int) -> Optional[int]:
        """
        最新のプロジェクトIDを非同期で取得
        
        Args:
            user_id: ユーザーID
            
        Returns:
            最新のプロジェクトID、または None
        """
        try:
            result = await asyncio.to_thread(
                lambda: self.supabase.table('projects')
                .select('id')
                .eq('user_id', user_id)
                .order('updated_at', desc=True)
                .limit(1)
                .execute()
            )
            
            if result.data:
                return result.data[0]['id']
            return None
            
        except Exception as e:
            logger.warning(f"最新プロジェクト取得エラー (async): {e}")
            return None
    
    async def get_conversation_history(
        self, 
        conversation_id: str, 
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        対話履歴を非同期で取得
        
        Args:
            conversation_id: 会話ID
            limit: 取得する履歴の最大数
            
        Returns:
            対話履歴のリスト
        """
        try:
            result = await asyncio.to_thread(
                lambda: self.supabase.table("chat_logs")
                .select("id, sender, message, created_at, context_data")
                .eq("conversation_id", conversation_id)
                .order("created_at", desc=False)
                .limit(limit)
                .execute()
            )
            
            return result.data if result.data is not None else []
            
        except Exception as e:
            logger.error(f"対話履歴取得エラー (async): {e}")
            return []
    
    async def save_chat_log(
        self, 
        user_id: int,
        page_id: str,
        sender: str,
        message: str,
        conversation_id: str,
        context_data: Dict[str, Any]
    ) -> bool:
        """
        チャットログを非同期で保存
        
        Args:
            user_id: ユーザーID
            page_id: ページID
            sender: 送信者 (user/assistant)
            message: メッセージ内容
            conversation_id: 会話ID
            context_data: コンテキスト情報
            
        Returns:
            保存に成功したかどうか
        """
        try:
            message_data = {
                "user_id": user_id,
                "page": page_id,
                "sender": sender,
                "message": message,
                "conversation_id": conversation_id,
                "context_data": json.dumps(context_data, ensure_ascii=False)
            }
            
            await asyncio.to_thread(
                lambda: self.supabase.table("chat_logs").insert(message_data).execute()
            )
            return True
            
        except Exception as e:
            logger.error(f"チャットログ保存エラー (async): {e}")
            return False


class AsyncProjectContextBuilder:
    """
    プロジェクトコンテキスト構築の非同期化ヘルパー
    """
    
    def __init__(self, db_helper: AsyncDatabaseHelper):
        self.db_helper = db_helper
    
    async def build_context_from_page_id(
        self, 
        page_id: str, 
        user_id: int
    ) -> Tuple[Optional[int], Optional[str], Optional[Dict[str, Any]]]:
        """
        ページIDから非同期でプロジェクトコンテキストを構築
        
        Args:
            page_id: ページID
            user_id: ユーザーID
            
        Returns:
            (project_id, project_context_string, project_dict) のタプル
        """
        project_id = None
        project_context = ""
        project = None
        
        # page_idの形式を判定して適切な処理を選択
        if page_id.startswith('project-'):
            try:
                project_id = int(page_id.replace('project-', ''))
                logger.info(f"✅ project-形式からプロジェクトIDを取得: {project_id}")
            except ValueError:
                logger.warning(f"⚠️ project-形式の解析に失敗: {page_id}")
        
        elif page_id.isdigit():
            # メモIDからプロジェクトIDを取得
            project_id = await self.db_helper.get_memo_project_id(int(page_id), user_id)
            if project_id:
                logger.info(f"✅ memo_id:{page_id}からプロジェクトIDを取得: {project_id}")
            else:
                logger.info(f"🔴 memo_id:{page_id}にプロジェクト関連付けなし")
        
        elif page_id == 'conversation-agent-test':
            # 最新のプロジェクトを取得
            project_id = await self.db_helper.get_latest_project(user_id)
            if project_id:
                logger.info(f"✅ 最新のプロジェクトIDを取得: {project_id}")
            else:
                logger.info("🔴 利用可能なプロジェクトが見つかりませんでした")
        
        else:
            logger.info(f"🔴 page_id形式が未対応: {page_id}")
        
        # プロジェクト情報を取得
        if project_id:
            project = await self.db_helper.get_project_info(project_id, user_id)
            if project:
                # プロジェクト情報を軽量フォーマットで統合（トークン削減）
                theme_short = (project['theme'] or '')[:30]
                question_short = (project.get('question') or 'NA')[:25]
                hypothesis_short = (project.get('hypothesis') or 'NA')[:25]
                project_context = f"[テーマ:{theme_short}|問い:{question_short}|仮説:{hypothesis_short}]"
                logger.info(f"✅ プロジェクト情報を軽量フォーマットで取得成功: {project['theme']}")
            else:
                logger.warning(f"⚠️ プロジェクトが見つからない: project_id={project_id}")
        
        return project_id, project_context, project


async def parallel_fetch_context_and_history(
    db_helper: AsyncDatabaseHelper,
    context_builder: AsyncProjectContextBuilder,
    page_id: str,
    conversation_id: str,
    user_id: int,
    history_limit: int = 100
) -> Tuple[Optional[int], Optional[str], Optional[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    プロジェクトコンテキストと対話履歴を並列で取得
    
    Args:
        db_helper: データベースヘルパー
        context_builder: コンテキストビルダー
        page_id: ページID
        conversation_id: 会話ID
        user_id: ユーザーID
        history_limit: 履歴取得数の上限
        
    Returns:
        (project_id, project_context, project, conversation_history) のタプル
    """
    try:
        # プロジェクトコンテキスト構築と履歴取得を並列実行
        context_task = context_builder.build_context_from_page_id(page_id, user_id)
        history_task = db_helper.get_conversation_history(conversation_id, history_limit)
        
        # 両方のタスクを並列実行
        (project_id, project_context, project), conversation_history = await asyncio.gather(
            context_task,
            history_task
        )
        
        return project_id, project_context, project, conversation_history
        
    except Exception as e:
        logger.error(f"並列データ取得エラー: {e}")
        # エラー時は個別に取得を試みる
        project_id, project_context, project = await context_builder.build_context_from_page_id(page_id, user_id)
        conversation_history = await db_helper.get_conversation_history(conversation_id, history_limit)
        return project_id, project_context, project, conversation_history


async def parallel_save_chat_logs(
    db_helper: AsyncDatabaseHelper,
    user_message_data: Dict[str, Any],
    ai_message_data: Dict[str, Any]
) -> Tuple[bool, bool]:
    """
    ユーザーメッセージとAIメッセージを並列で保存
    
    Args:
        db_helper: データベースヘルパー
        user_message_data: ユーザーメッセージのデータ
        ai_message_data: AIメッセージのデータ
        
    Returns:
        (user_save_success, ai_save_success) のタプル
    """
    try:
        user_task = db_helper.save_chat_log(**user_message_data)
        ai_task = db_helper.save_chat_log(**ai_message_data)
        
        # 両方のログを並列で保存
        results = await asyncio.gather(user_task, ai_task, return_exceptions=True)
        
        user_success = results[0] if not isinstance(results[0], Exception) else False
        ai_success = results[1] if not isinstance(results[1], Exception) else False
        
        return user_success, ai_success
        
    except Exception as e:
        logger.error(f"並列ログ保存エラー: {e}")
        return False, False


# レート制限用のセマフォ（OpenAI API同時呼び出し数制限）
OPENAI_SEMAPHORE = asyncio.Semaphore(10)  # 最大10並列まで

async def rate_limited_openai_call(func, *args, **kwargs):
    """
    レート制限付きOpenAI API呼び出しラッパー
    
    Args:
        func: 呼び出す関数
        *args, **kwargs: 関数の引数
        
    Returns:
        関数の実行結果
    """
    async with OPENAI_SEMAPHORE:
        return await asyncio.to_thread(func, *args, **kwargs)