from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import sys
import os
import json
import logging
from datetime import datetime, timedelta
import asyncio
import uvicorn
from supabase import create_client, Client
from dotenv import load_dotenv
from functools import lru_cache
import time

# .envファイルを読み込み
load_dotenv()

# メモリ管理システムをインポート
from memory_manager import MemoryManager, MessageImportance

# プロジェクトルートをPythonパスに追加
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from module.llm_api import learning_plannner
from prompt.prompt import system_prompt

# ロギング設定（最適化）
logging.basicConfig(
    level=logging.WARNING,  # INFO -> WARNINGに変更してログを削減
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)


logger = logging.getLogger(__name__)

# 認証キャッシュ
auth_cache = {}
AUTH_CACHE_TTL = 300  # 5分

app = FastAPI(
    title="探Qメイト API (最適化版)",
    description="AI探究学習支援アプリケーションのバックエンドAPI（パフォーマンス最適化）",
    version="1.1.0",
    docs_url="/docs",  # 本番では無効化を検討
    redoc_url="/redoc"  # 本番では無効化を検討
)

# パフォーマンス最適化ミドルウェア
app.add_middleware(GZipMiddleware, minimum_size=1000)  # レスポンス圧縮

# CORS設定（ngrok対応）
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://localhost:3000",
        os.environ.get("ENGROK_ENDPOINT")
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# セキュリティスキーム
security = HTTPBearer()

# === Pydanticモデル ===
# （元のモデルをそのまま継承）

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

# 学習プロセス関連のモデルは削除済み（使用しない）

# チャット関連
class ChatMessage(BaseModel):
    message: str
    context: Optional[str] = None
    page: Optional[str] = "general"

class ChatResponse(BaseModel):
    response: str
    timestamp: str
    token_usage: Optional[Dict[str, Any]] = None
    context_metadata: Optional[Dict[str, Any]] = None

class ChatHistoryResponse(BaseModel):
    id: int
    page: str
    sender: str
    message: str
    context_data: Optional[str]
    created_at: str

class ConversationResponse(BaseModel):
    id: str
    title: str
    page_id: str
    message_count: int
    last_message: str
    last_updated: str
    created_at: str

# メモ関連
class MemoSave(BaseModel):
    page_id: str
    content: str

class MemoResponse(BaseModel):
    id: int
    page_id: str
    content: str
    updated_at: str

# 学習振り返り関連（ステップ機能削除により不要）

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

# === グローバル変数 ===
llm_client = None
supabase: Client = None
memory_manager: MemoryManager = None

@app.on_event("startup")
async def startup_event():
    """アプリケーション起動時の初期化（最適化版）"""
    global llm_client, supabase
    
    try:
        # Supabaseクライアント初期化（コネクション設定最適化）
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_KEY")
        
        if not supabase_url or not supabase_key:
            raise ValueError("Supabase環境変数が設定されていません")
            
        supabase = create_client(supabase_url, supabase_key)
        
        # LLMクライアント初期化
        llm_client = learning_plannner
        
        # メモリ管理システム初期化
        global memory_manager
        memory_manager = MemoryManager(model="gpt-4.1-nano", max_messages=100)
        
        logger.info("アプリケーション初期化完了（最適化版）")
        
    except Exception as e:
        logger.error(f"アプリケーション初期化エラー: {e}")
        raise e

@app.on_event("shutdown")
async def shutdown_event():
    """アプリケーション終了時のクリーンアップ"""
    global auth_cache
    auth_cache.clear()
    logger.info("アプリケーション終了")

def get_current_user_cached(credentials: HTTPAuthorizationCredentials = Depends(security)) -> int:
    """認証処理（キャッシュ機能付き）"""
    global auth_cache
    
    token = credentials.credentials
    current_time = time.time()
    
    # キャッシュから確認
    if token in auth_cache:
        cached_data = auth_cache[token]
        if current_time - cached_data["timestamp"] < AUTH_CACHE_TTL:
            return cached_data["user_id"]
        else:
            # 期限切れキャッシュを削除
            del auth_cache[token]
    
    try:
        user_id = int(token)
        
        # データベースでユーザー存在確認（最適化：必要最小限のクエリ）
        result = supabase.table("users").select("id").eq("id", user_id).limit(1).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="無効な認証トークンです"
            )
        
        # キャッシュに保存
        auth_cache[token] = {
            "user_id": user_id,
            "timestamp": current_time
        }
        
        return user_id
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="無効なトークン形式です"
        )
    except Exception as e:
        logger.error(f"認証エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="認証処理でエラーが発生しました"
        )

def validate_supabase():
    """Supabaseクライアントの有効性確認"""
    if not supabase:
        raise HTTPException(status_code=500, detail="データベース接続が初期化されていません")

@lru_cache(maxsize=100)
def get_cached_result(table: str, user_id: int, cache_key: str):
    """簡単なクエリ結果キャッシュ"""
    # 実装は省略（実際の使用時に追加）
    pass

def handle_database_error(error: Exception, operation: str):
    """データベースエラーのハンドリング"""
    logger.error(f"データベースエラー - {operation}: {error}")
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=f"{operation}でエラーが発生しました"
    )

async def get_or_create_conversation(user_id: int, page_id: str) -> str:
    """会話の取得または作成（非同期最適化版）"""
    validate_supabase()
    
    try:
        # 既存の会話を検索
        result = supabase.table("chat_conversations").select("id").eq("user_id", user_id).eq("page_id", page_id).limit(1).execute()
        
        if result.data:
            return result.data[0]["id"]
        
        # 新しい会話を作成
        conversation_data = {
            "user_id": user_id,
            "page_id": page_id,
            "title": f"Page {page_id} Conversation",
            "created_at": datetime.now().isoformat(),
            "last_updated": datetime.now().isoformat()
        }
        
        result = supabase.table("chat_conversations").insert(conversation_data).execute()
        
        if result.data:
            return result.data[0]["id"]
        else:
            raise Exception("会話の作成に失敗しました")
            
    except Exception as e:
        handle_database_error(e, "会話の取得または作成")

async def update_conversation_timestamp(conversation_id: str):
    """会話のタイムスタンプ更新（非同期最適化版）"""
    validate_supabase()
    
    try:
        supabase.table("chat_conversations").update({
            "last_updated": datetime.now().isoformat()
        }).eq("id", conversation_id).execute()
        
    except Exception as e:
        logger.warning(f"会話タイムスタンプ更新エラー: {e}")

# === エンドポイント実装 ===

@app.get("/")
async def root():
    """ヘルスチェックエンドポイント（最適化版）"""
    return {"message": "探Qメイト API（最適化版）", "status": "running", "version": "1.1.0"}

@app.get("/health")
async def health_check():
    """nginx用ヘルスチェック"""
    return {"status": "healthy", "message": "OK"}

@app.post("/auth/login", response_model=UserResponse)
async def login(user_data: UserLogin):
    """ユーザーログイン（最適化版）"""
    validate_supabase()
    
    try:
        # データベースクエリ最適化：必要な列のみ取得
        result = supabase.table("users").select("id, username").eq("username", user_data.username).limit(1).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="ユーザー名またはアクセスコードが正しくありません"
            )
        
        user = result.data[0]
        
        # アクセスコード確認（実際の実装では暗号化）
        if user_data.access_code != "test123":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="ユーザー名またはアクセスコードが正しくありません"
            )
        
        # ログイン成功時にキャッシュ更新
        token = str(user["id"])
        auth_cache[token] = {
            "user_id": user["id"],
            "timestamp": time.time()
        }
        
        return UserResponse(
            id=user["id"],
            username=user["username"],
            message="ログインに成功しました"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        handle_database_error(e, "ログイン処理")

@app.post("/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister):
    """ユーザー新規登録（最適化版）"""
    validate_supabase()
    
    try:
        # パスワードの一致チェック
        if user_data.password != user_data.confirm_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="パスワードと確認用パスワードが一致しません"
            )
        
        # ユーザー名の重複チェック
        existing_user = supabase.table("users").select("id").eq("username", user_data.username).limit(1).execute()
        if existing_user.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="そのユーザー名は既に使用されています"
            )
        
        # ユーザー作成
        result = supabase.table("users").insert({
            "username": user_data.username,
            "password": user_data.password
        }).execute()
        
        if result.data and len(result.data) > 0:
            new_user = result.data[0]
            response = UserResponse(
                id=new_user["id"],
                username=new_user["username"],
                message="アカウント登録が完了しました！探Qメイトへようこそ！"
            )
            
            # 明示的にJSONレスポンスとして返す
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=status.HTTP_201_CREATED,
                content=response.dict()
            )
        else:
            raise HTTPException(status_code=500, detail="ユーザーの登録に失敗しました")
            
    except HTTPException:
        raise
    except Exception as e:
        handle_database_error(e, "ユーザーの登録")

@app.post("/chat", response_model=ChatResponse)
async def chat_with_ai(
    chat_data: ChatMessage,
    current_user: int = Depends(get_current_user_cached)
):
    """AIとのチャット（最適化版）"""
    try:
        validate_supabase()
        
        if llm_client is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="LLMクライアントが初期化されていません"
            )
        
        # conversationを取得または作成
        page_id = chat_data.page or "general"
        conversation_id = await get_or_create_conversation(current_user, page_id)
        
        # 過去の対話履歴を取得（拡張：50-100メッセージ）
        history_limit = 100  # Phase 1: 履歴ウィンドウを拡張
        history_response = supabase.table("chat_logs").select("id, sender, message, created_at, context_data").eq("conversation_id", conversation_id).order("created_at").limit(history_limit).execute()
        conversation_history = history_response.data
        
        # メモリ管理システムでコンテキストを最適化
        if memory_manager and conversation_history:
            # 現在のメッセージも含めて最適化
            all_messages = conversation_history + [{
                "id": 0,
                "sender": "user",
                "message": chat_data.message,
                "created_at": datetime.now().isoformat()
            }]
            optimized_messages = memory_manager.optimize_context_window(all_messages)
            
            # システムプロンプトを追加
            messages = [{"role": "system", "content": system_prompt}]
            messages.extend(optimized_messages)
            
            # 会話のメタデータを生成
            context_metadata = memory_manager.get_conversation_metadata(all_messages)
        else:
            # フォールバック：従来の処理
            messages = [{"role": "system", "content": system_prompt}]
            for history_msg in conversation_history:
                role = "user" if history_msg["sender"] == "user" else "assistant"
                messages.append({"role": role, "content": history_msg["message"]})
            messages.append({"role": "user", "content": chat_data.message})
            context_metadata = None
        
        # ユーザーメッセージをDBに保存（拡張：メタデータ付き）
        user_message_data = {
            "user_id": current_user,
            "page": page_id,
            "sender": "user",
            "message": chat_data.message,
            "conversation_id": conversation_id,
            "context_data": json.dumps({
                "token_count": memory_manager.token_manager.count_tokens(chat_data.message) if memory_manager else None,
                "timestamp": datetime.now().isoformat()
            }) if memory_manager else None
        }
        supabase.table("chat_logs").insert(user_message_data).execute()
        
        # LLMから応答を取得
        response = llm_client.generate_response_with_history(messages)
        
        # トークン使用量を計算
        token_usage = None
        if memory_manager:
            input_tokens = memory_manager.token_manager.count_messages_tokens(messages)
            output_tokens = memory_manager.token_manager.count_tokens(response)
            token_usage = memory_manager.token_manager.estimate_cost(input_tokens, output_tokens)
        
        # AIの応答をDBに保存（拡張：メタデータ付き）
        ai_message_data = {
            "user_id": current_user,
            "page": page_id,
            "sender": "assistant",
            "message": response,
            "conversation_id": conversation_id,
            "context_data": json.dumps({
                "token_count": output_tokens if memory_manager else None,
                "token_usage": token_usage,
                "timestamp": datetime.now().isoformat()
            }) if memory_manager else None
        }
        supabase.table("chat_logs").insert(ai_message_data).execute()
        
        # conversationの最終更新時刻を更新
        await update_conversation_timestamp(conversation_id)
        
        # トークン使用履歴を記録
        if memory_manager and token_usage:
            try:
                usage_data = {
                    "user_id": current_user,
                    "conversation_id": conversation_id,
                    "input_tokens": token_usage["input_tokens"],
                    "output_tokens": token_usage["output_tokens"],
                    "total_tokens": token_usage["input_tokens"] + token_usage["output_tokens"],
                    "estimated_cost_usd": token_usage["total_cost"],
                    "model_name": "gpt-4.1-nano"
                }
                supabase.table("token_usage_history").insert(usage_data).execute()
            except Exception as e:
                logger.warning(f"トークン使用履歴の記録に失敗: {e}")
        
        return ChatResponse(
            response=response,
            timestamp=datetime.now().isoformat(),
            token_usage=token_usage,
            context_metadata=context_metadata
        )
    except HTTPException:
        raise
    except Exception as e:
        handle_database_error(e, "AI応答の生成")

@app.get("/chat/history", response_model=List[ChatHistoryResponse])
async def get_chat_history(
    page: Optional[str] = None,
    limit: Optional[int] = 50,
    current_user: int = Depends(get_current_user_cached)
):
    """対話履歴取得（最適化版）"""
    try:
        validate_supabase()
        
        query = supabase.table("chat_logs").select("id, page, sender, message, context_data, created_at").eq("user_id", current_user)
        
        if page:
            query = query.eq("page", page)
        
        query = query.order("created_at", desc=True).limit(limit or 50)
        result = query.execute()
        
        return [
            ChatHistoryResponse(
                id=item["id"],
                page=item["page"] or "general",
                sender=item["sender"],
                message=item["message"],
                context_data=item.get("context_data"),
                created_at=item["created_at"]
            )
            for item in result.data
        ]
    except Exception as e:
        handle_database_error(e, "対話履歴の取得")

@app.get("/chat/conversations", response_model=List[ConversationResponse])
async def get_chat_conversations(
    limit: Optional[int] = 20,
    current_user: int = Depends(get_current_user_cached)
):
    """conversation一覧取得（最適化版）"""
    try:
        validate_supabase()
        
        conversations_response = supabase.table("chat_conversations").select("*").eq("user_id", current_user).order("updated_at", desc=True).limit(limit or 20).execute()
        conversations = conversations_response.data
        
        result = []
        for conv in conversations:
            # メッセージ数と最新メッセージを効率的に取得
            logs_response = supabase.table("chat_logs").select("message", count='exact').eq("conversation_id", conv["id"]).order("created_at", desc=True).limit(1).execute()
            
            last_message = logs_response.data[0]["message"][:100] if logs_response.data else "メッセージなし"
            message_count = logs_response.count if logs_response.count else 0
            
            result.append(ConversationResponse(
                id=conv["id"],
                title=conv["title"],
                page_id=conv.get("page_id", "unknown"),
                message_count=message_count,
                last_message=last_message,
                last_updated=conv["updated_at"],
                created_at=conv["created_at"]
            ))
        
        return result
        
    except Exception as e:
        handle_database_error(e, "conversation一覧の取得")

@app.post("/memos", response_model=MemoResponse)
async def save_memo(
    memo_data: MemoSave,
    current_user: int = Depends(get_current_user_cached)
):
    """メモの保存（最適化版）"""
    try:
        validate_supabase()
        
        # 既存のページメモを確認（最適化：必要最小限のクエリ）
        existing_result = supabase.table("page_memos").select("id").eq("user_id", current_user).eq("page_id", memo_data.page_id).execute()
        
        if existing_result.data:
            # 既存のメモを更新
            result = supabase.table("page_memos").update({
                "content": memo_data.content
            }).eq("user_id", current_user).eq("page_id", memo_data.page_id).execute()
            memo_id = existing_result.data[0]["id"]
        else:
            # 新しいメモを作成
            result = supabase.table("page_memos").insert({
                "user_id": current_user,
                "page_id": memo_data.page_id,
                "content": memo_data.content
            }).execute()
            memo_id = result.data[0]["id"] if result.data else None
        
        if memo_id:
            return MemoResponse(
                id=memo_id,
                page_id=memo_data.page_id,
                content=memo_data.content,
                updated_at=datetime.now().isoformat()
            )
        else:
            raise HTTPException(status_code=500, detail="メモの保存に失敗しました")
    except HTTPException:
        raise
    except Exception as e:
        handle_database_error(e, "メモの保存")

@app.get("/memos/{page_id}", response_model=MemoResponse)
async def get_memo(
    page_id: str,
    current_user: int = Depends(get_current_user_cached)
):
    """メモの取得（最適化版）"""
    try:
        validate_supabase()
        
        result = supabase.table("page_memos").select("id, content, updated_at, created_at").eq("user_id", current_user).eq("page_id", page_id).execute()
        
        if result.data:
            memo = result.data[0]
            return MemoResponse(
                id=memo["id"],
                page_id=page_id,
                content=memo["content"] or "",
                updated_at=memo.get("updated_at") or memo.get("created_at") or datetime.now().isoformat()
            )
        else:
            # メモが存在しない場合は空のメモを返す
            return MemoResponse(
                id=0,
                page_id=page_id,
                content="",
                updated_at=datetime.now().isoformat()
            )
    except HTTPException:
        raise
    except Exception as e:
        handle_database_error(e, "メモの取得")

@app.get("/memos", response_model=List[MemoResponse])
async def get_all_memos(current_user: int = Depends(get_current_user_cached)):
    """ユーザーの全メモ取得（最適化版）"""
    try:
        validate_supabase()
        
        result = supabase.table("page_memos").select("id, page_id, content, updated_at, created_at").eq("user_id", current_user).order("updated_at", desc=True).execute()
        
        return [
            MemoResponse(
                id=memo["id"],
                page_id=memo["page_id"],
                content=memo["content"] or "",
                updated_at=memo.get("updated_at") or memo.get("created_at") or datetime.now().isoformat()
            )
            for memo in result.data
        ]
    except Exception as e:
        handle_database_error(e, "全メモの取得")

# =============================================================================
# Ver2 プロジェクト管理API（最適化版）
# =============================================================================

@app.post("/v2/projects", response_model=ProjectResponse)
async def create_project_v2(
    project_data: ProjectCreate,
    current_user: int = Depends(get_current_user_cached)
):
    """プロジェクト作成（最適化版）"""
    try:
        validate_supabase()
        
        result = supabase.table('projects').insert({
            'user_id': current_user,
            'theme': project_data.theme,
            'question': project_data.question,
            'hypothesis': project_data.hypothesis
        }).execute()
        
        if result.data:
            project = result.data[0]
            # メモ数は新規作成時は0
            return ProjectResponse(
                id=project['id'],
                theme=project['theme'],
                question=project['question'],
                hypothesis=project['hypothesis'],
                created_at=project['created_at'],
                updated_at=project['updated_at'],
                memo_count=0
            )
        else:
            raise HTTPException(status_code=500, detail="プロジェクトの作成に失敗しました")
    except HTTPException:
        raise
    except Exception as e:
        handle_database_error(e, "プロジェクトの作成")

@app.get("/v2/projects", response_model=List[ProjectResponse])
async def get_projects_v2(current_user: int = Depends(get_current_user_cached)):
    """プロジェクト一覧取得（最適化版）"""
    try:
        validate_supabase()
        
        result = supabase.table('projects').select('*').eq('user_id', current_user).order('updated_at', desc=True).execute()
        
        projects = []
        for project in result.data:
            # メモ数を効率的に取得
            memo_count_result = supabase.table('memos').select('id', count='exact').eq('project_id', project['id']).execute()
            memo_count = memo_count_result.count if memo_count_result.count else 0
            
            projects.append(ProjectResponse(
                id=project['id'],
                theme=project['theme'],
                question=project['question'],
                hypothesis=project['hypothesis'],
                created_at=project['created_at'],
                updated_at=project['updated_at'],
                memo_count=memo_count
            ))
        
        return projects
    except Exception as e:
        handle_database_error(e, "プロジェクト一覧の取得")

@app.get("/v2/projects/{project_id}", response_model=ProjectResponse)
async def get_project_v2(
    project_id: int,
    current_user: int = Depends(get_current_user_cached)
):
    """特定プロジェクト取得（最適化版）"""
    try:
        validate_supabase()
        
        result = supabase.table('projects').select('*').eq('id', project_id).eq('user_id', current_user).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")
        
        project = result.data[0]
        memo_count_result = supabase.table('memos').select('id', count='exact').eq('project_id', project['id']).execute()
        memo_count = memo_count_result.count if memo_count_result.count else 0
        
        return ProjectResponse(
            id=project['id'],
            theme=project['theme'],
            question=project['question'],
            hypothesis=project['hypothesis'],
            created_at=project['created_at'],
            updated_at=project['updated_at'],
            memo_count=memo_count
        )
    except HTTPException:
        raise
    except Exception as e:
        handle_database_error(e, "プロジェクトの取得")

@app.put("/v2/projects/{project_id}", response_model=ProjectResponse)
async def update_project_v2(
    project_id: int,
    project_data: ProjectUpdate,
    current_user: int = Depends(get_current_user_cached)
):
    """プロジェクト更新（最適化版）"""
    try:
        validate_supabase()
        
        update_data = {}
        if project_data.theme is not None:
            update_data['theme'] = project_data.theme
        if project_data.question is not None:
            update_data['question'] = project_data.question
        if project_data.hypothesis is not None:
            update_data['hypothesis'] = project_data.hypothesis
        
        if not update_data:
            raise HTTPException(status_code=400, detail="更新するフィールドがありません")
        
        result = supabase.table('projects').update(update_data).eq('id', project_id).eq('user_id', current_user).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")
        
        return await get_project_v2(project_id, current_user)
    except HTTPException:
        raise
    except Exception as e:
        handle_database_error(e, "プロジェクトの更新")

@app.delete("/v2/projects/{project_id}")
async def delete_project_v2(
    project_id: int,
    current_user: int = Depends(get_current_user_cached)
):
    """プロジェクト削除（最適化版）"""
    try:
        validate_supabase()
        
        result = supabase.table('projects').delete().eq('id', project_id).eq('user_id', current_user).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")
        
        return {"message": "プロジェクトが正常に削除されました"}
    except HTTPException:
        raise
    except Exception as e:
        handle_database_error(e, "プロジェクトの削除")

# =============================================================================
# Ver2 マルチメモ管理API（最適化版）
# =============================================================================

@app.post("/v2/projects/{project_id}/memos", response_model=MultiMemoResponse)
async def create_project_memo_v2(
    project_id: int,
    memo_data: MultiMemoCreate,
    current_user: int = Depends(get_current_user_cached)
):
    """プロジェクト内メモ作成（最適化版）"""
    try:
        validate_supabase()
        
        result = supabase.table('memos').insert({
            'user_id': current_user,
            'project_id': project_id,
            'title': memo_data.title,
            'content': memo_data.content
        }).execute()
        
        if result.data:
            memo = result.data[0]
            return MultiMemoResponse(
                id=memo['id'],
                title=memo['title'],
                content=memo['content'],
                tags=[],  # α版ではタグ機能なし
                project_id=memo['project_id'],
                created_at=memo['created_at'],
                updated_at=memo['updated_at']
            )
        else:
            raise HTTPException(status_code=500, detail="メモの作成に失敗しました")
    except HTTPException:
        raise
    except Exception as e:
        handle_database_error(e, "メモの作成")

@app.get("/v2/projects/{project_id}/memos", response_model=List[MultiMemoResponse])
async def get_project_memos_v2(
    project_id: int,
    current_user: int = Depends(get_current_user_cached)
):
    """プロジェクト内メモ一覧取得（最適化版）"""
    try:
        validate_supabase()
        
        result = supabase.table('memos').select('*').eq('project_id', project_id).eq('user_id', current_user).order('updated_at', desc=True).execute()
        
        return [
            MultiMemoResponse(
                id=memo['id'],
                title=memo['title'],
                content=memo['content'],
                tags=[],  # α版ではタグ機能なし
                project_id=memo['project_id'],
                created_at=memo['created_at'],
                updated_at=memo['updated_at']
            )
            for memo in result.data
        ]
    except Exception as e:
        handle_database_error(e, "メモ一覧の取得")

@app.get("/v2/memos/{memo_id}", response_model=MultiMemoResponse)
async def get_memo_v2(
    memo_id: int,
    current_user: int = Depends(get_current_user_cached)
):
    """特定メモ取得（最適化版）"""
    try:
        validate_supabase()
        
        result = supabase.table('memos').select('*').eq('id', memo_id).eq('user_id', current_user).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="メモが見つかりません")
        
        memo = result.data[0]
        return MultiMemoResponse(
            id=memo['id'],
            title=memo['title'],
            content=memo['content'],
            tags=[],  # α版ではタグ機能なし
            project_id=memo['project_id'],
            created_at=memo['created_at'],
            updated_at=memo['updated_at']
        )
    except HTTPException:
        raise
    except Exception as e:
        handle_database_error(e, "メモの取得")

@app.put("/v2/memos/{memo_id}", response_model=MultiMemoResponse)
async def update_memo_v2(
    memo_id: int,
    memo_data: MultiMemoUpdate,
    current_user: int = Depends(get_current_user_cached)
):
    """メモ更新（最適化版）"""
    try:
        validate_supabase()
        
        update_data = {}
        if memo_data.title is not None:
            update_data['title'] = memo_data.title
        if memo_data.content is not None:
            update_data['content'] = memo_data.content
        
        if not update_data:
            raise HTTPException(status_code=400, detail="更新するフィールドがありません")
        
        result = supabase.table('memos').update(update_data).eq('id', memo_id).eq('user_id', current_user).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="メモが見つかりません")
        
        return await get_memo_v2(memo_id, current_user)
    except HTTPException:
        raise
    except Exception as e:
        handle_database_error(e, "メモの更新")

@app.delete("/v2/memos/{memo_id}")
async def delete_memo_v2(
    memo_id: int,
    current_user: int = Depends(get_current_user_cached)
):
    """メモ削除（最適化版）"""
    try:
        validate_supabase()
        
        result = supabase.table('memos').delete().eq('id', memo_id).eq('user_id', current_user).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="メモが見つかりません")
        
        return {"message": "メモが正常に削除されました"}
    except HTTPException:
        raise
    except Exception as e:
        handle_database_error(e, "メモの削除")

# =============================================================================
# テーマ深掘りツール（最適化版）
# =============================================================================

@app.post("/framework-games/theme-deep-dive/suggestions", response_model=ThemeDeepDiveResponse)
async def generate_theme_suggestions(
    request: ThemeDeepDiveRequest,
    current_user: int = Depends(get_current_user_cached)
):
    """探究テーマの深掘り提案を生成（最適化版）"""
    try:
        validate_supabase()
        
        if llm_client is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="LLMクライアントが初期化されていません"
            )
        
        # プロンプトの構築（最適化：効率的な指示）
        system_prompt_theme = """あなたは探究学習の専門家です。
生徒が持っているテーマに対して、より具体的で興味深い方向性を提案する役割があります。
提案は探究可能で高校生にとって理解可能で実行可能なものにしてください。"""

        depth_guidance = "より具体的な探究の切り口を示してください。" if request.depth >= 2 else "具体的な領域や側面に分けてください。"
        interest_context = f"\n生徒の興味関心: {', '.join(request.user_interests)}" if request.user_interests else ""
        
        user_prompt = f"""探究テーマ「{request.theme}」について、次のレベルの具体的な探究の方向性を5〜7個提案してください。

{depth_guidance}
{interest_context}

以下の形式で提案してください：
1. [提案内容]
2. [提案内容]
...

各提案は30文字以内で、生徒が興味を持ちやすい表現にしてください。"""

        # LLMへのリクエスト（最適化：履歴なしで効率化）
        messages = [
            {"role": "system", "content": system_prompt_theme},
            {"role": "user", "content": user_prompt}
        ]
        
        response = llm_client.generate_response_with_history(messages)
        
        # 応答のパース（最適化：効率的な正規表現）
        import re
        suggestions = []
        for line in response.strip().split('\n'):
            match = re.match(r'^\d+\.\s*(.+)$', line.strip())
            if match:
                suggestion = match.group(1).strip()
                if suggestion and len(suggestion) <= 50:
                    suggestions.append(suggestion)
        
        # 最低5個、最大7個に調整
        if len(suggestions) < 5:
            default_suggestions = [
                f"{request.theme}の社会的影響",
                f"{request.theme}の技術的側面",
                f"{request.theme}と環境の関係",
                f"{request.theme}の歴史的背景",
                f"{request.theme}の未来予測"
            ]
            for ds in default_suggestions:
                if len(suggestions) >= 7:
                    break
                if ds not in suggestions:
                    suggestions.append(ds)
        elif len(suggestions) > 7:
            suggestions = suggestions[:7]
        
        context_info = {
            "depth": request.depth,
            "suggestions_count": len(suggestions)
        }
        
        return ThemeDeepDiveResponse(
            suggestions=suggestions,
            context_info=context_info
        )
    except HTTPException:
        raise
    except Exception as e:
        handle_database_error(e, "提案の生成")

@app.post("/framework-games/theme-deep-dive/save-selection")
async def save_theme_selection(
    request: Dict[str, Any],
    current_user: int = Depends(get_current_user_cached)
):
    """テーマ選択の保存"""
    try:
        theme = request.get("theme")
        path = request.get("path", [])
        
        if not theme:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="テーマが指定されていません"
            )
        
        # ここでは選択を記録するだけで、特にDBへの保存は行わない
        # 将来的にDBに保存する場合はここに実装を追加
        logger.info(f"User {current_user} selected theme: {theme}, path: {path}")
        
        return {"message": "選択が保存されました", "theme": theme, "path": path}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"テーマ選択の保存エラー: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="選択の保存に失敗しました"
        )

# =============================================================================
# メモリ管理API（Phase 1）
# =============================================================================

@app.get("/memory/conversation/{conversation_id}/metadata")
async def get_conversation_metadata(
    conversation_id: str,
    current_user: int = Depends(get_current_user_cached)
):
    """会話のメタデータを取得"""
    try:
        validate_supabase()
        
        # 会話の所有者確認
        conv_result = supabase.table("chat_conversations").select("user_id").eq("id", conversation_id).execute()
        if not conv_result.data or conv_result.data[0]["user_id"] != current_user:
            raise HTTPException(status_code=404, detail="会話が見つかりません")
        
        # メッセージを取得
        messages_result = supabase.table("chat_logs").select("*").eq("conversation_id", conversation_id).order("created_at").execute()
        
        if memory_manager and messages_result.data:
            metadata = memory_manager.get_conversation_metadata(messages_result.data)
            return metadata
        else:
            return {"message": "メタデータを生成できませんでした"}
            
    except HTTPException:
        raise
    except Exception as e:
        handle_database_error(e, "会話メタデータの取得")

@app.post("/memory/conversation/{conversation_id}/summarize")
async def create_conversation_summary(
    conversation_id: str,
    current_user: int = Depends(get_current_user_cached)
):
    """会話の要約を作成"""
    try:
        validate_supabase()
        
        # 会話の所有者確認
        conv_result = supabase.table("chat_conversations").select("user_id").eq("id", conversation_id).execute()
        if not conv_result.data or conv_result.data[0]["user_id"] != current_user:
            raise HTTPException(status_code=404, detail="会話が見つかりません")
        
        # メッセージを取得
        messages_result = supabase.table("chat_logs").select("*").eq("conversation_id", conversation_id).order("created_at").execute()
        
        if not messages_result.data:
            raise HTTPException(status_code=400, detail="要約するメッセージがありません")
        
        # 重要なメッセージを抽出して要約を作成
        if memory_manager:
            enhanced_messages = [memory_manager.process_message(msg) for msg in messages_result.data]
            
            # 重要度が高いメッセージを選択
            important_messages = [msg for msg in enhanced_messages if msg.importance.value >= MessageImportance.HIGH.value]
            
            if not important_messages:
                important_messages = enhanced_messages[:10]  # 最新10件
            
            # 要約テキストを生成（簡易版）
            summary_parts = []
            keywords = set()
            
            for msg in important_messages[:5]:  # 最大5件
                if msg.summary:
                    summary_parts.append(f"- {msg.summary}")
                else:
                    summary_parts.append(f"- {msg.message[:100]}...")
                keywords.update(msg.keywords)
            
            summary_text = "\n".join(summary_parts)
            
            # DBに保存
            summary_data = {
                "conversation_id": conversation_id,
                "summary_type": "auto-generated",
                "summary_text": summary_text,
                "keywords": list(keywords)[:20],
                "token_count": memory_manager.token_manager.count_tokens(summary_text)
            }
            
            result = supabase.table("conversation_summaries").insert(summary_data).execute()
            
            if result.data:
                return {
                    "summary": summary_text,
                    "keywords": list(keywords)[:20],
                    "message_count": len(messages_result.data),
                    "important_message_count": len(important_messages)
                }
        
        raise HTTPException(status_code=500, detail="要約の作成に失敗しました")
        
    except HTTPException:
        raise
    except Exception as e:
        handle_database_error(e, "会話要約の作成")

@app.get("/memory/user/profile")
async def get_user_learning_profile(
    current_user: int = Depends(get_current_user_cached)
):
    """ユーザーの学習プロファイルを取得"""
    try:
        validate_supabase()
        
        # プロファイルを取得または作成
        result = supabase.table("user_learning_profiles").select("*").eq("user_id", current_user).execute()
        
        if result.data:
            return result.data[0]
        else:
            # 新規作成
            new_profile = {
                "user_id": current_user,
                "interests": [],
                "important_topics": [],
                "learning_style": {},
                "token_usage_stats": {}
            }
            
            create_result = supabase.table("user_learning_profiles").insert(new_profile).execute()
            
            if create_result.data:
                return create_result.data[0]
            else:
                raise HTTPException(status_code=500, detail="プロファイルの作成に失敗しました")
                
    except HTTPException:
        raise
    except Exception as e:
        handle_database_error(e, "学習プロファイルの取得")

@app.post("/memory/user/profile/update")
async def update_user_learning_profile(
    profile_data: Dict[str, Any],
    current_user: int = Depends(get_current_user_cached)
):
    """ユーザーの学習プロファイルを更新"""
    try:
        validate_supabase()
        
        # 既存のプロファイルを確認
        result = supabase.table("user_learning_profiles").select("id").eq("user_id", current_user).execute()
        
        if not result.data:
            # 新規作成
            profile_data["user_id"] = current_user
            result = supabase.table("user_learning_profiles").insert(profile_data).execute()
        else:
            # 更新
            result = supabase.table("user_learning_profiles").update(profile_data).eq("user_id", current_user).execute()
        
        if result.data:
            return {"message": "プロファイルが更新されました", "profile": result.data[0]}
        else:
            raise HTTPException(status_code=500, detail="プロファイルの更新に失敗しました")
            
    except HTTPException:
        raise
    except Exception as e:
        handle_database_error(e, "学習プロファイルの更新")

@app.get("/memory/token-usage/stats")
async def get_token_usage_stats(
    days: int = 7,
    current_user: int = Depends(get_current_user_cached)
):
    """トークン使用統計を取得"""
    try:
        validate_supabase()
        
        # 指定期間のトークン使用履歴を取得
        from_date = (datetime.now() - timedelta(days=days)).isoformat()
        
        result = supabase.table("token_usage_history").select("*").eq("user_id", current_user).gte("created_at", from_date).order("created_at", desc=True).execute()
        
        if result.data:
            total_tokens = sum(item["total_tokens"] for item in result.data)
            total_cost = sum(float(item["estimated_cost_usd"] or 0) for item in result.data)
            
            return {
                "period_days": days,
                "total_requests": len(result.data),
                "total_tokens": total_tokens,
                "total_cost_usd": round(total_cost, 4),
                "average_tokens_per_request": round(total_tokens / len(result.data)) if result.data else 0,
                "daily_average_tokens": round(total_tokens / days) if days > 0 else 0
            }
        else:
            return {
                "period_days": days,
                "total_requests": 0,
                "total_tokens": 0,
                "total_cost_usd": 0,
                "average_tokens_per_request": 0,
                "daily_average_tokens": 0
            }
            
    except Exception as e:
        handle_database_error(e, "トークン使用統計の取得")

@app.post("/memory/messages/mark-important")
async def mark_message_important(
    message_data: Dict[str, Any],
    current_user: int = Depends(get_current_user_cached)
):
    """メッセージを重要としてマーク"""
    try:
        validate_supabase()
        
        message_id = message_data.get("message_id")
        importance_level = message_data.get("importance_level", 3)
        notes = message_data.get("notes", "")
        
        if not message_id:
            raise HTTPException(status_code=400, detail="メッセージIDが必要です")
        
        # メッセージの所有者確認
        msg_result = supabase.table("chat_logs").select("user_id, conversation_id, message").eq("id", message_id).execute()
        
        if not msg_result.data or msg_result.data[0]["user_id"] != current_user:
            raise HTTPException(status_code=404, detail="メッセージが見つかりません")
        
        message = msg_result.data[0]
        
        # キーワード抽出
        keywords = []
        if memory_manager:
            _, keywords = memory_manager.classifier.classify(message["message"])
        
        # 重要メッセージとして保存
        important_msg_data = {
            "user_id": current_user,
            "message_id": message_id,
            "conversation_id": message["conversation_id"],
            "importance_level": importance_level,
            "keywords": keywords,
            "notes": notes
        }
        
        result = supabase.table("important_messages").insert(important_msg_data).execute()
        
        if result.data:
            return {"message": "メッセージが重要としてマークされました", "data": result.data[0]}
        else:
            raise HTTPException(status_code=500, detail="保存に失敗しました")
            
    except HTTPException:
        raise
    except Exception as e:
        handle_database_error(e, "重要メッセージのマーク")

# =============================================================================
# クエストシステムAPI
# =============================================================================

@app.get("/quests", response_model=List[QuestResponse])
async def get_quests(
    category: Optional[str] = None,
    difficulty: Optional[int] = None,
    current_user: int = Depends(get_current_user_cached)
):
    """利用可能なクエスト一覧を取得"""
    try:
        validate_supabase()
        
        query = supabase.table("quests").select("*").eq("is_active", True)
        
        if category:
            query = query.eq("category", category)
        if difficulty:
            query = query.eq("difficulty", difficulty)
        
        result = query.order("difficulty", desc=False).order("points", desc=False).execute()
        
        return [
            QuestResponse(
                id=quest["id"],
                title=quest["title"],
                description=quest["description"],
                category=quest["category"],
                difficulty=quest["difficulty"],
                points=quest["points"],
                required_evidence=quest["required_evidence"],
                icon_name=quest.get("icon_name"),
                is_active=quest["is_active"],
                created_at=quest["created_at"],
                updated_at=quest["updated_at"]
            )
            for quest in result.data
        ]
    except Exception as e:
        handle_database_error(e, "クエスト一覧の取得")

@app.get("/quests/{quest_id}", response_model=QuestResponse)
async def get_quest(
    quest_id: int,
    current_user: int = Depends(get_current_user_cached)
):
    """特定のクエスト詳細を取得"""
    try:
        validate_supabase()
        
        result = supabase.table("quests").select("*").eq("id", quest_id).eq("is_active", True).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="クエストが見つかりません")
        
        quest = result.data[0]
        return QuestResponse(
            id=quest["id"],
            title=quest["title"],
            description=quest["description"],
            category=quest["category"],
            difficulty=quest["difficulty"],
            points=quest["points"],
            required_evidence=quest["required_evidence"],
            icon_name=quest.get("icon_name"),
            is_active=quest["is_active"],
            created_at=quest["created_at"],
            updated_at=quest["updated_at"]
        )
    except HTTPException:
        raise
    except Exception as e:
        handle_database_error(e, "クエスト詳細の取得")

@app.get("/user-quests", response_model=List[UserQuestResponse])
async def get_user_quests(
    status: Optional[str] = None,
    current_user: int = Depends(get_current_user_cached)
):
    """ユーザーのクエスト進捗を取得"""
    try:
        validate_supabase()
        
        query = supabase.table("user_quests").select("""
            id, user_id, quest_id, status, progress, started_at, completed_at, created_at, updated_at,
            quests!user_quests_quest_id_fkey (
                id, title, description, category, difficulty, points, required_evidence, icon_name, is_active, created_at, updated_at
            )
        """).eq("user_id", current_user)
        
        if status:
            query = query.eq("status", status)
        
        result = query.order("updated_at", desc=True).execute()
        
        return [
            UserQuestResponse(
                id=uq["id"],
                user_id=uq["user_id"],
                quest_id=uq["quest_id"],
                status=uq["status"],
                progress=uq["progress"] or 0,
                quest=QuestResponse(
                    id=uq["quests"]["id"],
                    title=uq["quests"]["title"],
                    description=uq["quests"]["description"],
                    category=uq["quests"]["category"],
                    difficulty=uq["quests"]["difficulty"],
                    points=uq["quests"]["points"],
                    required_evidence=uq["quests"]["required_evidence"],
                    icon_name=uq["quests"].get("icon_name"),
                    is_active=uq["quests"]["is_active"],
                    created_at=uq["quests"]["created_at"],
                    updated_at=uq["quests"]["updated_at"]
                ),
                started_at=uq.get("started_at"),
                completed_at=uq.get("completed_at"),
                created_at=uq["created_at"],
                updated_at=uq["updated_at"]
            )
            for uq in result.data
        ]
    except Exception as e:
        handle_database_error(e, "ユーザークエストの取得")

@app.post("/user-quests/start", response_model=UserQuestResponse)
async def start_quest(
    quest_data: UserQuestStart,
    current_user: int = Depends(get_current_user_cached)
):
    """クエストを開始"""
    try:
        validate_supabase()
        
        # クエストが存在し、アクティブかチェック
        quest_result = supabase.table("quests").select("*").eq("id", quest_data.quest_id).eq("is_active", True).execute()
        if not quest_result.data:
            raise HTTPException(status_code=404, detail="クエストが見つかりません")
        
        # 既に開始済みかチェック
        existing_result = supabase.table("user_quests").select("id, status").eq("user_id", current_user).eq("quest_id", quest_data.quest_id).execute()
        
        if existing_result.data:
            existing_quest = existing_result.data[0]
            if existing_quest["status"] == "completed":
                raise HTTPException(status_code=400, detail="このクエストは既に完了しています")
            elif existing_quest["status"] == "in_progress":
                raise HTTPException(status_code=400, detail="このクエストは既に進行中です")
            else:
                # ステータスを更新
                update_result = supabase.table("user_quests").update({
                    "status": "in_progress",
                    "started_at": datetime.now().isoformat(),
                    "progress": 0
                }).eq("id", existing_quest["id"]).execute()
        else:
            # 新規作成
            update_result = supabase.table("user_quests").insert({
                "user_id": current_user,
                "quest_id": quest_data.quest_id,
                "status": "in_progress",
                "started_at": datetime.now().isoformat(),
                "progress": 0
            }).execute()
        
        if not update_result.data:
            raise HTTPException(status_code=500, detail="クエストの開始に失敗しました")
        
        # 更新されたユーザークエストを取得
        result = supabase.table("user_quests").select("""
            id, user_id, quest_id, status, progress, started_at, completed_at, created_at, updated_at,
            quests!user_quests_quest_id_fkey (
                id, title, description, category, difficulty, points, required_evidence, icon_name, is_active, created_at, updated_at
            )
        """).eq("id", update_result.data[0]["id"]).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="開始したクエストの取得に失敗しました")
        
        uq = result.data[0]
        return UserQuestResponse(
            id=uq["id"],
            user_id=uq["user_id"],
            quest_id=uq["quest_id"],
            status=uq["status"],
            progress=uq["progress"] or 0,
            quest=QuestResponse(
                id=uq["quests"]["id"],
                title=uq["quests"]["title"],
                description=uq["quests"]["description"],
                category=uq["quests"]["category"],
                difficulty=uq["quests"]["difficulty"],
                points=uq["quests"]["points"],
                required_evidence=uq["quests"]["required_evidence"],
                icon_name=uq["quests"].get("icon_name"),
                is_active=uq["quests"]["is_active"],
                created_at=uq["quests"]["created_at"],
                updated_at=uq["quests"]["updated_at"]
            ),
            started_at=uq.get("started_at"),
            completed_at=uq.get("completed_at"),
            created_at=uq["created_at"],
            updated_at=uq["updated_at"]
        )
    except HTTPException:
        raise
    except Exception as e:
        handle_database_error(e, "クエストの開始")

@app.post("/user-quests/{user_quest_id}/submit", response_model=QuestSubmissionResponse)
async def submit_quest(
    user_quest_id: int,
    submission_data: QuestSubmissionCreate,
    current_user: int = Depends(get_current_user_cached)
):
    """クエストの成果物を提出"""
    try:
        validate_supabase()
        
        # ユーザークエストの存在確認
        uq_result = supabase.table("user_quests").select("id, user_id, quest_id, status").eq("id", user_quest_id).eq("user_id", current_user).execute()
        
        if not uq_result.data:
            raise HTTPException(status_code=404, detail="クエストが見つかりません")
        
        user_quest = uq_result.data[0]
        
        if user_quest["status"] != "in_progress":
            raise HTTPException(status_code=400, detail="進行中のクエストのみ提出できます")
        
        # クエスト情報を取得
        quest_result = supabase.table("quests").select("points").eq("id", user_quest["quest_id"]).execute()
        quest_points = quest_result.data[0]["points"] if quest_result.data else 1000
        
        # 提出データを保存
        submission_result = supabase.table("quest_submissions").insert({
            "user_quest_id": user_quest_id,
            "user_id": current_user,
            "quest_id": user_quest["quest_id"],
            "description": submission_data.description,
            "file_url": submission_data.file_url,
            "reflection_data": submission_data.reflection_data,
            "status": "approved",  # 自動承認
            "points_awarded": quest_points
        }).execute()
        
        if not submission_result.data:
            raise HTTPException(status_code=500, detail="提出の保存に失敗しました")
        
        # ユーザークエストのステータスを完了に更新
        supabase.table("user_quests").update({
            "status": "completed",
            "progress": 100,
            "completed_at": datetime.now().isoformat()
        }).eq("id", user_quest_id).execute()
        
        # ユーザープロファイルのポイントを更新
        try:
            profile_result = supabase.table("user_learning_profiles").select("total_points").eq("user_id", current_user).execute()
            
            if profile_result.data:
                current_points = profile_result.data[0]["total_points"] or 0
                supabase.table("user_learning_profiles").update({
                    "total_points": current_points + quest_points,
                    "last_activity": datetime.now().isoformat()
                }).eq("user_id", current_user).execute()
            else:
                # プロファイルを新規作成
                supabase.table("user_learning_profiles").insert({
                    "user_id": current_user,
                    "total_points": quest_points,
                    "last_activity": datetime.now().isoformat()
                }).execute()
        except Exception as e:
            logger.warning(f"プロファイル更新に失敗: {e}")
        
        submission = submission_result.data[0]
        return QuestSubmissionResponse(
            id=submission["id"],
            user_quest_id=submission["user_quest_id"],
            quest_id=submission["quest_id"],
            description=submission["description"],
            file_url=submission.get("file_url"),
            reflection_data=submission.get("reflection_data"),
            status=submission["status"],
            points_awarded=submission["points_awarded"],
            submitted_at=submission["submitted_at"]
        )
    except HTTPException:
        raise
    except Exception as e:
        handle_database_error(e, "クエストの提出")

@app.get("/user-quests/{user_quest_id}/submission", response_model=QuestSubmissionResponse)
async def get_quest_submission(
    user_quest_id: int,
    current_user: int = Depends(get_current_user_cached)
):
    """クエスト提出内容を取得"""
    try:
        validate_supabase()
        
        result = supabase.table("quest_submissions").select("*").eq("user_quest_id", user_quest_id).eq("user_id", current_user).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="提出データが見つかりません")
        
        submission = result.data[0]
        return QuestSubmissionResponse(
            id=submission["id"],
            user_quest_id=submission["user_quest_id"],
            quest_id=submission["quest_id"],
            description=submission["description"],
            file_url=submission.get("file_url"),
            reflection_data=submission.get("reflection_data"),
            status=submission["status"],
            points_awarded=submission["points_awarded"],
            submitted_at=submission["submitted_at"]
        )
    except HTTPException:
        raise
    except Exception as e:
        handle_database_error(e, "提出データの取得")

@app.get("/quest-stats")
async def get_quest_stats(
    current_user: int = Depends(get_current_user_cached)
):
    """クエスト統計情報を取得"""
    try:
        validate_supabase()
        
        # ユーザーのクエスト統計
        user_quests = supabase.table("user_quests").select("status, quests!user_quests_quest_id_fkey(points)").eq("user_id", current_user).execute()
        
        total_quests = len(user_quests.data)
        completed_quests = len([uq for uq in user_quests.data if uq["status"] == "completed"])
        in_progress_quests = len([uq for uq in user_quests.data if uq["status"] == "in_progress"])
        available_quests_count = supabase.table("quests").select("id", count="exact").eq("is_active", True).execute().count or 0
        
        total_points = sum(uq["quests"]["points"] for uq in user_quests.data if uq["status"] == "completed")
        
        return {
            "total_quests": total_quests,
            "available_quests": available_quests_count - total_quests,
            "completed_quests": completed_quests,
            "in_progress_quests": in_progress_quests,
            "total_points": total_points
        }
    except Exception as e:
        handle_database_error(e, "クエスト統計の取得")

# データベーステーブル存在確認用のデバッグエンドポイント
@app.get("/debug/check-quest-tables")
async def check_quest_tables(
    current_user: int = Depends(get_current_user_cached)
):
    """クエスト関連テーブルの存在確認（デバッグ用）"""
    try:
        validate_supabase()
        
        result = {}
        
        # questsテーブル確認
        try:
            quests_result = supabase.table("quests").select("count", count="exact").execute()
            result["quests_table"] = {
                "exists": True,
                "count": quests_result.count
            }
        except Exception as e:
            result["quests_table"] = {
                "exists": False,
                "error": str(e)
            }
        
        # user_questsテーブル確認
        try:
            user_quests_result = supabase.table("user_quests").select("count", count="exact").execute()
            result["user_quests_table"] = {
                "exists": True,
                "count": user_quests_result.count
            }
        except Exception as e:
            result["user_quests_table"] = {
                "exists": False,
                "error": str(e)
            }
        
        # quest_submissionsテーブル確認
        try:
            submissions_result = supabase.table("quest_submissions").select("count", count="exact").execute()
            result["quest_submissions_table"] = {
                "exists": True,
                "count": submissions_result.count
            }
        except Exception as e:
            result["quest_submissions_table"] = {
                "exists": False,
                "error": str(e)
            }
        
        return result
        
    except Exception as e:
        return {"error": f"Database connection failed: {str(e)}"}

# Phase 2: AI提案機能（今後実装予定）
# =============================================================================

# 現在はPlaceholder実装（Phase 2で実装）
@app.get("/quest-recommendations")
async def get_quest_recommendations(
    current_user: int = Depends(get_current_user_cached)
):
    """AI推薦クエスト取得（Phase 2で実装予定）"""
    return {"message": "Phase 2で実装予定", "recommendations": []}

@app.post("/generate-quest")
async def generate_quest(
    generation_data: Dict[str, Any],
    current_user: int = Depends(get_current_user_cached)
):
    """AI生成クエスト（Phase 2で実装予定）"""
    return {"message": "Phase 2で実装予定", "quest": None}

# =============================================================================
# 管理者機能（最適化版）
# =============================================================================

@app.post("/admin/create-test-user")
async def create_test_user(user_data: AdminUserCreate):
    """負荷テスト用ユーザー作成（最適化版）"""
    try:
        validate_supabase()
        
        # セキュリティ: loadtest_user_* パターンのみ許可
        if not user_data.username.startswith("loadtest_user_"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="テストユーザー名は 'loadtest_user_' で始まる必要があります"
            )
        
        # 既存ユーザーチェック（最適化：必要最小限のクエリ）
        existing_user = supabase.table("users").select("id").eq("username", user_data.username).execute()
        if existing_user.data:
            return {"message": f"ユーザー {user_data.username} は既に存在します", "id": existing_user.data[0]["id"]}
        
        # ユーザー作成（最適化版）
        result = supabase.table("users").insert({
            "username": user_data.username,
            "password": user_data.password
        }).execute()
        
        if result.data and len(result.data) > 0:
            user = result.data[0]
            return {
                "message": f"テストユーザー {user_data.username} を作成しました",
                "id": user["id"]
            }
        else:
            raise HTTPException(status_code=500, detail="ユーザー作成に失敗しました")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"テストユーザー作成エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"ユーザー作成処理でエラーが発生しました: {str(e)}"
        )

@app.delete("/admin/cleanup-test-users")
async def cleanup_test_users():
    """テストユーザーの一括削除（最適化版）"""
    try:
        validate_supabase()
        
        # loadtest_user_* パターンのユーザーを削除（最適化版）
        result = supabase.table("users").delete().like("username", "loadtest_user_%").execute()
        
        deleted_count = len(result.data) if result.data else 0
        
        return {
            "message": f"{deleted_count}人のテストユーザーを削除しました"
        }
        
    except Exception as e:
        logger.error(f"テストユーザー削除エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"テストユーザー削除でエラーが発生しました: {str(e)}"
        )

if __name__ == "__main__":
    # 本番環境用の設定
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        workers=4,  # ワーカープロセス数を増やす
        access_log=False,  # アクセスログを無効化してパフォーマンス向上
        log_level="warning"  # ログレベルを下げる
    ) 