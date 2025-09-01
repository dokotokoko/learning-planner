"""
対話エージェント用データモデル定義
既存のPydanticモデルと互換性を保ちながら拡張
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime

class Affect(BaseModel):
    """学習者の感情状態"""
    interest: int = Field(0, ge=0, le=5, description="関心度")
    anxiety: int = Field(0, ge=0, le=5, description="不安度")
    excitement: int = Field(0, ge=0, le=5, description="興奮度")

class ProgressSignal(BaseModel):
    """学習の進捗シグナル"""
    actions_in_last_7_days: int = Field(0, ge=0, description="過去7日間の行動数")
    novelty_ratio: float = Field(0.0, ge=0.0, le=1.0, description="新規性比率")
    looping_signals: List[str] = Field(default_factory=list, description="ループ兆候")
    scope_breadth: int = Field(1, ge=1, le=10, description="スコープの広さ")

class StateSnapshot(BaseModel):
    """会話時点での学習状態スナップショット（簡素化版）"""
    # 必須フィールド（ゴールと目的）
    goal: str = Field("", description="学習者のゴール")
    purpose: str = Field("", description="学習の目的")
    
    # プロジェクト情報（projectsテーブルから取得）
    project_context: Optional[Dict[str, Any]] = Field(None, description="プロジェクト情報（theme, question, hypothesis等）")
    project_id: Optional[int] = Field(None, description="プロジェクトID")
    
    # オプション情報（後方互換性のため残す）
    time_horizon: Optional[str] = Field("", description="時間軸")
    last_action: Optional[str] = Field("", description="最後の行動")
    blockers: List[str] = Field(default_factory=list, description="障害・ブロッカー")
    uncertainties: List[str] = Field(default_factory=list, description="不確実性")
    options_considered: List[str] = Field(default_factory=list, description="検討中の選択肢")
    resources: List[str] = Field(default_factory=list, description="利用可能なリソース")
    affect: Affect = Field(default_factory=Affect, description="感情状態")
    progress_signal: ProgressSignal = Field(default_factory=ProgressSignal, description="進捗シグナル")
    
    # 既存システムとの互換性のためのフィールド
    user_id: Optional[int] = None
    conversation_id: Optional[str] = None
    turn_index: Optional[int] = None

class NextAction(BaseModel):
    """次に取るべき行動"""
    action: str = Field(..., description="具体的な行動")
    urgency: int = Field(..., ge=1, le=5, description="緊急度（1-5）")
    importance: int = Field(..., ge=1, le=5, description="重要度（1-5）")
    reason: str = Field(..., description="この行動を取る理由")
    expected_outcome: str = Field(..., description="期待される成果")

class Milestone(BaseModel):
    """プロジェクトのマイルストーン"""
    title: str = Field(..., description="マイルストーンのタイトル")
    description: str = Field(..., description="詳細説明")
    target_date: Optional[str] = Field(None, description="目標日付")
    success_criteria: List[str] = Field(default_factory=list, description="成功基準")
    order: int = Field(..., ge=1, description="順序")

class ProjectPlan(BaseModel):
    """AIエージェントが考えるプロジェクト計画"""
    north_star: str = Field(..., description="北極星（最重要指標）")
    north_star_metric: str = Field(..., description="北極星の測定方法")
    milestones: List[Milestone] = Field(..., description="重要なマイルストーン")
    next_actions: List[NextAction] = Field(..., description="今取るべき行動（緊急度×重要度でソート）")
    strategic_approach: str = Field(..., description="戦略的アプローチ")
    risk_factors: List[str] = Field(default_factory=list, description="リスク要因")
    
    # メタデータ
    created_at: Optional[str] = Field(None, description="計画作成時刻")
    confidence: float = Field(0.7, ge=0.0, le=1.0, description="計画の確信度")

class Lens(BaseModel):
    """思考のレンズ（視点・基準）"""
    name: str = Field(..., description="レンズ名")
    principle: str = Field(..., description="原則・考え方")
    when_applicable: str = Field(..., description="適用条件")
    diagnostic_question: str = Field(..., description="診断質問")
    transformation: str = Field(..., description="変換・転換の方向性")
    next_step_template: str = Field(..., description="次の一歩のテンプレート")
    kill_criteria: str = Field(..., description="終了条件")
    effectiveness_score: Optional[float] = Field(None, ge=0.0, le=1.0, description="効果スコア")

class TurnDecision(BaseModel):
    """対話ターンでの意思決定"""
    support_type: str = Field(..., description="支援タイプ")
    selected_acts: List[str] = Field(..., max_items=2, description="選択された発話アクト（最大2個）")
    selected_lens: Dict[str, str] = Field(..., description="選択されたレンズ情報")
    reason_brief: str = Field(..., max_length=200, description="選択理由（簡潔に）")
    confidence: Optional[float] = Field(0.7, ge=0.0, le=1.0, description="決定の確信度")

class TurnPackage(BaseModel):
    """ユーザーに返す対話パッケージ"""
    natural_reply: str = Field(..., description="自然な応答文")
    followups: List[str] = Field(..., max_items=3, description="フォローアップ候補（最大3個）")
    metadata: Optional[Dict[str, Any]] = Field(None, description="メタデータ")
    
    # 既存APIとの互換性
    timestamp: Optional[str] = Field(None, description="タイムスタンプ")
    token_usage: Optional[Dict[str, Any]] = Field(None, description="トークン使用量")

# 支援タイプの定義（定数）
class SupportType:
    UNDERSTANDING = "理解深化"
    PATHFINDING = "道筋提示"
    REFRAMING = "視点転換"
    ACTIVATION = "行動活性化"
    NARROWING = "絞り込み"
    DECISION = "意思決定"
    
    ALL_TYPES = [
        UNDERSTANDING,
        PATHFINDING,
        REFRAMING,
        ACTIVATION,
        NARROWING,
        DECISION
    ]

# 発話アクトの定義（定数）
class SpeechAct:
    CLARIFY = "Clarify"     # 理解を深める質問
    INFORM = "Inform"       # 適時の情報提供
    PROBE = "Probe"         # 今向き合うべき問いの提示
    ACT = "Act"            # 行動・実践タスクの提案
    REFRAME = "Reframe"    # 視点・基準の再構築
    OUTLINE = "Outline"    # 道筋の骨子整理
    DECIDE = "Decide"      # 意思決定支援
    REFLECT = "Reflect"    # 鏡写し・要約・整合チェック
    
    ALL_ACTS = [
        CLARIFY,
        INFORM,
        PROBE,
        ACT,
        REFRAME,
        OUTLINE,
        DECIDE,
        REFLECT
    ]

# 評価メトリクス
class ConversationMetrics(BaseModel):
    """会話の評価指標"""
    momentum_delta: float = Field(0.0, description="前進感の変化")
    action_taken: bool = Field(False, description="72h以内の行動実行")
    turns_count: int = Field(0, ge=0, description="会話継続ターン数")
    satisfaction_score: Optional[float] = Field(None, ge=1.0, le=5.0, description="ユーザー満足度")
    lens_effectiveness: Dict[str, float] = Field(default_factory=dict, description="レンズ別効果測定")