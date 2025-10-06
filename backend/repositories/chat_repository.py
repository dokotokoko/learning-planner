
import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, Any, List

from supabase import Client

logger = logging.getLogger(__name__)

class ChatRepository:
    """
    Handles all database interactions for chat functionalities.
    """

    def __init__(self, supabase: Client):
        if not supabase:
            raise ValueError("Supabase client must be provided.")
        self.db = supabase

    async def get_or_create_session(self, user_id: int, page_id: str = "global_chat") -> str:
        """
        Finds an existing chat session or creates a new one.
        """
        try:
            # Find existing session
            existing_conv_res = await asyncio.to_thread(
                lambda: self.db.table("chat_conversations").select("id").eq("user_id", user_id).eq("page_id", page_id).limit(1).execute()
            )
            
            if existing_conv_res.data:
                return existing_conv_res.data[0]["id"]
            
            # Create a new session
            logger.info(f"No existing session found for user {user_id} on page {page_id}. Creating a new one.")
            new_conv_data = {
                "user_id": user_id,
                "title": "AIチャットセッション",
                "page_id": page_id
            }
            new_conv_res = await asyncio.to_thread(
                lambda: self.db.table("chat_conversations").insert(new_conv_data).execute()
            )
            
            if new_conv_res.data:
                return new_conv_res.data[0]["id"]
            
            logger.error("Failed to create a new chat session.")
            return None

        except Exception as e:
            logger.error(f"Error getting or creating chat session for user {user_id}: {e}", exc_info=True)
            raise

    async def get_history(self, conversation_id: str, limit: int = 30) -> List[Dict[str, Any]]:
        """
        Fetches chat history for a given conversation.
        """
        try:
            history_response = await asyncio.to_thread(
                lambda: self.db.table("chat_logs").select("id, sender, message, created_at")
                .eq("conversation_id", conversation_id)
                .order("created_at", desc=False)
                .limit(limit)
                .execute()
            )
            return history_response.data if history_response.data is not None else []
        except Exception as e:
            logger.error(f"Error fetching chat history for conversation {conversation_id}: {e}", exc_info=True)
            raise

    async def save_message(self, user_id: int, conversation_id: str, sender: str, message: str, context_data: Dict[str, Any], page_id: str = "global_chat"):
        """
        Saves a chat message to the database.
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
                lambda: self.db.table("chat_logs").insert(message_data).execute()
            )
        except Exception as e:
            logger.error(f"Error saving message for conversation {conversation_id}: {e}", exc_info=True)
            raise

    async def update_session_timestamp(self, conversation_id: str) -> None:
        """
        Updates the updated_at timestamp of a conversation session.
        """
        try:
            await asyncio.to_thread(
                lambda: self.db.table("chat_conversations").update({
                    "updated_at": datetime.now().isoformat()
                }).eq("id", conversation_id).execute()
            )
        except Exception as e:
            # This is not a critical failure, so just log a warning.
            logger.warning(f"Failed to update conversation timestamp for {conversation_id}: {e}")
