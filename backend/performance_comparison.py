"""
パフォーマンス比較とベンチマーク
単一インスタンス vs プール vs 負荷分散の性能測定
"""

import asyncio
import time
import statistics
import logging
from typing import List, Dict, Any, Tuple
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from module.llm_api import learning_plannner
from llm_pool_manager import get_llm_pool
from load_balancer import get_load_balancer, LoadBalanceStrategy

logger = logging.getLogger(__name__)


@dataclass
class BenchmarkResult:
    """ベンチマーク結果"""
    method: str
    total_time: float
    avg_response_time: float
    median_response_time: float
    min_response_time: float
    max_response_time: float
    success_rate: float
    requests_per_second: float
    error_count: int
    timeout_count: int
    concurrent_users: int


class PerformanceBenchmark:
    """パフォーマンスベンチマーククラス"""
    
    def __init__(self, test_message: str = "こんにちは、学習について教えてください。"):
        self.test_message = test_message
        self.test_messages = [
            {"role": "system", "content": "あなたは学習支援AIです。"},
            {"role": "user", "content": test_message}
        ]
    
    async def benchmark_single_instance(self, concurrent_users: int = 20, timeout: float = 30.0) -> BenchmarkResult:
        """単一インスタンス方式のベンチマーク"""
        logger.info(f"🔍 単一インスタンス方式ベンチマーク開始 (ユーザー数: {concurrent_users})")
        
        # 単一クライアントを作成
        client = learning_plannner()
        
        async def single_request(request_id: int) -> Tuple[float, bool, str]:
            start_time = time.time()
            try:
                # 同期関数を非同期で実行（ブロッキング）
                response = await asyncio.wait_for(
                    asyncio.to_thread(client.generate_response, self.test_messages),
                    timeout=timeout
                )
                response_time = time.time() - start_time
                return response_time, True, "success"
            except asyncio.TimeoutError:
                return time.time() - start_time, False, "timeout"
            except Exception as e:
                return time.time() - start_time, False, f"error: {str(e)}"
        
        # 並列実行（実際はブロッキングで順次実行される）
        start_time = time.time()
        tasks = [single_request(i) for i in range(concurrent_users)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        total_time = time.time() - start_time
        
        # 結果分析
        response_times = []
        success_count = 0
        error_count = 0
        timeout_count = 0
        
        for result in results:
            if isinstance(result, Exception):
                error_count += 1
                continue
            
            response_time, success, error_type = result
            response_times.append(response_time)
            
            if success:
                success_count += 1
            elif error_type == "timeout":
                timeout_count += 1
            else:
                error_count += 1
        
        return BenchmarkResult(
            method="Single Instance",
            total_time=total_time,
            avg_response_time=statistics.mean(response_times) if response_times else 0,
            median_response_time=statistics.median(response_times) if response_times else 0,
            min_response_time=min(response_times) if response_times else 0,
            max_response_time=max(response_times) if response_times else 0,
            success_rate=success_count / concurrent_users,
            requests_per_second=concurrent_users / total_time if total_time > 0 else 0,
            error_count=error_count,
            timeout_count=timeout_count,
            concurrent_users=concurrent_users
        )
    
    async def benchmark_connection_pool(self, concurrent_users: int = 20, pool_size: int = 10, timeout: float = 30.0) -> BenchmarkResult:
        """コネクションプール方式のベンチマーク"""
        logger.info(f"🔍 コネクションプール方式ベンチマーク開始 (ユーザー数: {concurrent_users}, プールサイズ: {pool_size})")
        
        # プールを取得
        pool = await get_llm_pool(pool_size=pool_size)
        
        async def pool_request(request_id: int) -> Tuple[float, bool, str]:
            start_time = time.time()
            try:
                async with pool.get_async_client() as client:
                    response = await asyncio.wait_for(
                        client.generate_response_async(self.test_messages),
                        timeout=timeout
                    )
                    response_time = time.time() - start_time
                    return response_time, True, "success"
            except asyncio.TimeoutError:
                return time.time() - start_time, False, "timeout"
            except Exception as e:
                return time.time() - start_time, False, f"error: {str(e)}"
        
        # 並列実行
        start_time = time.time()
        tasks = [pool_request(i) for i in range(concurrent_users)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        total_time = time.time() - start_time
        
        # 結果分析
        response_times = []
        success_count = 0
        error_count = 0
        timeout_count = 0
        
        for result in results:
            if isinstance(result, Exception):
                error_count += 1
                continue
            
            response_time, success, error_type = result
            response_times.append(response_time)
            
            if success:
                success_count += 1
            elif error_type == "timeout":
                timeout_count += 1
            else:
                error_count += 1
        
        return BenchmarkResult(
            method=f"Connection Pool (size={pool_size})",
            total_time=total_time,
            avg_response_time=statistics.mean(response_times) if response_times else 0,
            median_response_time=statistics.median(response_times) if response_times else 0,
            min_response_time=min(response_times) if response_times else 0,
            max_response_time=max(response_times) if response_times else 0,
            success_rate=success_count / concurrent_users,
            requests_per_second=concurrent_users / total_time if total_time > 0 else 0,
            error_count=error_count,
            timeout_count=timeout_count,
            concurrent_users=concurrent_users
        )
    
    async def benchmark_load_balancer(self, concurrent_users: int = 20, strategy: LoadBalanceStrategy = LoadBalanceStrategy.ADAPTIVE, timeout: float = 30.0) -> BenchmarkResult:
        """負荷分散方式のベンチマーク"""
        logger.info(f"🔍 負荷分散方式ベンチマーク開始 (ユーザー数: {concurrent_users}, 戦略: {strategy.value})")
        
        # 負荷分散器を取得
        load_balancer = await get_load_balancer(
            strategy=strategy,
            pool_configs=[
                {"pool_size": 8, "weight": 1.0},
                {"pool_size": 6, "weight": 0.8},
                {"pool_size": 4, "weight": 0.6}
            ]
        )
        
        async def lb_request(request_id: int) -> Tuple[float, bool, str]:
            start_time = time.time()
            try:
                async with await load_balancer.get_client(prefer_async=True) as client:
                    response = await asyncio.wait_for(
                        client.generate_response_async(self.test_messages),
                        timeout=timeout
                    )
                    response_time = time.time() - start_time
                    return response_time, True, "success"
            except asyncio.TimeoutError:
                return time.time() - start_time, False, "timeout"
            except Exception as e:
                return time.time() - start_time, False, f"error: {str(e)}"
        
        # 並列実行
        start_time = time.time()
        tasks = [lb_request(i) for i in range(concurrent_users)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        total_time = time.time() - start_time
        
        # 結果分析
        response_times = []
        success_count = 0
        error_count = 0
        timeout_count = 0
        
        for result in results:
            if isinstance(result, Exception):
                error_count += 1
                continue
            
            response_time, success, error_type = result
            response_times.append(response_time)
            
            if success:
                success_count += 1
            elif error_type == "timeout":
                timeout_count += 1
            else:
                error_count += 1
        
        return BenchmarkResult(
            method=f"Load Balancer ({strategy.value})",
            total_time=total_time,
            avg_response_time=statistics.mean(response_times) if response_times else 0,
            median_response_time=statistics.median(response_times) if response_times else 0,
            min_response_time=min(response_times) if response_times else 0,
            max_response_time=max(response_times) if response_times else 0,
            success_rate=success_count / concurrent_users,
            requests_per_second=concurrent_users / total_time if total_time > 0 else 0,
            error_count=error_count,
            timeout_count=timeout_count,
            concurrent_users=concurrent_users
        )
    
    def print_benchmark_results(self, results: List[BenchmarkResult]):
        """ベンチマーク結果を表示"""
        print("\n" + "="*80)
        print("📊 パフォーマンス ベンチマーク結果")
        print("="*80)
        
        # ヘッダー
        print(f"{'方式':<20} {'総時間':<8} {'平均応答':<8} {'成功率':<8} {'RPS':<8} {'エラー':<6} {'タイムアウト':<10}")
        print("-"*80)
        
        # 結果表示
        for result in results:
            print(f"{result.method:<20} "
                  f"{result.total_time:<8.2f} "
                  f"{result.avg_response_time:<8.2f} "
                  f"{result.success_rate:<8.1%} "
                  f"{result.requests_per_second:<8.1f} "
                  f"{result.error_count:<6} "
                  f"{result.timeout_count:<10}")
        
        print("\n" + "="*80)
        print("📈 改善効果分析")
        print("="*80)
        
        if len(results) >= 2:
            baseline = results[0]  # 単一インスタンスをベースライン
            
            for i, result in enumerate(results[1:], 1):
                print(f"\n{result.method} vs {baseline.method}:")
                
                # 総時間の改善
                time_improvement = (baseline.total_time - result.total_time) / baseline.total_time * 100
                print(f"  📊 総処理時間: {time_improvement:+.1f}% ({'改善' if time_improvement > 0 else '悪化'})")
                
                # RPS改善
                rps_improvement = (result.requests_per_second - baseline.requests_per_second) / baseline.requests_per_second * 100
                print(f"  🚀 RPS向上: {rps_improvement:+.1f}% ({result.requests_per_second:.1f} vs {baseline.requests_per_second:.1f})")
                
                # 成功率改善
                success_improvement = result.success_rate - baseline.success_rate
                print(f"  ✅ 成功率向上: {success_improvement:+.1%} ({result.success_rate:.1%} vs {baseline.success_rate:.1%})")
                
                # 応答時間改善
                response_improvement = (baseline.avg_response_time - result.avg_response_time) / baseline.avg_response_time * 100
                print(f"  ⚡ 応答時間短縮: {response_improvement:+.1f}% ({result.avg_response_time:.2f}s vs {baseline.avg_response_time:.2f}s)")
        
        print("\n" + "="*80)
        print("💡 推奨設定")
        print("="*80)
        
        # 最高性能の方式を特定
        best_rps = max(results, key=lambda r: r.requests_per_second)
        best_success = max(results, key=lambda r: r.success_rate)
        best_response = min(results, key=lambda r: r.avg_response_time if r.avg_response_time > 0 else float('inf'))
        
        print(f"🏆 最高RPS: {best_rps.method} ({best_rps.requests_per_second:.1f} req/s)")
        print(f"🎯 最高成功率: {best_success.method} ({best_success.success_rate:.1%})")
        print(f"⚡ 最速応答: {best_response.method} ({best_response.avg_response_time:.2f}s)")
        
        # 総合評価
        print(f"\n🌟 総合推奨: ", end="")
        if best_rps == best_success == best_response:
            print(f"{best_rps.method}")
        else:
            print("負荷分散方式（バランスの取れた性能）")


async def run_comprehensive_benchmark():
    """包括的ベンチマークを実行"""
    benchmark = PerformanceBenchmark()
    results = []
    
    # テスト設定
    concurrent_users = 20
    timeout = 30.0
    
    try:
        # 1. 単一インスタンス
        result = await benchmark.benchmark_single_instance(concurrent_users, timeout)
        results.append(result)
        
        # 2. コネクションプール
        result = await benchmark.benchmark_connection_pool(concurrent_users, pool_size=10, timeout=timeout)
        results.append(result)
        
        # 3. 負荷分散器（アダプティブ）
        result = await benchmark.benchmark_load_balancer(concurrent_users, LoadBalanceStrategy.ADAPTIVE, timeout)
        results.append(result)
        
        # 4. 負荷分散器（最少接続数）
        result = await benchmark.benchmark_load_balancer(concurrent_users, LoadBalanceStrategy.LEAST_CONNECTIONS, timeout)
        results.append(result)
        
        # 結果表示
        benchmark.print_benchmark_results(results)
        
        return results
        
    except Exception as e:
        logger.error(f"ベンチマーク実行エラー: {e}")
        import traceback
        traceback.print_exc()
        return []


async def stress_test(concurrent_users: int = 50, duration_seconds: int = 60):
    """ストレステスト"""
    print(f"\n🔥 ストレステスト開始 ({concurrent_users}ユーザー, {duration_seconds}秒)")
    
    load_balancer = await get_load_balancer(LoadBalanceStrategy.ADAPTIVE)
    
    start_time = time.time()
    end_time = start_time + duration_seconds
    
    success_count = 0
    error_count = 0
    
    messages = [
        {"role": "system", "content": "あなたは学習支援AIです。"},
        {"role": "user", "content": "ストレステスト中です。"}
    ]
    
    async def stress_request():
        nonlocal success_count, error_count
        try:
            async with await load_balancer.get_client() as client:
                response = await asyncio.wait_for(
                    client.generate_response_async(messages),
                    timeout=30.0
                )
                success_count += 1
        except Exception:
            error_count += 1
    
    # 継続的にリクエストを送信
    tasks = []
    while time.time() < end_time:
        # 同時実行数を制御
        if len(tasks) < concurrent_users:
            task = asyncio.create_task(stress_request())
            tasks.append(task)
        
        # 完了したタスクを削除
        tasks = [task for task in tasks if not task.done()]
        
        await asyncio.sleep(0.1)  # 少し待機
    
    # 残りのタスクを完了まで待機
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)
    
    actual_duration = time.time() - start_time
    total_requests = success_count + error_count
    
    print(f"✅ ストレステスト完了:")
    print(f"   期間: {actual_duration:.1f}秒")
    print(f"   総リクエスト: {total_requests}")
    print(f"   成功: {success_count} ({success_count/total_requests:.1%})")
    print(f"   エラー: {error_count} ({error_count/total_requests:.1%})")
    print(f"   平均RPS: {total_requests/actual_duration:.1f}")


if __name__ == "__main__":
    # 基本ベンチマーク
    asyncio.run(run_comprehensive_benchmark())
    
    # ストレステスト
    asyncio.run(stress_test(concurrent_users=30, duration_seconds=30))