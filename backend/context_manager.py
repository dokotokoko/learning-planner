"""
対話コンテキスト管理モジュール
トークン予算内で最適なプロンプトを構築し、長期的な文脈を維持
"""
import os
import json
import logging
import asyncio
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime, timezone, timedelta
from dataclasses import dataclass, field
import hashlib
import numpy as np
from collections import defaultdict

logger = logging.getLogger(__name__)

@dataclass
class ContextSection:
    """プロンプトの各セクション"""
    name: str
    content: str
    tokens: int = 0
    priority: int = 0  # 低い値ほど優先度高
    can_compress: bool = False
    
@dataclass
class ContextMetrics:
    """コンテキスト管理のメトリクス"""
    total_tokens: int = 0
    system_tokens: int = 0
    summary_tokens: int = 0
    recent_tokens: int = 0
    retrieved_tokens: int = 0
    compression_ratio: float = 0.0
    retrieval_hits: int = 0
    topic_switches: int = 0
    last_summary_update: Optional[datetime] = None
    
class ContextManager:
    """
    コンテキスト管理クラス
    トークン予算内で最適なプロンプトを構築
    """
    
    def __init__(
        self,
        supabase_client=None,
        embedding_client=None,
        token_counter=None
    ):
        # クライアント
        self.supabase = supabase_client
        self.embedding_client = embedding_client
        self.token_counter = token_counter or self._simple_token_counter
        
        # 設定値（環境変数から取得）
        self.token_budget = int(os.environ.get("TOKEN_BUDGET_IN", "4000"))
        self.n_recent = int(os.environ.get("N_RECENT", "8"))
        self.k_retrieve = int(os.environ.get("K_RETRIEVE", "3"))
        self.summary_max_tokens = int(os.environ.get("SUMMARY_MAXTOKENS", "500"))
        self.mmr_lambda = float(os.environ.get("MMR_LAMBDA", "0.7"))
        self.topic_tau = float(os.environ.get("TOPIC_TAU", "0.78"))
        self.summary_rotate_every = int(os.environ.get("SUMMARY_ROTATE_EVERY", "20"))
        
        # トークン配分比率
        self.system_ratio = 0.10
        self.summary_ratio = 0.20
        self.recent_ratio = 0.60
        self.retrieved_ratio = 0.10
        
        # 内部状態
        self.metrics = ContextMetrics()
        self.last_embeddings_cache = {}
        
        logger.info(f"📋 ContextManager初期化完了")
        logger.info(f"   トークン予算: {self.token_budget}")
        logger.info(f"   直近N: {self.n_recent}, 検索K: {self.k_retrieve}")
    
    def _simple_token_counter(self, text: str) -> int:
        """簡易トークンカウンター（tiktoken未導入時用）"""
        # 日本語は1文字≒1.5トークン、英語は4文字≒1トークンの概算
        import re
        japanese_chars = len(re.findall(r'[ぁ-んァ-ヶー一-龠]', text))
        other_chars = len(text) - japanese_chars
        return int(japanese_chars * 1.5 + other_chars * 0.25)
    
    async def build_context(
        self,
        user_message: str,
        conversation_id: str,
        system_prompt: str,
        conversation_history: Optional[List[Dict[str, Any]]] = None
    ) -> Tuple[List[Dict[str, str]], ContextMetrics]:
        """
        トークン予算内で最適なコンテキストを構築
        
        Returns:
            (messages, metrics)のタプル
        """
        logger.info(f"🔄 コンテキスト構築開始 (会話ID: {conversation_id[:8]}...)")
        
        sections = []
        
        # 1. システムプロンプト（10%）
        system_budget = int(self.token_budget * self.system_ratio)
        system_section = ContextSection(
            name="SYSTEM",
            content=self._build_system_prompt(system_prompt),
            tokens=self.token_counter(system_prompt),
            priority=1,
            can_compress=False
        )
        sections.append(system_section)
        
        # 2. 長期要約（20%） - Phase 1では簡易版
        summary_budget = int(self.token_budget * self.summary_ratio)
        summary_section = await self._get_or_create_summary(
            conversation_id, 
            conversation_history,
            summary_budget
        )
        if summary_section:
            sections.append(summary_section)
        
        # 3. 直近会話（60%）
        recent_budget = int(self.token_budget * self.recent_ratio)
        recent_section = self._build_recent_context(
            conversation_history,
            recent_budget,
            self.n_recent
        )
        sections.append(recent_section)
        
        # 4. 検索結果（10%） - Phase 2で実装
        if self.embedding_client and self.k_retrieve > 0:
            retrieved_budget = int(self.token_budget * self.retrieved_ratio)
            retrieved_section = await self._retrieve_relevant_context(
                user_message,
                conversation_id,
                retrieved_budget,
                self.k_retrieve
            )
            if retrieved_section:
                sections.append(retrieved_section)
        
        # 5. トークン調整（パッキング）
        messages = self._pack_into_budget(sections, user_message)
        
        # メトリクス更新
        self._update_metrics(sections)
        
        logger.info(f"✅ コンテキスト構築完了")
        logger.info(f"   総トークン: {self.metrics.total_tokens}/{self.token_budget}")
        logger.info(f"   セクション: SYSTEM={self.metrics.system_tokens}, "
                   f"SUMMARY={self.metrics.summary_tokens}, "
                   f"RECENT={self.metrics.recent_tokens}, "
                   f"RETRIEVED={self.metrics.retrieved_tokens}")
        
        return messages, self.metrics
    
    def _build_system_prompt(self, base_prompt: str) -> str:
        """システムプロンプトを構築"""
        additional = """

## コンテキスト参照ルール
以下のセクションのみを参照して応答してください：
- [SUMMARY]: 長期的な決定事項と制約
- [RECENT]: 直近の会話
- [RETRIEVED]: 関連する過去の会話
これら以外の情報は推測せず、不明な場合は確認してください。
"""
        return base_prompt + additional
    
    async def _get_or_create_summary(
        self,
        conversation_id: str,
        history: Optional[List[Dict[str, Any]]],
        budget: int
    ) -> Optional[ContextSection]:
        """長期要約を取得または生成（Phase 1では簡易版）"""
        # Phase 1: 最近の重要発話から簡易要約を作成
        if not history or len(history) < 5:
            return None
        
        # 簡易的な要約（後でLLMベースに置換）
        important_messages = []
        for msg in history[-20:]:  # 直近20件から抽出
            content = msg.get("message", "")
            # 重要そうなメッセージを抽出（決定、仕様、要件などのキーワード）
            if any(keyword in content for keyword in ["決定", "仕様", "要件", "方針", "重要", "必須"]):
                important_messages.append(f"- {content[:100]}")
        
        if not important_messages:
            return None
        
        summary_text = "## 重要な決定事項\n" + "\n".join(important_messages[:5])
        
        return ContextSection(
            name="SUMMARY",
            content=summary_text,
            tokens=self.token_counter(summary_text),
            priority=2,
            can_compress=True
        )
    
    def _build_recent_context(
        self,
        history: Optional[List[Dict[str, Any]]],
        budget: int,
        n_recent: int
    ) -> ContextSection:
        """直近の会話コンテキストを構築"""
        if not history:
            return ContextSection(
                name="RECENT",
                content="",
                tokens=0,
                priority=3
            )
        
        # 直近N件を取得
        recent_messages = history[-n_recent:] if len(history) > n_recent else history
        
        # メッセージを整形
        formatted_messages = []
        for msg in recent_messages:
            role = msg.get("sender", "user")
            content = msg.get("message", "")
            formatted_messages.append(f"{role}: {content}")
        
        recent_text = "\n".join(formatted_messages)
        
        # トークン数が予算を超える場合は古い方から削る
        while self.token_counter(recent_text) > budget and formatted_messages:
            formatted_messages.pop(0)
            recent_text = "\n".join(formatted_messages)
        
        return ContextSection(
            name="RECENT",
            content=recent_text,
            tokens=self.token_counter(recent_text),
            priority=3,
            can_compress=False
        )
    
    async def _retrieve_relevant_context(
        self,
        query: str,
        conversation_id: str,
        budget: int,
        k: int
    ) -> Optional[ContextSection]:
        """関連する過去の文脈を検索（Phase 2で実装）"""
        # Phase 2で埋め込みベースの検索を実装
        # 現在はスタブ
        return None
    
    def _pack_into_budget(
        self,
        sections: List[ContextSection],
        user_message: str
    ) -> List[Dict[str, str]]:
        """セクションをトークン予算内にパッキング"""
        messages = []
        total_tokens = 0
        user_tokens = self.token_counter(user_message)
        
        # ユーザーメッセージ分を確保
        available_budget = self.token_budget - user_tokens - 100  # 余裕を持たせる
        
        # 優先度順にソート
        sections.sort(key=lambda x: x.priority)
        
        # システムプロンプトを構築
        system_parts = []
        context_parts = []
        
        for section in sections:
            if total_tokens + section.tokens <= available_budget:
                if section.name == "SYSTEM":
                    system_parts.append(section.content)
                else:
                    if section.content:  # 空でない場合のみ追加
                        context_parts.append(f"[{section.name}]\n{section.content}")
                total_tokens += section.tokens
            elif section.can_compress and section.tokens > 0:
                # 圧縮可能なセクションは部分的に含める
                remaining_budget = available_budget - total_tokens
                if remaining_budget > 100:  # 最低100トークンは欲しい
                    compressed = self._compress_section(section, remaining_budget)
                    context_parts.append(f"[{section.name}]\n{compressed}")
                    total_tokens += self.token_counter(compressed)
        
        # メッセージリストを構築
        system_content = "\n".join(system_parts)
        if context_parts:
            system_content += "\n\n" + "\n\n".join(context_parts)
        
        messages.append({"role": "system", "content": system_content})
        messages.append({"role": "user", "content": user_message})
        
        return messages
    
    def _compress_section(self, section: ContextSection, target_tokens: int) -> str:
        """セクションを目標トークン数に圧縮"""
        # 簡易的な圧縮: 文字数で切り詰める
        # 後でより高度な圧縮アルゴリズムに置換
        content = section.content
        
        # 概算: 1トークン ≈ 2.5文字（日本語の場合）
        target_chars = int(target_tokens * 2.5)
        
        if len(content) > target_chars:
            return content[:target_chars] + "..."
        
        return content
    
    def _update_metrics(self, sections: List[ContextSection]):
        """メトリクスを更新"""
        self.metrics.total_tokens = sum(s.tokens for s in sections)
        
        for section in sections:
            if section.name == "SYSTEM":
                self.metrics.system_tokens = section.tokens
            elif section.name == "SUMMARY":
                self.metrics.summary_tokens = section.tokens
            elif section.name == "RECENT":
                self.metrics.recent_tokens = section.tokens
            elif section.name == "RETRIEVED":
                self.metrics.retrieved_tokens = section.tokens
        
        if self.metrics.total_tokens > 0:
            self.metrics.compression_ratio = self.metrics.total_tokens / self.token_budget
    
    async def detect_topic_switch(
        self,
        current_message: str,
        recent_messages: List[str],
        threshold: float = None
    ) -> bool:
        """トピック切り替えを検出（Phase 2で実装）"""
        # Phase 2で埋め込みベースの類似度計算を実装
        return False
    
    async def rotate_summary_if_needed(
        self,
        conversation_id: str,
        turn_count: int,
        force: bool = False
    ) -> bool:
        """必要に応じて要約を更新"""
        if force or (turn_count % self.summary_rotate_every == 0):
            logger.info(f"📝 要約更新開始 (会話ID: {conversation_id[:8]}...)")
            # Phase 2でLLMベースの要約生成を実装
            self.metrics.last_summary_update = datetime.now(timezone.utc)
            return True
        return False