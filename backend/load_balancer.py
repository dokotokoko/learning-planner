"""
LLMクライアント負荷分散システム
複数の戦略でリクエストを分散し、パフォーマンスを最適化
"""

import asyncio
import random
import time
import logging
from typing import List, Dict, Any, Optional, Callable
from enum import Enum
from dataclasses import dataclass, field
from llm_pool_manager import LLMConnectionPool, get_llm_pool

logger = logging.getLogger(__name__)


class LoadBalanceStrategy(Enum):
    """負荷分散戦略"""
    ROUND_ROBIN = "round_robin"          # ラウンドロビン
    LEAST_CONNECTIONS = "least_connections"  # 最少接続数
    WEIGHTED_ROUND_ROBIN = "weighted_round_robin"  # 重み付きラウンドロビン
    RANDOM = "random"                    # ランダム
    RESPONSE_TIME = "response_time"      # 応答時間ベース
    ADAPTIVE = "adaptive"                # 適応的（動的切り替え）


@dataclass
class PoolNode:
    """プールノード情報"""
    pool: LLMConnectionPool
    weight: float = 1.0
    current_requests: int = 0
    total_requests: int = 0
    avg_response_time: float = 0.0
    error_count: int = 0
    last_used: float = field(default_factory=time.time)
    health_score: float = 1.0  # 0.0-1.0の健全性スコア


class LLMLoadBalancer:
    """
    LLMクライアントの負荷分散器
    複数のプールを管理し、効率的にリクエストを分散
    """
    
    def __init__(
        self,
        strategy: LoadBalanceStrategy = LoadBalanceStrategy.ADAPTIVE,
        pool_configs: Optional[List[Dict[str, Any]]] = None,
        health_check_interval: float = 30.0
    ):
        self.strategy = strategy
        self.health_check_interval = health_check_interval
        
        # プールノード管理
        self.nodes: List[PoolNode] = []
        self.round_robin_index = 0
        
        # アダプティブ戦略用
        self.strategy_performance: Dict[LoadBalanceStrategy, float] = {}
        self.current_adaptive_strategy = LoadBalanceStrategy.ROUND_ROBIN
        self.last_strategy_switch = time.time()
        
        # デフォルト設定
        if pool_configs is None:
            pool_configs = [
                {"pool_size": 8, "name": "primary"},
                {"pool_size": 6, "name": "secondary"},
                {"pool_size": 4, "name": "tertiary"}
            ]
        
        self.pool_configs = pool_configs
        self._initialized = False
        self._health_check_task: Optional[asyncio.Task] = None
    
    async def initialize(self):
        """負荷分散器を初期化"""
        if self._initialized:
            return
        
        logger.info(f"🚀 LLM負荷分散器初期化開始 (戦略: {self.strategy.value})")
        
        try:
            # 複数のプールを作成
            for i, config in enumerate(self.pool_configs):
                pool = LLMConnectionPool(
                    pool_size=config.get("pool_size", 5),
                    max_queue_size=config.get("max_queue_size", 50),
                    connection_timeout=config.get("connection_timeout", 30.0)
                )
                
                await pool.initialize()
                
                node = PoolNode(
                    pool=pool,
                    weight=config.get("weight", 1.0)
                )
                
                self.nodes.append(node)
                logger.info(f"✅ プールノード {i+1} 初期化完了 (サイズ: {config.get('pool_size')})")
            
            self._initialized = True
            
            # ヘルスチェック開始
            self._health_check_task = asyncio.create_task(self._health_check_loop())
            
            logger.info(f"✅ LLM負荷分散器初期化完了 (ノード数: {len(self.nodes)})")
            
        except Exception as e:
            logger.error(f"❌ LLM負荷分散器初期化失敗: {e}")
            raise
    
    async def get_client(self, prefer_async: bool = True):
        """
        負荷分散戦略に基づいてクライアントを取得
        
        Args:
            prefer_async: 非同期クライアントを優先するか
            
        Returns:
            コンテキストマネージャー
        """
        if not self._initialized:
            await self.initialize()
        
        # 戦略に基づいてノードを選択
        node = await self._select_node()
        
        if node is None:
            raise Exception("利用可能なプールノードがありません")
        
        # リクエストカウンターを更新
        node.current_requests += 1
        node.total_requests += 1
        node.last_used = time.time()
        
        # クライアント取得
        if prefer_async:
            return node.pool.get_async_client()
        else:
            return node.pool.get_sync_client()
    
    async def _select_node(self) -> Optional[PoolNode]:
        """戦略に基づいてノードを選択"""
        if not self.nodes:
            return None
        
        # 健全性チェック（health_score > 0.3のノードのみ使用）
        healthy_nodes = [node for node in self.nodes if node.health_score > 0.3]
        if not healthy_nodes:
            logger.warning("⚠️ 健全なノードがありません。全ノードを対象にします。")
            healthy_nodes = self.nodes
        
        # アダプティブ戦略の場合は動的に戦略を変更
        if self.strategy == LoadBalanceStrategy.ADAPTIVE:
            await self._update_adaptive_strategy()
            strategy = self.current_adaptive_strategy
        else:
            strategy = self.strategy
        
        # 戦略別選択
        if strategy == LoadBalanceStrategy.ROUND_ROBIN:
            return self._round_robin_select(healthy_nodes)
        
        elif strategy == LoadBalanceStrategy.LEAST_CONNECTIONS:
            return self._least_connections_select(healthy_nodes)
        
        elif strategy == LoadBalanceStrategy.WEIGHTED_ROUND_ROBIN:
            return self._weighted_round_robin_select(healthy_nodes)
        
        elif strategy == LoadBalanceStrategy.RANDOM:
            return random.choice(healthy_nodes)
        
        elif strategy == LoadBalanceStrategy.RESPONSE_TIME:
            return self._response_time_select(healthy_nodes)
        
        else:
            # デフォルトはラウンドロビン
            return self._round_robin_select(healthy_nodes)
    
    def _round_robin_select(self, nodes: List[PoolNode]) -> PoolNode:
        """ラウンドロビン選択"""
        node = nodes[self.round_robin_index % len(nodes)]
        self.round_robin_index += 1
        return node
    
    def _least_connections_select(self, nodes: List[PoolNode]) -> PoolNode:
        """最少接続数選択"""
        return min(nodes, key=lambda n: n.current_requests)
    
    def _weighted_round_robin_select(self, nodes: List[PoolNode]) -> PoolNode:
        """重み付きラウンドロビン選択"""
        total_weight = sum(node.weight * node.health_score for node in nodes)
        if total_weight == 0:
            return random.choice(nodes)
        
        r = random.uniform(0, total_weight)
        cumulative_weight = 0
        
        for node in nodes:
            cumulative_weight += node.weight * node.health_score
            if r <= cumulative_weight:
                return node
        
        return nodes[-1]  # フォールバック
    
    def _response_time_select(self, nodes: List[PoolNode]) -> PoolNode:
        """応答時間ベース選択（応答時間が短いノードを優先）"""
        # 応答時間の逆数をスコアとして使用
        def response_score(node):
            if node.avg_response_time <= 0:
                return 1.0  # 未計測の場合は高スコア
            return 1.0 / (node.avg_response_time + 0.1)  # ゼロ除算回避
        
        scored_nodes = [(node, response_score(node)) for node in nodes]
        total_score = sum(score for _, score in scored_nodes)
        
        if total_score == 0:
            return random.choice(nodes)
        
        r = random.uniform(0, total_score)
        cumulative_score = 0
        
        for node, score in scored_nodes:
            cumulative_score += score
            if r <= cumulative_score:
                return node
        
        return nodes[-1]
    
    async def _update_adaptive_strategy(self):
        """アダプティブ戦略の更新"""
        current_time = time.time()
        
        # 30秒ごとに戦略を評価・切り替え
        if current_time - self.last_strategy_switch < 30:
            return
        
        # 各戦略のパフォーマンスを評価
        strategies_to_test = [
            LoadBalanceStrategy.ROUND_ROBIN,
            LoadBalanceStrategy.LEAST_CONNECTIONS,
            LoadBalanceStrategy.RESPONSE_TIME
        ]
        
        # 現在のパフォーマンス指標を計算
        total_response_time = sum(node.avg_response_time for node in self.nodes)
        total_errors = sum(node.error_count for node in self.nodes)
        total_requests = sum(node.total_requests for node in self.nodes)
        
        current_performance = 0
        if total_requests > 0:
            # スコア = (エラー率の逆数) * (応答時間の逆数) * 100
            error_rate = total_errors / total_requests
            avg_response_time = total_response_time / len(self.nodes)
            
            if error_rate < 1.0 and avg_response_time > 0:
                current_performance = (1 - error_rate) / (avg_response_time + 0.1) * 100
        
        # 現在の戦略のパフォーマンスを記録
        self.strategy_performance[self.current_adaptive_strategy] = current_performance
        
        # より良い戦略があるかチェック
        if len(self.strategy_performance) >= 2:
            best_strategy = max(
                self.strategy_performance.keys(),
                key=lambda s: self.strategy_performance[s]
            )
            
            if best_strategy != self.current_adaptive_strategy:
                logger.info(f"🔄 アダプティブ戦略切り替え: {self.current_adaptive_strategy.value} → {best_strategy.value}")
                self.current_adaptive_strategy = best_strategy
        
        self.last_strategy_switch = current_time
    
    async def _health_check_loop(self):
        """定期ヘルスチェック"""
        while True:
            try:
                await asyncio.sleep(self.health_check_interval)
                await self._update_health_scores()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"ヘルスチェックエラー: {e}")
    
    async def _update_health_scores(self):
        """各ノードの健全性スコアを更新"""
        for i, node in enumerate(self.nodes):
            try:
                metrics = await node.pool.get_metrics()
                
                # 健全性スコアの計算（0.0-1.0）
                # 要素: エラー率、応答時間、利用可能接続数
                
                error_rate = metrics.get("error_rate", 0)
                error_score = max(0, 1 - error_rate * 2)  # エラー率50%で0点
                
                avg_response_time = metrics.get("avg_response_time", 0)
                time_score = max(0, 1 - (avg_response_time - 1) / 10)  # 11秒で0点
                
                available_ratio = metrics.get("sync_available", 0) / max(metrics.get("pool_size", 1), 1)
                availability_score = available_ratio
                
                # 重み付き平均
                health_score = (error_score * 0.4 + time_score * 0.3 + availability_score * 0.3)
                node.health_score = max(0.1, min(1.0, health_score))  # 0.1-1.0の範囲
                
                # 統計更新
                node.avg_response_time = avg_response_time
                node.error_count = metrics.get("error_count", 0)
                
                logger.debug(f"ノード {i+1} 健全性: {node.health_score:.2f} "
                           f"(エラー率: {error_rate:.2%}, 応答時間: {avg_response_time:.2f}s)")
                
            except Exception as e:
                logger.error(f"ノード {i+1} ヘルスチェックエラー: {e}")
                node.health_score = max(0.1, node.health_score * 0.8)  # 段階的に低下
    
    async def get_status(self) -> Dict[str, Any]:
        """負荷分散器の状態を取得"""
        node_statuses = []
        for i, node in enumerate(self.nodes):
            try:
                metrics = await node.pool.get_metrics()
                node_statuses.append({
                    "node_id": i,
                    "health_score": node.health_score,
                    "current_requests": node.current_requests,
                    "total_requests": node.total_requests,
                    "avg_response_time": node.avg_response_time,
                    "error_count": node.error_count,
                    "pool_metrics": metrics
                })
            except Exception as e:
                node_statuses.append({
                    "node_id": i,
                    "error": str(e)
                })
        
        return {
            "strategy": self.strategy.value,
            "current_adaptive_strategy": self.current_adaptive_strategy.value if self.strategy == LoadBalanceStrategy.ADAPTIVE else None,
            "nodes": node_statuses,
            "total_nodes": len(self.nodes),
            "healthy_nodes": len([n for n in self.nodes if n.health_score > 0.3]),
            "strategy_performance": self.strategy_performance,
            "initialized": self._initialized
        }
    
    async def shutdown(self):
        """負荷分散器をシャットダウン"""
        logger.info("🛑 LLM負荷分散器シャットダウン開始")
        
        # ヘルスチェック停止
        if self._health_check_task:
            self._health_check_task.cancel()
            try:
                await self._health_check_task
            except asyncio.CancelledError:
                pass
        
        # 全プールをシャットダウン
        for node in self.nodes:
            await node.pool.shutdown()
        
        logger.info("✅ LLM負荷分散器シャットダウン完了")


# グローバル負荷分散器
_global_load_balancer: Optional[LLMLoadBalancer] = None


async def get_load_balancer(
    strategy: LoadBalanceStrategy = LoadBalanceStrategy.ADAPTIVE,
    pool_configs: Optional[List[Dict[str, Any]]] = None
) -> LLMLoadBalancer:
    """
    グローバル負荷分散器を取得
    
    Args:
        strategy: 負荷分散戦略
        pool_configs: プール設定のリスト
        
    Returns:
        LLMLoadBalancer インスタンス
    """
    global _global_load_balancer
    
    if _global_load_balancer is None:
        _global_load_balancer = LLMLoadBalancer(
            strategy=strategy,
            pool_configs=pool_configs
        )
        await _global_load_balancer.initialize()
    
    return _global_load_balancer


# ===================================
# 使用例
# ===================================

async def example_usage():
    """負荷分散器の使用例"""
    
    # 負荷分散器を取得
    load_balancer = await get_load_balancer(
        strategy=LoadBalanceStrategy.ADAPTIVE,
        pool_configs=[
            {"pool_size": 10, "weight": 1.0, "name": "primary"},
            {"pool_size": 6, "weight": 0.8, "name": "secondary"},
            {"pool_size": 4, "weight": 0.5, "name": "backup"}
        ]
    )
    
    messages = [
        {"role": "system", "content": "あなたは学習支援AIです。"},
        {"role": "user", "content": "こんにちは"}
    ]
    
    # 複数リクエストの並列実行
    async def process_request(request_id: int):
        async with await load_balancer.get_client(prefer_async=True) as client:
            response = await client.generate_response_async(messages)
            logger.info(f"リクエスト {request_id} 完了")
            return response
    
    # 20個のリクエストを並列実行
    tasks = [process_request(i) for i in range(20)]
    responses = await asyncio.gather(*tasks)
    
    # 状態確認
    status = await load_balancer.get_status()
    logger.info(f"📊 負荷分散器状態: {status}")
    
    return responses


if __name__ == "__main__":
    asyncio.run(example_usage())