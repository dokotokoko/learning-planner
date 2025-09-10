"""
発話アクト選択のポリシーエンジン
支援タイプと状態に基づいて最適な発話アクトを選択
"""

import logging
import random
from typing import List, Dict, Optional, Any, Tuple
from .schema import StateSnapshot, SupportType, SpeechAct

logger = logging.getLogger(__name__)

class PolicyEngine:
    """発話アクト選択のポリシーエンジン"""
    
    # 支援タイプごとの基本的なアクトマッピング
    DEFAULT_ACT_MAPPING = {
        SupportType.UNDERSTANDING: {
            "primary": [SpeechAct.CLARIFY, SpeechAct.REFLECT],
            "secondary": [SpeechAct.INFORM, SpeechAct.PROBE],
            "weights": {"Clarify": 0.4, "Reflect": 0.3, "Inform": 0.2, "Probe": 0.1}
        },
        SupportType.PATHFINDING: {
            "primary": [SpeechAct.OUTLINE, SpeechAct.PROBE],
            "secondary": [SpeechAct.INFORM, SpeechAct.CLARIFY],
            "weights": {"Outline": 0.4, "Probe": 0.3, "Inform": 0.2, "Clarify": 0.1}
        },
        SupportType.REFRAMING: {
            "primary": [SpeechAct.REFRAME, SpeechAct.PROBE],
            "secondary": [SpeechAct.REFLECT, SpeechAct.CLARIFY],
            "weights": {"Reframe": 0.4, "Probe": 0.3, "Reflect": 0.2, "Clarify": 0.1}
        },
        SupportType.ACTIVATION: {
            "primary": [SpeechAct.ACT, SpeechAct.REFLECT],
            "secondary": [SpeechAct.PROBE, SpeechAct.OUTLINE],
            "weights": {"Act": 0.5, "Reflect": 0.2, "Probe": 0.2, "Outline": 0.1}
        },
        SupportType.NARROWING: {
            "primary": [SpeechAct.DECIDE, SpeechAct.PROBE],
            "secondary": [SpeechAct.CLARIFY, SpeechAct.REFLECT],
            "weights": {"Decide": 0.4, "Probe": 0.3, "Clarify": 0.2, "Reflect": 0.1}
        },
        SupportType.DECISION: {
            "primary": [SpeechAct.DECIDE, SpeechAct.OUTLINE],
            "secondary": [SpeechAct.REFLECT, SpeechAct.PROBE],
            "weights": {"Decide": 0.4, "Outline": 0.3, "Reflect": 0.2, "Probe": 0.1}
        }
    }
    
    def __init__(self):
        """ポリシーエンジンの初期化"""
        self.act_history: List[str] = []
        self.effectiveness_cache: Dict[str, float] = {}
    
    def select_acts(
        self,
        state: StateSnapshot,
        support_type: str,
        history_hint: Optional[str] = None,
        max_acts: int = 2
    ) -> Tuple[List[str], str]:
        """
        状態と支援タイプから発話アクトを選択
        
        Args:
            state: 状態スナップショット
            support_type: 選択された支援タイプ
            history_hint: 会話履歴のヒント
            max_acts: 最大アクト数（1-2）
            
        Returns:
            (selected_acts, reason): 選択されたアクトと理由
        """
        
        # 基本的なアクト候補を取得
        act_config = self.DEFAULT_ACT_MAPPING.get(
            support_type,
            self.DEFAULT_ACT_MAPPING[SupportType.UNDERSTANDING]
        )
        
        # 状態に基づく調整
        selected_acts = self._adjust_acts_for_state(state, support_type, act_config)
        
        # 履歴に基づく調整
        selected_acts = self._adjust_for_history(selected_acts)
        
        # 最大数に制限
        selected_acts = selected_acts[:max_acts]
        
        # 選択理由の生成
        reason = self._generate_selection_reason(state, support_type, selected_acts)
        
        # 履歴に追加
        self.act_history.extend(selected_acts)
        
        return selected_acts, reason
    
    def _adjust_acts_for_state(
        self,
        state: StateSnapshot,
        support_type: str,
        act_config: Dict[str, Any]
    ) -> List[str]:
        """状態に基づいてアクトを調整"""
        
        acts = []
        
        # 緊急度の評価
        urgency = self._evaluate_urgency(state)
        
        # 感情状態の考慮
        if state.affect.anxiety > 3:
            # 不安が高い場合は安心感を与えるアクトを優先
            if SpeechAct.REFLECT not in acts:
                acts.append(SpeechAct.REFLECT)
            if urgency < 0.7 and SpeechAct.CLARIFY not in acts:
                acts.append(SpeechAct.CLARIFY)
        
        # 興奮度が高い場合
        if state.affect.excitement > 3:
            # 行動に繋げやすいアクトを選択
            if support_type == SupportType.ACTIVATION:
                acts.append(SpeechAct.ACT)
            else:
                acts.append(act_config["primary"][0])
        
        # ループシグナルがある場合
        if state.progress_signal.looping_signals:
            # 視点転換を優先
            if SpeechAct.REFRAME not in acts:
                acts.append(SpeechAct.REFRAME)
            elif SpeechAct.PROBE not in acts:
                acts.append(SpeechAct.PROBE)
        
        # 行動が少ない場合
        if state.progress_signal.actions_in_last_7_days < 2:
            # 具体的な行動提案を含める
            if SpeechAct.ACT not in acts and len(acts) < 2:
                acts.append(SpeechAct.ACT)
        
        # デフォルトアクトの追加
        if not acts:
            acts = act_config["primary"][:2]
        
        # 重複除去
        seen = set()
        unique_acts = []
        for act in acts:
            if act not in seen:
                seen.add(act)
                unique_acts.append(act)
        
        return unique_acts
    
    def _adjust_for_history(self, selected_acts: List[str]) -> List[str]:
        """履歴に基づいてアクトを調整（同じアクトの連続を避ける）"""
        
        if len(self.act_history) < 3:
            return selected_acts
        
        # 直近3回のアクトを確認
        recent_acts = self.act_history[-3:]
        
        adjusted_acts = []
        for act in selected_acts:
            # 同じアクトが3回連続している場合は別のアクトに変更
            if recent_acts.count(act) >= 2:
                # 代替アクトを選択
                alternative = self._get_alternative_act(act)
                adjusted_acts.append(alternative)
            else:
                adjusted_acts.append(act)
        
        return adjusted_acts
    
    def _get_alternative_act(self, act: str) -> str:
        """代替アクトを取得"""
        
        alternatives = {
            SpeechAct.CLARIFY: SpeechAct.PROBE,
            SpeechAct.INFORM: SpeechAct.REFLECT,
            SpeechAct.PROBE: SpeechAct.CLARIFY,
            SpeechAct.ACT: SpeechAct.OUTLINE,
            SpeechAct.REFRAME: SpeechAct.PROBE,
            SpeechAct.OUTLINE: SpeechAct.ACT,
            SpeechAct.DECIDE: SpeechAct.PROBE,
            SpeechAct.REFLECT: SpeechAct.CLARIFY
        }
        
        return alternatives.get(act, SpeechAct.PROBE)
    
    def _evaluate_urgency(self, state: StateSnapshot) -> float:
        """緊急度の評価（0.0-1.0）"""
        
        urgency = 0.0
        
        # 時間軸による緊急度
        if state.time_horizon == "今日":
            urgency += 0.4
        elif state.time_horizon == "今週":
            urgency += 0.2
        
        # ブロッカーの数
        urgency += min(0.3, len(state.blockers) * 0.1)
        
        # 不安度
        urgency += state.affect.anxiety * 0.1
        
        return min(1.0, urgency)
    
    def _generate_selection_reason(
        self,
        state: StateSnapshot,
        support_type: str,
        selected_acts: List[str]
    ) -> str:
        """アクト選択の理由を生成"""
        
        reasons = []
        
        # 支援タイプに基づく理由
        type_reasons = {
            SupportType.UNDERSTANDING: "理解を深めるため",
            SupportType.PATHFINDING: "道筋を明確にするため",
            SupportType.REFRAMING: "新しい視点を提供するため",
            SupportType.ACTIVATION: "具体的な行動を促すため",
            SupportType.NARROWING: "選択肢を絞り込むため",
            SupportType.DECISION: "意思決定を支援するため"
        }
        reasons.append(type_reasons.get(support_type, "学習を支援するため"))
        
        # アクトごとの理由
        for act in selected_acts:
            if act == SpeechAct.ACT:
                reasons.append("実践的な一歩を提案")
            elif act == SpeechAct.REFRAME:
                reasons.append("視点の転換を促す")
            elif act == SpeechAct.PROBE:
                reasons.append("核心的な問いを投げかける")
        
        return "、".join(reasons[:2])
    
    def update_effectiveness(self, act: str, effectiveness: float):
        """アクトの効果を更新"""
        
        if act not in self.effectiveness_cache:
            self.effectiveness_cache[act] = effectiveness
        else:
            # 移動平均で更新
            self.effectiveness_cache[act] = (
                self.effectiveness_cache[act] * 0.7 + effectiveness * 0.3
            )
    
    def get_act_description(self, act: str) -> Dict[str, str]:
        """アクトの説明を取得"""
        
        descriptions = {
            SpeechAct.CLARIFY: {
                "name": "明確化",
                "purpose": "理解を深める質問",
                "example": "それは具体的にどういうことですか？"
            },
            SpeechAct.INFORM: {
                "name": "情報提供",
                "purpose": "適切な情報や知識の提供",
                "example": "この分野では〜という考え方があります"
            },
            SpeechAct.PROBE: {
                "name": "探究",
                "purpose": "深い思考を促す問い",
                "example": "なぜそれが重要だと思いますか？"
            },
            SpeechAct.ACT: {
                "name": "行動提案",
                "purpose": "具体的な実践タスクの提案",
                "example": "まずは30分で〜を試してみましょう"
            },
            SpeechAct.REFRAME: {
                "name": "視点転換",
                "purpose": "新しい見方や切り口の提示",
                "example": "別の角度から見ると〜"
            },
            SpeechAct.OUTLINE: {
                "name": "構造化",
                "purpose": "道筋や手順の整理",
                "example": "これを3つのステップに分けると〜"
            },
            SpeechAct.DECIDE: {
                "name": "意思決定",
                "purpose": "選択や決定の支援",
                "example": "基準を明確にして選びましょう"
            },
            SpeechAct.REFLECT: {
                "name": "振り返り",
                "purpose": "内容の要約や整理",
                "example": "ここまでの話をまとめると〜"
            }
        }
        
        return descriptions.get(act, {
            "name": "不明",
            "purpose": "不明",
            "example": ""
        })
    
    # <summary>Socratic（ソクラテス式）優先順位でアクトを並び替えます。</summary>
    # <arg name="acts">アクトのリスト。</arg>
    # <returns>優先順位でソートされたアクトのリスト。</returns>
    def get_socratic_priority(self, acts: List[str]) -> List[str]:
        
        # Socratic優先度（高い順）
        socratic_order = [
            SpeechAct.CLARIFY,
            SpeechAct.REFLECT,
            SpeechAct.PROBE,
            SpeechAct.REFRAME,
            SpeechAct.OUTLINE,
            SpeechAct.DECIDE,
            SpeechAct.INFORM,
            SpeechAct.ACT
        ]
        
        # 優先度に基づいてソート
        return sorted(acts, key=lambda x: socratic_order.index(x) if x in socratic_order else 999)