"""
学習状態から適切な支援タイプを判定するモジュール
"""

import json
import logging
import sys
import os
from typing import Optional, Dict, Any, List
from .schema import StateSnapshot, SupportType

# prompt.pyへのパスを追加
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from prompt.prompt import SUPPORT_TYPE_PROMPT

logger = logging.getLogger(__name__)

class SupportTyper:
    """状態スナップショットから適切な支援タイプを判定"""
    
    # <summary>支援タイプ判定器を初期化します。</summary>
    # <arg name="llm_client">LLMクライアント（既存のmodule.llm_apiを使用）。</arg>
    def __init__(self, llm_client=None):
        self.llm_client = llm_client
    
    # <summary>状態から支援タイプを判定します。</summary>
    # <arg name="state">状態スナップショット。</param> 
    # <arg name="history_context">会話履歴の要約（任意）。</param> 
    # <arg name="use_llm">LLMを使用するか。</param> 
    # <returns>(support_type, reason, confidence)。支援タイプ、理由、確信度</returns>
    def determine_support_type(
        self,
        state: StateSnapshot,
        history_context: Optional[str] = None,
        use_llm: bool = True
    ) -> tuple[str, str, float]:
        
        if use_llm and self.llm_client:
            try:
                return self._determine_with_llm(state, history_context)
            except Exception as e:
                logger.warning(f"LLM判定エラー、ルールベース処理を使用: {e}")
                return self._determine_rule_based(state)
        else:
            return self._determine_rule_based(state)
    
    # <summary>LLMを使用して支援タイプを判定します。</summary>
    # <arg name="state">状態スナップショット。</arg>
    # <arg name="history_context">会話履歴の要約（任意）。</arg>
    # <returns>(support_type, reason, confidence)。支援タイプ、理由、確信度。</returns>
    def _determine_with_llm(
        self,
        state: StateSnapshot,
        history_context: Optional[str] = None
    ) -> tuple[str, str, float]:
        
        # 状態をJSON形式に変換（プロジェクト情報は除く）
        state_dict = state.dict(exclude={'user_id', 'conversation_id', 'turn_index', 'project_context'})
        state_json = json.dumps(state_dict, ensure_ascii=False, indent=2)
        
        # プロンプト生成
        prompt = SUPPORT_TYPE_PROMPT.format(snapshot=state_json)
        
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
    
    # <summary>ルールベースで支援タイプを判定します。</summary>
    # <arg name="state">状態スナップショット。</arg>
    # <returns>(support_type, reason, confidence)。支援タイプ、理由、確信度。</returns>
    def _determine_rule_based(self, state: StateSnapshot) -> tuple[str, str, float]:
        
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
    
    # <summary>支援タイプの特性情報を取得します。</summary>
    # <arg name="support_type">支援タイプ。</arg>
    # <returns>支援タイプの特性辞書（focus, approach, typical_acts, outcome）。</returns>
    def get_support_characteristics(self, support_type: str) -> Dict[str, Any]:
        
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