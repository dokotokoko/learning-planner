"""
プロジェクト計画思考モジュール
AIエージェントが探究学習プロジェクトに対して最適な計画・方針を思考する
"""

import json
import logging
import sys
import os
from typing import List, Dict, Optional, Any
from datetime import datetime
from .schema import StateSnapshot, ProjectPlan, NextAction, Milestone

# prompt.pyへのパスを追加
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from prompt.prompt import PLAN_GENERATION_PROMPT

logger = logging.getLogger(__name__)

class ProjectPlanner:
    """プロジェクト計画思考エンジン"""

    # <summary>ProjectPlannerクラスを初期化します。</summary>
    # <arg name="llm_client">LLMクライアント（既存のmodule.llm_apiを使用）。</arg>
    def __init__(self, llm_client=None):
        self.llm_client = llm_client
    
    # <summary>プロジェクト計画を生成します。</summary>
    # <arg name="state">学習者の状態。</arg>
    # <arg name="conversation_history">会話履歴。</arg>
    # <arg name="use_llm">LLMを使用するか。</arg>
    # <returns>生成されたプロジェクト計画。</returns>
    def generate_project_plan(
        self,
        state: StateSnapshot,
        conversation_history: List[Dict[str, str]],
        use_llm: bool = True
    ) -> ProjectPlan:
        
        if use_llm and self.llm_client:
            try:
                return self._generate_with_llm(state, conversation_history)
            except Exception as e:
                logger.warning(f"LLM計画生成エラー、ルールベース処理を使用: {e}")
                return self._generate_rule_based(state)
        else:
            return self._generate_rule_based(state)
    
    # <summary>LLMを使用して計画を生成します。</summary>
    # <arg name="state">学習者の状態。</arg>
    # <arg name="conversation_history">会話履歴。</arg>
    # <returns>生成されたプロジェクト計画。</returns>
    def _generate_with_llm(
        self,
        state: StateSnapshot,
        conversation_history: List[Dict[str, str]]
    ) -> ProjectPlan:
        
        # プロジェクト情報の抽出
        project_context = state.project_context or {}
        theme = project_context.get('theme', '未設定')
        question = project_context.get('question', '未設定')
        hypothesis = project_context.get('hypothesis', '未設定')
        
        # 会話履歴の要約生成
        conversation_summary = self._summarize_conversation(conversation_history)
        
        # プロンプト生成
        prompt = PLAN_GENERATION_PROMPT.format(
            goal=state.goal or theme,
            purpose=state.purpose or question,
            theme=theme,
            question=question,
            hypothesis=hypothesis,
            conversation_summary=conversation_summary
        )
        
        # LLM呼び出し
        messages = [
            {"role": "system", "content": "あなたは探究学習の専門家AIです。"},
            {"role": "user", "content": prompt}
        ]
        
        response = self.llm_client.generate_response_with_history(messages)
        
        # JSON解析と検証
        try:
            plan_dict = json.loads(response)
            return self._validate_and_create_plan(plan_dict)
            
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"LLM計画応答のJSON解析エラー: {e}")
            raise
    
    # <summary>ルールベースで計画を生成します（フォールバック用）。</summary>
    # <arg name="state">学習者の状態。</arg>
    # <returns>生成されたプロジェクト計画。</returns>
    def _generate_rule_based(self, state: StateSnapshot) -> ProjectPlan:
        
        project_context = state.project_context or {}
        theme = project_context.get('theme', '探究プロジェクト')
        question = project_context.get('question', '課題解決')
        goal = state.goal or theme
        
        # デフォルトの北極星
        north_star = f"{theme}の深い理解と実践的解決策の創出"
        
        # デフォルトマイルストーン
        milestones = [
            Milestone(
                title="問いの明確化",
                description="探究する問いを具体的で検証可能な形に洗練する",
                target_date="1-2週間以内",
                success_criteria=["明確な問いの設定", "仮説の立案"],
                order=1
            ),
            Milestone(
                title="調査・研究",
                description="既存研究や情報を収集し、理論的基盤を構築",
                target_date="3-4週間以内",
                success_criteria=["10件以上の信頼できる情報源", "研究レポート作成"],
                order=2
            ),
            Milestone(
                title="実験・検証",
                description="仮説を検証するための実験や調査を実施",
                target_date="5-8週間以内",
                success_criteria=["実験設計の完成", "データ収集の実施"],
                order=3
            ),
            Milestone(
                title="結果分析",
                description="収集データを分析し、結論を導出",
                target_date="9-10週間以内",
                success_criteria=["データ分析完了", "結論の明文化"],
                order=4
            ),
            Milestone(
                title="成果発表",
                description="研究成果をまとめ、他者に向けて発表",
                target_date="11-12週間以内",
                success_criteria=["発表資料完成", "効果的なプレゼンテーション"],
                order=5
            )
        ]
        
        # デフォルトの次の行動
        next_actions = [
            NextAction(
                action="探究する問いを1つの文章で明確に記述する",
                urgency=5,
                importance=5,
                reason="すべての探究活動の基盤となるため",
                expected_outcome="明確で検証可能な問いの設定"
            ),
            NextAction(
                action="関連する既存研究を3-5件調査する",
                urgency=4,
                importance=4,
                reason="先行研究を知ることで質の高い探究になるため",
                expected_outcome="研究の位置づけと独自性の明確化"
            ),
            NextAction(
                action="仮説を立て、検証方法を考える",
                urgency=3,
                importance=5,
                reason="探究の方向性と方法を決めるため",
                expected_outcome="具体的な仮説と検証計画"
            )
        ]
        
        # 緊急度×重要度でソート
        next_actions.sort(key=lambda x: x.urgency * x.importance, reverse=True)
        
        return ProjectPlan(
            north_star=north_star,
            north_star_metric="探究の深さと解決策の実用性を5段階で評価",
            milestones=milestones,
            next_actions=next_actions,
            strategic_approach="段階的で体系的な探究アプローチ",
            risk_factors=["時間不足", "情報不足", "検証方法の不適切さ"],
            created_at=datetime.now().isoformat(),
            confidence=0.6
        )
    
    # <summary>計画データを検証しProjectPlanオブジェクトを作成します。</summary>
    # <arg name="plan_dict">計画データの辞書。</arg>
    # <returns>検証済みのProjectPlanオブジェクト。</returns>
    def _validate_and_create_plan(self, plan_dict: Dict[str, Any]) -> ProjectPlan:
        
        # 必須フィールドの確認
        required_fields = ['north_star', 'north_star_metric', 'milestones', 'next_actions', 'strategic_approach']
        for field in required_fields:
            if field not in plan_dict:
                raise ValueError(f"必須フィールド '{field}' が不足しています")
        
        # マイルストーンの変換
        milestones = []
        for i, milestone_dict in enumerate(plan_dict['milestones']):
            milestone = Milestone(
                title=milestone_dict.get('title', f'マイルストーン{i+1}'),
                description=milestone_dict.get('description', ''),
                target_date=milestone_dict.get('target_date'),
                success_criteria=milestone_dict.get('success_criteria', []),
                order=milestone_dict.get('order', i+1)
            )
            milestones.append(milestone)
        
        # 次の行動の変換とソート
        next_actions = []
        for action_dict in plan_dict['next_actions']:
            action = NextAction(
                action=action_dict.get('action', ''),
                urgency=max(1, min(5, action_dict.get('urgency', 3))),
                importance=max(1, min(5, action_dict.get('importance', 3))),
                reason=action_dict.get('reason', ''),
                expected_outcome=action_dict.get('expected_outcome', '')
            )
            next_actions.append(action)
        
        # 緊急度×重要度でソート
        next_actions.sort(key=lambda x: x.urgency * x.importance, reverse=True)
        
        return ProjectPlan(
            north_star=plan_dict['north_star'],
            north_star_metric=plan_dict['north_star_metric'],
            milestones=milestones,
            next_actions=next_actions[:5],  # 最大5個に制限
            strategic_approach=plan_dict['strategic_approach'],
            risk_factors=plan_dict.get('risk_factors', []),
            created_at=datetime.now().isoformat(),
            confidence=0.8
        )
    
    # <summary>会話履歴を要約します。</summary>
    # <arg name="conversation_history">会話履歴のリスト。</arg>
    # <returns>要約された会話履歴の文字列。</returns>
    def _summarize_conversation(self, conversation_history: List[Dict[str, str]]) -> str:
        
        if not conversation_history:
            return "会話履歴なし"
        
        # 最新5件のメッセージから要約を作成
        recent_messages = conversation_history[-5:]
        summary_lines = []
        
        for msg in recent_messages:
            sender = "生徒" if msg.get('sender') == 'user' else "AI"
            message = msg.get('message', '')[:100]  # 100文字に制限
            summary_lines.append(f"{sender}: {message}")
        
        return "\n".join(summary_lines)
    
    # <summary>フィードバックに基づいて計画を更新します。</summary>
    # <arg name="original_plan">元のプロジェクト計画。</arg>
    # <arg name="feedback">フィードバック文字列。</arg>
    # <arg name="conversation_history">会話履歴。</arg>
    # <returns>更新されたプロジェクト計画。</returns>
    def update_plan_based_on_feedback(
        self,
        original_plan: ProjectPlan,
        feedback: str,
        conversation_history: List[Dict[str, str]]
    ) -> ProjectPlan:
        
        # TODO: Phase 2で実装 - フィードバックに基づく計画の動的更新
        logger.info(f"計画更新要求: {feedback}")
        
        # 現在は元の計画をそのまま返す
        return original_plan
    
    # <summary>計画の質を評価します。</summary>
    # <arg name="plan">評価するプロジェクト計画。</arg>
    # <arg name="state">学習者の状態。</arg>
    # <returns>計画の質スコア（0.0-1.0）。</returns>
    def calculate_plan_score(self, plan: ProjectPlan, state: StateSnapshot) -> float:
        
        score = 0.0
        
        # 北極星の具体性評価
        if plan.north_star and len(plan.north_star) > 10:
            score += 0.2
        
        # マイルストーン数の適切性
        if 3 <= len(plan.milestones) <= 5:
            score += 0.2
        
        # 次の行動の優先順位付け
        if plan.next_actions and all(action.urgency * action.importance >= 6 for action in plan.next_actions[:3]):
            score += 0.2
        
        # 戦略的アプローチの明確性
        if plan.strategic_approach and len(plan.strategic_approach) > 20:
            score += 0.2
        
        # プロジェクト情報との整合性
        if state.project_context:
            theme = state.project_context.get('theme', '')
            if theme and theme.lower() in plan.north_star.lower():
                score += 0.2
        
        return min(1.0, score)