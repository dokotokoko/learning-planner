"""
コンテキスト管理システムのテストスクリプト
段階的に各機能をテスト
"""
import os
import sys
import asyncio
import logging
from datetime import datetime
from typing import List, Dict, Any

# 環境変数設定（テスト用）
os.environ["ENABLE_CONTEXT_MANAGER"] = "true"
os.environ["TOKEN_BUDGET_IN"] = "1000"  # テスト用に小さい値
os.environ["N_RECENT"] = "5"
os.environ["K_RETRIEVE"] = "3"

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# モジュールインポート
from context_manager import ContextManager, ContextSection
from embedding_utils import EmbeddingClient, SemanticSearch, SearchResult
from context_integration import (
    initialize_context_system,
    build_enhanced_messages,
    build_legacy_messages
)

def create_test_history() -> List[Dict[str, Any]]:
    """テスト用の会話履歴を作成"""
    return [
        {
            "id": 1,
            "sender": "user",
            "message": "プロジェクトの要件を教えてください",
            "created_at": "2024-01-01T10:00:00Z"
        },
        {
            "id": 2,
            "sender": "assistant",
            "message": "以下の要件で進めます：1. レスポンシブデザイン 2. 高速なパフォーマンス 3. セキュアな実装",
            "created_at": "2024-01-01T10:01:00Z"
        },
        {
            "id": 3,
            "sender": "user",
            "message": "データベース設計について相談したいです",
            "created_at": "2024-01-01T10:05:00Z"
        },
        {
            "id": 4,
            "sender": "assistant",
            "message": "正規化を適切に行い、インデックスを最適化しましょう",
            "created_at": "2024-01-01T10:06:00Z"
        },
        {
            "id": 5,
            "sender": "user",
            "message": "了解しました",
            "created_at": "2024-01-01T10:07:00Z"
        },
        {
            "id": 6,
            "sender": "assistant",
            "message": "何か他に質問はありますか？",
            "created_at": "2024-01-01T10:08:00Z"
        },
        {
            "id": 7,
            "sender": "user",
            "message": "API設計の方針を決めたいです",
            "created_at": "2024-01-01T10:10:00Z"
        },
        {
            "id": 8,
            "sender": "assistant",
            "message": "RESTful APIで、OpenAPI仕様に準拠することを推奨します",
            "created_at": "2024-01-01T10:11:00Z"
        }
    ]

async def test_phase1_basic_context():
    """Phase 1: 基本的なコンテキスト管理をテスト"""
    print("\n" + "="*50)
    print("Phase 1: 基本的なコンテキスト管理のテスト")
    print("="*50)
    
    # コンテキストマネージャーの初期化
    context_manager = ContextManager()
    
    # テスト用の会話履歴
    history = create_test_history()
    
    # コンテキスト構築
    messages, metrics = await context_manager.build_context(
        user_message="前に話した要件について確認したいです",
        conversation_id="test-conversation-001",
        system_prompt="あなたは親切なアシスタントです。",
        conversation_history=history
    )
    
    # 結果表示
    print("\n📊 生成されたコンテキスト:")
    print("-" * 40)
    
    for i, msg in enumerate(messages):
        role = msg["role"]
        content = msg["content"][:200] + "..." if len(msg["content"]) > 200 else msg["content"]
        print(f"\n[{i+1}] Role: {role}")
        print(f"Content: {content}")
    
    print("\n📈 メトリクス:")
    print("-" * 40)
    print(f"総トークン数: {metrics.total_tokens}")
    print(f"システム: {metrics.system_tokens}")
    print(f"要約: {metrics.summary_tokens}")
    print(f"直近: {metrics.recent_tokens}")
    print(f"圧縮率: {metrics.compression_ratio:.2f}")
    
    return messages, metrics

async def test_phase2_embeddings():
    """Phase 2: 埋め込み生成と検索をテスト"""
    print("\n" + "="*50)
    print("Phase 2: 埋め込み生成と検索のテスト")
    print("="*50)
    
    # 埋め込みクライアントの初期化（モック）
    embedding_client = EmbeddingClient(provider="openai")
    
    # テストテキスト
    test_texts = [
        "プロジェクトの要件定義について",
        "データベース設計の最適化",
        "APIのセキュリティ対策",
        "今日の天気はどうですか",  # 無関係な文
        "要件に従った実装を進めます"
    ]
    
    print("\n🔬 埋め込み生成テスト:")
    print("-" * 40)
    
    embeddings = []
    for text in test_texts:
        embedding = await embedding_client.generate_embedding(text)
        embeddings.append(embedding)
        print(f"✅ '{text[:30]}...' → ベクトル次元: {embedding.shape}")
    
    # 類似度計算
    print("\n📐 類似度計算テスト:")
    print("-" * 40)
    
    query_text = "要件定義の確認"
    query_embedding = await embedding_client.generate_embedding(query_text)
    
    print(f"クエリ: '{query_text}'")
    print("\n類似度スコア:")
    
    similarities = []
    for i, (text, emb) in enumerate(zip(test_texts, embeddings)):
        similarity = embedding_client.cosine_similarity(query_embedding, emb)
        similarities.append((i, text, similarity))
        print(f"  [{i}] {similarity:.3f} - {text[:40]}...")
    
    # スコア順にソート
    similarities.sort(key=lambda x: x[2], reverse=True)
    
    print("\n🏆 Top 3 類似文書:")
    for i, (idx, text, score) in enumerate(similarities[:3]):
        print(f"  {i+1}. (スコア: {score:.3f}) {text}")
    
    # キャッシュ統計
    stats = embedding_client.get_cache_stats()
    print(f"\n📊 キャッシュ統計: {stats}")

async def test_phase2_semantic_search():
    """Phase 2: 意味検索とMMRをテスト"""
    print("\n" + "="*50)
    print("Phase 2: 意味検索とMMRのテスト")
    print("="*50)
    
    # 初期化
    embedding_client = EmbeddingClient(provider="openai")
    semantic_search = SemanticSearch(embedding_client)
    
    # 検索テスト
    print("\n🔍 意味検索テスト:")
    print("-" * 40)
    
    results = await semantic_search.search(
        query="プロジェクトの要件について",
        conversation_id="test-conversation-001",
        k=3,
        use_mmr=True
    )
    
    print(f"検索結果: {len(results)}件")
    for i, result in enumerate(results):
        print(f"\n[{i+1}] スコア: {result.score:.3f}")
        print(f"  内容: {result.text[:100]}...")
        print(f"  メタデータ: {result.metadata}")
    
    # トピック切替検出
    print("\n🔄 トピック切替検出テスト:")
    print("-" * 40)
    
    current_text = "天気予報について教えてください"  # 新しいトピック
    recent_texts = [
        "APIの設計方針",
        "データベースの正規化",
        "要件定義の確認"
    ]
    
    current_emb = await embedding_client.generate_embedding(current_text)
    recent_embs = [
        await embedding_client.generate_embedding(text)
        for text in recent_texts
    ]
    
    is_switch = semantic_search.detect_topic_switch(
        current_emb,
        recent_embs,
        threshold=0.8
    )
    
    print(f"現在のメッセージ: '{current_text}'")
    print(f"トピック切替検出: {'はい ✅' if is_switch else 'いいえ ❌'}")

async def test_integration():
    """統合テスト: build_enhanced_messages関数"""
    print("\n" + "="*50)
    print("統合テスト: build_enhanced_messages")
    print("="*50)
    
    # コンテキストシステムの初期化
    await initialize_context_system()
    
    # テスト用データ
    user_message = "前回の要件定義について確認させてください"
    conversation_id = "test-conv-002"
    history = create_test_history()
    system_prompt = "あなたは技術サポートアシスタントです。"
    
    # 強化メッセージ構築
    print("\n🚀 強化メッセージ構築:")
    print("-" * 40)
    
    messages, metrics = await build_enhanced_messages(
        user_message=user_message,
        conversation_id=conversation_id,
        conversation_history=history,
        system_prompt=system_prompt
    )
    
    print(f"生成されたメッセージ数: {len(messages)}")
    
    if metrics:
        print(f"\n📊 コンテキストメトリクス:")
        print(f"  総トークン: {metrics.total_tokens}")
        print(f"  圧縮率: {metrics.compression_ratio:.2f}")
    else:
        print("\n⚠️ メトリクスなし（レガシーモード）")
    
    # レガシーモードとの比較
    print("\n📊 レガシーモードとの比較:")
    print("-" * 40)
    
    legacy_messages = build_legacy_messages(
        user_message=user_message,
        conversation_history=history,
        system_prompt=system_prompt
    )
    
    print(f"レガシー: {len(legacy_messages)}メッセージ")
    print(f"強化版: {len(messages)}メッセージ")
    
    # トークン数の概算比較
    legacy_tokens = sum(len(msg["content"]) // 4 for msg in legacy_messages)
    enhanced_tokens = metrics.total_tokens if metrics else sum(len(msg["content"]) // 4 for msg in messages)
    
    print(f"\nトークン数（概算）:")
    print(f"  レガシー: ~{legacy_tokens}")
    print(f"  強化版: {enhanced_tokens}")
    print(f"  削減率: {(1 - enhanced_tokens/legacy_tokens)*100:.1f}%")

async def main():
    """メインテスト関数"""
    print("\n" + "🎯"*25)
    print(" コンテキスト管理システム テストスイート")
    print("🎯"*25)
    
    try:
        # Phase 1テスト
        await test_phase1_basic_context()
        
        # Phase 2テスト（埋め込み機能が有効な場合）
        if os.environ.get("ENABLE_EMBEDDINGS", "false").lower() == "true":
            await test_phase2_embeddings()
            await test_phase2_semantic_search()
        else:
            print("\n⚠️ Phase 2テストはスキップ（ENABLE_EMBEDDINGS=false）")
        
        # 統合テスト
        await test_integration()
        
        print("\n" + "✅"*25)
        print(" すべてのテストが完了しました！")
        print("✅"*25)
        
    except Exception as e:
        print(f"\n❌ エラーが発生しました: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # テスト実行
    asyncio.run(main())