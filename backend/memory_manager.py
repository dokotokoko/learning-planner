"""
長期メモリ管理システム - v1: コンテキスト管理の強化
トークン数管理、重要情報分類、タイムスタンプベース管理を実装
"""

import tiktoken
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
import json
import re
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class MessageImportance(Enum):
    """メッセージの重要度レベル"""
    CRITICAL = 5  # プロジェクトの核心、重要な決定事項
    HIGH = 4      # 重要な質問、仮説、洞察
    MEDIUM = 3    # 一般的な探究内容
    LOW = 2       # 確認事項、簡単な質問
    TRIVIAL = 1   # 挨拶、相槌など

@dataclass
class EnhancedMessage:
    """拡張メッセージクラス"""
    id: int
    sender: str
    message: str
    timestamp: datetime
    token_count: int
    importance: MessageImportance
    keywords: List[str]
    context_data: Optional[Dict[str, Any]] = None
    summary: Optional[str] = None

class TokenManager:
    """トークン数管理クラス"""
    
    def __init__(self, model: str = "gpt-4"):
        """
        Args:
            model: 使用するOpenAIモデル名
        """
        self.model = model
        # モデル別のトークン制限
        self.token_limits = {
            "gpt-4": 8192,
            "gpt-4-32k": 32768,
            "gpt-3.5-turbo": 4096,
            "gpt-4-turbo": 128000,
            "gpt-4o": 128000,
            "gpt-4o-mini": 128000,
            "gpt-4.1-nano": 8192  # カスタムモデル
        }
        self.max_tokens = self.token_limits.get(model, 8192)
        # システムプロンプトと応答用に予約するトークン数
        self.reserved_tokens = 2000
        
        # エンコーディングの取得（カスタムモデルの場合はフォールバック）
        try:
            self.encoding = tiktoken.encoding_for_model(model)
        except KeyError:
            # カスタムモデルの場合、gpt-4のエンコーディングを使用
            logger.warning(f"Model '{model}' not found in tiktoken. Using 'gpt-4' encoding as fallback.")
            self.encoding = tiktoken.encoding_for_model("gpt-4")
        
    def count_tokens(self, text: str) -> int:
        """テキストのトークン数をカウント"""
        return len(self.encoding.encode(text))
    
    def count_messages_tokens(self, messages: List[Dict[str, str]]) -> int:
        """メッセージリストの合計トークン数をカウント"""
        total = 0
        for message in messages:
            # role と content のオーバーヘッドを考慮（約4トークン）
            total += self.count_tokens(message.get("content", "")) + 4
        return total
    
    def get_available_tokens(self, current_tokens: int) -> int:
        """利用可能な残りトークン数を取得"""
        return self.max_tokens - self.reserved_tokens - current_tokens
    
    def estimate_cost(self, input_tokens: int, output_tokens: int) -> Dict[str, float]:
        """トークン数からコストを推定（USD）"""
        # GPT-4の価格（2024年1月時点の推定）
        pricing = {
            "gpt-4": {"input": 0.03, "output": 0.06},  # per 1K tokens
            "gpt-4-turbo": {"input": 0.01, "output": 0.03},
            "gpt-3.5-turbo": {"input": 0.0005, "output": 0.0015},
            "gpt-4.1-nano": {"input": 0.001, "output": 0.002}  # 推定値
        }
        
        model_pricing = pricing.get(self.model, pricing["gpt-4"])
        input_cost = (input_tokens / 1000) * model_pricing["input"]
        output_cost = (output_tokens / 1000) * model_pricing["output"]
        
        return {
            "input_cost": input_cost,
            "output_cost": output_cost,
            "total_cost": input_cost + output_cost,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens
        }

class ImportanceClassifier:
    """メッセージの重要度を分類するクラス"""
    
    # 重要度を判定するためのキーワードパターン
    IMPORTANCE_PATTERNS = {
        MessageImportance.CRITICAL: [
            r"(結論|まとめ|要約|決定|方針|重要)",
            r"(プロジェクト|テーマ|問い|仮説).*?(決定|確定|設定)",
            r"(最も重要|核心|本質|要点)",
        ],
        MessageImportance.HIGH: [
            r"(なぜ|どうして|理由|原因)",
            r"(仮説|推測|考察|分析)",
            r"(発見|気づき|洞察|インサイト)",
            r"(課題|問題|困難|障害)",
        ],
        MessageImportance.MEDIUM: [
            r"(説明|解説|定義|意味)",
            r"(例えば|具体的|事例|ケース)",
            r"(比較|違い|特徴|性質)",
        ],
        MessageImportance.LOW: [
            r"(確認|チェック|見直し)",
            r"(簡単|基本|基礎|初歩)",
            r"(補足|追加|参考)",
        ],
        MessageImportance.TRIVIAL: [
            r"(ありがとう|お願い|了解|わかりました)",
            r"(こんにちは|よろしく|お疲れ様)",
            r"(はい|いいえ|そうです|違います)$",
        ]
    }
    
    def classify(self, message: str, sender: str = "user") -> Tuple[MessageImportance, List[str]]:
        """
        メッセージの重要度を分類
        
        Returns:
            (重要度, 検出されたキーワードリスト)
        """
        # メッセージの長さによる基本スコア
        length_score = min(len(message) / 100, 3)  # 最大3ポイント
        
        # キーワードマッチング
        detected_keywords = []
        importance_scores = {level: 0 for level in MessageImportance}
        
        for importance, patterns in self.IMPORTANCE_PATTERNS.items():
            for pattern in patterns:
                matches = re.findall(pattern, message, re.IGNORECASE)
                if matches:
                    importance_scores[importance] += len(matches)
                    detected_keywords.extend(matches)
        
        # 最も高いスコアの重要度を選択
        max_importance = MessageImportance.MEDIUM  # デフォルト
        max_score = 0
        
        for importance, score in importance_scores.items():
            if score > max_score:
                max_score = score
                max_importance = importance
        
        # アシスタントの応答は基本的に重要度を上げる
        if sender == "assistant" and max_importance.value < MessageImportance.HIGH.value:
            max_importance = MessageImportance(min(max_importance.value + 1, MessageImportance.HIGH.value))
        
        # 長いメッセージは重要度を上げる
        if length_score > 2 and max_importance == MessageImportance.TRIVIAL:
            max_importance = MessageImportance.LOW
        
        return max_importance, list(set(detected_keywords))
    
    def extract_keywords(self, message: str) -> List[str]:
        """メッセージから重要なキーワードを抽出"""
        # 日本語の名詞を簡易的に抽出（より高度な実装では形態素解析を使用）
        # ここでは簡易的な実装
        keywords = []
        
        # 専門用語パターン
        technical_terms = re.findall(r"[ァ-ヶー]+|[一-龥]+", message)
        keywords.extend([term for term in technical_terms if len(term) >= 2])
        
        # カタカナ語（外来語）
        katakana_words = re.findall(r"[ァ-ヶー]{3,}", message)
        keywords.extend(katakana_words)
        
        # 重複を除去して返す
        return list(set(keywords))[:10]  # 最大10個

class MessageSummarizer:
    """メッセージ要約クラス"""
    
    def __init__(self, token_manager: TokenManager):
        self.token_manager = token_manager
        self.max_summary_tokens = 100  # 要約の最大トークン数
    
    def summarize(self, message: str, importance: MessageImportance) -> Optional[str]:
        """メッセージを要約"""
        # 短いメッセージや重要度が低い場合は要約しない
        if len(message) < 200 or importance.value <= MessageImportance.LOW.value:
            return None
        
        # 簡易的な要約（実際の実装ではLLMを使用）
        lines = message.split('\n')
        
        # 最初と最後の重要な文を抽出
        important_sentences = []
        for line in lines:
            line = line.strip()
            if len(line) > 20 and any(char in line for char in ['。', '！', '？']):
                important_sentences.append(line)
        
        if not important_sentences:
            return None
        
        # 最初と最後の文を組み合わせて要約
        if len(important_sentences) == 1:
            summary = important_sentences[0][:100]
        else:
            summary = f"{important_sentences[0][:50]}...{important_sentences[-1][:50]}"
        
        return summary

class MemoryManager:
    """長期メモリ管理の統合クラス"""
    
    def __init__(self, model: str = "gpt-4", max_messages: int = 100):
        self.token_manager = TokenManager(model)
        self.classifier = ImportanceClassifier()
        self.summarizer = MessageSummarizer(self.token_manager)
        self.max_messages = max_messages
        
    def process_message(self, message_data: Dict[str, Any]) -> EnhancedMessage:
        """メッセージを処理して拡張メッセージオブジェクトを作成"""
        message_text = message_data["message"]
        sender = message_data["sender"]
        
        # トークン数をカウント
        token_count = self.token_manager.count_tokens(message_text)
        
        # 重要度を分類
        importance, keywords = self.classifier.classify(message_text, sender)
        
        # キーワードを抽出
        if not keywords:
            keywords = self.classifier.extract_keywords(message_text)
        
        # タイムスタンプを処理
        timestamp = message_data.get("created_at")
        if isinstance(timestamp, str):
            timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        elif not isinstance(timestamp, datetime):
            timestamp = datetime.now(timezone.utc)
        
        # 要約を生成（必要な場合）
        summary = self.summarizer.summarize(message_text, importance)
        
        return EnhancedMessage(
            id=message_data.get("id", 0),
            sender=sender,
            message=message_text,
            timestamp=timestamp,
            token_count=token_count,
            importance=importance,
            keywords=keywords,
            context_data=message_data.get("context_data"),
            summary=summary
        )
    
    def optimize_context_window(
        self, 
        messages: List[Dict[str, Any]], 
        target_tokens: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        コンテキストウィンドウを最適化
        
        Args:
            messages: メッセージリスト
            target_tokens: 目標トークン数（Noneの場合は利用可能な最大値）
            
        Returns:
            最適化されたメッセージリスト
        """
        if not messages:
            return []
        
        # 各メッセージを処理
        enhanced_messages = [self.process_message(msg) for msg in messages]
        
        # タイムスタンプでソート（新しい順）
        enhanced_messages.sort(key=lambda x: x.timestamp, reverse=True)
        
        # 目標トークン数を設定
        if target_tokens is None:
            target_tokens = self.token_manager.max_tokens - self.token_manager.reserved_tokens
        
        # 重要度とタイムスタンプを考慮して選択
        selected_messages = []
        current_tokens = 0
        
        # まず重要度が高いメッセージを確保
        for msg in enhanced_messages:
            if msg.importance.value >= MessageImportance.HIGH.value:
                msg_tokens = msg.token_count + 4  # roleのオーバーヘッド
                if current_tokens + msg_tokens <= target_tokens:
                    selected_messages.append(msg)
                    current_tokens += msg_tokens
        
        # 残りの容量で新しいメッセージから順に追加
        for msg in enhanced_messages:
            if msg not in selected_messages:
                msg_tokens = msg.token_count + 4
                if current_tokens + msg_tokens <= target_tokens:
                    selected_messages.append(msg)
                    current_tokens += msg_tokens
                elif msg.summary:  # 要約で置き換え可能な場合
                    summary_tokens = self.token_manager.count_tokens(msg.summary) + 4
                    if current_tokens + summary_tokens <= target_tokens:
                        msg.message = msg.summary  # 要約で置き換え
                        msg.token_count = summary_tokens - 4
                        selected_messages.append(msg)
                        current_tokens += summary_tokens
        
        # 時系列順に並び替え
        selected_messages.sort(key=lambda x: x.timestamp)
        
        # 元のフォーマットに変換
        optimized_messages = []
        for msg in selected_messages:
            optimized_msg = {
                "role": "user" if msg.sender == "user" else "assistant",
                "content": msg.message
            }
            # メタデータを保持（デバッグ用）
            optimized_msg["_metadata"] = {
                "importance": msg.importance.name,
                "keywords": msg.keywords,
                "token_count": msg.token_count,
                "timestamp": msg.timestamp.isoformat()
            }
            optimized_messages.append(optimized_msg)
        
        logger.info(f"コンテキスト最適化: {len(messages)}メッセージから{len(optimized_messages)}メッセージを選択 (トークン数: {current_tokens})")
        
        return optimized_messages
    
    def get_conversation_metadata(self, messages: List[Dict[str, Any]]) -> Dict[str, Any]:
        """会話のメタデータを生成"""
        if not messages:
            return {}
        
        enhanced_messages = [self.process_message(msg) for msg in messages]
        
        # キーワードの頻度を計算
        keyword_freq = {}
        for msg in enhanced_messages:
            for keyword in msg.keywords:
                keyword_freq[keyword] = keyword_freq.get(keyword, 0) + 1
        
        # 上位キーワードを取得
        top_keywords = sorted(keyword_freq.items(), key=lambda x: x[1], reverse=True)[:10]
        
        # 重要度の分布
        importance_dist = {}
        for msg in enhanced_messages:
            level = msg.importance.name
            importance_dist[level] = importance_dist.get(level, 0) + 1
        
        # 時間範囲
        timestamps = [msg.timestamp for msg in enhanced_messages]
        time_range = {
            "start": min(timestamps).isoformat(),
            "end": max(timestamps).isoformat(),
            "duration_hours": (max(timestamps) - min(timestamps)).total_seconds() / 3600
        }
        
        # トークン使用統計
        total_tokens = sum(msg.token_count for msg in enhanced_messages)
        avg_tokens = total_tokens / len(enhanced_messages) if enhanced_messages else 0
        
        return {
            "message_count": len(messages),
            "top_keywords": [{"keyword": k, "count": c} for k, c in top_keywords],
            "importance_distribution": importance_dist,
            "time_range": time_range,
            "token_statistics": {
                "total": total_tokens,
                "average": avg_tokens,
                "max": max(msg.token_count for msg in enhanced_messages) if enhanced_messages else 0
            }
        }