# db_initializer.py
# db_initializer.py
import os
import sys

# 絶対パスの設定と追加
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)  # プロジェクトのルートディレクトリ
sys.path.append(root_dir)  # パスに追加

from module.db_manager import DBManager

def initialize_all_tables():
    """すべてのテーブルを削除して再作成します"""
    db = DBManager()
    
    print("データベースの初期化を開始します...")
    
    # 既存のテーブルをすべて削除
    print("既存のテーブルを削除しています...")
    db.delete_table_users()
    db.delete_table_interests()
    db.delete_table_goals()
    db.delete_table_learning_plans()
    
    # 新しいテーブルを作成
    print("新しいテーブルを作成しています...")
    db.create_table_users()
    db.create_table_interests()
    db.create_table_goals()
    db.create_table_learningPlans()
    
    print("データベースの初期化が完了しました！")
    
    # 接続を閉じる
    db.close()
    print("データベース接続を閉じました。")

if __name__ == "__main__":
    confirmation = input("警告: すべてのデータが削除されます。続行しますか？(yes/no): ")
    if confirmation.lower() == 'yes':
        initialize_all_tables()
    else:
        print("初期化をキャンセルしました。")