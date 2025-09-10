from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import sys
import os
import json
import logging
from datetime import datetime, timedelta, timezone
import asyncio
import uvicorn
from supabase import create_client, Client
from dotenv import load_dotenv
from functools import lru_cache
import time
from collections import deque

# .envファイルを読み込み
load_dotenv()

# メモリ管理システムをインポート（使用しない）
# from memory_manager import MemoryManager, MessageImportance

# プロジェクトルートをPythonパスに追加
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from module.llm_api import learning_plannner
from prompt.prompt import system_prompt

# ロギング設定（デバッグ用）
logging.basicConfig(
    level=logging.INFO,  # DEBUG用にINFOレベルに変更
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# =====================
# Config/Feature flags
# =====================
# History window size for chat context (kept small to control latency/cost)
CHAT_HISTORY_LIMIT_DEFAULT = int(os.environ.get("CHAT_HISTORY_LIMIT_DEFAULT", "50"))
CHAT_HISTORY_LIMIT_MAX = int(os.environ.get("CHAT_HISTORY_LIMIT_MAX", "100"))

# Message length guard for /chat
MAX_CHAT_MESSAGE_LENGTH = int(os.environ.get("MAX_CHAT_MESSAGE_LENGTH", "2000"))

# Simple in-memory rate limiting for /chat (per user+IP)
ENABLE_CHAT_RATE_LIMIT = os.environ.get("ENABLE_CHAT_RATE_LIMIT", "true").lower() == "true"
RATE_LIMIT_WINDOW_SEC = int(os.environ.get("CHAT_RATE_LIMIT_WINDOW_SEC", "60"))
RATE_LIMIT_MAX_REQUESTS = int(os.environ.get("CHAT_RATE_LIMIT_MAX", "20"))

# Phase 1: AI対話エージェント機能のインポート
try:
    # 同じディレクトリ内のconversation_agentモジュールからインポート
    from backend.conversation_agent import ConversationOrchestrator
    CONVERSATION_AGENT_AVAILABLE = True
    logger.info("対話エージェント機能が利用可能です")
except ImportError:
    try:
        # 代替パス（main.pyを直接実行する場合）
        from conversation_agent import ConversationOrchestrator
        CONVERSATION_AGENT_AVAILABLE = True
        logger.info("対話エージェント機能が利用可能です（代替パス）")
    except ImportError as e:
        CONVERSATION_AGENT_AVAILABLE = False
        logger.warning(f"対話エージェント機能が利用できません: {e}")

# 機能フラグ（環境変数で制御）
ENABLE_CONVERSATION_AGENT = os.environ.get("ENABLE_CONVERSATION_AGENT", "false").lower() == "true"

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

# CORS設定
# 開発環境でNginxリバースプロキシを使用する場合は不要
# 本番環境や直接アクセスが必要な場合はコメントを外してください
if os.environ.get("ENABLE_CORS", "false").lower() == "true":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173", 
            "http://localhost:3000",
            "http://127.0.0.1:8080",
            "http://localhost:8080",
            "https://demo.tanqmates.org"
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# セキュリティスキーム
security = HTTPBearer()

# In-memory rate limiting store
_rate_limit_store: dict = {}

async def chat_rate_limiter(request: Request, current_user: int = Depends(security)):
    """Simple per-user+IP rate limiter for /chat.
    Uses a sliding window over RATE_LIMIT_WINDOW_SEC seconds.
    """
    if not ENABLE_CHAT_RATE_LIMIT:
        return

    try:
        # Extract user id from bearer token (already required by Depends(security))
        token = current_user.credentials if hasattr(current_user, "credentials") else None
        user_key = str(token) if token else request.client.host
    except Exception:
        user_key = request.client.host

    ip = request.client.host if request.client else "unknown"
    key = f"{user_key}:{ip}"

    now = time.time()
    window_start = now - RATE_LIMIT_WINDOW_SEC

    dq = _rate_limit_store.get(key)
    if dq is None:
        dq = deque()
        _rate_limit_store[key] = dq

    # Drop old entries
    while dq and dq[0] < window_start:
        dq.popleft()

    if len(dq) >= RATE_LIMIT_MAX_REQUESTS:
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Please slow down.")

    dq.append(now)

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
    page_id: Optional[str] = None  # フロントエンドとの互換性のため
    memo_content: Optional[str] = None  # Layout.tsxから送られるフィールド

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
    """対話エージェント検証用リクエストモデル"""
    message: str
    project_id: Optional[int] = None
    page_id: Optional[str] = None
    include_history: bool = True
    history_limit: int = 50
    debug_mode: bool = False  # デバッグ情報を含めるか
    mock_mode: bool = True  # モックモードで動作するか

class ConversationAgentResponse(BaseModel):
    """対話エージェント検証用レスポンスモデル"""
    response: str
    timestamp: str
    # エージェント固有のメタデータ
    support_type: str
    selected_acts: List[str]
    state_snapshot: Dict[str, Any]
    project_plan: Optional[Dict[str, Any]]
    decision_metadata: Dict[str, Any]
    metrics: Dict[str, Any]
    # デバッグ情報
    debug_info: Optional[Dict[str, Any]] = None
    # 履歴情報
    conversation_id: Optional[str] = None
    history_count: int = 0
    # エラー情報
    error: Optional[str] = None
    warning: Optional[str] = None

class ChatHistoryResponse(BaseModel):
    id: int
    page: str
    sender: str
    message: str
    context_data: Optional[str]
    created_at: str

# ConversationResponse は削除（chat_conversationsテーブルを使用しないため）

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
# memory_manager: MemoryManager = None  # 使用しない

# Phase 1: 対話エージェント
conversation_orchestrator = None

@app.on_event("startup")
async def startup_event():
    """アプリケーション起動時の初期化（最適化版）"""
    global llm_client, supabase, conversation_orchestrator
    
    try:
        # Supabaseクライアント初期化（コネクション設定最適化）
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_KEY")
        
        if not supabase_url or not supabase_key:
            raise ValueError("Supabase環境変数が設定されていません")
            
        supabase = create_client(supabase_url, supabase_key)
        
        # LLMクライアント初期化
        llm_client = learning_plannner()
        
        # Phase 1: 対話エージェント初期化
        if ENABLE_CONVERSATION_AGENT and CONVERSATION_AGENT_AVAILABLE:
            try:
                conversation_orchestrator = ConversationOrchestrator(
                    llm_client=llm_client,
                    use_mock=True  # Phase 1ではモックモード
                )
                logger.info("✅ 対話エージェント初期化完了（モックモード）")
            except Exception as e:
                logger.error(f"❌ 対話エージェント初期化エラー: {e}")
                import traceback
                logger.error(f"詳細エラー: {traceback.format_exc()}")
                conversation_orchestrator = None
        else:
            if not ENABLE_CONVERSATION_AGENT:
                logger.info("⚠️ 対話エージェント機能は無効です（環境変数ENABLE_CONVERSATION_AGENT=false）")
            if not CONVERSATION_AGENT_AVAILABLE:
                logger.info("⚠️ 対話エージェントモジュールが利用不可です")
        
        # メモリ管理システム初期化（使用しない）
        # global memory_manager
        # memory_manager = MemoryManager(model="gpt-4.1-nano", max_messages=100)
        
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
        import traceback
        error_detail = f"認証エラー詳細: {type(e).__name__}: {str(e)}"
        logger.error(f"{error_detail}\nTraceback: {traceback.format_exc()}")
        
        # Supabase接続エラーの場合は詳細を返す
        if "connection" in str(e).lower() or "timeout" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"データベース接続エラー: {str(e)}"
            )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"認証処理でエラーが発生しました: {str(e)}"
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
    error_detail = f"{operation}でエラーが発生しました: {str(error)}"
    logger.error(f"データベースエラー - {operation}: {error}")
    print(f"Database Error - {operation}: {error}")
    import traceback
    print(f"Database Error Traceback: {traceback.format_exc()}")
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=error_detail
    )

async def get_or_create_conversation(user_id: int, page_id: str) -> str:
    """ページに対応するconversationを取得または作成"""
    try:
        # 既存のconversationを探す
        existing_conv = supabase.table("chat_conversations").select("*").eq("user_id", user_id).eq("page_id", page_id).execute()
        
        if existing_conv.data:
            return existing_conv.data[0]["id"]
        else:
            # 新しいconversationを作成
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

async def update_conversation_timestamp(conversation_id: str):
    """conversationの最終更新時刻を更新"""
    try:
        await asyncio.to_thread(
            lambda: supabase.table("chat_conversations").update({
                "updated_at": datetime.now().isoformat()
            }).eq("id", conversation_id).execute()
        )
    except Exception as e:
        logger.error(f"conversation timestamp更新エラー: {e}")

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
        
        # アクセスコード（パスワード）確認
        # 注意: 本番環境では必ずパスワードをハッシュ化して比較してください
        result_password = supabase.table("users").select("password").eq("id", user["id"]).execute()
        if not result_password.data or result_password.data[0]["password"] != user_data.access_code:
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

@app.post("/chat", response_model=ChatResponse, dependencies=[Depends(chat_rate_limiter)])
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
        # page_idが送られてきた場合はそれを使用、なければpageを使用
        page_id = chat_data.page_id or chat_data.page or "general"
        conversation_id = await get_or_create_conversation(current_user, page_id)
        
        # プロジェクト情報を自動取得（長期記憶）
        project_context = ""
        project = None
        project_id = None
        
        logger.info(f"🔍 プロジェクト情報取得開始 - page_id: {page_id}")
        
        # 1. pageIdがproject-形式の場合（既存ロジック維持）
        if page_id.startswith('project-'):
            try:
                project_id = int(page_id.replace('project-', ''))
                logger.info(f"✅ project-形式からプロジェクトIDを取得: {project_id}")
            except ValueError:
                logger.warning(f"⚠️ project-形式の解析に失敗: {page_id}")
        
        # 2. pageIdが数値（memo_id）の場合、memosテーブルから直接project_idを取得
        elif page_id.isdigit():
            try:
                memo_result = supabase.table('memos').select('project_id').eq('id', int(page_id)).eq('user_id', current_user).execute()
                if memo_result.data and memo_result.data[0].get('project_id'):
                    project_id = memo_result.data[0]['project_id']
                    logger.info(f"✅ memo_id:{page_id}からプロジェクトIDを直接取得: {project_id}")
                else:
                    logger.info(f"🔴 memo_id:{page_id}にプロジェクト関連付けなし")
            except Exception as e:
                logger.warning(f"⚠️ memo_id:{page_id}からのproject_id取得に失敗: {e}")

        elif page_id == 'conversation-agent-test':
            logger.info(f"👉 page_idが'conversation-agent-test'のため、最新のプロジェクトを探します")
            try:
                latest_project_result = supabase.table('projects').select('id').eq('user_id', current_user).order('updated_at', desc=True).limit(1).execute()
                if latest_project_result.data:
                    project_id = latest_project_result.data[0]['id']
                    logger.info(f"✅ 最新のプロジェクトIDを取得: {project_id}")
                else:
                    logger.info("🔴 利用可能なプロジェクトが見つかりませんでした")
            except Exception as e:
                logger.warning(f"⚠️ 最新プロジェクトの取得に失敗: {e}")
        
        else:
            logger.info(f"🔴 page_id形式が未対応: {page_id}")
            # その他の形式の場合はproject_idをNoneのまま継続
        
        # プロジェクト情報を取得
        if project_id:
            try:
                logger.info(f"📛 プロジェクト情報を取得中: project_id={project_id}, user_id={current_user}")
                project_result = supabase.table('projects').select('*').eq('id', project_id).eq('user_id', current_user).execute()
                
                if project_result.data:
                    project = project_result.data[0]
                    # プロジェクト情報を軽量フォーマットで統合（トークン削減）
                    theme_short = (project['theme'] or '')[:30]
                    question_short = (project.get('question') or 'NA')[:25]
                    hypothesis_short = (project.get('hypothesis') or 'NA')[:25]
                    project_context = f"[テーマ:{theme_short}|問い:{question_short}|仮説:{hypothesis_short}]"
                    logger.info(f"✅ プロジェクト情報を軽量フォーマットで取得成功: {project['theme']}")
                else:
                    logger.warning(f"⚠️ プロジェクトが見つからない: project_id={project_id}, user_id={current_user}")
            except Exception as e:
                logger.error(f"❌ プロジェクト情報の取得に失敗: {e}")
        else:
            logger.info(f"🔴 project_idが取得できなかった")
        
        # 過去の対話履歴を取得（拡張：50-100メッセージ）
        history_limit = 100  # Phase 1: 履歴ウィンドウを拡張
        history_response = supabase.table("chat_logs").select("id, sender, message, created_at, context_data").eq("conversation_id", conversation_id).order("created_at", desc=False).limit(history_limit).execute()
        conversation_history = history_response.data if history_response.data is not None else []

        if conversation_history is None:
            # エラーログを残す
            print(f"Warning: conversation_history is None for conversation_id: {conversation_id}")
        
        # メッセージの準備
        # システムプロンプトとメッセージを準備
        system_prompt_with_context = system_prompt
        
        # プロジェクト情報を追加（長期記憶）
        if project_context:
            system_prompt_with_context += project_context
            logger.info(f"✅ システムプロンプトにプロジェクト情報を追加")
        else:
            logger.info(f"🔴 プロジェクト情報がないため、システムプロンプトに追加しない")
        
        logger.info(f"📜 システムプロンプト長: {len(system_prompt_with_context)}文字")
        
        messages = [{"role": "system", "content": system_prompt_with_context}]
        if conversation_history:  # None または空リストのチェック
            for history_msg in conversation_history:
                role = "user" if history_msg["sender"] == "user" else "assistant"
                messages.append({"role": role, "content": history_msg["message"]})

        user_message = chat_data.message
        
        # Guard: message size limit to protect backend/LLM
        if user_message is not None and len(user_message) > MAX_CHAT_MESSAGE_LENGTH:
            raise HTTPException(status_code=400, detail="Message too long")

        messages.append({"role": "user", "content": user_message})
        context_metadata = None
        
        # 保存用のcontext_data作成
        context_data_dict = {"timestamp": datetime.now(timezone.utc).isoformat()}
        if chat_data.memo_content:
            context_data_dict["memo_content"] = chat_data.memo_content[:500]  # 最初の500文字のみ保存
        if project_id:
            context_data_dict["project_id"] = project_id
        if project:
            context_data_dict["project_info"] = {
                "theme": project.get('theme'),
                "question": project.get('question'),
                "hypothesis": project.get('hypothesis')
            }
        
        # ユーザーメッセージをDBに保存（拡張：メタデータ付き）
        user_message_data = {
            "user_id": current_user,
            "page": page_id,
            "sender": "user",
            "message": chat_data.message,
            "conversation_id": conversation_id,
            "context_data": json.dumps(context_data_dict, ensure_ascii=False)
        }
        await asyncio.to_thread(lambda: supabase.table("chat_logs").insert(user_message_data).execute())
        
        # ===== Phase 1: 対話エージェント機能統合 =====
        agent_payload: Dict[str, Any] = {}
        if ENABLE_CONVERSATION_AGENT and conversation_orchestrator is not None:
            try:
                # 会話履歴を対話エージェント用フォーマットに変換
                agent_history = []
                for history_msg in conversation_history:
                    sender = "user" if history_msg["sender"] == "user" else "assistant"
                    agent_history.append({
                        "sender": sender,
                        "message": history_msg["message"]
                    })
                
                # プロジェクト情報を対話エージェント用に変換
                agent_project_context = None
                if project:
                    agent_project_context = {
                        "theme": project.get('theme'),
                        "question": project.get('question'),
                        "hypothesis": project.get('hypothesis'),
                        "id": project_id
                    }
                
                # 対話エージェントで処理
                agent_result = conversation_orchestrator.process_turn(
                    user_message=chat_data.message,
                    conversation_history=agent_history,
                    project_context=agent_project_context,
                    user_id=current_user,
                    conversation_id=conversation_id
                )
                
                # 対話エージェントの応答を使用
                response = agent_result["response"]
                # capture for response
                agent_payload = {
                    "support_type": agent_result.get("support_type"),
                    "selected_acts": agent_result.get("selected_acts"),
                    "state_snapshot": agent_result.get("state_snapshot"),
                    "project_plan": agent_result.get("project_plan"),
                    "decision_metadata": agent_result.get("decision_metadata"),
                    "metrics": agent_result.get("metrics"),
                }
                
                # メタデータを保存用context_dataに追加
                ai_context_data = {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "has_project_context": bool(project_context),
                    "conversation_agent": True,
                    "support_type": agent_result.get("support_type"),
                    "selected_acts": agent_result.get("selected_acts"),
                    "state_snapshot": agent_result.get("state_snapshot", {}),
                    "decision_metadata": agent_result.get("decision_metadata", {}),
                    "project_plan": agent_result.get("project_plan")  # プロジェクト計画を追加
                }
                
                # followupsがある場合はresponseに追加
                if agent_result.get("followups"):
                    followup_text = "\n\n**次にできること:**\n" + "\n".join([f"• {f}" for f in agent_result["followups"][:3]])
                    response += followup_text
                
                logger.info(f"✅ 対話エージェント処理完了: {agent_result['support_type']} | {agent_result['selected_acts']}")
                
            except Exception as e:
                logger.error(f"❌ 対話エージェント処理エラー、従来処理にフォールバック: {e}")
                # エラー時は従来の処理にフォールバック
                response = llm_client.generate_response_with_history(messages)
                ai_context_data = {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "has_project_context": bool(project_context),
                    "conversation_agent_error": str(e)
                }
        else:
            # 従来の処理
            response = llm_client.generate_response_with_history(messages)
            ai_context_data = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "has_project_context": bool(project_context)
            }
        
        # トークン使用量を計算（使用しない）
        token_usage = None
        
        # プロジェクトIDを追加（対話エージェントで設定されていない場合）
        if project_id and "project_id" not in ai_context_data:
            ai_context_data["project_id"] = project_id
        
        ai_message_data = {
            "user_id": current_user,
            "page": page_id,
            "sender": "assistant",
            "message": response,
            "conversation_id": conversation_id,
            "context_data": json.dumps(ai_context_data, ensure_ascii=False)
        }
        await asyncio.to_thread(lambda: supabase.table("chat_logs").insert(ai_message_data).execute())
        
        # conversationの最終更新時刻を更新
        try:
            await update_conversation_timestamp(conversation_id)
        except Exception as e:
            # タイムスタンプ更新エラーは警告ログのみ（チャット自体は正常に処理）
            logger.warning(f"conversation timestamp update failed: {e}")
        
        # トークン使用履歴を記録（使用しない）
        
        return ChatResponse(
            response=response,
            timestamp=datetime.now(timezone.utc).isoformat(),
            token_usage=token_usage,
            context_metadata=context_metadata,
            **agent_payload
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Chat API Error: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        handle_database_error(e, "AI応答の生成")

@app.get("/chat/history", response_model=List[ChatHistoryResponse])
async def get_chat_history(
    page: Optional[str] = None,
    limit: Optional[int] = 50,
    before: Optional[str] = None,
    current_user: int = Depends(get_current_user_cached)
):
    """対話履歴取得（最適化版）"""
    try:
        validate_supabase()
        
        # Bound the limit
        eff_limit = min(max(1, limit or CHAT_HISTORY_LIMIT_DEFAULT), CHAT_HISTORY_LIMIT_MAX)
        query = supabase.table("chat_logs").select("id, page, sender, message, context_data, created_at").eq("user_id", current_user)
        
        if page:
            query = query.eq("page", page)
        
        if before:
            try:
                # Filter strictly before the cursor
                query = query.lt("created_at", before)
            except Exception:
                pass
        query = query.order("created_at", desc=True).limit(eff_limit)
        result = await asyncio.to_thread(lambda: query.execute())
        
        items = [
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
        # reverse to chronological order (oldest first)
        return list(reversed(items))
    except Exception as e:
        handle_database_error(e, "対話履歴の取得")

# /chat/conversations エンドポイントは削除（chat_conversationsテーブルを使用しないため）

# /chat/conversations/{conversation_id}/messages エンドポイントは削除（chat_conversationsテーブルを使用しないため）

@app.post("/memos", response_model=MemoResponse)
async def save_memo(
    memo_data: MemoSave,
    current_user: int = Depends(get_current_user_cached)
):
    """メモの保存（page_memosテーブル非対応のため無効化）"""
    try:
        validate_supabase()
        
        # page_memosテーブルが存在しないため、エラーを返す
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="page_memosベースのメモ保存は現在利用できません。プロジェクトベースのメモ機能をご利用ください。"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        handle_database_error(e, "メモの保存")

@app.get("/memos/{page_id}", response_model=MemoResponse)
async def get_memo_by_page_id(
    page_id: str,
    current_user: int = Depends(get_current_user_cached)
):
    """ページIDベースのメモ取得（レガシー対応）"""
    try:
        validate_supabase()
        
        # page_memosテーブルが存在しないため、memosテーブルからpage_id相当のものを検索
        # page_idが数値の場合はmemo_idとして扱う
        try:
            memo_id = int(page_id)
            result = supabase.table("memos").select("id, title, content, updated_at, created_at").eq("id", memo_id).eq("user_id", current_user).execute()
            
            if result.data:
                memo = result.data[0]
                return MemoResponse(
                    id=memo["id"],
                    page_id=page_id,
                    content=memo.get("content") or "",
                    updated_at=memo.get("updated_at") or memo.get("created_at") or datetime.now(timezone.utc).isoformat()
                )
            else:
                # メモが存在しない場合は空のメモを返す
                return MemoResponse(
                    id=0,
                    page_id=page_id,
                    content="",
                    updated_at=datetime.now(timezone.utc).isoformat()
                )
        except ValueError:
            # page_idが数値でない場合は空のメモを返す
            return MemoResponse(
                id=0,
                page_id=page_id,
                content="",
                updated_at=datetime.now(timezone.utc).isoformat()
            )
    except HTTPException:
        raise
    except Exception as e:
        handle_database_error(e, "メモの取得")

@app.get("/memos", response_model=List[MemoResponse])
async def get_all_memos(current_user: int = Depends(get_current_user_cached)):
    """ユーザーの全メモ取得（memosテーブルから取得）"""
    try:
        validate_supabase()
        
        # memosテーブルから全メモを取得
        result = supabase.table("memos").select("id, title, content, updated_at, created_at").eq("user_id", current_user).order("updated_at", desc=True).execute()
        
        return [
            MemoResponse(
                id=memo["id"],
                page_id=str(memo["id"]),  # memo_idをpage_idとして使用
                content=memo["content"] or "",
                updated_at=memo.get("updated_at") or memo.get("created_at") or datetime.now(timezone.utc).isoformat()
            )
            for memo in result.data
        ]
    except Exception as e:
        handle_database_error(e, "全メモの取得")

# =============================================================================
# プロジェクト管理API
# =============================================================================

@app.post("/projects", response_model=ProjectResponse)
async def create_project(
    project_data: ProjectCreate,
    current_user: int = Depends(get_current_user_cached)
):
    """プロジェクト作成"""
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

@app.get("/users/{user_id}/projects", response_model=List[ProjectResponse])
async def get_user_projects(
    user_id: int,
    current_user: int = Depends(get_current_user_cached)
):
    """ユーザーのプロジェクト一覧取得"""
    if user_id != current_user:
        raise HTTPException(status_code=403, detail="アクセス権限がありません")

    try:
        validate_supabase()
        
        result = supabase.table('projects').select('id, user_id, theme, question, hypothesis, created_at, updated_at').eq('user_id', user_id).order('updated_at', desc=True).execute()
        
        projects = []
        for project in result.data:
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

@app.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: int,
    current_user: int = Depends(get_current_user_cached)
):
    """特定プロジェクト取得"""
    try:
        validate_supabase()
        
        result = supabase.table('projects').select('id, user_id, theme, question, hypothesis, created_at, updated_at').eq('id', project_id).eq('user_id', current_user).execute()
        
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

@app.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    current_user: int = Depends(get_current_user_cached)
):
    """プロジェクト更新"""
    try:
        validate_supabase()
        
        update_data = project_data.dict(exclude_unset=True)
        
        if not update_data:
            raise HTTPException(status_code=400, detail="更新するフィールドがありません")
        
        result = supabase.table('projects').update(update_data).eq('id', project_id).eq('user_id', current_user).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")
        
        return await get_project(project_id, current_user)
    except HTTPException:
        raise
    except Exception as e:
        handle_database_error(e, "プロジェクトの更新")

@app.delete("/projects/{project_id}")
async def delete_project(
    project_id: int,
    current_user: int = Depends(get_current_user_cached)
):
    """プロジェクト削除"""
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
# マルチメモ管理API
# =============================================================================

@app.post("/projects/{project_id}/memos", response_model=MultiMemoResponse)
async def create_project_memo(
    project_id: int,
    memo_data: MultiMemoCreate,
    current_user: int = Depends(get_current_user_cached)
):
    """プロジェクト内メモ作成"""
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
                title=memo.get('title') or '',
                content=memo.get('content') or '',
                tags=[],
                project_id=memo.get('project_id', project_id),
                created_at=memo.get('created_at') or datetime.now(timezone.utc).isoformat(),
                updated_at=memo.get('updated_at') or datetime.now(timezone.utc).isoformat()
            )
        else:
            raise HTTPException(status_code=500, detail="メモの作成に失敗しました")
    except HTTPException:
        raise
    except Exception as e:
        handle_database_error(e, "メモの作成")

@app.get("/projects/{project_id}/memos", response_model=List[MultiMemoResponse])
async def get_project_memos(
    project_id: int,
    current_user: int = Depends(get_current_user_cached)
):
    """プロジェクト内メモ一覧取得"""
    try:
        validate_supabase()
        
        result = supabase.table('memos').select('id, title, content, project_id, created_at, updated_at').eq('project_id', project_id).eq('user_id', current_user).order('updated_at', desc=True).execute()
        
        return [
            MultiMemoResponse(
                id=memo['id'],
                title=memo.get('title') or '',
                content=memo.get('content') or '',
                tags=[],
                project_id=memo.get('project_id', project_id),
                created_at=memo.get('created_at') or datetime.now(timezone.utc).isoformat(),
                updated_at=memo.get('updated_at') or datetime.now(timezone.utc).isoformat()
            )
            for memo in result.data
        ]
    except Exception as e:
        handle_database_error(e, "メモ一覧の取得")

@app.get("/memos/{memo_id}", response_model=MultiMemoResponse)
async def get_memo(
    memo_id: int,
    current_user: int = Depends(get_current_user_cached)
):
    """特定メモ取得"""
    try:
        validate_supabase()
        
        logger.info(f"メモ取得開始: memo_id={memo_id}, user_id={current_user}")
        
        result = supabase.table('memos').select('id, title, content, project_id, created_at, updated_at').eq('id', memo_id).eq('user_id', current_user).execute()
        
        logger.info(f"データベースクエリ結果: count={result.count if result.count else 0}, data_length={len(result.data) if result.data else 0}")
        
        if not result.data:
            logger.warning(f"メモが見つかりません: memo_id={memo_id}, user_id={current_user}")
            raise HTTPException(status_code=404, detail="メモが見つかりません")
        
        memo = result.data[0]
        
        # フィールドの存在確認とデフォルト値の設定
        logger.info(f"メモデータ取得: keys={list(memo.keys())}, values={memo}")
        
        # 必須フィールドの存在確認
        if 'id' not in memo:
            logger.error(f"メモIDが存在しません: {memo.keys()}")
            raise HTTPException(status_code=500, detail="メモデータの構造エラー")
        
        response = MultiMemoResponse(
            id=memo['id'],
            title=memo.get('title') or '',
            content=memo.get('content') or '',
            tags=[],
            project_id=memo.get('project_id'),
            created_at=memo.get('created_at') or datetime.now(timezone.utc).isoformat(),
            updated_at=memo.get('updated_at') or datetime.now(timezone.utc).isoformat()
        )
        
        logger.info(f"レスポンス作成成功: memo_id={memo['id']}")
        return response
    except HTTPException:
        raise
    except KeyError as e:
        logger.error(f"メモフィールドエラー: {e}, メモデータキー: {memo.keys() if 'memo' in locals() else 'N/A'}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"メモのデータ構造エラー: 必要なフィールド '{e}' が見つかりません"
        )
    except ValueError as e:
        logger.error(f"メモバリデーションエラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"メモのデータ検証エラー: {str(e)}"
        )
    except Exception as e:
        logger.error(f"予期しないエラー (メモ取得): {type(e).__name__}: {str(e)}")
        handle_database_error(e, "メモの取得")

@app.put("/memos/{memo_id}", response_model=MultiMemoResponse)
async def update_memo(
    memo_id: int,
    memo_data: MultiMemoUpdate,
    current_user: int = Depends(get_current_user_cached)
):
    """メモ更新（最適化版）"""
    try:
        validate_supabase()
        
        update_data = memo_data.dict(exclude_unset=True)
        
        if not update_data:
            raise HTTPException(status_code=400, detail="更新するフィールドがありません")
        
        # タイムスタンプを追加
        from datetime import datetime, timezone
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        # タイムアウト対策: execute()を分離
        import asyncio
        try:
            result = await asyncio.wait_for(
                asyncio.to_thread(
                    lambda: supabase.table('memos').update(update_data).eq('id', memo_id).eq('user_id', current_user).execute()
                ),
                timeout=30.0  # 30秒のタイムアウト
            )
        except asyncio.TimeoutError:
            logger.error(f"メモ更新タイムアウト: memo_id={memo_id}, user_id={current_user}")
            raise HTTPException(status_code=504, detail="データベース更新がタイムアウトしました")
        
        if not result.data:
            raise HTTPException(status_code=404, detail="メモが見つかりません")
        
        return await get_memo(memo_id, current_user)
    except HTTPException:
        raise
    except Exception as e:
        handle_database_error(e, "メモの更新")

@app.delete("/memos/{memo_id}")
async def delete_memo(
    memo_id: int,
    current_user: int = Depends(get_current_user_cached)
):
    """メモ削除"""
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
# メモリ管理API（Phase 1）- 削除済み
# =============================================================================

# メモリ管理関連のエンドポイントは使用しないため削除しました

# メモリ管理関連の残りのエンドポイントも使用しないため削除しました

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
                    "started_at": datetime.now(timezone.utc).isoformat(),
                    "progress": 0
                }).eq("id", existing_quest["id"]).execute()
        else:
            # 新規作成
            update_result = supabase.table("user_quests").insert({
                "user_id": current_user,
                "quest_id": quest_data.quest_id,
                "status": "in_progress",
                "started_at": datetime.now(timezone.utc).isoformat(),
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
            "completed_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", user_quest_id).execute()
        
        # ユーザープロファイルのポイントを更新
        try:
            profile_result = supabase.table("user_learning_profiles").select("total_points").eq("user_id", current_user).execute()
            
            if profile_result.data:
                current_points = profile_result.data[0]["total_points"] or 0
                supabase.table("user_learning_profiles").update({
                    "total_points": current_points + quest_points,
                    "last_activity": datetime.now(timezone.utc).isoformat()
                }).eq("user_id", current_user).execute()
            else:
                # プロファイルを新規作成
                supabase.table("user_learning_profiles").insert({
                    "user_id": current_user,
                    "total_points": quest_points,
                    "last_activity": datetime.now(timezone.utc).isoformat()
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

# =============================================================================
# Conversation Agent検証用エンドポイント
# =============================================================================

@app.post("/conversation-agent/chat", response_model=ConversationAgentResponse)
async def chat_with_conversation_agent(
    request: ConversationAgentRequest,
    current_user: int = Depends(get_current_user_cached)
):
    """
    対話エージェント検証用エンドポイント
    
    通常の /chat エンドポイントから分離された、conversation_agent の機能を
    独立して検証するための専用エンドポイントです。
    
    Features:
    - 対話エージェントの動作を独立して検証可能
    - デバッグモードでの詳細情報取得
    - モック/実モードの切り替え可能
    - エラーハンドリングの強化
    """
    start_time = time.time()
    
    try:
        validate_supabase()
        
        # エージェントの可用性チェック
        if not CONVERSATION_AGENT_AVAILABLE:
            return ConversationAgentResponse(
                response="対話エージェント機能は現在利用できません。モジュールがインポートされていません。",
                timestamp=datetime.now(timezone.utc).isoformat(),
                support_type="error",
                selected_acts=[],
                state_snapshot={},
                decision_metadata={},
                metrics={"error": "module_not_available"},
                error="ConversationAgent module not available",
                history_count=0
            )
        
        if conversation_orchestrator is None:
            # オーケストレーターを初期化（リクエストごとに初期化可能）
            try:
                temp_orchestrator = ConversationOrchestrator(
                    llm_client=llm_client,
                    use_mock=request.mock_mode
                )
                logger.info(f"✅ 対話エージェント一時初期化完了（mock={request.mock_mode}）")
            except Exception as e:
                logger.error(f"❌ 対話エージェント初期化エラー: {e}")
                return ConversationAgentResponse(
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
        
        # ページIDの決定
        page_id = request.page_id or (f"project-{request.project_id}" if request.project_id else "general")
        
        # conversationの取得または作成
        conversation_id = await get_or_create_conversation(current_user, page_id)
        
        # プロジェクト情報の取得
        project_context = None
        if request.project_id:
            try:
                project_result = supabase.table('projects').select('*').eq('id', request.project_id).eq('user_id', current_user).execute()
                if project_result.data:
                    project = project_result.data[0]
                    project_context = {
                        "theme": project.get('theme'),
                        "question": project.get('question'),
                        "hypothesis": project.get('hypothesis'),
                        "id": request.project_id
                    }
                    logger.info(f"✅ プロジェクト情報取得成功: {project['theme']}")
            except Exception as e:
                logger.warning(f"⚠️ プロジェクト情報取得失敗: {e}")
        
        # 対話履歴の取得
        conversation_history = []
        if request.include_history:
            try:
                history_response = supabase.table("chat_logs").select(
                    "id, sender, message, created_at, context_data"
                ).eq(
                    "conversation_id", conversation_id
                ).order(
                    "created_at", desc=False
                ).limit(
                    request.history_limit
                ).execute()
                
                if history_response.data:
                    conversation_history = [
                        {
                            "sender": msg["sender"],
                            "message": msg["message"]
                        }
                        for msg in history_response.data
                    ]
                    logger.info(f"📜 対話履歴取得: {len(conversation_history)}件")
            except Exception as e:
                logger.warning(f"⚠️ 対話履歴取得エラー: {e}")
        
        # 対話エージェントで処理
        try:
            agent_start = time.time()
            
            agent_result = temp_orchestrator.process_turn(
                user_message=request.message,
                conversation_history=conversation_history,
                project_context=project_context,
                user_id=current_user,
                conversation_id=conversation_id
            )
            
            agent_time = time.time() - agent_start
            
            # デバッグ情報の構築
            debug_info = None
            if request.debug_mode:
                debug_info = {
                    "processing_time_ms": int(agent_time * 1000),
                    "mock_mode": request.mock_mode,
                    "history_items": len(conversation_history),
                    "has_project_context": bool(project_context),
                    "conversation_id": conversation_id,
                    "page_id": page_id,
                    "raw_state": agent_result.get("state_snapshot", {}),
                    "raw_decision": agent_result.get("decision_metadata", {}),
                    "raw_metrics": agent_result.get("metrics", {})
                }
            
            # 応答をデータベースに保存（ユーザーメッセージ）
            user_message_data = {
                "user_id": current_user,
                "page": page_id,
                "sender": "user",
                "message": request.message,
                "conversation_id": conversation_id,
                "context_data": json.dumps({
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "agent_endpoint": True,
                    "project_id": request.project_id
                }, ensure_ascii=False)
            }
            await asyncio.to_thread(
                lambda: supabase.table("chat_logs").insert(user_message_data).execute()
            )
            
            # 応答をデータベースに保存（AIメッセージ）
            ai_message_data = {
                "user_id": current_user,
                "page": page_id,
                "sender": "assistant",
                "message": agent_result["response"],
                "conversation_id": conversation_id,
                "context_data": json.dumps({
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "agent_endpoint": True,
                    "support_type": agent_result.get("support_type"),
                    "selected_acts": agent_result.get("selected_acts"),
                    "state_snapshot": agent_result.get("state_snapshot", {}),
                    "project_plan": agent_result.get("project_plan"),
                    "decision_metadata": agent_result.get("decision_metadata", {}),
                    "metrics": agent_result.get("metrics", {})
                }, ensure_ascii=False)
            }
            await asyncio.to_thread(
                lambda: supabase.table("chat_logs").insert(ai_message_data).execute()
            )
            
            # conversationのタイムスタンプ更新
            await update_conversation_timestamp(conversation_id)
            
            # レスポンスの構築
            return ConversationAgentResponse(
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
                history_count=len(conversation_history)
            )
            
        except Exception as e:
            logger.error(f"❌ 対話エージェント処理エラー: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            
            return ConversationAgentResponse(
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
                history_count=len(conversation_history) if 'conversation_history' in locals() else 0
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ エンドポイントエラー: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        
        return ConversationAgentResponse(
            response="システムエラーが発生しました。",
            timestamp=datetime.now(timezone.utc).isoformat(),
            support_type="error",
            selected_acts=[],
            state_snapshot={},
            decision_metadata={},
            metrics={"error": "system_error", "processing_time_ms": int((time.time() - start_time) * 1000)},
            error=f"System error: {str(e)}",
            history_count=0
        )

@app.get("/conversation-agent/status")
async def get_conversation_agent_status(
    current_user: int = Depends(get_current_user_cached)
):
    """
    対話エージェントのステータス確認エンドポイント
    
    Returns:
        エージェントの可用性、設定、状態情報
    """
    try:
        status = {
            "available": CONVERSATION_AGENT_AVAILABLE,
            "enabled": ENABLE_CONVERSATION_AGENT,
            "initialized": conversation_orchestrator is not None,
            "module_path": "backend.conversation_agent",
            "environment": {
                "ENABLE_CONVERSATION_AGENT": os.environ.get("ENABLE_CONVERSATION_AGENT", "false"),
                "mode": "mock" if conversation_orchestrator and hasattr(conversation_orchestrator, 'use_mock') else "unknown"
            },
            "features": {
                "state_extraction": True,
                "support_typing": True,
                "policy_engine": True,
                "project_planning": True
            }
        }
        
        # オーケストレーターが初期化されている場合、追加情報を取得
        if conversation_orchestrator:
            try:
                status["orchestrator_info"] = {
                    "class": conversation_orchestrator.__class__.__name__,
                    "has_llm_client": conversation_orchestrator.llm_client is not None if hasattr(conversation_orchestrator, 'llm_client') else False,
                    "mock_mode": conversation_orchestrator.use_mock if hasattr(conversation_orchestrator, 'use_mock') else None
                }
            except Exception as e:
                status["orchestrator_info"] = {"error": str(e)}
        
        return status
        
    except Exception as e:
        logger.error(f"ステータス取得エラー: {e}")
        return {
            "available": False,
            "error": str(e)
        }

@app.post("/conversation-agent/initialize")
async def initialize_conversation_agent(
    mock_mode: bool = True,
    current_user: int = Depends(get_current_user_cached)
):
    """
    対話エージェントの手動初期化エンドポイント（管理者用）
    
    Args:
        mock_mode: モックモードで初期化するか
    
    Returns:
        初期化結果
    """
    global conversation_orchestrator
    
    try:
        if not CONVERSATION_AGENT_AVAILABLE:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="対話エージェントモジュールが利用不可です"
            )
        
        # 既存のオーケストレーターをクリーンアップ
        if conversation_orchestrator:
            logger.info("既存のオーケストレーターをクリーンアップ")
            conversation_orchestrator = None
        
        # 新しいオーケストレーターを初期化
        conversation_orchestrator = ConversationOrchestrator(
            llm_client=llm_client,
            use_mock=mock_mode
        )
        
        logger.info(f"✅ 対話エージェント手動初期化完了（mock={mock_mode}）")
        
        return {
            "success": True,
            "message": f"対話エージェントを{'モック' if mock_mode else '実'}モードで初期化しました",
            "mock_mode": mock_mode,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"初期化エラー: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"対話エージェントの初期化に失敗しました: {str(e)}"
        )

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
