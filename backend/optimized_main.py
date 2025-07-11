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

# 管理者関連
class AdminUserCreate(BaseModel):
    username: str
    password: str

# === グローバル変数 ===
llm_client = None
supabase: Client = None

@app.on_event("startup")
async def startup_event():
    """アプリケーション起動時の初期化（最適化版）"""
    global llm_client, supabase
    
    try:
        # Supabaseクライアント初期化（コネクション設定最適化）
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_ANON_KEY")
        
        if not supabase_url or not supabase_key:
            raise ValueError("Supabase環境変数が設定されていません")
            
        supabase = create_client(supabase_url, supabase_key)
        
        # LLMクライアント初期化
        llm_client = learning_plannner
        
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
        
        # 過去の対話履歴を取得（最適化：最小限のクエリ）
        history_response = supabase.table("chat_logs").select("sender, message").eq("conversation_id", conversation_id).order("created_at").limit(20).execute()
        conversation_history = history_response.data
        
        # LLM用のメッセージリストを構築
        messages = [{"role": "system", "content": system_prompt}]
        for history_msg in conversation_history:
            role = "user" if history_msg["sender"] == "user" else "assistant"
            messages.append({"role": role, "content": history_msg["message"]})
        
        messages.append({"role": "user", "content": chat_data.message})
        
        # ユーザーメッセージをDBに保存（最適化：必要最小限のデータ）
        user_message_data = {
            "user_id": current_user,
            "page": page_id,
            "sender": "user",
            "message": chat_data.message,
            "conversation_id": conversation_id
        }
        supabase.table("chat_logs").insert(user_message_data).execute()
        
        # LLMから応答を取得
        response = llm_client.generate_response_with_history(messages)
        
        # AIの応答をDBに保存
        ai_message_data = {
            "user_id": current_user,
            "page": page_id,
            "sender": "assistant",
            "message": response,
            "conversation_id": conversation_id
        }
        supabase.table("chat_logs").insert(ai_message_data).execute()
        
        # conversationの最終更新時刻を更新
        await update_conversation_timestamp(conversation_id)
        
        return ChatResponse(
            response=response,
            timestamp=datetime.now().isoformat()
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
        "optimized_main:app",
        host="0.0.0.0",
        port=8000,
        workers=4,  # ワーカープロセス数を増やす
        access_log=False,  # アクセスログを無効化してパフォーマンス向上
        log_level="warning"  # ログレベルを下げる
    ) 