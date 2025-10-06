
import asyncio
import json
import logging
from datetime import datetime, timezone

from fastapi import HTTPException

# Note: These paths might need adjustment if the service is run from a different context
from backend.repositories.chat_repository import ChatRepository
from module.llm_api import learning_plannner
from backend.schemas import ChatMessage, ChatResponse
from prompt.prompt import system_prompt

logger = logging.getLogger(__name__)

class ChatService:
    """
    Orchestrates the business logic for chat functionalities.
    Uses a repository for data access and an LLM service for AI responses.
    """

    def __init__(self, llm_service: learning_plannner, repository: ChatRepository):
        if not llm_service or not repository:
            raise ValueError("LLM service and repository must be provided.")
        self.llm_service = llm_service
        self.repository = repository
        # This should be configurable, but hard-coding for now as per original logic.
        self.MAX_CHAT_MESSAGE_LENGTH = 2000

    async def handle_legacy_chat(self, chat_data: ChatMessage, current_user: int) -> ChatResponse:
        """
        Handles the logic for a legacy chat request, including:
        1. Session and history management.
        2. Saving user and AI messages.
        3. Calling the LLM to get a response.
        """
        try:
            # 1. Get or create a conversation session
            conversation_id = await self.repository.get_or_create_session(current_user)
            if not conversation_id:
                raise Exception("Could not get or create a chat session.")

            # 2. Get chat history
            history = await self.repository.get_history(conversation_id)

            # 3. Build the message list for the LLM
            messages = [{"role": "system", "content": system_prompt}]
            for msg in history:
                role = "user" if msg.get("sender") == "user" else "assistant"
                messages.append({"role": role, "content": msg.get("message")})
            
            user_message = chat_data.message
            if user_message is None or len(user_message) > self.MAX_CHAT_MESSAGE_LENGTH:
                raise HTTPException(status_code=400, detail=f"Message is empty or exceeds {self.MAX_CHAT_MESSAGE_LENGTH} characters.")
            
            messages.append({"role": "user", "content": user_message})

            # 4. Save the user's message
            user_context = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "session_type": "global_chat",
                "independent": True
            }
            await self.repository.save_message(current_user, conversation_id, "user", user_message, user_context)

            # 5. Call the synchronous LLM method in a separate thread
            response_text = await asyncio.to_thread(self.llm_service.generate_response, messages)

            # 6. Save the AI's message
            ai_context = {"timestamp": datetime.now(timezone.utc).isoformat()}
            await self.repository.save_message(current_user, conversation_id, "assistant", response_text, ai_context)

            # 7. Update the session's timestamp
            await self.repository.update_session_timestamp(conversation_id)

            # 8. Return the final response object
            return ChatResponse(
                response=response_text,
                timestamp=datetime.now(timezone.utc).isoformat(),
            )

        except HTTPException:
            # Re-raise HTTP exceptions directly
            raise
        except Exception as e:
            logger.error(f"Error in legacy chat flow for user {current_user}: {e}", exc_info=True)
            # Raise a generic server error for other exceptions
            raise HTTPException(status_code=500, detail=f"An unexpected error occurred in the chat service.")
