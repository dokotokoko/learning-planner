"""
学習状態から適切な支援タイプを判定するモジュール
"""

import json
import logging
from typing import Optional, Dict, Any, List
from .schema import StateSnapshot, SupportType

logger = logging.getLogger(__name__)

class SupportTyper:
    """状態スナップショットから適切な支援タイプを判定"""
    
    # 支援タイプ判定用プロンプトテンプレート
    SUPPORT_TYPE_PROMPT = """次の学習者の状態（StateSnapshot）を読み、最も適切な支援タイプを1つ選んでください。

候補:
- 理解深化: 概念や内容の理解を深める必要がある
- 道筋提示: 進め方や手順が分からない
- 視点転換: 新しい見方や切り口が必要
- 行動活性化: 具体的な行動を促す必要がある
- 絞り込み: 選択肢が多すぎて決められない
- 意思決定: 重要な決定を下す必要がある

判定基準:
- ループ兆候が強い → 視点転換 または 絞り込み
- 不確実性が核心 → 道筋提示 または 行動活性化
- 行動ゼロ＆不安高 → 行動活性化
- スコープ過大/選択肢過多 → 絞り込み または 意思決定
- ブロッカーが明確 → その解決に適した支援
- 興味は高いが進まない → 道筋提示 または 行動活性化

StateSnapshot:
{snapshot}

出力形式（JSON）:
{{"support_type": "選択した支援タイプ", "reason": "選択理由（1-2文）", "confidence": 0.0-1.0}}"""
    
    def __init__(self, llm_client=None):
        """
        Args:
            llm_client: LLMクライアント（既存のmodule.llm_apiを使用）
        """
        self.llm_client = llm_client
    
    def determine_support_type(
        self,
        state: StateSnapshot,
        history_context: Optional[str] = None,
        use_llm: bool = True
    ) -> tuple[str, str, float]:
        """
        状態から支援タイプを判定
        
        Args:
            state: 状態スナップショット
            history_context: 会話履歴の要約（オプション）
            use_llm: LLMを使用するか
            
        Returns:
            (support_type, reason, confidence): 支援タイプ、理由、確信度
        """
        
        if use_llm and self.llm_client:
            try:
                return self._determine_with_llm(state, history_context)
            except Exception as e:
                logger.warning(f"LLM判定エラー、ルールベース処理を使用: {e}")
                return self._determine_rule_based(state)
        else:
            return self._determine_rule_based(state)
    
    def _determine_with_llm(
        self,
        state: StateSnapshot,
        history_context: Optional[str] = None
    ) -> tuple[str, str, float]:
        """LLMを使用した支援タイプ判定"""
        
        # 状態をJSON形式に変換（プロジェクト情報は除く）
        state_dict = state.dict(exclude={'user_id', 'conversation_id', 'turn_index', 'project_context'})
        state_json = json.dumps(state_dict, ensure_ascii=False, indent=2)
        
        # プロンプト生成
        prompt = self.SUPPORT_TYPE_PROMPT.format(snapshot=state_json)
        
        # 履歴コンテキストがあれば追加
        if history_context:
            prompt += f"\n\n会話履歴の要約:\n{history_context}"
        
        # LLM呼び出し
        messages = [
            {"role": "system", "content": "あなたは学習支援の専門家です。"},
            {"role": "user", "content": prompt}
        ]
        
        response = self.llm_client.generate_response(messages)
        
        # JSON解析
        try:
            result = json.loads(response)
            support_type = result.get('support_type', SupportType.UNDERSTANDING)
            reason = result.get('reason', '状態分析に基づく判定')
            confidence = float(result.get('confidence', 0.7))
            
            # 有効な支援タイプかチェック
            if support_type not in SupportType.ALL_TYPES:
                logger.warning(f"無効な支援タイプ: {support_type}")
                support_type = SupportType.UNDERSTANDING
            
            return support_type, reason, confidence
            
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"LLM応答の解析エラー: {e}")
            raise
    
    def _determine_rule_based(self, state: StateSnapshot) -> tuple[str, str, float]:
        """ルールベースの支援タイプ判定"""
        
        # スコアリングシステム
        scores = {
            SupportType.UNDERSTANDING: 0,
            SupportType.PATHFINDING: 0,
            SupportType.REFRAMING: 0,
            SupportType.ACTIVATION: 0,
            SupportType.NARROWING: 0,
            SupportType.DECISION: 0
        }
        
        # ループシグナルのチェック
        if state.progress_signal.looping_signals:
            scores[SupportType.REFRAMING] += 3
            scores[SupportType.NARROWING] += 2
            reason = "ループ兆候が検出されたため"
        
        # 不確実性のチェック
        if len(state.uncertainties) > 2:
            scores[SupportType.PATHFINDING] += 3
            scores[SupportType.ACTIVATION] += 1
            reason = "複数の不確実性があるため"
        
        # 行動の少なさと不安のチェック
        if state.progress_signal.actions_in_last_7_days < 2 and state.affect.anxiety > 3:
            scores[SupportType.ACTIVATION] += 4
            reason = "行動が少なく不安が高いため"
        
        # スコープの広さのチェック
        if state.progress_signal.scope_breadth > 7:
            scores[SupportType.NARROWING] += 3
            scores[SupportType.DECISION] += 2
            reason = "スコープが広すぎるため"
        
        # 選択肢の多さのチェック
        if len(state.options_considered) > 3:
            scores[SupportType.DECISION] += 3
            scores[SupportType.NARROWING] += 2
            reason = "選択肢が多いため意思決定支援が必要"
        
        # ブロッカーのチェック
        if state.blockers:
            scores[SupportType.PATHFINDING] += 2
            scores[SupportType.REFRAMING] += 1
            reason = f"ブロッカー「{state.blockers[0]}」の解決が必要"
        
        # 興味が高いが進捗が少ない
        if state.affect.interest >= 4 and state.progress_signal.actions_in_last_7_days < 3:
            scores[SupportType.PATHFINDING] += 2
            scores[SupportType.ACTIVATION] += 2
            reason = "興味は高いが行動が少ないため"
        
        # デフォルトスコア（理解深化）
        if max(scores.values()) == 0:
            scores[SupportType.UNDERSTANDING] = 1
            reason = "基本的な理解を深めることから開始"
        
        # 最高スコアの支援タイプを選択
        support_type = max(scores, key=scores.get)
        
        # 確信度の計算（最高スコアと次点の差から）
        sorted_scores = sorted(scores.values(), reverse=True)
        if sorted_scores[0] > 0:
            confidence = min(0.9, 0.5 + (sorted_scores[0] - sorted_scores[1]) * 0.1)
        else:
            confidence = 0.5
        
        return support_type, reason, confidence
    
    def get_support_characteristics(self, support_type: str) -> Dict[str, Any]:
        """支援タイプの特性を取得"""
        
        characteristics = {
            SupportType.UNDERSTANDING: {
                "focus": "概念や知識の理解",
                "approach": "説明と例示",
                "typical_acts": ["Clarify", "Inform", "Reflect"],
                "outcome": "深い理解と気づき"
            },
            SupportType.PATHFINDING: {
                "focus": "進め方や手順の明確化",
                "approach": "ステップバイステップのガイド",
                "typical_acts": ["Outline", "Probe", "Inform"],
                "outcome": "明確な道筋"
            },
            SupportType.REFRAMING: {
                "focus": "新しい視点や切り口",
                "approach": "異なる角度からの問いかけ",
                "typical_acts": ["Reframe", "Probe", "Reflect"],
                "outcome": "視野の拡大と新しい可能性"
            },
            SupportType.ACTIVATION: {
                "focus": "具体的な行動の促進",
                "approach": "小さな一歩の提案",
                "typical_acts": ["Act", "Reflect", "Probe"],
                "outcome": "実際の行動と経験"
            },
            SupportType.NARROWING: {
                "focus": "選択肢の絞り込み",
                "approach": "優先順位付けと基準設定",
                "typical_acts": ["Decide", "Probe", "Clarify"],
                "outcome": "焦点の明確化"
            },
            SupportType.DECISION: {
                "focus": "意思決定の支援",
                "approach": "トレードオフの可視化",
                "typical_acts": ["Decide", "Outline", "Reflect"],
                "outcome": "明確な決定と次のステップ"
            }
        }
        
        return characteristics.get(support_type, characteristics[SupportType.UNDERSTANDING])
    
    def adjust_for_context(
        self,
        initial_type: str,
        recent_types: List[str],
        effectiveness_scores: Dict[str, float]
    ) -> str:
        """
        文脈に基づいて支援タイプを調整
        
        Args:
            initial_type: 初期判定された支援タイプ
            recent_types: 最近使用された支援タイプのリスト
            effectiveness_scores: 各支援タイプの効果スコア
            
        Returns:
            調整後の支援タイプ
        """
        
        # 同じタイプが連続している場合は変更を検討
        if recent_types and len(recent_types) >= 3:
            last_three = recent_types[-3:]
            if all(t == initial_type for t in last_three):
                # 効果が低い場合は別のタイプに変更
                if effectiveness_scores.get(initial_type, 0.5) < 0.4:
                    # 代替タイプを選択
                    alternatives = {
                        SupportType.UNDERSTANDING: SupportType.PATHFINDING,
                        SupportType.PATHFINDING: SupportType.ACTIVATION,
                        SupportType.REFRAMING: SupportType.ACTIVATION,
                        SupportType.ACTIVATION: SupportType.REFRAMING,
                        SupportType.NARROWING: SupportType.DECISION,
                        SupportType.DECISION: SupportType.ACTIVATION
                    }
                    return alternatives.get(initial_type, SupportType.REFRAMING)
        
        return initial_type