import mysql.connector
import json
import logging
import os               # 環境変数を読み込むために追加
from dotenv import load_dotenv # .envファイルを読み込むために追加

# .envファイルから環境変数を読み込む
load_dotenv()

# DB名 (不要になったため削除)
# DB_FILE = "learning_assistant.db"

class DBManager:
    def __init__(self):
        try:
            # 環境変数から接続情報を取得
            db_host = os.getenv("DB_HOST", "localhost") # 第2引数はデフォルト値
            db_user = os.getenv("DB_USER")
            db_password = os.getenv("DB_PASSWORD")
            db_name = os.getenv("DB_NAME")

            # 環境変数が設定されていない場合のチェック（パスワードとDB名は必須とする）
            if not db_user or not db_password or not db_name:
                raise ValueError("データベース接続情報が環境変数に設定されていません (DB_USER, DB_PASSWORD, DB_NAME)")

            self.con = mysql.connector.connect(
                host=db_host,
                user=db_user,
                password=db_password,
                database=db_name
            )
            # buffered=True を指定して、fetchone() の後に別のクエリを実行できるようにする
            self.cur = self.con.cursor(buffered=True)
            self._initialize_tables()
        except mysql.connector.Error as err:
            # 接続エラーの詳細（ユーザー名を含む）をログに出力
            logging.error(f"MySQLへの接続に失敗しました (user: {db_user}): {err}")
            # 必要に応じて、ここでプログラムを終了させるか、デフォルトの動作を定義する
            raise # エラーを再送出して、呼び出し元に問題を通知
        except ValueError as verr:
             logging.error(verr)
             raise
    
    def _initialize_tables(self):
        """必要なテーブルの初期化を行う"""
        self.create_table_users()
        self.create_table_interests()
        self.create_table_goals()
        self.create_table_learningPlans()
        self.create_table_memos()
        self.create_table_chat_logs()

    # 興味関心テーブルを作成する関数
    def create_table_interests(self):

        self.cur.execute("""
            CREATE TABLE IF NOT EXISTS interests
            (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                interest TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)

        self.con.commit()
    
    # 興味関心を保存する関数
    def save_interests(self, user_id, interest:str):
        self.cur.execute("""
            INSERT INTO interests(user_id, interest) VALUES(%s, %s)
        """, (user_id, interest))
        self.con.commit()

    # 興味関心を取得する関数
    def get_interest(self, user_id):
        self.cur.execute("""
            SELECT interest FROM interests WHERE user_id = %s
        """, (user_id,))
        return self.cur.fetchall()
    
    # ゴールテーブルを作成する関数
    def create_table_goals(self):
        self.cur.execute("""
            CREATE TABLE IF NOT EXISTS goals
            (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            interest_id INTEGER,
            goal TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (interest_id) REFERENCES interests(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
            )
            """)
        
        self.con.commit()
    
    # ゴールを保存する関数
    def save_goal(self, user_id, interest, goal:str):
        # 既存の interest の id を取得
        self.cur.execute("SELECT id FROM interests WHERE interest = %s AND user_id = %s", (interest, user_id))
        row = self.cur.fetchone()
        if row is None:
            raise ValueError("興味関心の取得に失敗しました。")
        interest_id = row[0]

        # goals テーブルに、user_id、interest_id と goal を保存
        self.cur.execute("INSERT INTO goals (user_id, interest_id, goal) VALUES (%s, %s, %s)", (user_id, interest_id, goal,))
        logging.info("ゴールと関連する興味関心がDBに保存されました。")
        self.con.commit()
    
    # ゴールを取得する関数
    def get_goal(self, user_id):
        self.cur.execute("SELECT * FROM goals WHERE user_id = %s", (user_id,))
        return self.cur.fetchall()
    
    # 学習計画テーブルを作成する関数
    def create_table_learningPlans(self):
        # テーブルが存在する場合は削除
        self.cur.execute("DROP TABLE IF EXISTS learning_plans")

        self.cur.execute("""
            CREATE TABLE IF NOT EXISTS learning_plans
            (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                goal_id INTEGER,
                nextStep TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (goal_id) REFERENCES goals(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )""")

        self.con.commit()

    # DBに学習計画を保存する関数
    def save_learningPlans(self, user_id, goal:str, nextStep:str):
        # ゴールのIDを取得する
        self.cur.execute("SELECT id FROM goals WHERE goal = %s AND user_id = %s ORDER BY id DESC LIMIT 1", (goal, user_id))
        row = self.cur.fetchone()
        if row is None:
            raise ValueError("指定されたゴールがDBに見つかりません。")
        goal_id = row[0]
    
        # DBに保存する
        self.cur.execute(""" INSERT INTO learning_plans(user_id, goal_id, nextStep) VALUES(%s, %s, %s)""", (user_id, goal_id, nextStep,))
        self.con.commit()

    # DBから学習計画データを取得する関数
    def get_learningsPlans(self, user_id):
        self.cur.execute("SELECT * FROM learning_plans WHERE user_id = %s", (user_id,))
        return self.cur.fetchall()

    # シンプルなユーザーテーブルを作成
    def create_table_users(self):
        self.cur.execute("""
            CREATE TABLE IF NOT EXISTS users
            (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                access_code TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        self.con.commit()
    
    # 事前に許可されたユーザーを追加
    def add_test_users(self, users_list):
        for username, access_code in users_list:
            try:
                # MySQLでは INSERT IGNORE を使用して重複を無視
                self.cur.execute("""
                    INSERT IGNORE INTO users(username, access_code)
                    VALUES(%s, %s)
                """, (username, access_code))
            except mysql.connector.Error as err:
                logging.warning(f"テストユーザー追加中にエラーが発生しました: {err} ({username})")
                pass  # エラーが発生しても他のユーザーの処理を続行
        self.con.commit()
    
    # シンプル認証
    def verify_user(self, username, access_code):
        self.cur.execute("""
            SELECT id FROM users WHERE username = %s AND access_code = %s
        """, (username, access_code))
        user = self.cur.fetchone()
        return user[0] if user else None

    # ユーザー追加
    def add_user(self, username, access_code):
        try:
            self.cur.execute("""
                INSERT INTO users(username, access_code)
                VALUES(%s, %s)
            """, (username, access_code))
            self.con.commit()
            return True
        except mysql.connector.Error as err:
            # 重複エラー (エラーコード 1062) かどうかを確認することも可能
            # if err.errno == 1062:
            #     logging.info(f"ユーザー名は既に存在します: {username}")
            # else:
            #     logging.error(f"ユーザー追加中にエラーが発生しました: {err}")
            logging.warning(f"ユーザー追加中にエラーが発生しました（ユーザー名重複の可能性）: {err} ({username})")
            return False
    
    #DBにアドバイスを保存する (未使用のためコメントアウト)
    # def save_advice(self, user_id, log:str, advice:str):
    #     #ログのIDを取得する
    #     # 注意: advices テーブルと logs テーブルがMySQLに存在しないため、
    #     # このメソッドは現在エラーになります。スキーマ定義を追加する必要があります。
    #     try:
    #         self.cur.execute("""SELECT id FROM logs WHERE log = %s AND user_id = %s ORDER BY id DESC LIMIT 1""", (log, user_id))
    #         row = self.cur.fetchone()
    #         if row is None:
    #             raise ValueError("指定された学習記録がDBに見つかりません。logsテーブルを確認してください。")
    #         log_id = row[0]
    #
    #         #DBに保存する
    #         self.cur.execute(""" INSERT INTO advices(user_id, log_id, advice) VALUES(%s, %s, %s)""", (user_id, log_id, advice,))
    #         self.con.commit()
    #     except mysql.connector.Error as err:
    #         logging.error(f"アドバイス保存中にエラーが発生しました: {err}")
    #         # advices や logs テーブルが存在しない場合のエラー (例: 1146 Table doesn't exist)
    #         if err.errno == 1146:
    #              raise ValueError(f"必要なテーブル (advices または logs) が存在しません。スキーマを確認してください。 Error: {err}")
    #         else:
    #              raise # その他のMySQLエラーを再送出

    #DBからアドバイスを取得する (未使用のためコメントアウト)
    # def get_advice(self, user_id):
    #     # 注意: advices テーブルがMySQLに存在しないため、
    #     # このメソッドは現在エラーになります。スキーマ定義を追加する必要があります。
    #     try:
    #         self.cur.execute(""" SELECT * FROM advices WHERE user_id = %s """, (user_id,))
    #         return self.cur.fetchall()
    #     except mysql.connector.Error as err:
    #         logging.error(f"アドバイス取得中にエラーが発生しました: {err}")
    #         if err.errno == 1146: # Table 'my_app_db.advices' doesn't exist
    #             logging.warning("advices テーブルが存在しません。スキーマを確認してください。")
    #             return [] # テーブルがない場合は空のリストを返すなどの対応
    #         else:
    #              raise # その他のMySQLエラーを再送出

    def close(self):
        self.con.close()

    def delete_table_interests(self):
        self.cur.execute(""" DROP TABLE IF EXISTS interests""")
    
    def delete_table_goals(self):
        self.cur.execute(""" DROP TABLE IF EXISTS goals""")    
    
    def delete_table_learning_plans(self):
        self.cur.execute(""" DROP TABLE IF EXISTS learning_plans""")

    # def delete_table_logs(self): # 未使用のためコメントアウト
    #     self.cur.execute(""" DROP TABLE IF EXISTS logs""")

    # def delete_table_advices(self): # 未使用のためコメントアウト
    #     self.cur.execute(""" DROP TABLE IF EXISTS advices""")
    def delete_table_users(self):
        self.cur.execute(""" DROP TABLE IF EXISTS users""")

    # メモテーブルを作成する関数
    def create_table_memos(self):
        self.cur.execute("""
            CREATE TABLE IF NOT EXISTS user_memos
            (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                page_id VARCHAR(50) NOT NULL,
                content TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE KEY unique_user_page (user_id, page_id)
            )
        """)
        self.con.commit()

    # メモを保存する関数
    def save_memo(self, user_id, page_id: str, content: str):
        self.cur.execute("""
            INSERT INTO user_memos(user_id, page_id, content) 
            VALUES(%s, %s, %s)
            ON DUPLICATE KEY UPDATE 
            content = VALUES(content),
            updated_at = CURRENT_TIMESTAMP
        """, (user_id, page_id, content))
        self.con.commit()
        
        # 保存したメモを取得して返す
        self.cur.execute("""
            SELECT id, page_id, content, updated_at 
            FROM user_memos 
            WHERE user_id = %s AND page_id = %s
        """, (user_id, page_id))
        return self.cur.fetchone()

    # メモを取得する関数
    def get_memo(self, user_id, page_id: str):
        self.cur.execute("""
            SELECT id, page_id, content, updated_at 
            FROM user_memos 
            WHERE user_id = %s AND page_id = %s
        """, (user_id, page_id))
        return self.cur.fetchone()

    # ユーザーの全メモを取得する関数
    def get_user_memos(self, user_id):
        self.cur.execute("""
            SELECT id, page_id, content, updated_at 
            FROM user_memos 
            WHERE user_id = %s 
            ORDER BY updated_at DESC
        """, (user_id,))
        return self.cur.fetchall()

    # メモを削除する関数
    def delete_memo(self, user_id, page_id: str):
        self.cur.execute("""
            DELETE FROM user_memos 
            WHERE user_id = %s AND page_id = %s
        """, (user_id, page_id))
        self.con.commit()
        return self.cur.rowcount > 0

    # 対話履歴テーブルを作成する関数
    def create_table_chat_logs(self):
        self.cur.execute("""
            CREATE TABLE IF NOT EXISTS chat_logs
            (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                page VARCHAR(50) NOT NULL,
                sender VARCHAR(10) NOT NULL,
                message TEXT NOT NULL,
                context_data TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                CHECK (sender IN ('user', 'assistant'))
            )
        """)
        # インデックス作成（MySQLでは IF NOT EXISTS を使わずに例外処理で対応）
        try:
            self.cur.execute("""
                CREATE INDEX idx_chat_logs_user_id ON chat_logs(user_id)
            """)
        except Exception:
            pass  # インデックスが既に存在する場合は無視
        
        try:
            self.cur.execute("""
                CREATE INDEX idx_chat_logs_user_page ON chat_logs(user_id, page)
            """)
        except Exception:
            pass  # インデックスが既に存在する場合は無視
        
        try:
            self.cur.execute("""
                CREATE INDEX idx_chat_logs_created_at ON chat_logs(created_at)
            """)
        except Exception:
            pass  # インデックスが既に存在する場合は無視
        self.con.commit()

    # 対話履歴を保存する関数
    def save_chat_message(self, user_id, page: str, sender: str, message: str, context_data: str = None):
        """対話メッセージをデータベースに保存"""
        self.cur.execute("""
            INSERT INTO chat_logs(user_id, page, sender, message, context_data) 
            VALUES(%s, %s, %s, %s, %s)
        """, (user_id, page, sender, message, context_data))
        self.con.commit()
        return self.cur.lastrowid

    # ユーザーの全対話履歴を取得する関数
    def get_user_chat_history(self, user_id, limit: int = None):
        """ユーザーの全対話履歴を時系列順で取得"""
        query = """
            SELECT id, page, sender, message, context_data, created_at 
            FROM chat_logs 
            WHERE user_id = %s 
            ORDER BY created_at ASC
        """
        params = (user_id,)
        
        if limit:
            query += " LIMIT %s"
            params = (user_id, limit)
            
        self.cur.execute(query, params)
        return self.cur.fetchall()

    # 特定のページでの対話履歴を取得する関数
    def get_page_chat_history(self, user_id, page: str):
        """特定のページでの対話履歴を取得"""
        self.cur.execute("""
            SELECT id, page, sender, message, context_data, created_at 
            FROM chat_logs 
            WHERE user_id = %s AND page = %s 
            ORDER BY created_at ASC
        """, (user_id, page))
        return self.cur.fetchall()

    # LLM用の履歴コンテキストを生成する関数
    def get_conversation_context(self, user_id, include_pages: list = None, exclude_pages: list = None, limit: int = 100):
        """LLMに渡すための対話履歴コンテキストを生成"""
        query = """
            SELECT page, sender, message, created_at 
            FROM chat_logs 
            WHERE user_id = %s
        """
        params = [user_id]
        
        if include_pages:
            placeholders = ','.join(['%s'] * len(include_pages))
            query += f" AND page IN ({placeholders})"
            params.extend(include_pages)
        elif exclude_pages:
            placeholders = ','.join(['%s'] * len(exclude_pages))
            query += f" AND page NOT IN ({placeholders})"
            params.extend(exclude_pages)
            
        query += " ORDER BY created_at DESC"
        
        if limit:
            query += " LIMIT %s"
            params.append(limit)
            
        self.cur.execute(query, params)
        results = self.cur.fetchall()
        
        # LLM用のフォーマットに変換（時系列順に戻す）
        context_messages = []
        for row in reversed(results):  # DESCで取得したので逆順にする
            page, sender, message, created_at = row
            role = "user" if sender == "user" else "assistant"
            context_messages.append({
                "role": role,
                "content": message,
                "page": page,
                "timestamp": created_at.isoformat() if created_at else None
            })
        
        return context_messages

    # 対話履歴をクリアする関数（開発・テスト用）
    def clear_chat_history(self, user_id, page: str = None):
        """対話履歴をクリア（開発・テスト用）"""
        if page:
            self.cur.execute("""
                DELETE FROM chat_logs WHERE user_id = %s AND page = %s
            """, (user_id, page))
        else:
            self.cur.execute("""
                DELETE FROM chat_logs WHERE user_id = %s
            """, (user_id,))
        self.con.commit()
        return self.cur.rowcount

    def delete_table_memos(self):
        """メモテーブルを削除"""
        self.cur.execute(""" DROP TABLE IF EXISTS user_memos""")

    def delete_table_chat_logs(self):
        """対話履歴テーブルを削除"""
        self.cur.execute(""" DROP TABLE IF EXISTS chat_logs""")