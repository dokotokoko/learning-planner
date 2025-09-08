#!/usr/bin/env python
"""
Conversation Agent API テストスクリプト

使い方:
1. バックエンドサーバーを起動
2. ユーザーIDを設定
3. このスクリプトを実行

python test_conversation_agent.py
"""

import requests
import json
import sys
from typing import Dict, Any
from datetime import datetime

# 設定
BASE_URL = "http://localhost:8000"  # Docker環境の場合は適宜変更
USER_ID = "420"  # テスト用ユーザーID（実際のユーザーIDに置き換えてください）

# カラー出力用のANSIエスケープコード
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def print_colored(text: str, color: str = Colors.ENDC):
    """色付きテキストを出力"""
    print(f"{color}{text}{Colors.ENDC}")

def print_section(title: str):
    """セクションヘッダーを出力"""
    print()
    print_colored(f"{'=' * 60}", Colors.HEADER)
    print_colored(f"{title}", Colors.HEADER + Colors.BOLD)
    print_colored(f"{'=' * 60}", Colors.HEADER)

def print_json(data: Dict[str, Any], indent: int = 2):
    """JSON形式で整形して出力"""
    print(json.dumps(data, indent=indent, ensure_ascii=False))

def test_status_endpoint():
    """ステータスエンドポイントのテスト"""
    print_section("1. ステータス確認 (GET /conversation-agent/status)")
    
    headers = {
        "Authorization": f"Bearer {USER_ID}"
    }
    
    try:
        response = requests.get(
            f"{BASE_URL}/conversation-agent/status",
            headers=headers
        )
        
        if response.status_code == 200:
            print_colored("✅ ステータス取得成功", Colors.OKGREEN)
            status = response.json()
            
            print(f"\n利用可能: {status.get('available', False)}")
            print(f"有効化: {status.get('enabled', False)}")
            print(f"初期化済み: {status.get('initialized', False)}")
            
            if status.get('environment'):
                print(f"\n環境設定:")
                print_json(status['environment'])
            
            if status.get('features'):
                print(f"\n利用可能な機能:")
                print_json(status['features'])
                
            return status
        else:
            print_colored(f"❌ エラー: {response.status_code}", Colors.FAIL)
            print(response.text)
            return None
            
    except Exception as e:
        print_colored(f"❌ 接続エラー: {e}", Colors.FAIL)
        return None

def test_initialize_endpoint(mock_mode: bool = True):
    """初期化エンドポイントのテスト"""
    print_section("2. 手動初期化 (POST /conversation-agent/initialize)")
    
    headers = {
        "Authorization": f"Bearer {USER_ID}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/conversation-agent/initialize",
            headers=headers,
            params={"mock_mode": mock_mode}
        )
        
        if response.status_code == 200:
            print_colored("✅ 初期化成功", Colors.OKGREEN)
            result = response.json()
            print_json(result)
            return True
        else:
            print_colored(f"❌ エラー: {response.status_code}", Colors.FAIL)
            print(response.text)
            return False
            
    except Exception as e:
        print_colored(f"❌ 接続エラー: {e}", Colors.FAIL)
        return False

def test_chat_endpoint(message: str, project_id: int = None, debug_mode: bool = True):
    """チャットエンドポイントのテスト"""
    print_section("3. 対話エージェントチャット (POST /conversation-agent/chat)")
    
    headers = {
        "Authorization": f"Bearer {USER_ID}",
        "Content-Type": "application/json"
    }
    
    request_data = {
        "message": message,
        "debug_mode": debug_mode,
        "mock_mode": True,
        "include_history": True,
        "history_limit": 10
    }
    
    if project_id:
        request_data["project_id"] = project_id
    
    print(f"\nリクエスト:")
    print_colored(f"メッセージ: {message}", Colors.OKCYAN)
    if project_id:
        print(f"プロジェクトID: {project_id}")
    print(f"デバッグモード: {debug_mode}")
    
    try:
        response = requests.post(
            f"{BASE_URL}/conversation-agent/chat",
            headers=headers,
            json=request_data
        )
        
        if response.status_code == 200:
            print_colored("\n✅ チャット成功", Colors.OKGREEN)
            result = response.json()
            
            # 主要な情報を表示
            print(f"\n📝 応答:")
            print_colored(result['response'], Colors.OKBLUE)
            
            print(f"\n🎯 サポートタイプ: {result.get('support_type', 'N/A')}")
            print(f"📊 選択された行動: {', '.join(result.get('selected_acts', []))}")
            
            if result.get('state_snapshot'):
                print(f"\n📸 状態スナップショット:")
                print_json(result['state_snapshot'])
            
            if result.get('project_plan'):
                print(f"\n📋 プロジェクト計画:")
                print_json(result['project_plan'])
            
            if result.get('debug_info'):
                print(f"\n🔍 デバッグ情報:")
                print_json(result['debug_info'])
            
            if result.get('error'):
                print_colored(f"\n⚠️ エラー: {result['error']}", Colors.WARNING)
                
            return result
        else:
            print_colored(f"❌ エラー: {response.status_code}", Colors.FAIL)
            print(response.text)
            return None
            
    except Exception as e:
        print_colored(f"❌ 接続エラー: {e}", Colors.FAIL)
        return None

def run_test_sequence():
    """テストシーケンスを実行"""
    print_colored("\n🚀 Conversation Agent APIテスト開始", Colors.HEADER + Colors.BOLD)
    print(f"サーバー: {BASE_URL}")
    print(f"ユーザーID: {USER_ID}")
    print(f"時刻: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 1. ステータス確認
    status = test_status_endpoint()
    if not status:
        print_colored("\n⚠️ サーバーに接続できません。バックエンドが起動しているか確認してください。", Colors.WARNING)
        return
    
    # 2. 初期化が必要な場合
    if not status.get('initialized') or not status.get('available'):
        print_colored("\n⚠️ 対話エージェントが初期化されていません。初期化を試みます...", Colors.WARNING)
        if not test_initialize_endpoint(mock_mode=True):
            print_colored("\n❌ 初期化に失敗しました。", Colors.FAIL)
            print("以下を確認してください:")
            print("1. conversation_agentモジュールが存在するか")
            print("2. 依存関係がインストールされているか")
            print("3. ENABLE_CONVERSATION_AGENT環境変数が設定されているか")
            return
    
    # 3. テストメッセージを送信
    test_messages = [
        {
            "message": "探究学習について教えてください",
            "project_id": None
        },
        {
            "message": "環境問題について調べたいです",
            "project_id": None
        },
        {
            "message": "私のテーマは「プラスチックごみ問題」です。どのように進めればよいでしょうか？",
            "project_id": None
        }
    ]
    
    for i, test_case in enumerate(test_messages, 1):
        print()
        print_colored(f"\n📌 テストケース {i}/{len(test_messages)}", Colors.HEADER)
        result = test_chat_endpoint(
            message=test_case["message"],
            project_id=test_case.get("project_id"),
            debug_mode=True
        )
        
        if not result:
            print_colored(f"テストケース {i} 失敗", Colors.FAIL)
        else:
            print_colored(f"テストケース {i} 成功", Colors.OKGREEN)
        
        # 次のテストまで少し待機
        import time
        if i < len(test_messages):
            time.sleep(1)
    
    print_section("テスト完了")
    print_colored("✅ すべてのテストが完了しました", Colors.OKGREEN)

def main():
    """メイン関数"""
    if len(sys.argv) > 1:
        # コマンドライン引数がある場合は、それをメッセージとして使用
        message = " ".join(sys.argv[1:])
        print_colored(f"\n💬 カスタムメッセージでテスト: {message}", Colors.HEADER)
        test_chat_endpoint(message, debug_mode=True)
    else:
        # 通常のテストシーケンスを実行
        run_test_sequence()

if __name__ == "__main__":
    main()