
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

# 認証関連
class UserLogin(BaseModel):
    username: str
    access_code: str

class UserRegister(BaseModel):
    username: str
    password: str
    confirm_password: str

class UserResponse(BaseModel):
    id: int
    username: str
    message: str

# チャット関連
class ChatMessage(BaseModel):
    message: str
    context: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    timestamp: str
    token_usage: Optional[Dict[str, Any]] = None
    context_metadata: Optional[Dict[str, Any]] = None
    # Conversation agent metadata (optional)
    support_type: Optional[str] = None
    selected_acts: Optional[List[str]] = None
    state_snapshot: Optional[Dict[str, Any]] = None
    project_plan: Optional[Dict[str, Any]] = None
    decision_metadata: Optional[Dict[str, Any]] = None
    metrics: Optional[Dict[str, Any]] = None

# Conversation Agent専用モデル（検証用）
class ConversationAgentRequest(BaseModel):
    message: str
    project_id: Optional[int] = None
    page_id: Optional[str] = None
    include_history: bool = True
    history_limit: int = 50
    debug_mode: bool = False
    mock_mode: bool = True

class ConversationAgentResponse(BaseModel):
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

class ChatHistoryResponse(BaseModel):
    id: int
    page: str
    sender: str
    message: str
    context_data: Optional[str]
    created_at: str

# メモ関連
class MemoSave(BaseModel):
    page_id: str
    content: str

class MemoResponse(BaseModel):
    id: int
    page_id: str
    title: Optional[str] = ""
    content: str
    updated_at: str

# プロジェクト関連
class ProjectCreate(BaseModel):
    theme: str
    question: Optional[str] = None
    hypothesis: Optional[str] = None

class ProjectUpdate(BaseModel):
    theme: Optional[str] = None
    question: Optional[str] = None
    hypothesis: Optional[str] = None

class ProjectResponse(BaseModel):
    id: int
    theme: str
    question: Optional[str]
    hypothesis: Optional[str]
    created_at: str
    updated_at: str
    memo_count: int

# マルチメモ関連
class MultiMemoCreate(BaseModel):
    title: str
    content: str
    project_id: Optional[int] = None

class MultiMemoUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    version: Optional[int] = None
    requestId: Optional[str] = None
    seq: Optional[int] = None

class MultiMemoResponse(BaseModel):
    id: int
    title: str
    content: str
    tags: List[str]
    project_id: Optional[int]
    created_at: str
    updated_at: str

# テーマ深掘り関連
class ThemeDeepDiveRequest(BaseModel):
    theme: str
    parent_theme: str
    depth: int
    path: List[str]
    user_interests: List[str] = []

class ThemeDeepDiveResponse(BaseModel):
    suggestions: List[str]
    context_info: Dict[str, Any]

# クエスト関連
class QuestResponse(BaseModel):
    id: int
    title: str
    description: str
    category: str
    difficulty: int
    points: int
    required_evidence: str
    icon_name: Optional[str]
    is_active: bool
    created_at: str
    updated_at: str

class UserQuestResponse(BaseModel):
    id: int
    user_id: int
    quest_id: int
    status: str
    progress: int
    quest: QuestResponse
    started_at: Optional[str]
    completed_at: Optional[str]
    created_at: str
    updated_at: str

class QuestSubmissionCreate(BaseModel):
    description: str
    file_url: Optional[str] = None
    reflection_data: Optional[Dict[str, Any]] = None

class QuestSubmissionResponse(BaseModel):
    id: int
    user_quest_id: int
    quest_id: int
    description: str
    file_url: Optional[str]
    reflection_data: Optional[Dict[str, Any]]
    status: str
    points_awarded: int
    submitted_at: str

class UserQuestStart(BaseModel):
    quest_id: int

# 管理者関連
class AdminUserCreate(BaseModel):
    username: str
    password: str
