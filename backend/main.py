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

# グローバル変数
db_manager = None
llm_client = None

@app.on_event("startup")
async def startup_event():
    """アプリケーション起動時の初期化"""
    global db_manager, llm_client
    try:
        # DB・LLMの両方を有効化
        db_manager = DBManager()  # DB有効化
        llm_client = learning_plannner()  # LLM有効化
        logger.info("FastAPIサーバーが起動しました（DB・LLM有効モード）")
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
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> int:
    """トークンからユーザーIDを取得（簡易実装）"""
    # 実際の実装では、JWTトークンの検証などを行う
    try:
        # 簡易実装：トークンをuser_idとして扱う
        user_id = int(credentials.credentials)
        return user_id
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
    current_user: int = Depends(get_current_user)
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
async def get_interests(current_user: int = Depends(get_current_user)):
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
    current_user: int = Depends(get_current_user)
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
async def get_goals(current_user: int = Depends(get_current_user)):
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
    current_user: int = Depends(get_current_user)
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
async def get_learning_plans(current_user: int = Depends(get_current_user)):
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
    current_user: int = Depends(get_current_user)
):
    """AIとのチャット（対話履歴を考慮）"""
    try:
        logger.info(f"チャット開始 - ユーザーID: {current_user}, メッセージ: {chat_data.message[:50]}...")
        
        if llm_client is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="LLMクライアントが初期化されていません"
            )
        
        if db_manager is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="データベースマネージャーが初期化されていません"
            )
        
        # 過去の対話履歴を取得してコンテキストに含める
        conversation_history = db_manager.get_conversation_context(
            user_id=current_user, 
            limit=50  # 直近50件の対話を取得
        )
        logger.info(f"取得した対話履歴: {len(conversation_history)}件")
        
        # コンテキストデータを準備（メモ内容は除外）
        context_data = {}
        if chat_data.context:
            context_data["additional_context"] = chat_data.context
        
        # LLM用のメッセージリストを構築
        messages = [{"role": "system", "content": system_prompt}]
        
        # 過去の対話履歴を追加
        for history_msg in conversation_history:
            messages.append({
                "role": history_msg["role"],
                "content": history_msg["content"]
            })
        logger.info(f"メッセージリストに追加された履歴: {len(conversation_history)}件")
        
        # 追加コンテキストのみを含める（メモ内容は含めない）
        current_context = ""
        if chat_data.context:
            current_context += f"追加コンテキスト: {chat_data.context}\n\n"
        
        user_message_with_context = current_context + chat_data.message
        messages.append({"role": "user", "content": user_message_with_context})
        logger.info(f"最終的なメッセージ数: {len(messages)}")
        
        # ユーザーメッセージをDBに保存
        db_manager.save_chat_message(
            user_id=current_user,
            page=chat_data.page or "general",
            sender="user",
            message=chat_data.message,
            context_data=json.dumps(context_data, ensure_ascii=False) if context_data else None
        )
        
        # LLMから応答を取得
        response = llm_client.generate_response_with_history(messages)
        
        # AIの応答をDBに保存
        db_manager.save_chat_message(
            user_id=current_user,
            page=chat_data.page or "general",
            sender="assistant",
            message=response,
            context_data=None
        )
        
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
    current_user: int = Depends(get_current_user)
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
    current_user: int = Depends(get_current_user)
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
    current_user: int = Depends(get_current_user)
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
    current_user: int = Depends(get_current_user)
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
async def get_all_memos(current_user: int = Depends(get_current_user)):
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
    current_user: int = Depends(get_current_user)
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True) 