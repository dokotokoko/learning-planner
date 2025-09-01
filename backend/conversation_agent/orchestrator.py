"""
対話エージェントの統合制御モジュール（Phase 1: モック版）
すべてのコンポーネントを統合して対話フローを制御
"""

import json
import logging
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime
from .schema import (
    StateSnapshot,
    TurnDecision,
    TurnPackage,
    SupportType,
    SpeechAct,
    ConversationMetrics,
    ProjectPlan
)
from .state_extractor import StateExtractor
from .support_typer import SupportTyper
from .policies import PolicyEngine
from .project_planner import ProjectPlanner

logger = logging.getLogger(__name__)

class ConversationOrchestrator:
    """対話フロー全体を統合制御"""
    
    def __init__(self, llm_client=None, use_mock: bool = False):
        """
        Args:
            llm_client: LLMクライアント（既存のmodule.llm_apiを使用）
            use_mock: モックモードで動作するか（Phase 1ではTrue）
        """
        self.llm_client = llm_client
        self.use_mock = use_mock
        
        # 各コンポーネントの初期化
        self.state_extractor = StateExtractor(llm_client)
        self.support_typer = SupportTyper(llm_client)
        self.policy_engine = PolicyEngine()
        self.project_planner = ProjectPlanner(llm_client)
        
        # メトリクス追跡
        self.metrics = ConversationMetrics()
        
        # 会話履歴（簡易版）
        self.conversation_history: List[Dict[str, Any]] = []
        self.support_type_history: List[str] = []
        self.act_history: List[List[str]] = []
    
    def process_turn(
        self,
        user_message: str,
        conversation_history: List[Dict[str, str]],
        project_context: Optional[Dict[str, Any]] = None,
        user_id: Optional[int] = None,
        conversation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        1ターンの対話処理（メインエントリポイント）
        
        Args:
            user_message: ユーザーの入力メッセージ
            conversation_history: 会話履歴
            project_context: プロジェクト情報
            user_id: ユーザーID
            conversation_id: 会話ID
            
        Returns:
            {
                "response": str,                # 自然な応答文
                "followups": List[str],         # フォローアップ候補
                "support_type": str,            # 選択された支援タイプ
                "selected_acts": List[str],     # 選択された発話アクト
                "state_snapshot": dict,         # 状態スナップショット
                "project_plan": dict,           # AIエージェントの計画思考結果（NEW!）
                "decision_metadata": dict,      # 意思決定メタデータ
                "metrics": dict                 # メトリクス
            }
        """
        
        try:
            # 1. 状態抽出(理解)
            state = self._extract_state(conversation_history, project_context, user_id, conversation_id)
            
            # 2. 計画思考フェーズ（思考）
            project_plan = self._generate_project_plan(state, conversation_history)
            
            # 3. 支援タイプ判定
            support_type, support_reason, confidence = self._determine_support_type(state)
            
            # 4. 発話アクト選択
            selected_acts, act_reason = self._select_acts(state, support_type)
            
            # 5. 応答生成
            response_package = self._generate_response(
                state, support_type, selected_acts, user_message
            )
            
            # 6. メトリクス更新
            self._update_metrics(state, support_type, selected_acts)
            
            # 7. 履歴更新
            self._update_history(support_type, selected_acts, response_package)
            
            # 結果をパッケージング
            result = {
                "response": response_package.natural_reply,
                "followups": response_package.followups,
                "support_type": support_type,
                "selected_acts": selected_acts,
                "state_snapshot": state.dict(exclude={'user_id', 'conversation_id', 'turn_index'}),
                "project_plan": project_plan.dict() if project_plan else None,  # NEW!
                "decision_metadata": {
                    "support_reason": support_reason,
                    "support_confidence": confidence,
                    "act_reason": act_reason,
                    "timestamp": datetime.now().isoformat()
                },
                "metrics": self.metrics.dict()
            }
            
            return result
            
        except Exception as e:
            logger.error(f"対話処理エラー: {e}")
            # エラー時のフォールバック応答
            return self._generate_fallback_response(str(e))
    
    def _extract_state(
        self,
        conversation_history: List[Dict[str, str]],
        project_context: Optional[Dict[str, Any]],
        user_id: Optional[int],
        conversation_id: Optional[str]
    ) -> StateSnapshot:
        """状態抽出フェーズ"""
        
        # プロジェクト情報のログ出力（デバッグ用）
        if project_context:
            logger.info(f"プロジェクト情報: theme={project_context.get('theme')}, "
                       f"question={project_context.get('question')}, "
                       f"id={project_context.get('id')}")
        else:
            logger.warning("プロジェクト情報が提供されていません")
        
        # モックモードの場合はヒューリスティック処理を使用
        use_llm = not self.use_mock and self.llm_client is not None
        
        state = self.state_extractor.extract_from_history(
            conversation_history,
            project_context,
            use_llm=use_llm,
            minimal_mode=True  # 必須フィールドに限定（ゴール、目的、ProjectContext、会話履歴）
        )
        
        # システム情報を追加
        state.user_id = user_id
        state.conversation_id = conversation_id
        state.turn_index = len(conversation_history)
        
        # プロジェクト情報が確実に設定されているか確認
        if project_context:
            if not state.project_context:
                state.project_context = project_context
            if not state.project_id:
                state.project_id = project_context.get('id')
            # goalが空でthemeがある場合は設定
            if not state.goal and project_context.get('theme'):
                state.goal = project_context['theme']
                if project_context.get('question'):
                    state.goal = f"{project_context['theme']} - {project_context['question']}"
        
        logger.info(f"状態抽出完了: goal={state.goal}, blockers={len(state.blockers)}, "
                   f"project_id={state.project_id}")
        
        return state
    
    def _generate_project_plan(
        self,
        state: StateSnapshot,
        conversation_history: List[Dict[str, str]]
    ) -> Optional[ProjectPlan]:
        """プロジェクト計画思考フェーズ"""
        
        # プロジェクト情報がない場合はスキップ
        if not state.project_context:
            logger.info("プロジェクト情報がないため、計画思考フェーズをスキップ")
            return None
        
        # モックモードの場合はルールベース処理を使用
        use_llm = not self.use_mock and self.llm_client is not None
        
        try:
            project_plan = self.project_planner.generate_project_plan(
                state,
                conversation_history,
                use_llm=use_llm
            )
            
            logger.info(f"プロジェクト計画生成完了: 北極星={project_plan.north_star[:50]}...")
            logger.info(f"次の行動数: {len(project_plan.next_actions)}, マイルストーン数: {len(project_plan.milestones)}")
            
            return project_plan
            
        except Exception as e:
            logger.error(f"プロジェクト計画生成エラー: {e}")
            return None
    
    def _determine_support_type(self, state: StateSnapshot) -> Tuple[str, str, float]:
        """支援タイプ判定フェーズ"""
        
        # モックモードの場合はルールベース処理を使用
        use_llm = not self.use_mock and self.llm_client is not None
        
        support_type, reason, confidence = self.support_typer.determine_support_type(
            state,
            use_llm=use_llm
        )
        
        # 文脈に基づく調整
        if self.support_type_history:
            effectiveness_scores = {}  # Phase 2で実装
            support_type = self.support_typer.adjust_for_context(
                support_type,
                self.support_type_history[-5:],
                effectiveness_scores
            )
        
        logger.info(f"支援タイプ判定: {support_type} (確信度: {confidence:.2f})")
        
        return support_type, reason, confidence
    
    def _select_acts(self, state: StateSnapshot, support_type: str) -> Tuple[List[str], str]:
        """発話アクト選択フェーズ"""
        
        selected_acts, reason = self.policy_engine.select_acts(
            state,
            support_type,
            max_acts=2
        )
        
        # Socratic優先順位で並び替え
        selected_acts = self.policy_engine.get_socratic_priority(selected_acts)
        
        logger.info(f"発話アクト選択: {selected_acts}")
        
        return selected_acts, reason
    
    def _generate_response(
        self,
        state: StateSnapshot,
        support_type: str,
        selected_acts: List[str],
        user_message: str
    ) -> TurnPackage:
        """応答生成フェーズ（Phase 1: モック版）"""
        
        if self.use_mock or not self.llm_client:
            return self._generate_mock_response(state, support_type, selected_acts)
        
        # Phase 2で実装: LLMを使用した自然文生成
        return self._generate_llm_response(state, support_type, selected_acts, user_message)
    
    def _generate_mock_response(
        self,
        state: StateSnapshot,
        support_type: str,
        selected_acts: List[str]
    ) -> TurnPackage:
        """モック応答の生成"""
        
        # アクトに基づくテンプレート応答
        responses = {
            SpeechAct.CLARIFY: "もう少し詳しく教えていただけますか？どのような点で困っていますか？",
            SpeechAct.INFORM: "この分野では、まず基本的な概念を理解することが重要です。",
            SpeechAct.PROBE: "なぜそれが重要だと思いますか？どのような成果を期待していますか？",
            SpeechAct.ACT: "まずは30分で、具体的な例を3つ書き出してみましょう。",
            SpeechAct.REFRAME: "別の角度から見ると、これは学習の機会かもしれません。",
            SpeechAct.OUTLINE: "これを3つのステップに分けてみましょう：1) 調査、2) 実験、3) 振り返り。",
            SpeechAct.DECIDE: "どの選択肢が最も目標に近づけそうですか？基準を明確にしましょう。",
            SpeechAct.REFLECT: "ここまでの話をまとめると、主な課題は明確になってきましたね。"
        }
        
        # 選択されたアクトに基づいて応答を構築
        response_parts = []
        for act in selected_acts[:2]:
            if act in responses:
                response_parts.append(responses[act])
        
        natural_reply = " ".join(response_parts) if response_parts else "どのようなことでお困りですか？"
        
        # フォローアップ候補
        followups = [
            "具体例を教えてください",
            "他の方法も検討しましょう",
            "まずは小さく始めてみます"
        ]
        
        return TurnPackage(
            natural_reply=natural_reply,
            followups=followups[:3],
            metadata={"mock": True, "support_type": support_type}
        )
    
    def _generate_llm_response(
        self,
        state: StateSnapshot,
        support_type: str,
        selected_acts: List[str],
        user_message: str
    ) -> TurnPackage:
        """LLMを使用した応答生成（Phase 2で実装）"""
        
        # プロンプト構築
        prompt = f"""あなたは探究学習のメンターAIです。
        
選択された発話アクト: {selected_acts}
支援タイプ: {support_type}
学習者の状態:
- 目標: {state.goal}
- ブロッカー: {', '.join(state.blockers) if state.blockers else 'なし'}
- 不確実性: {', '.join(state.uncertainties) if state.uncertainties else 'なし'}

ユーザーのメッセージ: {user_message}

上記の情報を基に、選択された発話アクトを自然に組み合わせた応答を生成してください。
Socratic（問いかけ中心）なアプローチを優先し、必要最小限の情報提供に留めてください。

応答形式（JSON）:
{{
    "natural_reply": "自然な応答文",
    "followups": ["フォローアップ1", "フォローアップ2", "フォローアップ3"]
}}"""
        
        try:
            messages = [
                {"role": "system", "content": "あなたは学習支援の専門家です。"},
                {"role": "user", "content": prompt}
            ]
            
            response = self.llm_client.generate_response_with_history(messages)
            result = json.loads(response)
            
            return TurnPackage(
                natural_reply=result.get("natural_reply", "どのようなお手伝いができますか？"),
                followups=result.get("followups", [])[:3],
                metadata={"support_type": support_type}
            )
            
        except Exception as e:
            logger.error(f"LLM応答生成エラー: {e}")
            return self._generate_mock_response(state, support_type, selected_acts)
    
    def _update_metrics(
        self,
        state: StateSnapshot,
        support_type: str,
        selected_acts: List[str]
    ):
        """メトリクスの更新"""
        
        # ターン数をインクリメント
        self.metrics.turns_count += 1
        
        # 前進感の推定（簡易版）
        if state.progress_signal.actions_in_last_7_days > 3:
            self.metrics.momentum_delta = 0.5
        elif state.progress_signal.looping_signals:
            self.metrics.momentum_delta = -0.2
        else:
            self.metrics.momentum_delta = 0.1
    
    def _update_history(
        self,
        support_type: str,
        selected_acts: List[str],
        response_package: TurnPackage
    ):
        """履歴の更新"""
        
        self.support_type_history.append(support_type)
        self.act_history.append(selected_acts)
        
        # 最大履歴数を制限
        if len(self.support_type_history) > 20:
            self.support_type_history = self.support_type_history[-20:]
        if len(self.act_history) > 20:
            self.act_history = self.act_history[-20:]
    
    def _generate_fallback_response(self, error_message: str) -> Dict[str, Any]:
        """エラー時のフォールバック応答"""
        
        logger.error(f"フォールバック応答生成: {error_message}")
        
        return {
            "response": "申し訳ございません。ちょっと考えがまとまりませんでした。もう一度お聞かせください。",
            "followups": [
                "別の言い方で説明してみてください",
                "具体的な例を教えてください",
                "どの部分が特に重要ですか？"
            ],
            "support_type": SupportType.UNDERSTANDING,
            "selected_acts": [SpeechAct.CLARIFY],
            "state_snapshot": {},
            "decision_metadata": {"error": error_message},
            "metrics": self.metrics.dict()
        }
    
    def get_conversation_summary(self) -> Dict[str, Any]:
        """会話の要約を取得"""
        
        return {
            "total_turns": self.metrics.turns_count,
            "momentum_delta": self.metrics.momentum_delta,
            "support_types_used": list(set(self.support_type_history)),
            "most_common_acts": self._get_most_common_acts(),
            "effectiveness": self._calculate_effectiveness()
        }
    
    def _get_most_common_acts(self) -> List[str]:
        """最も使用された発話アクトを取得"""
        
        act_counts = {}
        for acts in self.act_history:
            for act in acts:
                act_counts[act] = act_counts.get(act, 0) + 1
        
        sorted_acts = sorted(act_counts.items(), key=lambda x: x[1], reverse=True)
        return [act for act, _ in sorted_acts[:3]]
    
    def _calculate_effectiveness(self) -> float:
        """会話の効果を計算（簡易版）"""
        
        if self.metrics.turns_count == 0:
            return 0.5
        
        # 前進感と継続率から効果を推定
        effectiveness = 0.5 + self.metrics.momentum_delta * 0.3
        if self.metrics.turns_count > 3:
            effectiveness += 0.2  # 継続ボーナス
        
        return min(1.0, max(0.0, effectiveness))