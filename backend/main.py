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

from module.db_manager import DBManager
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

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Reactアプリのデフォルトポート
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# セキュリティスキーム
security = HTTPBearer()

# Pydanticモデル
class UserLogin(BaseModel):
    username: str
    access_code: str

class UserResponse(BaseModel):
    id: int
    username: str
    message: str

class InterestCreate(BaseModel):
    interest: str

class InterestResponse(BaseModel):
    id: int
    interest: str
    created_at: str

class GoalCreate(BaseModel):
    interest: str
    goal: str

class GoalResponse(BaseModel):
    id: int
    goal: str
    interest_id: int
    created_at: str

class LearningPlanCreate(BaseModel):
    goal: str
    nextStep: str

class LearningPlanResponse(BaseModel):
    id: int
    nextStep: str
    goal_id: int
    created_at: str

class ChatMessage(BaseModel):
    message: str
    memo_content: Optional[str] = None  # 互換性のため残すが使用しない
    context: Optional[str] = None
    page: Optional[str] = "general"  # 対話が行われるページを追加

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

class MemoSave(BaseModel):
    page_id: str
    content: str

class MemoResponse(BaseModel):
    id: int
    page_id: str
    content: str
    updated_at: str

class StepTheme(BaseModel):
    step: int
    theme: str
    content: Optional[str] = None

class LearningPathResponse(BaseModel):
    themes: List[StepTheme]
    chat_history: List[str]

# プロジェクト関連のモデル追加
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

# マルチメモ関連のモデル追加
class MultiMemoCreate(BaseModel):
    title: str
    content: str
    tags: Optional[List[str]] = []
    project_id: Optional[int] = None

class MultiMemoUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None

class MultiMemoResponse(BaseModel):
    id: int
    title: str
    content: str
    tags: List[str]
    project_id: Optional[int]
    created_at: str
    updated_at: str

class MemoSearchFilter(BaseModel):
    query: Optional[str] = None
    tags: Optional[List[str]] = None
    project_id: Optional[int] = None

# グローバル変数
db_manager = None
llm_client = None
supabase: Client = None

@app.on_event("startup")
async def startup_event():
    """アプリケーション起動時の初期化"""
    global db_manager, llm_client, supabase
    try:
        # DB・LLMの両方を有効化
        db_manager = DBManager()  # DB有効化
        logger.info("DBManager初期化完了")
        
        # Supabaseクライアントの初期化
        url: str = os.environ.get("SUPABASE_URL")
        key: str = os.environ.get("SUPABASE_KEY")
        if not url or not key:
            raise ValueError("Supabaseの接続情報が環境変数に設定されていません (SUPABASE_URL, SUPABASE_KEY)")
        supabase = create_client(url, key)
        logger.info("Supabaseクライアント初期化完了")
        
        # テーブル存在確認
        db_manager.cur.execute("SHOW TABLES LIKE 'chat_logs'")
        chat_logs_exists = db_manager.cur.fetchone()
        logger.info(f"chat_logsテーブル存在: {bool(chat_logs_exists)}")
        
        llm_client = learning_plannner()  # LLM有効化
        logger.info("FastAPIサーバーが起動しました（DB・LLM・Supabase有効モード）")
    except Exception as e:
        logger.error(f"初期化エラー: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """アプリケーション終了時のクリーンアップ"""
    global db_manager
    if db_manager:
        db_manager.close()
        logger.info("データベース接続を閉じました")

# 認証ヘルパー関数
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """トークンからユーザーIDを取得（UUID文字列として返す）"""
    # 実際の実装では、JWTトークンの検証などを行う
    try:
        # 簡易実装：トークンをuser_idとして扱う
        # 数値IDの場合はUUID形式に変換
        token = credentials.credentials
        
        # 数値IDをUUID形式に変換（0埋め形式）
        if token.isdigit():
            user_id_int = int(token)
            # 32桁の16進数に変換してUUID形式にする
            hex_id = f"{user_id_int:032x}"
            user_uuid = f"{hex_id[:8]}-{hex_id[8:12]}-{hex_id[12:16]}-{hex_id[16:20]}-{hex_id[20:32]}"
            return user_uuid
        else:
            # 既にUUID形式の場合はそのまま返す
            return token
            
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="無効なトークンです",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_current_user_int(credentials: HTTPAuthorizationCredentials = Depends(security)) -> int:
    """トークンからユーザーIDを取得（int型として返す）"""
    try:
        token = credentials.credentials
        
        # 数値IDの場合はint型で返す
        if token.isdigit():
            return int(token)
        else:
            # UUID形式の場合は数値IDに戻す
            # UUID形式: 00000000-0000-0000-0000-000000000005 -> 5
            uuid_str = token.replace("-", "")
            if len(uuid_str) == 32 and all(c in "0123456789abcdef" for c in uuid_str.lower()):
                # 16進数として解釈して10進数に変換
                return int(uuid_str, 16)
            else:
                raise ValueError("Invalid UUID format")
            
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="無効なトークンです",
            headers={"WWW-Authenticate": "Bearer"},
        )

# API エンドポイント

@app.get("/")
async def root():
    """ヘルスチェック"""
    return {"message": "探Qメイト API サーバーが動作中です", "version": "1.0.0"}

@app.post("/auth/login", response_model=UserResponse)
async def login(user_data: UserLogin):
    """ユーザーログイン"""
    try:
        user_id = db_manager.verify_user(user_data.username, user_data.access_code)
        if user_id:
            return UserResponse(
                id=user_id,
                username=user_data.username,
                message="ログインに成功しました"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="ユーザー名またはアクセスコードが正しくありません"
            )
    except Exception as e:
        logger.error(f"ログインエラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ログイン処理でエラーが発生しました"
        )

@app.post("/interests", response_model=InterestResponse)
async def create_interest(
    interest_data: InterestCreate,
    current_user: int = Depends(get_current_user_int)
):
    """興味関心の保存"""
    try:
        db_manager.save_interests(current_user, interest_data.interest)
        
        # 保存した興味関心を取得して返す
        interests = db_manager.get_interest(current_user)
        if interests:
            latest_interest = interests[-1]  # 最新の興味関心を取得
            return InterestResponse(
                id=1,  # 簡易実装：実際にはDBから取得
                interest=latest_interest[0],
                created_at=datetime.now().isoformat()
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="興味関心の保存に失敗しました"
            )
    except Exception as e:
        logger.error(f"興味関心保存エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="興味関心の保存でエラーが発生しました"
        )

@app.get("/interests", response_model=List[InterestResponse])
async def get_interests(current_user: int = Depends(get_current_user_int)):
    """ユーザーの興味関心一覧取得"""
    try:
        interests = db_manager.get_interest(current_user)
        return [
            InterestResponse(
                id=i + 1,
                interest=interest[0],
                created_at=datetime.now().isoformat()
            )
            for i, interest in enumerate(interests)
        ]
    except Exception as e:
        logger.error(f"興味関心取得エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="興味関心の取得でエラーが発生しました"
        )

@app.post("/goals", response_model=GoalResponse)
async def create_goal(
    goal_data: GoalCreate,
    current_user: int = Depends(get_current_user_int)
):
    """学習目標の保存"""
    try:
        db_manager.save_goal(current_user, goal_data.interest, goal_data.goal)
        
        # 保存した目標を取得して返す
        goals = db_manager.get_goal(current_user)
        if goals:
            latest_goal = goals[-1]
            return GoalResponse(
                id=latest_goal[0],
                goal=latest_goal[3],
                interest_id=latest_goal[2],
                created_at=latest_goal[4].isoformat() if latest_goal[4] else datetime.now().isoformat()
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="学習目標の保存に失敗しました"
            )
    except Exception as e:
        logger.error(f"学習目標保存エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="学習目標の保存でエラーが発生しました"
        )

@app.get("/goals", response_model=List[GoalResponse])
async def get_goals(current_user: int = Depends(get_current_user_int)):
    """ユーザーの学習目標一覧取得"""
    try:
        goals = db_manager.get_goal(current_user)
        return [
            GoalResponse(
                id=goal[0],
                goal=goal[3],
                interest_id=goal[2],
                created_at=goal[4].isoformat() if goal[4] else datetime.now().isoformat()
            )
            for goal in goals
        ]
    except Exception as e:
        logger.error(f"学習目標取得エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="学習目標の取得でエラーが発生しました"
        )

@app.post("/learning-plans", response_model=LearningPlanResponse)
async def create_learning_plan(
    plan_data: LearningPlanCreate,
    current_user: int = Depends(get_current_user_int)
):
    """学習計画の保存"""
    try:
        db_manager.save_learningPlans(current_user, plan_data.goal, plan_data.nextStep)
        
        # 保存した学習計画を取得して返す
        plans = db_manager.get_learningsPlans(current_user)
        if plans:
            latest_plan = plans[-1]
            return LearningPlanResponse(
                id=latest_plan[0],
                nextStep=latest_plan[3],
                goal_id=latest_plan[2],
                created_at=latest_plan[4].isoformat() if latest_plan[4] else datetime.now().isoformat()
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="学習計画の保存に失敗しました"
            )
    except Exception as e:
        logger.error(f"学習計画保存エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="学習計画の保存でエラーが発生しました"
        )

@app.get("/learning-plans", response_model=List[LearningPlanResponse])
async def get_learning_plans(current_user: int = Depends(get_current_user_int)):
    """ユーザーの学習計画一覧取得"""
    try:
        plans = db_manager.get_learningsPlans(current_user)
        return [
            LearningPlanResponse(
                id=plan[0],
                nextStep=plan[3],
                goal_id=plan[2],
                created_at=plan[4].isoformat() if plan[4] else datetime.now().isoformat()
            )
            for plan in plans
        ]
    except Exception as e:
        logger.error(f"学習計画取得エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="学習計画の取得でエラーが発生しました"
        )

@app.post("/chat", response_model=ChatResponse)
async def chat_with_ai(
    chat_data: ChatMessage,
    current_user: int = Depends(get_current_user_int)
):
    """AIとのチャット（対話履歴を考慮）"""
    try:
        logger.info(f"チャット開始 - ユーザーID: {current_user}, メッセージ: {chat_data.message[:50]}...")
        
        if llm_client is None or supabase is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="LLMクライアントまたはSupabaseクライアントが初期化されていません"
            )
        
        # 過去の対話履歴を取得してコンテキストに含める (Supabaseから)
        history_response = supabase.table("chat_logs").select("sender, message").eq("user_id", current_user).order("created_at").limit(50).execute()
        conversation_history = history_response.data
        logger.info(f"取得した対話履歴: {len(conversation_history)}件")
        
        # LLM用のメッセージリストを構築
        messages = [{"role": "system", "content": system_prompt}]
        for history_msg in conversation_history:
            role = "user" if history_msg["sender"] == "user" else "assistant"
            messages.append({"role": role, "content": history_msg["message"]})
        
        messages.append({"role": "user", "content": chat_data.message})
        logger.info(f"最終的なメッセージ数: {len(messages)}")
        
        # ユーザーメッセージをDBに保存 (Supabase経由)
        try:
            user_message_data = {
                "user_id": current_user,
                "page": chat_data.page or "general",
                "sender": "user",
                "message": chat_data.message
            }
            supabase.table("chat_logs").insert(user_message_data).execute()
            logger.info(f"ユーザーメッセージ保存完了")
        except Exception as e:
            logger.error(f"ユーザーメッセージ保存失敗: {e}")
            # 保存に失敗してもチャットは続行するが、エラーは返す
            raise HTTPException(status_code=500, detail=f"ユーザーメッセージの保存に失敗しました: {e}")
        
        # LLMから応答を取得
        response = llm_client.generate_response_with_history(messages)
        logger.info(f"LLM応答生成完了 - 長さ: {len(response)}")
        
        # AIの応答をDBに保存 (Supabase経由)
        try:
            ai_message_data = {
                "user_id": current_user,
                "page": chat_data.page or "general",
                "sender": "assistant",
                "message": response
            }
            supabase.table("chat_logs").insert(ai_message_data).execute()
            logger.info(f"AI応答保存完了")
        except Exception as e:
            logger.error(f"AI応答保存失敗: {e}")
            # 保存に失敗してもレスポンスは返すが、エラーは返す
            raise HTTPException(status_code=500, detail=f"AI応答の保存に失敗しました: {e}")
        
        return ChatResponse(
            response=response,
            timestamp=datetime.now().isoformat()
        )
    except Exception as e:
        logger.error(f"チャットエラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI応答の生成でエラーが発生しました"
        )

@app.get("/chat/history", response_model=List[ChatHistoryResponse])
async def get_chat_history(
    page: Optional[str] = None,
    limit: Optional[int] = 100,
    current_user: int = Depends(get_current_user_int)
):
    """対話履歴取得"""
    try:
        if page:
            history = db_manager.get_page_chat_history(current_user, page)
        else:
            history = db_manager.get_user_chat_history(current_user, limit)
        
        return [
            ChatHistoryResponse(
                id=item[0],
                page=item[1],
                sender=item[2],
                message=item[3],
                context_data=item[4],
                created_at=item[5].isoformat() if item[5] else datetime.now().isoformat()
            )
            for item in history
        ]
    except Exception as e:
        logger.error(f"対話履歴取得エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="対話履歴の取得でエラーが発生しました"
        )

@app.delete("/chat/history")
async def clear_chat_history(
    page: Optional[str] = None,
    current_user: int = Depends(get_current_user_int)
):
    """対話履歴クリア"""
    try:
        cleared_count = db_manager.clear_chat_history(current_user, page)
        page_info = f" (ページ: {page})" if page else ""
        return {"message": f"対話履歴をクリアしました{page_info}", "cleared_count": cleared_count}
    except Exception as e:
        logger.error(f"対話履歴クリアエラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="対話履歴のクリアでエラーが発生しました"
        )

@app.post("/memos", response_model=MemoResponse)
async def save_memo(
    memo_data: MemoSave,
    current_user: int = Depends(get_current_user_int)
):
    """メモの保存"""
    try:
        memo_result = db_manager.save_memo(current_user, memo_data.page_id, memo_data.content)
        if memo_result:
            return MemoResponse(
                id=memo_result[0],
                page_id=memo_result[1],
                content=memo_result[2],
                updated_at=memo_result[3].isoformat() if memo_result[3] else datetime.now().isoformat()
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="メモの保存に失敗しました"
            )
    except Exception as e:
        logger.error(f"メモ保存エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="メモの保存でエラーが発生しました"
        )

@app.get("/memos/{page_id}", response_model=MemoResponse)
async def get_memo(
    page_id: str,
    current_user: int = Depends(get_current_user_int)
):
    """メモの取得"""
    try:
        memo_result = db_manager.get_memo(current_user, page_id)
        if memo_result:
            return MemoResponse(
                id=memo_result[0],
                page_id=memo_result[1],
                content=memo_result[2] or "",
                updated_at=memo_result[3].isoformat() if memo_result[3] else datetime.now().isoformat()
            )
        else:
            # メモが存在しない場合は空のメモを返す
            return MemoResponse(
                id=0,
                page_id=page_id,
                content="",
                updated_at=datetime.now().isoformat()
            )
    except Exception as e:
        logger.error(f"メモ取得エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="メモの取得でエラーが発生しました"
        )

@app.get("/memos", response_model=List[MemoResponse])
async def get_all_memos(current_user: int = Depends(get_current_user_int)):
    """ユーザーの全メモ取得"""
    try:
        memos = db_manager.get_user_memos(current_user)
        return [
            MemoResponse(
                id=memo[0],
                page_id=memo[1],
                content=memo[2] or "",
                updated_at=memo[3].isoformat() if memo[3] else datetime.now().isoformat()
            )
            for memo in memos
        ]
    except Exception as e:
        logger.error(f"全メモ取得エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="メモの取得でエラーが発生しました"
        )

@app.delete("/memos/{page_id}")
async def delete_memo(
    page_id: str,
    current_user: int = Depends(get_current_user_int)
):
    """メモの削除"""
    try:
        deleted = db_manager.delete_memo(current_user, page_id)
        if deleted:
            return {"message": "メモが削除されました", "page_id": page_id}
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="削除するメモが見つかりません"
            )
    except Exception as e:
        logger.error(f"メモ削除エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="メモの削除でエラーが発生しました"
        )

@app.get("/learning-path/reflection", response_model=LearningPathResponse)
async def get_learning_path_reflection(current_user: int = Depends(get_current_user_int)):
    """学習の振り返り情報を取得"""
    try:
        # 各ステップのテーマを取得
        themes = []
        
        # Step 1: 興味関心
        interests = db_manager.get_interests(current_user)
        if interests:
            themes.append(StepTheme(
                step=1,
                theme="興味関心の特定",
                content=interests[-1][2]  # 最新の興味関心
            ))
        
        # Step 2: 学習目標
        goals = db_manager.get_goals(current_user)
        if goals:
            themes.append(StepTheme(
                step=2,
                theme="学習目標の設定",
                content=goals[-1][2]  # 最新の学習目標
            ))
        
        # Step 3: 学習計画
        plans = db_manager.get_learning_plans(current_user)
        if plans:
            themes.append(StepTheme(
                step=3,
                theme="学習計画の立案",
                content=plans[-1][2]  # 最新の学習計画
            ))
        
        # チャット履歴も含める（簡略版）
        chat_history = []
        if db_manager.cur:
            db_manager.cur.execute(
                "SELECT message FROM chat_logs WHERE user_id = %s ORDER BY created_at DESC LIMIT 10",
                (current_user,)
            )
            chat_results = db_manager.cur.fetchall()
            chat_history = [row[0] for row in chat_results]
        
        return LearningPathResponse(
            themes=themes,
            chat_history=chat_history
        )
    except Exception as e:
        logger.error(f"学習の振り返り情報取得エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="学習の振り返り情報の取得に失敗しました"
        )

# =============================================================================
# プロジェクト管理API
# =============================================================================

@app.post("/projects", response_model=ProjectResponse)
async def create_project(
    project_data: ProjectCreate,
    current_user: int = Depends(get_current_user)
):
    """新しいプロジェクトを作成"""
    try:
        if not db_manager.cur:
            raise HTTPException(status_code=500, detail="データベース接続エラー")
        
        # プロジェクトを作成
        tags_json = json.dumps(project_data.tags, ensure_ascii=False)
        
        db_manager.cur.execute("""
            INSERT INTO projects (user_id, title, description, tags, created_at, updated_at)
            VALUES (%s, %s, %s, %s, NOW(), NOW())
        """, (current_user, project_data.title, project_data.description, tags_json))
        
        project_id = db_manager.cur.lastrowid
        db_manager.conn.commit()
        
        # 作成されたプロジェクトを取得
        db_manager.cur.execute("""
            SELECT id, title, description, tags, created_at, updated_at
            FROM projects WHERE id = %s
        """, (project_id,))
        
        result = db_manager.cur.fetchone()
        
        return ProjectResponse(
            id=result[0],
            title=result[1],
            description=result[2],
            tags=json.loads(result[3]) if result[3] else [],
            created_at=result[4].isoformat(),
            updated_at=result[5].isoformat(),
            memo_count=0
        )
    except Exception as e:
        logger.error(f"プロジェクト作成エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="プロジェクトの作成に失敗しました"
        )

@app.get("/projects", response_model=List[ProjectResponse])
async def get_projects(current_user: int = Depends(get_current_user)):
    """ユーザーのプロジェクト一覧を取得"""
    try:
        if not db_manager.cur:
            raise HTTPException(status_code=500, detail="データベース接続エラー")
        
        # プロジェクト一覧とメモ数を取得
        db_manager.cur.execute("""
            SELECT p.id, p.title, p.description, p.tags, p.created_at, p.updated_at,
                   COUNT(m.id) as memo_count
            FROM projects p
            LEFT JOIN multi_memos m ON p.id = m.project_id
            WHERE p.user_id = %s
            GROUP BY p.id, p.title, p.description, p.tags, p.created_at, p.updated_at
            ORDER BY p.updated_at DESC
        """, (current_user,))
        
        results = db_manager.cur.fetchall()
        
        projects = []
        for row in results:
            projects.append(ProjectResponse(
                id=row[0],
                title=row[1],
                description=row[2],
                tags=json.loads(row[3]) if row[3] else [],
                created_at=row[4].isoformat(),
                updated_at=row[5].isoformat(),
                memo_count=row[6]
            ))
        
        return projects
    except Exception as e:
        logger.error(f"プロジェクト一覧取得エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="プロジェクト一覧の取得に失敗しました"
        )

@app.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: int,
    current_user: int = Depends(get_current_user_int)
):
    """特定のプロジェクトを取得"""
    try:
        if not db_manager.cur:
            raise HTTPException(status_code=500, detail="データベース接続エラー")
        
        db_manager.cur.execute("""
            SELECT p.id, p.title, p.description, p.tags, p.created_at, p.updated_at,
                   COUNT(m.id) as memo_count
            FROM projects p
            LEFT JOIN multi_memos m ON p.id = m.project_id
            WHERE p.id = %s AND p.user_id = %s
            GROUP BY p.id, p.title, p.description, p.tags, p.created_at, p.updated_at
        """, (project_id, current_user))
        
        result = db_manager.cur.fetchone()
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="プロジェクトが見つかりません"
            )
        
        return ProjectResponse(
            id=result[0],
            title=result[1],
            description=result[2],
            tags=json.loads(result[3]) if result[3] else [],
            created_at=result[4].isoformat(),
            updated_at=result[5].isoformat(),
            memo_count=result[6]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"プロジェクト取得エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="プロジェクトの取得に失敗しました"
        )

@app.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    current_user: int = Depends(get_current_user_int)
):
    """プロジェクトを更新"""
    try:
        if not db_manager.cur:
            raise HTTPException(status_code=500, detail="データベース接続エラー")
        
        # 更新フィールドを動的に構築
        update_fields = []
        values = []
        
        if project_data.title is not None:
            update_fields.append("title = %s")
            values.append(project_data.title)
        
        if project_data.description is not None:
            update_fields.append("description = %s")
            values.append(project_data.description)
        
        if project_data.tags is not None:
            update_fields.append("tags = %s")
            values.append(json.dumps(project_data.tags, ensure_ascii=False))
        
        if not update_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="更新するフィールドがありません"
            )
        
        update_fields.append("updated_at = NOW()")
        values.extend([project_id, current_user])
        
        # プロジェクトを更新
        query = f"""
            UPDATE projects 
            SET {', '.join(update_fields)}
            WHERE id = %s AND user_id = %s
        """
        
        db_manager.cur.execute(query, values)
        
        if db_manager.cur.rowcount == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="プロジェクトが見つかりません"
            )
        
        db_manager.conn.commit()
        
        # 更新されたプロジェクトを取得
        return await get_project(project_id, current_user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"プロジェクト更新エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="プロジェクトの更新に失敗しました"
        )

@app.delete("/projects/{project_id}")
async def delete_project(
    project_id: int,
    current_user: int = Depends(get_current_user_int)
):
    """プロジェクトを削除"""
    try:
        if not db_manager.cur:
            raise HTTPException(status_code=500, detail="データベース接続エラー")
        
        # 先に関連するメモを削除
        db_manager.cur.execute(
            "DELETE FROM multi_memos WHERE project_id = %s AND user_id = %s",
            (project_id, current_user)
        )
        
        # プロジェクトを削除
        db_manager.cur.execute(
            "DELETE FROM projects WHERE id = %s AND user_id = %s",
            (project_id, current_user)
        )
        
        if db_manager.cur.rowcount == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="プロジェクトが見つかりません"
            )
        
        db_manager.conn.commit()
        
        return {"message": "プロジェクトが正常に削除されました"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"プロジェクト削除エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="プロジェクトの削除に失敗しました"
        )

# =============================================================================
# マルチメモ管理API
# =============================================================================

@app.post("/projects/{project_id}/memos", response_model=MultiMemoResponse)
async def create_project_memo(
    project_id: int,
    memo_data: MultiMemoCreate,
    current_user: int = Depends(get_current_user)
):
    """プロジェクト内にメモを作成"""
    try:
        if not db_manager.cur:
            raise HTTPException(status_code=500, detail="データベース接続エラー")
        
        # プロジェクトの存在確認
        db_manager.cur.execute(
            "SELECT id FROM projects WHERE id = %s AND user_id = %s",
            (project_id, current_user)
        )
        if not db_manager.cur.fetchone():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="プロジェクトが見つかりません"
            )
        
        tags_json = json.dumps(memo_data.tags, ensure_ascii=False)
        
        db_manager.cur.execute("""
            INSERT INTO multi_memos (user_id, project_id, title, content, tags, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
        """, (current_user, project_id, memo_data.title, memo_data.content, tags_json))
        
        memo_id = db_manager.cur.lastrowid
        db_manager.conn.commit()
        
        # 作成されたメモを取得
        return await get_memo_by_id(memo_id, current_user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"プロジェクトメモ作成エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="メモの作成に失敗しました"
        )

@app.post("/memos", response_model=MultiMemoResponse)
async def create_memo(
    memo_data: MultiMemoCreate,
    current_user: int = Depends(get_current_user_int)
):
    """メモを作成（プロジェクトなし）"""
    try:
        if not db_manager.cur:
            raise HTTPException(status_code=500, detail="データベース接続エラー")
        
        tags_json = json.dumps(memo_data.tags, ensure_ascii=False)
        
        db_manager.cur.execute("""
            INSERT INTO multi_memos (user_id, project_id, title, content, tags, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
        """, (current_user, memo_data.project_id, memo_data.title, memo_data.content, tags_json))
        
        memo_id = db_manager.cur.lastrowid
        db_manager.conn.commit()
        
        # 作成されたメモを取得
        return await get_memo_by_id(memo_id, current_user)
        
    except Exception as e:
        logger.error(f"メモ作成エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="メモの作成に失敗しました"
        )

async def get_memo_by_id(memo_id: int, current_user: int) -> MultiMemoResponse:
    """内部用：メモをIDで取得"""
    db_manager.cur.execute("""
        SELECT id, title, content, tags, project_id, created_at, updated_at
        FROM multi_memos WHERE id = %s AND user_id = %s
    """, (memo_id, current_user))
    
    result = db_manager.cur.fetchone()
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="メモが見つかりません"
        )
    
    return MultiMemoResponse(
        id=result[0],
        title=result[1],
        content=result[2],
        tags=json.loads(result[3]) if result[3] else [],
        project_id=result[4],
        created_at=result[5].isoformat(),
        updated_at=result[6].isoformat()
    )

@app.get("/projects/{project_id}/memos", response_model=List[MultiMemoResponse])
async def get_project_memos(
    project_id: int,
    current_user: int = Depends(get_current_user)
):
    """プロジェクト内のメモ一覧を取得"""
    try:
        if not db_manager.cur:
            raise HTTPException(status_code=500, detail="データベース接続エラー")
        
        db_manager.cur.execute("""
            SELECT id, title, content, tags, project_id, created_at, updated_at
            FROM multi_memos 
            WHERE project_id = %s AND user_id = %s
            ORDER BY updated_at DESC
        """, (project_id, current_user))
        
        results = db_manager.cur.fetchall()
        
        memos = []
        for row in results:
            memos.append(MultiMemoResponse(
                id=row[0],
                title=row[1],
                content=row[2],
                tags=json.loads(row[3]) if row[3] else [],
                project_id=row[4],
                created_at=row[5].isoformat(),
                updated_at=row[6].isoformat()
            ))
        
        return memos
        
    except Exception as e:
        logger.error(f"プロジェクトメモ一覧取得エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="メモ一覧の取得に失敗しました"
        )

@app.get("/memos", response_model=List[MultiMemoResponse])
async def search_memos(
    query: Optional[str] = None,
    tags: Optional[str] = None,
    project_id: Optional[int] = None,
    current_user: int = Depends(get_current_user_int)
):
    """メモを検索・フィルタリング"""
    try:
        if not db_manager.cur:
            raise HTTPException(status_code=500, detail="データベース接続エラー")
        
        # 基本クエリ
        base_query = """
            SELECT id, title, content, tags, project_id, created_at, updated_at
            FROM multi_memos 
            WHERE user_id = %s
        """
        
        conditions = []
        values = [current_user]
        
        # 検索条件を追加
        if query:
            conditions.append("(title LIKE %s OR content LIKE %s)")
            values.extend([f"%{query}%", f"%{query}%"])
        
        if project_id is not None:
            conditions.append("project_id = %s")
            values.append(project_id)
        
        if tags:
            tag_list = [tag.strip() for tag in tags.split(",")]
            for tag in tag_list:
                conditions.append("JSON_CONTAINS(tags, %s)")
                values.append(json.dumps(tag, ensure_ascii=False))
        
        # 条件を結合
        if conditions:
            base_query += " AND " + " AND ".join(conditions)
        
        base_query += " ORDER BY updated_at DESC"
        
        db_manager.cur.execute(base_query, values)
        results = db_manager.cur.fetchall()
        
        memos = []
        for row in results:
            memos.append(MultiMemoResponse(
                id=row[0],
                title=row[1],
                content=row[2],
                tags=json.loads(row[3]) if row[3] else [],
                project_id=row[4],
                created_at=row[5].isoformat(),
                updated_at=row[6].isoformat()
            ))
        
        return memos
        
    except Exception as e:
        logger.error(f"メモ検索エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="メモの検索に失敗しました"
        )

@app.get("/memos/{memo_id}", response_model=MultiMemoResponse)
async def get_memo(
    memo_id: int,
    current_user: int = Depends(get_current_user_int)
):
    """特定のメモを取得"""
    try:
        return await get_memo_by_id(memo_id, current_user)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"メモ取得エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="メモの取得に失敗しました"
        )

@app.put("/memos/{memo_id}", response_model=MultiMemoResponse)
async def update_memo(
    memo_id: int,
    memo_data: MultiMemoUpdate,
    current_user: int = Depends(get_current_user_int)
):
    """メモを更新"""
    try:
        if not db_manager.cur:
            raise HTTPException(status_code=500, detail="データベース接続エラー")
        
        # 更新フィールドを動的に構築
        update_fields = []
        values = []
        
        if memo_data.title is not None:
            update_fields.append("title = %s")
            values.append(memo_data.title)
        
        if memo_data.content is not None:
            update_fields.append("content = %s")
            values.append(memo_data.content)
        
        if memo_data.tags is not None:
            update_fields.append("tags = %s")
            values.append(json.dumps(memo_data.tags, ensure_ascii=False))
        
        if not update_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="更新するフィールドがありません"
            )
        
        update_fields.append("updated_at = NOW()")
        values.extend([memo_id, current_user])
        
        # メモを更新
        query = f"""
            UPDATE multi_memos 
            SET {', '.join(update_fields)}
            WHERE id = %s AND user_id = %s
        """
        
        db_manager.cur.execute(query, values)
        
        if db_manager.cur.rowcount == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="メモが見つかりません"
            )
        
        db_manager.conn.commit()
        
        # 更新されたメモを取得
        return await get_memo_by_id(memo_id, current_user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"メモ更新エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="メモの更新に失敗しました"
        )

@app.delete("/memos/{memo_id}")
async def delete_memo(
    memo_id: int,
    current_user: int = Depends(get_current_user_int)
):
    """メモを削除"""
    try:
        if not db_manager.cur:
            raise HTTPException(status_code=500, detail="データベース接続エラー")
        
        db_manager.cur.execute(
            "DELETE FROM multi_memos WHERE id = %s AND user_id = %s",
            (memo_id, current_user)
        )
        
        if db_manager.cur.rowcount == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="メモが見つかりません"
            )
        
        db_manager.conn.commit()
        
        return {"message": "メモが正常に削除されました"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"メモ削除エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="メモの削除に失敗しました"
        )

# =============================================================================
# 自動保存エンドポイント
# =============================================================================

@app.post("/memos/{memo_id}/autosave")
async def autosave_memo(
    memo_id: int,
    memo_data: MultiMemoUpdate,
    current_user: int = Depends(get_current_user_int)
):
    """メモの自動保存（リアルタイム更新）"""
    try:
        # 通常の更新処理と同じだが、エラーハンドリングを軽量化
        return await update_memo(memo_id, memo_data, current_user)
    except Exception as e:
        logger.warning(f"自動保存エラー (継続可能): {e}")
        # 自動保存の失敗は致命的ではないため、警告レベルでログ出力
        return {"message": "自動保存に失敗しましたが、手動保存は可能です"}

# =============================================================================
# プロジェクト管理API
# =============================================================================

@app.post("/projects", response_model=ProjectResponse)
async def create_project(
    project_data: ProjectCreate,
    current_user: int = Depends(get_current_user)
):
    """新しいプロジェクトを作成"""
    try:
        if not db_manager.cur:
            raise HTTPException(status_code=500, detail="データベース接続エラー")
        
        # プロジェクトを作成
        tags_json = json.dumps(project_data.tags, ensure_ascii=False)
        
        db_manager.cur.execute("""
            INSERT INTO projects (user_id, title, description, tags, created_at, updated_at)
            VALUES (%s, %s, %s, %s, NOW(), NOW())
        """, (current_user, project_data.title, project_data.description, tags_json))
        
        project_id = db_manager.cur.lastrowid
        db_manager.conn.commit()
        
        # 作成されたプロジェクトを取得
        db_manager.cur.execute("""
            SELECT id, title, description, tags, created_at, updated_at
            FROM projects WHERE id = %s
        """, (project_id,))
        
        result = db_manager.cur.fetchone()
        
        return ProjectResponse(
            id=result[0],
            title=result[1],
            description=result[2],
            tags=json.loads(result[3]) if result[3] else [],
            created_at=result[4].isoformat(),
            updated_at=result[5].isoformat(),
            memo_count=0
        )
    except Exception as e:
        logger.error(f"プロジェクト作成エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="プロジェクトの作成に失敗しました"
        )

@app.get("/projects", response_model=List[ProjectResponse])
async def get_projects(current_user: int = Depends(get_current_user)):
    """ユーザーのプロジェクト一覧を取得"""
    try:
        if not db_manager.cur:
            raise HTTPException(status_code=500, detail="データベース接続エラー")
        
        # プロジェクト一覧とメモ数を取得
        db_manager.cur.execute("""
            SELECT p.id, p.title, p.description, p.tags, p.created_at, p.updated_at,
                   COUNT(m.id) as memo_count
            FROM projects p
            LEFT JOIN multi_memos m ON p.id = m.project_id
            WHERE p.user_id = %s
            GROUP BY p.id, p.title, p.description, p.tags, p.created_at, p.updated_at
            ORDER BY p.updated_at DESC
        """, (current_user,))
        
        results = db_manager.cur.fetchall()
        
        projects = []
        for row in results:
            projects.append(ProjectResponse(
                id=row[0],
                title=row[1],
                description=row[2],
                tags=json.loads(row[3]) if row[3] else [],
                created_at=row[4].isoformat(),
                updated_at=row[5].isoformat(),
                memo_count=row[6]
            ))
        
        return projects
    except Exception as e:
        logger.error(f"プロジェクト一覧取得エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="プロジェクト一覧の取得に失敗しました"
        )

# =============================================================================
# マルチメモ管理API
# =============================================================================

@app.post("/projects/{project_id}/memos", response_model=MultiMemoResponse)
async def create_project_memo(
    project_id: int,
    memo_data: MultiMemoCreate,
    current_user: int = Depends(get_current_user)
):
    """プロジェクト内にメモを作成"""
    try:
        if not db_manager.cur:
            raise HTTPException(status_code=500, detail="データベース接続エラー")
        
        tags_json = json.dumps(memo_data.tags, ensure_ascii=False)
        
        db_manager.cur.execute("""
            INSERT INTO multi_memos (user_id, project_id, title, content, tags, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
        """, (current_user, project_id, memo_data.title, memo_data.content, tags_json))
        
        memo_id = db_manager.cur.lastrowid
        db_manager.conn.commit()
        
        # 作成されたメモを取得
        db_manager.cur.execute("""
            SELECT id, title, content, tags, project_id, created_at, updated_at
            FROM multi_memos WHERE id = %s
        """, (memo_id,))
        
        result = db_manager.cur.fetchone()
        
        return MultiMemoResponse(
            id=result[0],
            title=result[1],
            content=result[2],
            tags=json.loads(result[3]) if result[3] else [],
            project_id=result[4],
            created_at=result[5].isoformat(),
            updated_at=result[6].isoformat()
        )
        
    except Exception as e:
        logger.error(f"プロジェクトメモ作成エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="メモの作成に失敗しました"
        )

@app.get("/projects/{project_id}/memos", response_model=List[MultiMemoResponse])
async def get_project_memos(
    project_id: int,
    current_user: int = Depends(get_current_user)
):
    """プロジェクト内のメモ一覧を取得"""
    try:
        if not db_manager.cur:
            raise HTTPException(status_code=500, detail="データベース接続エラー")
        
        db_manager.cur.execute("""
            SELECT id, title, content, tags, project_id, created_at, updated_at
            FROM multi_memos 
            WHERE project_id = %s AND user_id = %s
            ORDER BY updated_at DESC
        """, (project_id, current_user))
        
        results = db_manager.cur.fetchall()
        
        memos = []
        for row in results:
            memos.append(MultiMemoResponse(
                id=row[0],
                title=row[1],
                content=row[2],
                tags=json.loads(row[3]) if row[3] else [],
                project_id=row[4],
                created_at=row[5].isoformat(),
                updated_at=row[6].isoformat()
            ))
        
        return memos
        
    except Exception as e:
        logger.error(f"プロジェクトメモ一覧取得エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="メモ一覧の取得に失敗しました"
        )

@app.put("/memos/{memo_id}", response_model=MultiMemoResponse)
async def update_memo_new(
    memo_id: int,
    memo_data: MultiMemoUpdate,
    current_user: int = Depends(get_current_user)
):
    """メモを更新"""
    try:
        if not db_manager.cur:
            raise HTTPException(status_code=500, detail="データベース接続エラー")
        
        # 更新フィールドを動的に構築
        update_fields = []
        values = []
        
        if memo_data.title is not None:
            update_fields.append("title = %s")
            values.append(memo_data.title)
        
        if memo_data.content is not None:
            update_fields.append("content = %s")
            values.append(memo_data.content)
        
        if memo_data.tags is not None:
            update_fields.append("tags = %s")
            values.append(json.dumps(memo_data.tags, ensure_ascii=False))
        
        if not update_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="更新するフィールドがありません"
            )
        
        update_fields.append("updated_at = NOW()")
        values.extend([memo_id, current_user])
        
        # メモを更新
        query = f"""
            UPDATE multi_memos 
            SET {', '.join(update_fields)}
            WHERE id = %s AND user_id = %s
        """
        
        db_manager.cur.execute(query, values)
        
        if db_manager.cur.rowcount == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="メモが見つかりません"
            )
        
        db_manager.conn.commit()
        
        # 更新されたメモを取得
        db_manager.cur.execute("""
            SELECT id, title, content, tags, project_id, created_at, updated_at
            FROM multi_memos WHERE id = %s AND user_id = %s
        """, (memo_id, current_user))
        
        result = db_manager.cur.fetchone()
        
        return MultiMemoResponse(
            id=result[0],
            title=result[1],
            content=result[2],
            tags=json.loads(result[3]) if result[3] else [],
            project_id=result[4],
            created_at=result[5].isoformat(),
            updated_at=result[6].isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"メモ更新エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="メモの更新に失敗しました"
        )

@app.delete("/memos/{memo_id}")
async def delete_memo_new(
    memo_id: int,
    current_user: int = Depends(get_current_user)
):
    """メモを削除"""
    try:
        if not db_manager.cur:
            raise HTTPException(status_code=500, detail="データベース接続エラー")
        
        db_manager.cur.execute(
            "DELETE FROM multi_memos WHERE id = %s AND user_id = %s",
            (memo_id, current_user)
        )
        
        if db_manager.cur.rowcount == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="メモが見つかりません"
            )
        
        db_manager.conn.commit()
        
        return {"message": "メモが正常に削除されました"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"メモ削除エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="メモの削除に失敗しました"
        )

# =============================================================================
# Ver2 Supabase対応API（探究学習アプリケーション用）
# =============================================================================

@app.post("/v2/projects", response_model=ProjectResponse)
async def create_project_v2(
    project_data: ProjectCreate,
    current_user: int = Depends(get_current_user_int)
):
    """Ver2: Supabaseを使用してプロジェクトを作成"""
    try:
        # Supabaseにプロジェクトを挿入
        result = supabase.table('projects').insert({
            'user_id': current_user,
            'theme': project_data.theme,
            'question': project_data.question,
            'hypothesis': project_data.hypothesis
        }).execute()
        
        if result.data:
            project = result.data[0]
            # メモ数を取得
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
            
    except Exception as e:
        logger.error(f"Ver2プロジェクト作成エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"プロジェクトの作成に失敗しました: {str(e)}"
        )

@app.get("/v2/projects", response_model=List[ProjectResponse])
async def get_projects_v2(current_user: int = Depends(get_current_user_int)):
    """Ver2: Supabaseからプロジェクト一覧を取得"""
    try:
        # プロジェクト一覧を取得
        result = supabase.table('projects').select('*').eq('user_id', current_user).order('updated_at', desc=True).execute()
        
        projects = []
        for project in result.data:
            # 各プロジェクトのメモ数を取得
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
        logger.error(f"Ver2プロジェクト一覧取得エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"プロジェクト一覧の取得に失敗しました: {str(e)}"
        )

@app.get("/v2/projects/{project_id}", response_model=ProjectResponse)
async def get_project_v2(
    project_id: int,
    current_user: int = Depends(get_current_user_int)
):
    """Ver2: Supabaseから特定のプロジェクトを取得"""
    try:
        result = supabase.table('projects').select('*').eq('id', project_id).eq('user_id', current_user).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")
        
        project = result.data[0]
        # メモ数を取得
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
        logger.error(f"Ver2プロジェクト取得エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"プロジェクトの取得に失敗しました: {str(e)}"
        )

@app.put("/v2/projects/{project_id}", response_model=ProjectResponse)
async def update_project_v2(
    project_id: int,
    project_data: ProjectUpdate,
    current_user: int = Depends(get_current_user_int)
):
    """Ver2: Supabaseでプロジェクトを更新"""
    try:
        # 更新データを構築
        update_data = {}
        if project_data.theme is not None:
            update_data['theme'] = project_data.theme
        if project_data.question is not None:
            update_data['question'] = project_data.question
        if project_data.hypothesis is not None:
            update_data['hypothesis'] = project_data.hypothesis
        
        if not update_data:
            raise HTTPException(status_code=400, detail="更新するフィールドがありません")
        
        # Supabaseで更新
        result = supabase.table('projects').update(update_data).eq('id', project_id).eq('user_id', current_user).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")
        
        # 更新されたプロジェクトを取得
        return await get_project_v2(project_id, current_user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ver2プロジェクト更新エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"プロジェクトの更新に失敗しました: {str(e)}"
        )

@app.delete("/v2/projects/{project_id}")
async def delete_project_v2(
    project_id: int,
    current_user: int = Depends(get_current_user_int)
):
    """Ver2: Supabaseからプロジェクトを削除"""
    try:
        result = supabase.table('projects').delete().eq('id', project_id).eq('user_id', current_user).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")
        
        return {"message": "プロジェクトが正常に削除されました"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ver2プロジェクト削除エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"プロジェクトの削除に失敗しました: {str(e)}"
        )

@app.post("/v2/projects/{project_id}/memos", response_model=MultiMemoResponse)
async def create_project_memo_v2(
    project_id: int,
    memo_data: MultiMemoCreate,
    current_user: int = Depends(get_current_user_int)
):
    """Ver2: Supabaseでプロジェクト内にメモを作成"""
    try:
        # Supabaseにメモを挿入
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
                tags=[],  # Ver2ではタグなし
                project_id=memo['project_id'],
                created_at=memo['created_at'],
                updated_at=memo['updated_at']
            )
        else:
            raise HTTPException(status_code=500, detail="メモの作成に失敗しました")
            
    except Exception as e:
        logger.error(f"Ver2メモ作成エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"メモの作成に失敗しました: {str(e)}"
        )

@app.get("/v2/projects/{project_id}/memos", response_model=List[MultiMemoResponse])
async def get_project_memos_v2(
    project_id: int,
    current_user: int = Depends(get_current_user_int)
):
    """Ver2: Supabaseからプロジェクト内のメモ一覧を取得"""
    try:
        result = supabase.table('memos').select('*').eq('project_id', project_id).eq('user_id', current_user).order('updated_at', desc=True).execute()
        
        memos = []
        for memo in result.data:
            memos.append(MultiMemoResponse(
                id=memo['id'],
                title=memo['title'],
                content=memo['content'],
                tags=[],  # Ver2ではタグなし
                project_id=memo['project_id'],
                created_at=memo['created_at'],
                updated_at=memo['updated_at']
            ))
        
        return memos
        
    except Exception as e:
        logger.error(f"Ver2メモ一覧取得エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"メモ一覧の取得に失敗しました: {str(e)}"
        )

@app.get("/v2/memos/{memo_id}", response_model=MultiMemoResponse)
async def get_memo_v2(
    memo_id: int,
    current_user: int = Depends(get_current_user_int)
):
    """Ver2: Supabaseから特定のメモを取得"""
    try:
        result = supabase.table('memos').select('*').eq('id', memo_id).eq('user_id', current_user).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="メモが見つかりません")
        
        memo = result.data[0]
        return MultiMemoResponse(
            id=memo['id'],
            title=memo['title'],
            content=memo['content'],
            tags=[],  # Ver2ではタグなし
            project_id=memo['project_id'],
            created_at=memo['created_at'],
            updated_at=memo['updated_at']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ver2メモ取得エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"メモの取得に失敗しました: {str(e)}"
        )

@app.put("/v2/memos/{memo_id}", response_model=MultiMemoResponse)
async def update_memo_v2(
    memo_id: int,
    memo_data: MultiMemoUpdate,
    current_user: int = Depends(get_current_user_int)
):
    """Ver2: Supabaseでメモを更新"""
    try:
        # 更新データを構築
        update_data = {}
        if memo_data.title is not None:
            update_data['title'] = memo_data.title
        if memo_data.content is not None:
            update_data['content'] = memo_data.content
        
        if not update_data:
            raise HTTPException(status_code=400, detail="更新するフィールドがありません")
        
        # Supabaseで更新
        result = supabase.table('memos').update(update_data).eq('id', memo_id).eq('user_id', current_user).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="メモが見つかりません")
        
        # 更新されたメモを取得
        return await get_memo_v2(memo_id, current_user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ver2メモ更新エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"メモの更新に失敗しました: {str(e)}"
        )

@app.delete("/v2/memos/{memo_id}")
async def delete_memo_v2(
    memo_id: int,
    current_user: int = Depends(get_current_user_int)
):
    """Ver2: Supabaseからメモを削除"""
    try:
        result = supabase.table('memos').delete().eq('id', memo_id).eq('user_id', current_user).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="メモが見つかりません")
        
        return {"message": "メモが正常に削除されました"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ver2メモ削除エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"メモの削除に失敗しました: {str(e)}"
        )

@app.post("/v2/memos/{memo_id}/autosave")
async def autosave_memo_v2(
    memo_id: int,
    memo_data: MultiMemoUpdate,
    current_user: int = Depends(get_current_user_int)
):
    """Ver2: Supabaseでメモの自動保存"""
    try:
        # 部分更新データを構築
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
        logger.error(f"Ver2メモ自動保存エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"メモの自動保存に失敗しました: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
 