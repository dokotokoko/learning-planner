"""
対話エージェントの統合制御モジュール（Phase 1: モック版）
すべてのコンポーネントを統合して対話フローを制御
"""
import json
import logging
import re
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
    
    # <summary>対話オーケストレーターを初期化します。</summary>
    # <arg name="llm_client">LLMクライアント（既存のmodule.llm_apiを使用）。</arg>
    # <arg name="use_mock">モックモードで動作するか（Phase 1ではTrue）。</arg>
    def __init__(self, llm_client=None, use_mock: bool = False):
        self.llm_client = llm_client
        self.use_mock = use_mock
        
        # 各コンポーネントの初期化
        self.state_extractor = StateExtractor(llm_client)
        self.project_planner = ProjectPlanner(llm_client)
        self.support_typer = SupportTyper(llm_client)
        self.policy_engine = PolicyEngine()
        
        # メトリクス追跡
        self.metrics = ConversationMetrics()
        
        # 会話履歴（簡易版）
        self.conversation_history: List[Dict[str, Any]] = []
        self.support_type_history: List[str] = []
        self.act_history: List[List[str]] = []

        # 既存のLLM応答生成メソッドを、適応型ロジックに差し替え
        # 既存コードの呼び出し箇所を最小変更にするため、実体を差し替える
        try:
            self._generate_llm_response  # 存在確認
            # 実行時に適応型メソッドへエイリアス
            self._generate_llm_response = self._generate_llm_response_adaptive  # type: ignore
        except Exception:
            pass
    
    # <summary>1ターンの対話処理を実行します（メインエントリポイント）。</summary>
    # <arg name="user_message">ユーザーの入力メッセージ。</arg>
    # <arg name="conversation_history">会話履歴。</arg>
    # <arg name="project_context">プロジェクト情報（任意）。</arg>
    # <arg name="user_id">ユーザーID（任意）。</arg>
    # <arg name="conversation_id">会話ID（任意）。</arg>
    # <returns>応答パッケージ（response, followups, support_type, selected_acts, state_snapshot, project_plan, decision_metadata, metrics）。</returns>
    def process_turn(
        self,
        user_message: str,
        conversation_history: List[Dict[str, str]],
        project_context: Optional[Dict[str, Any]] = None,
        user_id: Optional[int] = None,
        conversation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        # 最新の履歴を内部にも保持（簡易）
        try:
            self.conversation_history = list(conversation_history or [])
        except Exception:
            self.conversation_history = []

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
    
    # <summary>会話履歴から現在の状態を抽出します。</summary>
    # <arg name="conversation_history">会話履歴。</arg>
    # <arg name="project_context">プロジェクト情報（任意）。</arg>
    # <arg name="user_id">ユーザーID（任意）。</arg>
    # <arg name="conversation_id">会話ID（任意）。</arg>
    # <returns>現在の状態スナップショット。</returns>
    def _extract_state(
        self,
        conversation_history: List[Dict[str, str]],
        project_context: Optional[Dict[str, Any]],
        user_id: Optional[int],
        conversation_id: Optional[str]
    ) -> StateSnapshot:
        
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
    
    # <summary>プロジェクト計画を生成します。</summary>
    # <arg name="state">現在の状態スナップショット。</arg>
    # <arg name="conversation_history">会話履歴。</arg>
    # <returns>プロジェクト計画（任意）。</returns>
    def _generate_project_plan(
        self,
        state: StateSnapshot,
        conversation_history: List[Dict[str, str]]
    ) -> Optional[ProjectPlan]:
        
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
    
    # <summary>状態から支援タイプを判定します。</summary>
    # <arg name="state">現在の状態スナップショット。</arg>
    # <returns>(support_type, reason, confidence)。支援タイプ、理由、確信度。</returns>
    def _determine_support_type(self, state: StateSnapshot) -> Tuple[str, str, float]:
        
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
    
    # <summary>支援タイプに基づいて発話アクトを選択します。</summary>
    # <arg name="state">現在の状態スナップショット。</arg>
    # <arg name="support_type">選択された支援タイプ。</arg>
    # <returns>(selected_acts, reason)。選択された発話アクトリストと理由。</returns>
    def _select_acts(self, state: StateSnapshot, support_type: str) -> Tuple[List[str], str]:
        
        selected_acts, reason = self.policy_engine.select_acts(
            state,
            support_type,
            max_acts=2
        )
        
        # Socratic優先順位で並び替え
        selected_acts = self.policy_engine.get_socratic_priority(selected_acts)
        
        logger.info(f"発話アクト選択: {selected_acts}")
        
        return selected_acts, reason
    
    # <summary>発話アクトに基づいて応答を生成します（Phase 1: モック版）。</summary>
    # <arg name="state">現在の状態スナップショット。</arg>
    # <arg name="support_type">選択された支援タイプ。</arg>
    # <arg name="selected_acts">選択された発話アクトリスト。</arg>
    # <arg name="user_message">ユーザーの入力メッセージ。</arg>
    # <returns>応答パッケージ。</returns>
    def _generate_response(
        self,
        state: StateSnapshot,
        support_type: str,
        selected_acts: List[str],
        user_message: str
    ) -> TurnPackage:
        
        if self.use_mock or not self.llm_client:
            return self._generate_mock_response(state, support_type, selected_acts)
        
        # Phase 2で実装: LLMを使用した自然文生成
        return self._generate_llm_response(state, support_type, selected_acts, user_message)
    
    # <summary>テンプレートベースのモック応答を生成します。</summary>
    # <arg name="state">現在の状態スナップショット。</arg>
    # <arg name="support_type">選択された支援タイプ。</arg>
    # <arg name="selected_acts">選択された発話アクトリスト。</arg>
    # <returns>モック応答パッケージ。</returns>
    def _generate_mock_response(
        self,
        state: StateSnapshot,
        support_type: str,
        selected_acts: List[str]
    ) -> TurnPackage:
        
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
    
    # 新規: 適応型LLM応答生成（文量・スタイルを自動調整）[2025.9.15 mori]
    def _generate_llm_response_adaptive(
        self,
        state: StateSnapshot,
        support_type: str,
        selected_acts: List[str],
        user_message: str
    ) -> TurnPackage:
        """
        入力長・語彙・履歴・進捗から動機づけ/理解度を推定し、
        適切な文量とスタイルでLLMに指示して応答を得る。
        """

        motivation_score, understanding_score = self._assess_motivation_and_understanding(
            user_message, state, self.conversation_history
        )

        profile = self._decide_response_profile(
            motivation_score, understanding_score, state, self.conversation_history, support_type
        )

        guidelines = self._build_guidelines(profile, motivation_score, understanding_score, state)

        blockers_str = ", ".join(state.blockers) if getattr(state, 'blockers', None) else "なし"
        uncertainties_str = ", ".join(state.uncertainties) if getattr(state, 'uncertainties', None) else "なし"
        selected_acts_str = ", ".join(selected_acts)

        prompt = (
            "あなたは探究学習のメンターAIです。学習科学・動機づけ理論に基づき、\n"
            "過剰な説明は避け、短い対話のテンポで前進を促してください。\n\n"
            f"支援タイプ: {support_type}\n"
            f"発話アクト: {selected_acts_str}\n"
            "学習状態:\n"
            f"- 目標: {getattr(state, 'goal', '')}\n"
            f"- ブロッカー: {blockers_str}\n"
            f"- 不確実性: {uncertainties_str}\n\n"
            f"ユーザーのメッセージ: {user_message}\n\n"
            f"応答ガイドライン:\n{guidelines}\n\n"
            "出力は必ず次のJSONで返してください（余計なテキストやコードブロックは禁止）。\n"
            "{\n"
            "  \"natural_reply\": \"指示に沿った日本語の応答文\",\n"
            "  \"followups\": [\"短いフォローアップ1\", \"短いフォローアップ2\", \"短いフォローアップ3\"]\n"
            "}"
        )

        try:
            messages = [
                {"role": "system", "content": "あなたは学習支援の専門家です。日本語で丁寧に応答し、必ず有効なJSONのみを出力します。"},
                {"role": "user", "content": prompt}
            ]

            response = self.llm_client.generate_response_with_history(messages)

            # JSON抽出の堅牢化
            try:
                json_str = response
                match = re.search(r"\{[\s\S]*\}\s*$", response)
                if match:
                    json_str = match.group(0)
                result = json.loads(json_str)
            except Exception:
                result = json.loads(response)

            return TurnPackage(
                natural_reply=result.get("natural_reply", "どのようなお手伝いができますか？"),
                followups=result.get("followups", [])[:3],
                metadata={
                    "support_type": support_type,
                    "profile": profile,
                    "motivation_score": motivation_score,
                    "understanding_score": understanding_score,
                }
            )

        except Exception as e:
            logger.error(f"LLM応答生成エラー: {e}")
            return self._generate_mock_response(state, support_type, selected_acts)

    def _assess_motivation_and_understanding(
        self,
        user_message: str,
        state: StateSnapshot,
        history: List[Dict[str, Any]],
    ) -> Tuple[float, float]:
        """0.0〜1.0で動機づけ/理解度を推定（簡易ヒューリスティクス）。"""
        text = (user_message or "").strip()
        length = len(text)
        neg_words = ["わからない", "無理", "できない", "難しい", "むずかしい", "疲れた", "やめたい", "つらい"]
        neg_hits = sum(w in text for w in neg_words)

        # 動機づけ
        base = 0.6 if length >= 50 else 0.4 if length >= 15 else 0.25
        base -= 0.1 * min(2, neg_hits)
        try:
            interest = getattr(state.affect, 'interest', 0) or 0
            anxiety = getattr(state.affect, 'anxiety', 0) or 0
        except Exception:
            interest, anxiety = 0, 0
        base += (interest - 2) * 0.07
        base -= (anxiety - 2) * 0.07
        try:
            actions = getattr(state.progress_signal, 'actions_in_last_7_days', 0) or 0
        except Exception:
            actions = 0
        base += min(0.2, actions * 0.03)
        motivation = max(0.0, min(1.0, base))

        # 理解度
        vague_words = ["なんとなく", "よく", "多分", "たぶん", "とりあえず", "どうすれば"]
        vague_hits = sum(w in text for w in vague_words)
        understanding_base = 0.5 + (0.2 if length >= 80 else 0.1 if length >= 40 else -0.05)
        understanding_base -= 0.08 * min(2, vague_hits)
        understanding_base -= 0.08 * min(2, neg_hits)
        understanding = max(0.0, min(1.0, understanding_base))

        return motivation, understanding

    def _decide_response_profile(
        self,
        motivation: float,
        understanding: float,
        state: StateSnapshot,
        history: List[Dict[str, Any]],
        support_type: str,
    ) -> Dict[str, Any]:
        """応答の文量・スタイル・フォローアップ方針を決定。"""
        turns = len(history)
        try:
            actions = getattr(state.progress_signal, 'actions_in_last_7_days', 0) or 0
        except Exception:
            actions = 0

        if motivation < 0.35 or understanding < 0.35:
            target = 80
        elif motivation < 0.55 or understanding < 0.55:
            target = 160
        elif actions > 3 or turns > 6:
            target = 300
        else:
            target = 200

        style = {
            "normalize": motivation < 0.45,
            "socratic": True,
            "micro_task": motivation >= 0.4,
            "offer_choices": understanding < 0.5,
            "reflect": True,
        }

        return {
            "target_chars": target,
            "style": style,
        }

    def _build_guidelines(
        self,
        profile: Dict[str, Any],
        motivation: float,
        understanding: float,
        state: StateSnapshot,
    ) -> str:
        t = profile["target_chars"]
        style = profile["style"]
        if t <= 90:
            length_text = "60〜90文字"
        elif t <= 160:
            length_text = "120〜180文字"
        elif t <= 220:
            length_text = "180〜260文字"
        elif t <= 320:
            length_text = "240〜360文字"
        else:
            length_text = "300〜420文字"

        parts = [
            f"文量は{length_text}。",
            "専門用語は避け、短い文で。",
            "原則として質問は1〜2個までで負荷を上げない。",
            "段落は最大2つ。箇条書きは3点以内。",
        ]
        if style.get("normalize"):
            parts.append("最初に安心づけの一言（肯定・共感）を短く入れる。")
        if style.get("socratic"):
            parts.append("問いかけ中心で思考を前に進める。")
        if style.get("micro_task"):
            parts.append("次の一歩は5〜10分でできる極小タスクとして1つだけ提案。")
        if style.get("offer_choices"):
            parts.append("選択肢を2〜3個に限定し、どれか一つを選べば進める形にする。")
        if style.get("reflect"):
            parts.append("ユーザー発話の要点を1文で鏡写しにしてから続ける。")

        parts.append(
            "followups配列には、さらに軽い確認質問/選択肢/次の一歩のいずれかを3件、各15文字以内で。"
        )

        return "\n".join(parts)
    
    # <summary>LLMを使用して自然な応答を生成します（Phase 2で実装）。</summary>
    # <arg name="state">現在の状態スナップショット。</arg>
    # <arg name="support_type">選択された支援タイプ。</arg>
    # <arg name="selected_acts">選択された発話アクトリスト。</arg>
    # <arg name="user_message">ユーザーの入力メッセージ。</arg>
    # <returns>LLM生成応答パッケージ。</returns>
    def _generate_llm_response(
        self,
        state: StateSnapshot,
        support_type: str,
        selected_acts: List[str],
        user_message: str
    ) -> TurnPackage:
        
        # ユーザーの入力文字数に基づいて応答の長さを決定
        input_length = len(user_message)
        if input_length < 20:
            response_length_instruction = "簡潔に、およそ80文字程度で応答してください。"
        elif input_length < 100:
            response_length_instruction = "およそ200文字程度で応答してください。"
        else:
            response_length_instruction = "少し詳しめに、およそ400文字程度で応答してください。"

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
{response_length_instruction}

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
    
    # <summary>会話メトリクスを更新します。</summary>
    # <arg name="state">現在の状態スナップショット。</arg>
    # <arg name="support_type">選択された支援タイプ。</arg>
    # <arg name="selected_acts">選択された発話アクトリスト。</arg>
    def _update_metrics(
        self,
        state: StateSnapshot,
        support_type: str,
        selected_acts: List[str]
    ):
        
        # ターン数をインクリメント
        self.metrics.turns_count += 1
        
        # 前進感の推定（簡易版）
        if state.progress_signal.actions_in_last_7_days > 3:
            self.metrics.momentum_delta = 0.5
        elif state.progress_signal.looping_signals:
            self.metrics.momentum_delta = -0.2
        else:
            self.metrics.momentum_delta = 0.1
    
    # <summary>会話履歴を更新します。</summary>
    # <arg name="support_type">選択された支援タイプ。</arg>
    # <arg name="selected_acts">選択された発話アクトリスト。</arg>
    # <arg name="response_package">応答パッケージ。</arg>
    def _update_history(
        self,
        support_type: str,
        selected_acts: List[str],
        response_package: TurnPackage
    ):
        
        self.support_type_history.append(support_type)
        self.act_history.append(selected_acts)
        
        # 最大履歴数を制限
        if len(self.support_type_history) > 20:
            self.support_type_history = self.support_type_history[-20:]
        if len(self.act_history) > 20:
            self.act_history = self.act_history[-20:]
    
    # <summary>エラー時のフォールバック応答を生成します。</summary>
    # <arg name="error_message">エラーメッセージ。</arg>
    # <returns>フォールバック応答辞書。</returns>
    def _generate_fallback_response(self, error_message: str) -> Dict[str, Any]:
        
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
    
    # <summary>現在の会話セッションの要約を取得します。</summary>
    # <returns>会話要約辞書（total_turns, momentum_delta, support_types_used等）。</returns>
    def get_conversation_summary(self) -> Dict[str, Any]:
        
        return {
            "total_turns": self.metrics.turns_count,
            "momentum_delta": self.metrics.momentum_delta,
            "support_types_used": list(set(self.support_type_history)),
            "most_common_acts": self._get_most_common_acts(),
            "effectiveness": self._calculate_effectiveness()
        }
    
    # <summary>最も頻繁に使用された発話アクトのリストを取得します。</summary>
    # <returns>上位3つの発話アクトリスト。</returns>
    def _get_most_common_acts(self) -> List[str]:
        
        act_counts = {}
        for acts in self.act_history:
            for act in acts:
                act_counts[act] = act_counts.get(act, 0) + 1
        
        sorted_acts = sorted(act_counts.items(), key=lambda x: x[1], reverse=True)
        return [act for act, _ in sorted_acts[:3]]
    
    # <summary>会話の効果スコアを計算します（簡易版）。</summary>
    # <returns>効果スコア（0.0～1.0）。</returns>
    def _calculate_effectiveness(self) -> float:
        
        if self.metrics.turns_count == 0:
            return 0.5
        
        # 前進感と継続率から効果を推定
        effectiveness = 0.5 + self.metrics.momentum_delta * 0.3
        if self.metrics.turns_count > 3:
            effectiveness += 0.2  # 継続ボーナス
        
        return min(1.0, max(0.0, effectiveness))
