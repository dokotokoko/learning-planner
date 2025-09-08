"""
会話履歴から学習状態を抽出するモジュール
LLMを使用した動的な状態抽出と、ヒューリスティックなフォールバック処理を実装
"""

import json
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
from .schema import StateSnapshot, Affect, ProgressSignal

logger = logging.getLogger(__name__)

class StateExtractor:
    """会話履歴から状態スナップショットを抽出"""
    
    # 状態抽出用プロンプトテンプレート
    STATE_EXTRACT_PROMPT = """あなたは学習メンターAIです。学習者の発話から現在の状態をStateSnapshotとしてJSONで生成してください。

必須フィールド:
- goal: 学習者の現在の目標（明示されていない場合は推測）
- time_horizon: 時間軸（今日/今週/今月/今学期など）
- last_action: 最後に実行した行動
- blockers: 障害・ブロッカー（配列）
- uncertainties: 不確実な点（配列）
- options_considered: 検討中の選択肢（配列）
- resources: 利用可能なリソース（配列）
- affect: 感情状態 {{interest: 0-5, anxiety: 0-5, excitement: 0-5}}
- progress_signal: 進捗シグナル {{
    actions_in_last_7_days: 数値,
    novelty_ratio: 0.0-1.0,
    looping_signals: ["繰り返しのパターン"],
    scope_breadth: 1-10
  }}

会話履歴:
{conversation}

プロジェクト情報（参考）:
{project_context}

注意:
- 会話から読み取れない情報は適切なデフォルト値を使用
- 感情状態は会話のトーンから推測
- ループ兆候があれば looping_signals に記載

出力は厳密なJSON形式のみ:"""
    
    def __init__(self, llm_client=None):
        """
        Args:
            llm_client: LLMクライアント（既存のmodule.llm_apiを使用）
        """
        self.llm_client = llm_client
        
    def extract_from_history(
        self,
        conversation_history: List[Dict[str, str]],
        project_context: Optional[Dict[str, Any]] = None,
        use_llm: bool = True,
        mock_mode: bool = False #mock
    ) -> StateSnapshot:
        """
        会話履歴から状態を抽出するメイン関数（
        
        Args:
            conversation_history: [{"sender": "user/assistant", "message": "..."}]形式の履歴
            project_context: プロジェクト情報（既存システムから取得）
            use_llm: LLMを使用するか（Falseの場合はヒューリスティック処理）
            mock_mode: 最小限の状態抽出モード（ゴール、目的、ProjectContext、会話履歴のみに焦点）
            
        Returns:
            StateSnapshot: 抽出された状態
        """
        
        if mock_mode:
            # Mock用に必要最低限の入力（入力パラメータ：ゴール, 目的, ProjectContext, 会話履歴）
            return self._extract_minimal(conversation_history, project_context)
        
        if use_llm and self.llm_client:
            try:
                return self._extract_with_llm(conversation_history, project_context)
            except Exception as e:
                logger.warning(f"LLM抽出エラー、フォールバック処理を使用: {e}")
                return self._extract_heuristic(conversation_history, project_context)
        else:
            return self._extract_heuristic(conversation_history, project_context)


    """LLMを使用した状態抽出（デフォルト関数）"""
    def _extract_with_llm(
        self,
        conversation_history: List[Dict[str, str]],
        project_context: Optional[Dict[str, Any]] = None
    ) -> StateSnapshot:
        
        # 会話履歴を文字列に変換
        conversation_text = self._format_conversation(conversation_history[-20:])  # 最新20メッセージ
        
        # プロジェクト情報を文字列に変換
        project_text = ""
        if project_context:
            project_text = f"""
            - テーマ: {project_context.get('theme', '未設定')}
            - 問い: {project_context.get('question', '未設定')}
            - 仮説: {project_context.get('hypothesis', '未設定')}
            """
        
        # プロンプト生成
        prompt = self.STATE_EXTRACT_PROMPT.format(
            conversation=conversation_text,
            project_context=project_text
        )
        
        # LLM呼び出し
        messages = [
            {"role": "system", "content": "あなたは状態抽出を行うAIアシスタントです。"},
            {"role": "user", "content": prompt}
        ]
        
        response = self.llm_client.generate_response_with_history(messages)
        
        # JSON解析
        try:
            state_dict = json.loads(response)
            
            # ネストされたオブジェクトの処理
            if 'affect' in state_dict:
                state_dict['affect'] = Affect(**state_dict['affect'])
            else:
                state_dict['affect'] = Affect()
                
            if 'progress_signal' in state_dict:
                state_dict['progress_signal'] = ProgressSignal(**state_dict['progress_signal'])
            else:
                state_dict['progress_signal'] = ProgressSignal()
            
            # プロジェクト情報を追加
            state_dict['project_context'] = project_context
            if project_context:
                state_dict['project_id'] = project_context.get('id')
                # goalが空の場合はthemeを使用
                if not state_dict.get('goal') and project_context.get('theme'):
                    state_dict['goal'] = project_context['theme']
            
            return StateSnapshot(**state_dict)
            
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"LLM応答のJSON解析エラー: {e}")
            raise

     """ヒューリスティックな状態抽出（LLMが使用できない場合のフォールバック用）""" 
    def _extract_heuristic(
        self,
        conversation_history: List[Dict[str, str]],
        project_context: Optional[Dict[str, Any]] = None
    ) -> StateSnapshot:
        
        # 基本的な状態を構築
        state = StateSnapshot()
        
        # プロジェクト情報から目標を設定（theme と question を優先的に使用）
        if project_context:
            # themeがあれば目標として使用
            theme = project_context.get('theme', '')
            question = project_context.get('question', '')
            
            if theme:
                state.goal = theme
                # questionがあれば追加情報として含める
                if question:
                    state.goal = f"{theme} - {question}"
            
            state.project_context = project_context
            state.project_id = project_context.get('id')
        
        # 最新のユーザーメッセージから情報を抽出
        recent_user_messages = [
            msg['message'] for msg in conversation_history[-10:]
            if msg.get('sender') == 'user'
        ]
        
        # キーワードベースの分析
        state = self._analyze_keywords(state, recent_user_messages)
        
        # 感情状態の推定
        state.affect = self._estimate_affect(recent_user_messages)
        
        # 進捗シグナルの推定
        state.progress_signal = self._estimate_progress(conversation_history)
        
        return state
    
    def _format_conversation(self, conversation_history: List[Dict[str, str]]) -> str:
        """会話履歴を文字列フォーマットに変換"""
        lines = []
        for msg in conversation_history:
            role = "U" if msg.get('sender') == 'user' else "A"
            lines.append(f"{role}: {msg.get('message', '')}")
        return "\n".join(lines)
    
    def _analyze_keywords(self, state: StateSnapshot, messages: List[str]) -> StateSnapshot:
        """キーワード分析による状態更新"""
        
        all_text = " ".join(messages).lower()
        
        # ブロッカーのキーワード
        blocker_keywords = ["困って", "わからない", "難しい", "できない", "止まって"]
        for keyword in blocker_keywords:
            if keyword in all_text:
                state.blockers.append(f"{keyword}いる状況")
                break
        
        # 不確実性のキーワード
        uncertainty_keywords = ["どうすれば", "どれが", "いつ", "なぜ", "？"]
        for keyword in uncertainty_keywords:
            if keyword in all_text:
                state.uncertainties.append("方法や選択に関する疑問")
                break
        
        # 時間軸の推定
        if "今日" in all_text:
            state.time_horizon = "今日"
        elif "今週" in all_text:
            state.time_horizon = "今週"
        elif "今月" in all_text:
            state.time_horizon = "今月"
        else:
            state.time_horizon = "未定"
        
        return state
    
    def _estimate_affect(self, messages: List[str]) -> Affect:
        """感情状態の推定"""
        affect = Affect()
        
        if not messages:
            return affect
        
        all_text = " ".join(messages).lower()
        
        # 関心度の推定
        interest_keywords = ["面白い", "興味", "知りたい", "やってみたい"]
        if any(keyword in all_text for keyword in interest_keywords):
            affect.interest = 4
        else:
            affect.interest = 2
        
        # 不安度の推定
        anxiety_keywords = ["不安", "心配", "怖い", "自信がない"]
        if any(keyword in all_text for keyword in anxiety_keywords):
            affect.anxiety = 4
        else:
            affect.anxiety = 1
        
        # 興奮度の推定
        excitement_keywords = ["楽しい", "ワクワク", "すごい", "！"]
        if any(keyword in all_text for keyword in excitement_keywords):
            affect.excitement = 4
        else:
            affect.excitement = 2
        
        return affect
    
    def _estimate_progress(self, conversation_history: List[Dict[str, str]]) -> ProgressSignal:
        """進捗シグナルの推定"""
        progress = ProgressSignal()
        
        # 最近のメッセージ数から行動数を推定
        recent_messages = conversation_history[-14:]  # 約7日分
        user_messages = [msg for msg in recent_messages if msg.get('sender') == 'user']
        progress.actions_in_last_7_days = min(len(user_messages), 10)
        
        # ループシグナルの検出（簡易版）
        if len(user_messages) > 3:
            # 似たような質問の繰り返しを検出
            questions = [msg['message'] for msg in user_messages if '？' in msg.get('message', '')]
            if len(questions) > len(set(questions)) * 0.7:  # 30%以上重複
                progress.looping_signals.append("同じような質問の繰り返し")
        
        # 新規性比率（簡易推定）
        progress.novelty_ratio = 0.5  # デフォルト値
        
        # スコープの広さ（キーワード数から推定）
        all_text = " ".join([msg.get('message', '') for msg in user_messages])
        unique_words = len(set(all_text.split()))
        progress.scope_breadth = min(max(1, unique_words // 20), 10)
        
        return progress

    """ Mock用に最小限の状態抽出（ゴール、目的、ProjectContext、会話履歴のみ）"""  
    def _extract_minimal(
        self,
        conversation_history: List[Dict[str, str]],
        project_context: Optional[Dict[str, Any]] = None
    ) -> StateSnapshot:
        
        logger.info("最小限の状態抽出モードを使用")
        
        # 基本的な状態を構築（必須フィールドのみに焦点）
        state = StateSnapshot()
        
        # プロジェクト情報から目標と目的を設定
        if project_context:
            theme = project_context.get('theme', '')
            question = project_context.get('question', '')
            
            # ゴール：テーマを中心に設定
            if theme:
                state.goal = theme
                # questionがあれば追加情報として含める
                if question:
                    state.goal = f"{theme} - {question}"
            
            # 目的：問いや仮説から推測
            if question:
                state.purpose = f"「{question}」について探究する"
            elif project_context.get('hypothesis'):
                state.purpose = f"「{project_context['hypothesis']}」を検証する"
            else:
                state.purpose = "プロジェクトの目標を達成する"
            
            state.project_context = project_context
            state.project_id = project_context.get('id')
        else:
            # プロジェクト情報がない場合のデフォルト
            state.goal = "学習目標の明確化"
            state.purpose = "効果的な学習を進める"
        
        logger.info(f"最小限状態抽出完了: goal={state.goal}, purpose={state.purpose}")
        
        return state