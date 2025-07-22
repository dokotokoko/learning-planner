from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import sys
import os
import json
import logging
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv

# .envファイルを読み込み
load_dotenv()

# プロジェクトルートをPythonパスに追加
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from module.llm_api import learning_plannner
from prompt.prompt import system_prompt

# ロギング設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="探Qメイト API",
    description="AI探究学習支援アプリケーションのバックエンドAPI",
    version="1.0.0"
)

# CORS設定（ngrok対応）
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

# === Pydanticモデル ===

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

# 学習プロセス関連のモデルは削除済み

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
    """アプリケーション起動時の初期化"""
    global llm_client, supabase
    try:
        # Supabaseクライアントの初期化
        url: str = os.environ.get("SUPABASE_URL")
        key: str = os.environ.get("SUPABASE_KEY")
        if not url or not key:
            raise ValueError("Supabaseの接続情報が環境変数に設定されていません (SUPABASE_URL, SUPABASE_KEY)")
        supabase = create_client(url, key)
        logger.info("Supabaseクライアント初期化完了")
        
        # Supabaseのテーブル存在確認
        try:
            test_response = supabase.table("chat_logs").select("*").limit(1).execute()
            logger.info("Supabaseテーブル接続確認完了")
        except Exception as e:
            logger.warning(f"Supabaseテーブル確認エラー（継続可能）: {e}")
        
        llm_client = learning_plannner()  # LLM有効化
        logger.info("FastAPIサーバーが起動しました（Supabase・LLM有効モード）")
    except Exception as e:
        logger.error(f"初期化エラー: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """アプリケーション終了時のクリーンアップ"""
    # α版ではSupabase使用のため、特別なクリーンアップは不要
    logger.info("サーバーをシャットダウンしました")

# === 共通ヘルパー関数 ===

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> int:
    """トークンからユーザーIDを取得"""
    try:
        token = credentials.credentials
        if token.isdigit():
            return int(token)
        else:
            # UUID形式からint型に変換
            uuid_str = token.replace("-", "")
            if len(uuid_str) == 32 and all(c in "0123456789abcdef" for c in uuid_str.lower()):
                return int(uuid_str, 16)
            else:
                raise ValueError("Invalid token format")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="無効なトークンです",
            headers={"WWW-Authenticate": "Bearer"},
        )

def validate_supabase():
    """Supabaseクライアントの存在確認"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabaseクライアントが初期化されていません")

def handle_database_error(error: Exception, operation: str):
    """データベースエラーの統一処理"""
    logger.error(f"{operation}エラー: {error}")
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=f"{operation}でエラーが発生しました"
    )

# === conversation管理ヘルパー関数 ===

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
        supabase.table("chat_conversations").update({
            "updated_at": datetime.now().isoformat()
        }).eq("id", conversation_id).execute()
    except Exception as e:
        logger.error(f"conversation timestamp更新エラー: {e}")

# === API エンドポイント ===

@app.get("/")
async def root():
    """ヘルスチェック"""
    return {"message": "探Qメイト API サーバーが動作中です", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    """nginx用ヘルスチェック"""
    return {"status": "healthy", "message": "OK"}

@app.post("/auth/login", response_model=UserResponse)
async def login(user_data: UserLogin):
    """ユーザーログイン（Supabase版）"""
    try:
        validate_supabase()
        
        # Supabaseのusersテーブルでユーザー認証
        user_response = supabase.table("users").select("*").eq("username", user_data.username).eq("password", user_data.access_code).execute()
        
        if user_response.data and len(user_response.data) > 0:
            user = user_response.data[0]
            user_id = user.get("id")
            
            logger.info(f"ログイン成功: ユーザー={user_data.username}, ID={user_id}")
            
            return UserResponse(
                id=user_id,
                username=user_data.username,
                message="ログインに成功しました"
            )
        else:
            logger.warning(f"ログイン失敗: ユーザー={user_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="ユーザー名またはアクセスコードが正しくありません"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ログインエラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ログイン処理でエラーが発生しました"
        )

@app.post("/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister):
    """ユーザー新規登録"""
    logger.info(f"Registration attempt for username: {user_data.username}")
    
    try:
        validate_supabase()
        
        # パスワードの確認
        if user_data.password != user_data.confirm_password:
            logger.warning(f"Password mismatch for user: {user_data.username}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="パスワードと確認用パスワードが一致しません"
            )
        
        # Supabaseのusersテーブルでユーザー重複チェック
        logger.info(f"Checking if username exists: {user_data.username}")
        existing_user = supabase.table("users").select("id").eq("username", user_data.username).execute()
        
        if existing_user.data:
            logger.warning(f"Username already exists: {user_data.username}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="そのユーザー名は既に使用されています"
            )
        
        # 新しいユーザーを作成
        logger.info(f"Creating new user: {user_data.username}")
        result = supabase.table("users").insert({
            "username": user_data.username,
            "password": user_data.password
        }).execute()
        
        logger.info(f"Supabase insert result: {result}")
        
        if result.data and len(result.data) > 0:
            new_user = result.data[0]
            user_id = new_user.get("id")
            logger.info(f"新規登録成功: ユーザー={user_data.username}, ID={user_id}")
            
            response = UserResponse(
                id=user_id,
                username=user_data.username,
                message="アカウント登録が完了しました！探Qメイトへようこそ！"
            )
            logger.info(f"Returning success response: {response.dict()}")
            
            # 明示的にJSONレスポンスとして返す
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=status.HTTP_201_CREATED,
                content=response.dict()
            )
        else:
            logger.error(f"No data returned from Supabase insert for user: {user_data.username}")
            raise HTTPException(status_code=500, detail="新規登録に失敗しました")
            
    except HTTPException as e:
        logger.error(f"HTTPException in register: {e.detail}")
        raise
    except Exception as e:
        logger.error(f"新規登録エラー: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"新規登録処理でエラーが発生しました: {str(e)}"
        )







@app.post("/chat", response_model=ChatResponse)
async def chat_with_ai(
    chat_data: ChatMessage,
    current_user: int = Depends(get_current_user)
):
    """AIとのチャット（conversation管理対応）"""
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
        
        # そのconversationの過去の対話履歴を取得
        history_response = supabase.table("chat_logs").select("sender, message").eq("conversation_id", conversation_id).order("created_at").limit(50).execute()
        conversation_history = history_response.data
        
        # LLM用のメッセージリストを構築
        messages = [{"role": "system", "content": system_prompt}]
        for history_msg in conversation_history:
            role = "user" if history_msg["sender"] == "user" else "assistant"
            messages.append({"role": role, "content": history_msg["message"]})
        
        messages.append({"role": "user", "content": chat_data.message})
        
        # ユーザーメッセージをDBに保存
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
    limit: Optional[int] = 100,
    current_user: int = Depends(get_current_user)
):
    """対話履歴取得（Supabase版）"""
    try:
        validate_supabase()
        
        query = supabase.table("chat_logs").select("id, page, sender, message, context_data, created_at").eq("user_id", current_user)
        
        if page:
            query = query.eq("page", page)
        
        query = query.order("created_at", desc=True)
        
        if limit:
            query = query.limit(limit)
        
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
    limit: Optional[int] = 50,
    current_user: int = Depends(get_current_user)
):
    """conversation一覧取得（新しい履歴システム）"""
    try:
        validate_supabase()
        
        conversations_response = supabase.table("chat_conversations").select("*").eq("user_id", current_user).order("updated_at", desc=True).limit(limit or 50).execute()
        conversations = conversations_response.data
        
        result = []
        for conv in conversations:
            logs_response = supabase.table("chat_logs").select("*").eq("conversation_id", conv["id"]).order("created_at", desc=True).execute()
            logs = logs_response.data
            
            last_message = logs[0]["message"][:100] if logs else "メッセージなし"
            message_count = len(logs)
            
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

@app.get("/chat/conversations/{conversation_id}/messages", response_model=List[ChatHistoryResponse])
async def get_conversation_messages(
    conversation_id: str,
    current_user: int = Depends(get_current_user)
):
    """特定のconversationのメッセージ一覧取得"""
    try:
        validate_supabase()
        
        # conversationの所有者確認
        conv_response = supabase.table("chat_conversations").select("*").eq("id", conversation_id).eq("user_id", current_user).execute()
        if not conv_response.data:
            raise HTTPException(status_code=404, detail="conversationが見つかりません")
        
        # メッセージを取得
        messages_response = supabase.table("chat_logs").select("*").eq("conversation_id", conversation_id).order("created_at").execute()
        messages = messages_response.data
        
        return [
            ChatHistoryResponse(
                id=msg["id"],
                page=msg["page"],
                sender=msg["sender"],
                message=msg["message"],
                context_data=msg.get("context_data"),
                created_at=msg["created_at"]
            )
            for msg in messages
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"conversationメッセージ取得エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="conversationメッセージの取得でエラーが発生しました"
        )

@app.delete("/chat/history")
async def clear_chat_history(
    page: Optional[str] = None,
    current_user: int = Depends(get_current_user)
):
    """対話履歴クリア（Supabase版）"""
    try:
        validate_supabase()
        
        query = supabase.table("chat_logs").delete().eq("user_id", current_user)
        
        if page:
            query = query.eq("page", page)
        
        result = query.execute()
        cleared_count = len(result.data) if result.data else 0
        
        page_info = f" (ページ: {page})" if page else ""
        return {"message": f"対話履歴をクリアしました{page_info}", "cleared_count": cleared_count}
    except Exception as e:
        handle_database_error(e, "対話履歴のクリア")

@app.post("/memos", response_model=MemoResponse)
async def save_memo(
    memo_data: MemoSave,
    current_user: int = Depends(get_current_user)
):
    """メモの保存（Supabase版・ページメモ）"""
    try:
        validate_supabase()
        
        # 既存のページメモを確認
        existing_result = supabase.table("page_memos").select("*").eq("user_id", current_user).eq("page_id", memo_data.page_id).execute()
        
        if existing_result.data:
            # 既存のメモを更新
            result = supabase.table("page_memos").update({
                "content": memo_data.content
            }).eq("user_id", current_user).eq("page_id", memo_data.page_id).execute()
            memo = result.data[0] if result.data else existing_result.data[0]
        else:
            # 新しいメモを作成
            result = supabase.table("page_memos").insert({
                "user_id": current_user,
                "page_id": memo_data.page_id,
                "content": memo_data.content
            }).execute()
            memo = result.data[0] if result.data else None
        
        if memo:
            return MemoResponse(
                id=memo["id"],
                page_id=memo["page_id"],
                content=memo["content"] or "",
                updated_at=memo.get("updated_at") or memo.get("created_at") or datetime.now().isoformat()
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="メモの保存に失敗しました"
            )
    except HTTPException:
        raise
    except Exception as e:
        handle_database_error(e, "メモの保存")

@app.get("/memos/{page_id}", response_model=MemoResponse)
async def get_memo(
    page_id: str,
    current_user: int = Depends(get_current_user)
):
    """メモの取得（Supabase版・ページメモ）"""
    try:
        validate_supabase()
        
        # Supabaseからページメモを取得
        result = supabase.table("page_memos").select("*").eq("user_id", current_user).eq("page_id", page_id).execute()
        
        if result.data:
            memo = result.data[0]
            return MemoResponse(
                id=memo["id"],
                page_id=memo["page_id"],
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
async def get_all_memos(current_user: int = Depends(get_current_user)):
    """ユーザーの全メモ取得（Supabase版・ページメモ）"""
    try:
        validate_supabase()
        
        # Supabaseから全ページメモを取得
        result = supabase.table("page_memos").select("*").eq("user_id", current_user).order("updated_at", desc=True).execute()
        
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

@app.delete("/memos/{page_id}")
async def delete_memo(
    page_id: str,
    current_user: int = Depends(get_current_user)
):
    """メモの削除（Supabase版・ページメモ）"""
    try:
        validate_supabase()
        
        # Supabaseからページメモを削除
        result = supabase.table("page_memos").delete().eq("user_id", current_user).eq("page_id", page_id).execute()
        
        if result.data:
            return {"message": "メモが削除されました", "page_id": page_id}
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="削除するメモが見つかりません"
            )
    except HTTPException:
        raise
    except Exception as e:
        handle_database_error(e, "メモの削除")

# =============================================================================
# Ver2 Supabase対応API（探究学習アプリケーション用）
# =============================================================================

@app.post("/v2/projects", response_model=ProjectResponse)
async def create_project_v2(
    project_data: ProjectCreate,
    current_user: int = Depends(get_current_user)
):
    """Ver2: Supabaseを使用してプロジェクトを作成"""
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
        else:
            raise HTTPException(status_code=500, detail="プロジェクトの作成に失敗しました")
    except HTTPException:
        raise
    except Exception as e:
        handle_database_error(e, "プロジェクトの作成")

@app.get("/v2/projects", response_model=List[ProjectResponse])
async def get_projects_v2(current_user: int = Depends(get_current_user)):
    """Ver2: Supabaseからプロジェクト一覧を取得"""
    try:
        validate_supabase()
        
        result = supabase.table('projects').select('*').eq('user_id', current_user).order('updated_at', desc=True).execute()
        
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

@app.get("/v2/projects/{project_id}", response_model=ProjectResponse)
async def get_project_v2(
    project_id: int,
    current_user: int = Depends(get_current_user)
):
    """Ver2: Supabaseから特定のプロジェクトを取得"""
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
    current_user: int = Depends(get_current_user)
):
    """Ver2: Supabaseでプロジェクトを更新"""
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
    current_user: int = Depends(get_current_user)
):
    """Ver2: Supabaseからプロジェクトを削除"""
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

@app.post("/v2/projects/{project_id}/memos", response_model=MultiMemoResponse)
async def create_project_memo_v2(
    project_id: int,
    memo_data: MultiMemoCreate,
    current_user: int = Depends(get_current_user)
):
    """Ver2: Supabaseでプロジェクト内にメモを作成"""
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
    current_user: int = Depends(get_current_user)
):
    """Ver2: Supabaseからプロジェクト内のメモ一覧を取得"""
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
    current_user: int = Depends(get_current_user)
):
    """Ver2: Supabaseから特定のメモを取得"""
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
    current_user: int = Depends(get_current_user)
):
    """Ver2: Supabaseでメモを更新"""
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
    current_user: int = Depends(get_current_user)
):
    """Ver2: Supabaseからメモを削除"""
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

@app.post("/v2/memos/{memo_id}/autosave")
async def autosave_memo_v2(
    memo_id: int,
    memo_data: MultiMemoUpdate,
    current_user: int = Depends(get_current_user)
):
    """Ver2: Supabaseでメモの自動保存"""
    try:
        validate_supabase()
        
        update_data = {}
        if memo_data.title is not None:
            update_data['title'] = memo_data.title
        if memo_data.content is not None:
            update_data['content'] = memo_data.content
        
        if update_data:
            result = supabase.table('memos').update(update_data).eq('id', memo_id).eq('user_id', current_user).execute()
            
            if not result.data:
                raise HTTPException(status_code=404, detail="メモが見つかりません")
        
        return {"message": "メモが自動保存されました"}
    except HTTPException:
        raise
    except Exception as e:
        handle_database_error(e, "メモの自動保存")

# 新しいモデル：conversation履歴用

# =============================================================================
# 探究テーマ深掘りツリー用API
# =============================================================================

@app.post("/framework-games/theme-deep-dive/suggestions", response_model=ThemeDeepDiveResponse)
async def generate_theme_suggestions(
    request: ThemeDeepDiveRequest,
    current_user: int = Depends(get_current_user)
):
    """探究テーマの深掘り提案を生成"""
    try:
        validate_supabase()
        
        if llm_client is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="LLMクライアントが初期化されていません"
            )
        
        # プロンプトの構築
        system_prompt_theme = """あなたは探究学習の専門家です。
生徒は抽象度の高いテーマしか持っておらず、多くの場合は自分ごとになっていないテーマが多いです（例えば、AIと伝統産業、スポーツサイエンスなど）。
ユーザーが選択肢を選択肢ながら、より自分事になった「本当に興味がある」探究テーマに辿り着けるような選択肢を提案するのが仕事です。"""

        # 深さに応じたプロンプトの調整
        depth_guidance = "より具体的な探究の切り口を示してください。" if request.depth >= 2 else "具体的な領域や側面に分けてください。"
        
        # ユーザーの興味を考慮
        interest_context = f"\n生徒の興味関心: {', '.join(request.user_interests)}" if request.user_interests else ""
        
        user_prompt = f"""探究テーマ「{request.theme}」について、次の段階の具体的な探究の方向性を5〜7個提案してください。

{depth_guidance}
{interest_context}

以下の形式で提案してください：
1. [提案内容]
2. [提案内容]
...

各提案は30文字以内で、生徒が興味を持ちやすい表現にしてください。"""

        # LLMへのリクエスト
        messages = [
            {"role": "system", "content": system_prompt_theme},
            {"role": "user", "content": user_prompt}
        ]
        
        response = llm_client.generate_response_with_history(messages)
        
        # 応答のパース
        suggestions = []
        for line in response.strip().split('\n'):
            import re
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
        
        # コンテキスト情報
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
    current_user: int = Depends(get_current_user)
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

@app.post("/admin/create-test-user")
async def create_test_user(user_data: AdminUserCreate):
    """負荷テスト用ユーザー作成（開発・テスト環境のみ）"""
    try:
        validate_supabase()
        
        # セキュリティ: loadtest_user_* パターンのみ許可
        if not user_data.username.startswith("loadtest_user_"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="テストユーザー名は 'loadtest_user_' で始まる必要があります"
            )
        
        # 既存ユーザーチェック
        existing_user = supabase.table("users").select("id").eq("username", user_data.username).execute()
        if existing_user.data:
            return {"message": f"ユーザー {user_data.username} は既に存在します", "id": existing_user.data[0]["id"]}
        
        # ユーザー作成（実際のusersテーブルスキーマに合わせて）
        result = supabase.table("users").insert({
            "username": user_data.username,
            "password": user_data.password  # 実環境ではハッシュ化必要
            # created_atは自動生成されるので含めない
        }).execute()
        
        if result.data and len(result.data) > 0:
            user = result.data[0]
            logger.info(f"テストユーザー作成成功: {user_data.username} (ID: {user['id']})")
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
    """テストユーザーの一括削除（テスト後のクリーンアップ）"""
    try:
        validate_supabase()
        
        # loadtest_user_* パターンのユーザーを削除
        result = supabase.table("users").delete().like("username", "loadtest_user_%").execute()
        
        deleted_count = len(result.data) if result.data else 0
        logger.info(f"テストユーザー削除完了: {deleted_count}人")
        
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
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
 