"""
埋め込みベクトル生成と検索ユーティリティ
Phase 2で使用される高度な検索機能
"""
import os
import json
import hashlib
import logging
import asyncio
from typing import List, Dict, Optional, Any, Tuple
import numpy as np
from datetime import datetime, timezone
import aiohttp
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class SearchResult:
    """検索結果"""
    id: int
    text: str
    score: float
    metadata: Dict[str, Any]

class EmbeddingClient:
    """
    埋め込み生成クライアント
    OpenAI, Cohere, またはローカルモデルをサポート
    """
    
    def __init__(self, provider: str = "openai", api_key: Optional[str] = None):
        self.provider = provider.lower()
        self.api_key = api_key or os.environ.get(f"{provider.upper()}_API_KEY")
        
        # モデル設定
        self.model_configs = {
            "openai": {
                "model": os.environ.get("EMBEDDING_MODEL", "text-embedding-ada-002"),
                "dim": 1536,
                "endpoint": "https://api.openai.com/v1/embeddings"
            },
            "cohere": {
                "model": "embed-english-v2.0",
                "dim": 4096,
                "endpoint": "https://api.cohere.ai/v1/embed"
            }
        }
        
        self.config = self.model_configs.get(self.provider)
        if not self.config:
            raise ValueError(f"Unsupported provider: {self.provider}")
        
        # キャッシュ
        self.cache = {}
        self.cache_hits = 0
        self.cache_misses = 0
        
        logger.info(f"📊 EmbeddingClient初期化: {self.provider}/{self.config['model']}")
    
    async def generate_embedding(self, text: str, use_cache: bool = True) -> np.ndarray:
        """
        テキストの埋め込みベクトルを生成
        """
        if not text:
            return np.zeros(self.config["dim"])
        
        # キャッシュチェック
        text_hash = hashlib.sha256(text.encode()).hexdigest()
        if use_cache and text_hash in self.cache:
            self.cache_hits += 1
            return self.cache[text_hash]
        
        self.cache_misses += 1
        
        try:
            if self.provider == "openai":
                embedding = await self._generate_openai_embedding(text)
            elif self.provider == "cohere":
                embedding = await self._generate_cohere_embedding(text)
            else:
                # フォールバック: ランダムベクトル（開発用）
                logger.warning(f"⚠️ 開発用: ランダム埋め込みを生成")
                embedding = np.random.randn(self.config["dim"])
                embedding = embedding / np.linalg.norm(embedding)  # 正規化
            
            # キャッシュに保存
            if use_cache:
                self.cache[text_hash] = embedding
            
            return embedding
            
        except Exception as e:
            logger.error(f"❌ 埋め込み生成エラー: {e}")
            # エラー時はゼロベクトル
            return np.zeros(self.config["dim"])
    
    async def _generate_openai_embedding(self, text: str) -> np.ndarray:
        """OpenAI APIで埋め込み生成"""
        if not self.api_key:
            logger.warning("⚠️ OpenAI APIキーが設定されていません")
            return np.random.randn(self.config["dim"])
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "input": text,
            "model": self.config["model"]
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                self.config["endpoint"],
                headers=headers,
                json=payload
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    embedding = data["data"][0]["embedding"]
                    return np.array(embedding)
                else:
                    error_text = await response.text()
                    raise Exception(f"OpenAI API error: {response.status} - {error_text}")
    
    async def _generate_cohere_embedding(self, text: str) -> np.ndarray:
        """Cohere APIで埋め込み生成"""
        if not self.api_key:
            logger.warning("⚠️ Cohere APIキーが設定されていません")
            return np.random.randn(self.config["dim"])
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "texts": [text],
            "model": self.config["model"]
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                self.config["endpoint"],
                headers=headers,
                json=payload
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    embedding = data["embeddings"][0]
                    return np.array(embedding)
                else:
                    error_text = await response.text()
                    raise Exception(f"Cohere API error: {response.status} - {error_text}")
    
    async def generate_batch_embeddings(
        self,
        texts: List[str],
        batch_size: int = 100
    ) -> List[np.ndarray]:
        """
        バッチで埋め込みを生成
        """
        embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            batch_embeddings = await asyncio.gather(
                *[self.generate_embedding(text) for text in batch]
            )
            embeddings.extend(batch_embeddings)
        
        return embeddings
    
    def cosine_similarity(self, vec1: np.ndarray, vec2: np.ndarray) -> float:
        """コサイン類似度を計算"""
        if vec1.shape != vec2.shape:
            raise ValueError("ベクトルの次元が一致しません")
        
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return float(dot_product / (norm1 * norm2))
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """キャッシュ統計を取得"""
        total_requests = self.cache_hits + self.cache_misses
        hit_rate = self.cache_hits / total_requests if total_requests > 0 else 0
        
        return {
            "cache_size": len(self.cache),
            "cache_hits": self.cache_hits,
            "cache_misses": self.cache_misses,
            "hit_rate": hit_rate
        }


class SemanticSearch:
    """
    意味的類似検索とMMRリランキング
    """
    
    def __init__(
        self,
        embedding_client: EmbeddingClient,
        supabase_client=None
    ):
        self.embedding_client = embedding_client
        self.supabase = supabase_client
        
        # MMRパラメータ
        self.mmr_lambda = float(os.environ.get("MMR_LAMBDA", "0.7"))
        self.recency_decay = float(os.environ.get("RECENCY_DECAY", "0.95"))
        
        logger.info(f"🔍 SemanticSearch初期化: MMR λ={self.mmr_lambda}")
    
    async def search(
        self,
        query: str,
        conversation_id: str,
        k: int = 10,
        min_similarity: float = 0.5,
        exclude_recent_n: int = 10,
        use_mmr: bool = True
    ) -> List[SearchResult]:
        """
        意味的類似検索を実行
        
        Args:
            query: 検索クエリ
            conversation_id: 会話ID
            k: 取得する結果数
            min_similarity: 最小類似度閾値
            exclude_recent_n: 除外する直近のメッセージ数
            use_mmr: MMRリランキングを使用するか
        """
        logger.info(f"🔎 検索開始: '{query[:50]}...' (k={k})")
        
        # クエリの埋め込み生成
        query_embedding = await self.embedding_client.generate_embedding(query)
        
        # Supabaseから類似検索（Phase 2で実装）
        if self.supabase:
            results = await self._search_with_supabase(
                query_embedding,
                conversation_id,
                k * 2,  # MMR用に多めに取得
                min_similarity,
                exclude_recent_n
            )
        else:
            # モック結果（開発用）
            results = self._get_mock_results(k)
        
        # MMRリランキング
        if use_mmr and len(results) > k:
            results = self._mmr_rerank(query_embedding, results, k)
        
        # Top-k取得
        results = results[:k]
        
        logger.info(f"✅ 検索完了: {len(results)}件の結果")
        
        return results
    
    async def _search_with_supabase(
        self,
        query_embedding: np.ndarray,
        conversation_id: str,
        k: int,
        min_similarity: float,
        exclude_recent_n: int
    ) -> List[SearchResult]:
        """Supabaseで類似検索（Phase 2で実装）"""
        # TODO: pgvectorを使った検索を実装
        return []
    
    def _get_mock_results(self, k: int) -> List[SearchResult]:
        """モック検索結果（開発用）"""
        results = []
        for i in range(k):
            results.append(SearchResult(
                id=i,
                text=f"過去のメッセージ {i+1}: これはテスト用のモックメッセージです。",
                score=0.9 - i * 0.1,
                metadata={"created_at": datetime.now(timezone.utc).isoformat()}
            ))
        return results
    
    def _mmr_rerank(
        self,
        query_embedding: np.ndarray,
        candidates: List[SearchResult],
        k: int
    ) -> List[SearchResult]:
        """
        Maximum Marginal Relevance (MMR) によるリランキング
        関連性と多様性のバランスを取る
        """
        if not candidates:
            return []
        
        selected = []
        remaining = list(candidates)
        
        # 最初の要素は最も関連性の高いものを選択
        first = max(remaining, key=lambda x: x.score)
        selected.append(first)
        remaining.remove(first)
        
        # 残りをMMRスコアで選択
        while len(selected) < k and remaining:
            mmr_scores = []
            
            for candidate in remaining:
                # 関連性スコア（既に計算済み）
                relevance = candidate.score
                
                # 多様性ペナルティ（選択済みとの最大類似度）
                max_sim = 0.0
                for selected_item in selected:
                    # ここでは簡易的にテキストの重複度を使用
                    # Phase 2では埋め込みベクトルの類似度を使用
                    overlap = len(set(candidate.text.split()) & set(selected_item.text.split()))
                    sim = overlap / max(len(candidate.text.split()), 1)
                    max_sim = max(max_sim, sim)
                
                # MMRスコア計算
                mmr_score = self.mmr_lambda * relevance - (1 - self.mmr_lambda) * max_sim
                mmr_scores.append((candidate, mmr_score))
            
            # 最高MMRスコアの要素を選択
            best_candidate = max(mmr_scores, key=lambda x: x[1])[0]
            selected.append(best_candidate)
            remaining.remove(best_candidate)
        
        return selected
    
    def detect_topic_switch(
        self,
        current_embedding: np.ndarray,
        recent_embeddings: List[np.ndarray],
        threshold: float = None
    ) -> bool:
        """
        トピック切り替えを検出
        現在のメッセージと直近のメッセージの類似度が閾値以下の場合True
        """
        if not recent_embeddings:
            return False
        
        threshold = threshold or float(os.environ.get("TOPIC_TAU", "0.78"))
        
        # 直近メッセージの平均埋め込み
        recent_avg = np.mean(recent_embeddings, axis=0)
        
        # コサイン類似度計算
        similarity = self.embedding_client.cosine_similarity(current_embedding, recent_avg)
        
        is_switch = similarity < threshold
        
        if is_switch:
            logger.info(f"🔄 トピック切り替え検出: 類似度={similarity:.3f} < {threshold}")
        
        return is_switch
    
    async def apply_recency_boost(
        self,
        results: List[SearchResult],
        decay_factor: float = None
    ) -> List[SearchResult]:
        """
        時間減衰を適用して最近のメッセージをブースト
        """
        decay_factor = decay_factor or self.recency_decay
        
        now = datetime.now(timezone.utc)
        
        for result in results:
            # メタデータから作成時刻を取得
            created_at_str = result.metadata.get("created_at")
            if created_at_str:
                created_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
                
                # 経過時間（時間単位）
                hours_ago = (now - created_at).total_seconds() / 3600
                
                # 指数減衰を適用
                recency_factor = decay_factor ** hours_ago
                
                # スコアを調整
                result.score *= recency_factor
        
        # スコアで再ソート
        results.sort(key=lambda x: x.score, reverse=True)
        
        return results