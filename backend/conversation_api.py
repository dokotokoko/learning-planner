"""
会話管理API - conversation_idベースの会話管理システム
"""
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from uuid import UUID
import json
import logging

from fastapi import HTTPException, Depends, status
from pydantic import BaseModel, Field
from supabase import Client

logger = logging.getLogger(__name__)


# ===================================================================
# Pydantic Models
# ===================================================================

class ConversationCreate(BaseModel):
    """新規会話作成リクエスト"""
    title: Optional[str] = Field(None, description="会話タイトル（省略時は自動生成）")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="メタデータ")


class ConversationUpdate(BaseModel):
    """会話情報更新リクエスト"""
    title: Optional[str] = Field(None, description="会話タイトル")
    is_active: Optional[bool] = Field(None, description="アクティブ状態")
    metadata: Optional[Dict[str, Any]] = Field(None, description="メタデータ")


class ConversationResponse(BaseModel):
    """会話レスポンス"""
    id: str
    user_id: int
    title: Optional[str]
    is_active: bool
    message_count: int = 0
    last_message: Optional[str] = None
    created_at: str
    updated_at: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ConversationListResponse(BaseModel):
    """会話リスト レスポンス"""
    conversations: List[ConversationResponse]
    total_count: int
    has_more: bool


class MessageResponse(BaseModel):
    """メッセージレスポンス"""
    id: int
    conversation_id: str
    sender: str
    message: str
    context_data: Optional[Dict[str, Any]] = None
    created_at: str


# ===================================================================
# 会話管理クラス
# ===================================================================

class ConversationManager:
    """会話管理クラス"""
    
    def __init__(self, supabase: Client):
        self.supabase = supabase
    
    async def create_conversation(
        self, 
        user_id: int, 
        title: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        新しい会話を作成
        
        Args:
            user_id: ユーザーID
            title: 会話タイトル（省略時は最初のメッセージから自動生成）
            metadata: メタデータ
        
        Returns:
            conversation_id: 作成された会話のID
        """
        try:
            conversation_data = {
                "user_id": user_id,
                "metadata": json.dumps(metadata or {}, ensure_ascii=False)
            }
            
            if title:
                conversation_data["title"] = title
            
            result = self.supabase.table("chat_conversations").insert(conversation_data).execute()
            
            if result.data:
                return result.data[0]["id"]
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="会話の作成に失敗しました"
                )
                
        except Exception as e:
            logger.error(f"会話作成エラー: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"会話の作成に失敗しました: {str(e)}"
            )
    
    async def get_conversation(self, conversation_id: str, user_id: int) -> Optional[ConversationResponse]:
        """
        会話情報を取得
        
        Args:
            conversation_id: 会話ID
            user_id: ユーザーID（権限チェック用）
        
        Returns:
            ConversationResponse or None
        """
        try:
            # 会話情報を取得
            result = self.supabase.table("chat_conversations")\
                .select("*")\
                .eq("id", conversation_id)\
                .eq("user_id", user_id)\
                .execute()
            
            if not result.data:
                return None
            
            conversation = result.data[0]
            
            # メッセージ数と最新メッセージを取得
            messages_result = self.supabase.table("chat_logs")\
                .select("id, message, created_at")\
                .eq("conversation_id", conversation_id)\
                .order("created_at", desc=True)\
                .limit(1)\
                .execute()
            
            # メッセージカウントを取得（別クエリで実行）
            count_result = self.supabase.table("chat_logs")\
                .select("id", count="exact")\
                .eq("conversation_id", conversation_id)\
                .execute()
            
            message_count = count_result.count if count_result else 0
            last_message = None
            
            if messages_result.data:
                last_msg = messages_result.data[0]["message"]
                # 最大100文字で切り詰め
                last_message = last_msg[:100] + "..." if len(last_msg) > 100 else last_msg
            
            # メタデータのパース
            metadata = {}
            if conversation.get("metadata"):
                try:
                    metadata = json.loads(conversation["metadata"]) if isinstance(conversation["metadata"], str) else conversation["metadata"]
                except:
                    metadata = {}
            
            return ConversationResponse(
                id=conversation["id"],
                user_id=conversation["user_id"],
                title=conversation.get("title"),
                is_active=conversation.get("is_active", True),
                message_count=message_count,
                last_message=last_message,
                created_at=conversation["created_at"],
                updated_at=conversation.get("updated_at", conversation["created_at"]),
                metadata=metadata
            )
            
        except Exception as e:
            logger.error(f"会話取得エラー: {e}")
            return None
    
    async def list_conversations(
        self, 
        user_id: int,
        limit: int = 20,
        offset: int = 0,
        is_active: Optional[bool] = None
    ) -> ConversationListResponse:
        """
        ユーザーの会話リストを取得
        
        Args:
            user_id: ユーザーID
            limit: 取得数
            offset: オフセット
            is_active: アクティブフィルター
        
        Returns:
            ConversationListResponse
        """
        try:
            # デバッグログ追加
            logger.info(f"🔍 会話リスト取得開始: user_id={user_id}, type={type(user_id)}, limit={limit}, is_active={is_active}")
            
            # クエリを構築
            query = self.supabase.table("chat_conversations")\
                .select("*", count="exact")\
                .eq("user_id", user_id)
            
            if is_active is not None:
                query = query.eq("is_active", is_active)
            
            # 最終更新日時で降順ソート
            query = query.order("updated_at", desc=True)\
                .range(offset, offset + limit - 1)
            
            logger.info(f"🔍 Supabaseクエリ実行中...")
            result = query.execute()
            logger.info(f"🔍 Supabaseクエリ結果: count={result.count}, data_length={len(result.data) if result.data else 0}")
            
            conversations = []
            for conv in result.data:
                # 各会話のメッセージ数を取得（パフォーマンス考慮で簡略化）
                msg_count_result = self.supabase.table("chat_logs")\
                    .select("id", count="exact")\
                    .eq("conversation_id", conv["id"])\
                    .execute()
                
                message_count = msg_count_result.count if msg_count_result else 0
                
                # 最新メッセージを取得
                last_msg_result = self.supabase.table("chat_logs")\
                    .select("message")\
                    .eq("conversation_id", conv["id"])\
                    .order("created_at", desc=True)\
                    .limit(1)\
                    .execute()
                
                last_message = None
                if last_msg_result.data:
                    msg = last_msg_result.data[0]["message"]
                    last_message = msg[:100] + "..." if len(msg) > 100 else msg
                
                # メタデータのパース
                metadata = {}
                if conv.get("metadata"):
                    try:
                        metadata = json.loads(conv["metadata"]) if isinstance(conv["metadata"], str) else conv["metadata"]
                    except:
                        metadata = {}
                
                conversations.append(ConversationResponse(
                    id=conv["id"],
                    user_id=conv["user_id"],
                    title=conv.get("title") or "無題の会話",
                    is_active=conv.get("is_active", True),
                    message_count=message_count,
                    last_message=last_message,
                    created_at=conv["created_at"],
                    updated_at=conv.get("updated_at", conv["created_at"]),
                    metadata=metadata
                ))
            
            total_count = result.count if result.count else len(conversations)
            has_more = (offset + limit) < total_count
            
            return ConversationListResponse(
                conversations=conversations,
                total_count=total_count,
                has_more=has_more
            )
            
        except Exception as e:
            logger.error(f"会話リスト取得エラー: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"会話リストの取得に失敗しました: {str(e)}"
            )
    
    async def update_conversation(
        self,
        conversation_id: str,
        user_id: int,
        update_data: ConversationUpdate
    ) -> bool:
        """
        会話情報を更新
        
        Args:
            conversation_id: 会話ID
            user_id: ユーザーID（権限チェック用）
            update_data: 更新データ
        
        Returns:
            成功時True
        """
        try:
            updates = {}
            
            if update_data.title is not None:
                updates["title"] = update_data.title
            
            if update_data.is_active is not None:
                updates["is_active"] = update_data.is_active
            
            if update_data.metadata is not None:
                updates["metadata"] = json.dumps(update_data.metadata, ensure_ascii=False)
            
            if not updates:
                return True  # 更新対象がない場合は成功として扱う
            
            updates["updated_at"] = datetime.now(timezone.utc).isoformat()
            
            result = self.supabase.table("chat_conversations")\
                .update(updates)\
                .eq("id", conversation_id)\
                .eq("user_id", user_id)\
                .execute()
            
            return bool(result.data)
            
        except Exception as e:
            logger.error(f"会話更新エラー: {e}")
            return False
    
    async def delete_conversation(self, conversation_id: str, user_id: int) -> bool:
        """
        会話を削除（論理削除）
        
        Args:
            conversation_id: 会話ID
            user_id: ユーザーID（権限チェック用）
        
        Returns:
            成功時True
        """
        try:
            # 論理削除（is_active = false）
            result = self.supabase.table("chat_conversations")\
                .update({"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()})\
                .eq("id", conversation_id)\
                .eq("user_id", user_id)\
                .execute()
            
            return bool(result.data)
            
        except Exception as e:
            logger.error(f"会話削除エラー: {e}")
            return False
    
    async def get_messages(
        self,
        conversation_id: str,
        user_id: int,
        limit: int = 50,
        offset: int = 0
    ) -> List[MessageResponse]:
        """
        会話のメッセージを取得
        
        Args:
            conversation_id: 会話ID
            user_id: ユーザーID（権限チェック用）
            limit: 取得数
            offset: オフセット
        
        Returns:
            List[MessageResponse]
        """
        try:
            # まず会話の権限チェック
            conv_check = self.supabase.table("chat_conversations")\
                .select("id")\
                .eq("id", conversation_id)\
                .eq("user_id", user_id)\
                .execute()
            
            if not conv_check.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="会話が見つからないか、アクセス権限がありません"
                )
            
            # メッセージを取得
            result = self.supabase.table("chat_logs")\
                .select("*")\
                .eq("conversation_id", conversation_id)\
                .order("created_at", desc=False)\
                .range(offset, offset + limit - 1)\
                .execute()
            
            messages = []
            for msg in result.data:
                # context_dataのパース
                context_data = None
                if msg.get("context_data"):
                    try:
                        context_data = json.loads(msg["context_data"]) if isinstance(msg["context_data"], str) else msg["context_data"]
                    except:
                        context_data = None
                
                messages.append(MessageResponse(
                    id=msg["id"],
                    conversation_id=msg.get("conversation_id", conversation_id),
                    sender=msg["sender"],
                    message=msg["message"],
                    context_data=context_data,
                    created_at=msg["created_at"]
                ))
            
            return messages
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"メッセージ取得エラー: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"メッセージの取得に失敗しました: {str(e)}"
            )