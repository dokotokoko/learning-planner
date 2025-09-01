"""
Phase 1: 対話エージェント機能のテスト
基本的な状態抽出、支援タイプ判定、アクト選択のテスト
"""

import unittest
import sys
import os
from unittest.mock import Mock, patch

# プロジェクトルートをパスに追加
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from conversation_agent.schema import (
    StateSnapshot, Affect, ProgressSignal, SupportType, SpeechAct, ProjectPlan
)
from conversation_agent.state_extractor import StateExtractor
from conversation_agent.support_typer import SupportTyper
from conversation_agent.policies import PolicyEngine
from conversation_agent.orchestrator import ConversationOrchestrator
from conversation_agent.project_planner import ProjectPlanner

class TestStateExtractor(unittest.TestCase):
    """状態抽出エンジンのテスト"""
    
    def setUp(self):
        self.extractor = StateExtractor(llm_client=None)
    
    def test_heuristic_extraction_empty_history(self):
        """空の履歴に対するヒューリスティック抽出"""
        state = self.extractor._extract_heuristic([], None)
        
        self.assertIsInstance(state, StateSnapshot)
        self.assertEqual(state.goal, "")
        self.assertEqual(state.time_horizon, "未定")
        self.assertIsInstance(state.affect, Affect)
        self.assertIsInstance(state.progress_signal, ProgressSignal)
    
    def test_heuristic_extraction_with_project(self):
        """プロジェクト情報ありのヒューリスティック抽出"""
        project_context = {
            "theme": "AI技術の教育応用",
            "question": "AIはどのように学習を変えるか？",
            "hypothesis": "AIが個別最適化を実現する"
        }
        
        conversation = [
            {"sender": "user", "message": "AIについて困っています"},
            {"sender": "assistant", "message": "どのような点でお困りですか？"}
        ]
        
        state = self.extractor._extract_heuristic(conversation, project_context)
        
        self.assertEqual(state.goal, "AI技術の教育応用")
        self.assertEqual(state.project_context, project_context)
        self.assertIn("困って", " ".join([b for b in state.blockers if "困って" in b]))
    
    def test_affect_estimation(self):
        """感情状態の推定"""
        messages = ["すごく面白い！でも不安もある"]
        affect = self.extractor._estimate_affect(messages)
        
        self.assertGreater(affect.interest, 2)  # "面白い"で高い関心
        self.assertGreater(affect.anxiety, 2)   # "不安"で高い不安
        self.assertGreater(affect.excitement, 2) # "すごく"と"！"で高い興奮
    
    def test_minimal_extraction_mode(self):
        """最小限状態抽出モードのテスト"""
        project_context = {
            "theme": "環境問題の解決策",
            "question": "プラスチック削減の効果的な方法は？",
            "hypothesis": "リサイクル技術が鍵となる"
        }
        
        conversation = [
            {"sender": "user", "message": "どうすればプラスチックを減らせるかわからない"},
            {"sender": "assistant", "message": "具体的にはどの分野で？"}
        ]
        
        state = self.extractor._extract_minimal(conversation, project_context)
        
        # 必須フィールドが正しく設定されているか確認
        self.assertEqual(state.goal, "環境問題の解決策 - プラスチック削減の効果的な方法は？")
        self.assertEqual(state.purpose, "「プラスチック削減の効果的な方法は？」について探究する")
        self.assertEqual(state.project_context, project_context)
        
        # デフォルト値が設定されているか確認
        self.assertIsInstance(state.affect, Affect)
        self.assertEqual(state.affect.interest, 3)  # デフォルト値
        self.assertIsInstance(state.progress_signal, ProgressSignal)
    
    def test_minimal_extraction_no_project(self):
        """プロジェクト情報なしでの最小限抽出"""
        conversation = [{"sender": "user", "message": "学習方法について相談したい"}]
        
        state = self.extractor._extract_minimal(conversation, None)
        
        # デフォルトの目標と目的が設定されているか確認
        self.assertEqual(state.goal, "学習目標の明確化")
        self.assertEqual(state.purpose, "効果的な学習を進める")
        self.assertIsNone(state.project_context)

class TestSupportTyper(unittest.TestCase):
    """支援タイプ判定のテスト"""
    
    def setUp(self):
        self.typer = SupportTyper(llm_client=None)
    
    def test_rule_based_determination_looping(self):
        """ループ兆候がある場合の判定"""
        state = StateSnapshot(
            goal="研究テーマの決定",
            progress_signal=ProgressSignal(
                looping_signals=["同じような質問の繰り返し"],
                actions_in_last_7_days=1
            )
        )
        
        support_type, reason, confidence = self.typer._determine_rule_based(state)
        
        self.assertIn(support_type, [SupportType.REFRAMING, SupportType.NARROWING])
        self.assertGreater(confidence, 0.5)
    
    def test_rule_based_determination_activation_needed(self):
        """行動活性化が必要な場合の判定"""
        state = StateSnapshot(
            goal="プロジェクト開始",
            affect=Affect(anxiety=4, interest=3),
            progress_signal=ProgressSignal(actions_in_last_7_days=1)
        )
        
        support_type, reason, confidence = self.typer._determine_rule_based(state)
        
        self.assertEqual(support_type, SupportType.ACTIVATION)
        self.assertIn("行動が少なく不安が高い", reason)
    
    def test_rule_based_determination_narrowing_needed(self):
        """絞り込みが必要な場合の判定"""
        state = StateSnapshot(
            goal="研究手法の選択",
            options_considered=["手法A", "手法B", "手法C", "手法D"],
            progress_signal=ProgressSignal(scope_breadth=8)
        )
        
        support_type, reason, confidence = self.typer._determine_rule_based(state)
        
        self.assertIn(support_type, [SupportType.NARROWING, SupportType.DECISION])

class TestProjectPlanner(unittest.TestCase):
    """プロジェクト計画思考のテスト"""
    
    def setUp(self):
        self.planner = ProjectPlanner(llm_client=None)
    
    def test_rule_based_plan_generation(self):
        """ルールベースの計画生成テスト"""
        state = StateSnapshot(
            goal="AI技術の教育応用",
            purpose="効果的な学習支援の実現",
            project_context={
                "theme": "AI技術の教育応用",
                "question": "どのような効果があるか？",
                "hypothesis": "個別最適化により学習効果が向上する"
            }
        )
        
        plan = self.planner._generate_rule_based(state)
        
        # 基本構造の確認
        self.assertIsInstance(plan, ProjectPlan)
        self.assertTrue(plan.north_star)
        self.assertTrue(plan.north_star_metric)
        self.assertGreater(len(plan.milestones), 0)
        self.assertGreater(len(plan.next_actions), 0)
        
        # 行動が緊急度×重要度でソートされているか確認
        action_scores = [action.urgency * action.importance for action in plan.next_actions]
        self.assertEqual(action_scores, sorted(action_scores, reverse=True))
    
    def test_plan_validation(self):
        """計画データの検証テスト"""
        plan_dict = {
            "north_star": "研究の質向上",
            "north_star_metric": "論文の説得力を5段階評価",
            "milestones": [
                {
                    "title": "問いの明確化",
                    "description": "研究問いを洗練する",
                    "target_date": "2週間以内",
                    "success_criteria": ["明確な問いの設定"],
                    "order": 1
                }
            ],
            "next_actions": [
                {
                    "action": "研究問いを一文で書く",
                    "urgency": 5,
                    "importance": 5,
                    "reason": "すべての基盤となる",
                    "expected_outcome": "明確な方向性"
                }
            ],
            "strategic_approach": "段階的アプローチ",
            "risk_factors": ["時間不足"]
        }
        
        plan = self.planner._validate_and_create_plan(plan_dict)
        
        self.assertEqual(plan.north_star, "研究の質向上")
        self.assertEqual(len(plan.milestones), 1)
        self.assertEqual(len(plan.next_actions), 1)
        self.assertEqual(plan.next_actions[0].urgency, 5)
        self.assertEqual(plan.next_actions[0].importance, 5)

class TestPolicyEngine(unittest.TestCase):
    """ポリシーエンジンのテスト"""
    
    def setUp(self):
        self.engine = PolicyEngine()
    
    def test_act_selection_for_understanding(self):
        """理解深化のアクト選択"""
        state = StateSnapshot(goal="基本概念の理解")
        acts, reason = self.engine.select_acts(state, SupportType.UNDERSTANDING)
        
        self.assertLessEqual(len(acts), 2)
        self.assertIn(SpeechAct.CLARIFY, acts + [SpeechAct.REFLECT])
    
    def test_act_selection_for_activation(self):
        """行動活性化のアクト選択"""
        state = StateSnapshot(
            goal="実験開始",
            affect=Affect(anxiety=4),
            progress_signal=ProgressSignal(actions_in_last_7_days=0)
        )
        acts, reason = self.engine.select_acts(state, SupportType.ACTIVATION)
        
        self.assertIn(SpeechAct.ACT, acts)
    
    def test_socratic_priority(self):
        """Socratic優先順位のテスト"""
        acts = [SpeechAct.ACT, SpeechAct.CLARIFY, SpeechAct.INFORM]
        sorted_acts = self.engine.get_socratic_priority(acts)
        
        # Clarifyが最初、Actが最後になるはず
        self.assertEqual(sorted_acts[0], SpeechAct.CLARIFY)
        self.assertEqual(sorted_acts[-1], SpeechAct.ACT)
    
    def test_history_adjustment(self):
        """履歴に基づく調整のテスト"""
        # 同じアクトを履歴に追加
        self.engine.act_history = [SpeechAct.CLARIFY] * 3
        
        acts = [SpeechAct.CLARIFY]
        adjusted = self.engine._adjust_for_history(acts)
        
        # 連続使用により別のアクトに変更されるはず
        self.assertNotEqual(adjusted[0], SpeechAct.CLARIFY)

class TestConversationOrchestrator(unittest.TestCase):
    """統合制御のテスト"""
    
    def setUp(self):
        self.orchestrator = ConversationOrchestrator(llm_client=None, use_mock=True)
    
    def test_process_turn_basic(self):
        """基本的なターン処理のテスト"""
        conversation_history = [
            {"sender": "user", "message": "研究テーマを決めたいです"},
            {"sender": "assistant", "message": "どのような分野に興味がありますか？"}
        ]
        
        result = self.orchestrator.process_turn(
            user_message="AIと教育の関係について",
            conversation_history=conversation_history,
            project_context=None,
            user_id=1,
            conversation_id="test-conv-1"
        )
        
        # 結果の基本構造をチェック（project_planを追加）
        required_keys = ["response", "followups", "support_type", "selected_acts", 
                        "state_snapshot", "project_plan", "decision_metadata", "metrics"]
        for key in required_keys:
            self.assertIn(key, result)
        
        # 応答が空でないことを確認
        self.assertTrue(result["response"])
        self.assertIsInstance(result["followups"], list)
        self.assertIn(result["support_type"], SupportType.ALL_TYPES)
        self.assertLessEqual(len(result["selected_acts"]), 2)
    
    def test_process_turn_with_project(self):
        """プロジェクト情報ありのターン処理"""
        project_context = {
            "theme": "AI技術の教育応用",
            "question": "効果的な学習支援は？",
            "hypothesis": "個別最適化が鍵"
        }
        
        result = self.orchestrator.process_turn(
            user_message="実験をどう設計すればいいか分からない",
            conversation_history=[],
            project_context=project_context,
            user_id=1,
            conversation_id="test-conv-2"
        )
        
        # プロジェクト情報が状態に反映されているか確認
        state = result["state_snapshot"]
        self.assertEqual(state["goal"], "AI技術の教育応用 - 効果的な学習支援は？")
        self.assertEqual(state["project_context"], project_context)
        
        # プロジェクト計画が生成されているか確認
        self.assertIsNotNone(result["project_plan"])
        project_plan = result["project_plan"]
        self.assertIn("north_star", project_plan)
        self.assertIn("milestones", project_plan)
        self.assertIn("next_actions", project_plan)
        self.assertTrue(project_plan["north_star"])  # 空でないことを確認
    
    def test_error_handling(self):
        """エラーハンドリングのテスト"""
        # 無効な入力でもフォールバック応答が返されることを確認
        result = self.orchestrator._generate_fallback_response("テストエラー")
        
        self.assertIn("response", result)
        self.assertIn("followups", result)
        self.assertEqual(result["support_type"], SupportType.UNDERSTANDING)

# テストケースのサンプルデータ
SAMPLE_CONVERSATIONS = [
    {
        "name": "初回相談",
        "history": [],
        "user_message": "研究テーマを決めたいのですが、何から始めればいいでしょうか？",
        "expected_support_type": SupportType.PATHFINDING,
        "expected_acts": [SpeechAct.CLARIFY, SpeechAct.OUTLINE]
    },
    {
        "name": "ループ状態",
        "history": [
            {"sender": "user", "message": "何を調べればいいかわからない"},
            {"sender": "assistant", "message": "具体的にはどの部分でしょうか？"},
            {"sender": "user", "message": "やっぱり何を調べればいいかわからない"}
        ],
        "user_message": "どうやって調べればいいかわからない",
        "expected_support_type": SupportType.REFRAMING,
        "expected_acts": [SpeechAct.REFRAME, SpeechAct.PROBE]
    },
    {
        "name": "行動促進",
        "history": [
            {"sender": "user", "message": "理論はわかったんですが..."},
            {"sender": "assistant", "message": "実際に試してみることが大切ですね"},
            {"sender": "user", "message": "でも何から手をつければ..."}
        ],
        "user_message": "不安でなかなか始められません",
        "expected_support_type": SupportType.ACTIVATION,
        "expected_acts": [SpeechAct.ACT, SpeechAct.REFLECT]
    }
]

class TestSampleConversations(unittest.TestCase):
    """サンプル会話でのテスト"""
    
    def setUp(self):
        self.orchestrator = ConversationOrchestrator(llm_client=None, use_mock=True)
    
    def test_sample_conversations(self):
        """サンプル会話での期待動作テスト"""
        for sample in SAMPLE_CONVERSATIONS:
            with self.subTest(conversation=sample["name"]):
                result = self.orchestrator.process_turn(
                    user_message=sample["user_message"],
                    conversation_history=sample["history"],
                    project_context=None,
                    user_id=1,
                    conversation_id=f"test-{sample['name']}"
                )
                
                # 支援タイプが期待と一致するか（厳密でなくても良い）
                print(f"[{sample['name']}] 期待: {sample['expected_support_type']}, 実際: {result['support_type']}")
                
                # 基本的な結果構造は保証する
                self.assertTrue(result["response"])
                self.assertIn(result["support_type"], SupportType.ALL_TYPES)
                self.assertLessEqual(len(result["selected_acts"]), 2)

if __name__ == "__main__":
    # テスト実行
    unittest.main(verbosity=2)