import sqlite3
import json
import logging

#DB名
DB_FILE = "learning_assistant.db"

class DBManager:
    def __init__(self) :
        self.con = sqlite3.connect("DB_FILE")
        self.cur = self.con.cursor()

    #興味関心テーブルを作成する関数
    def create_table_interests(self):
        self.cur.execute("""
            CREATE TABLE IF NOT EXISTS interests
            (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                interest TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)

        self.con.commit()
    
    #興味関心を保存する関数
    def save_interests(self, user_id, interest:str):
        self.cur.execute("""
            INSERT INTO interests(user_id, interest) VALUES(?, ?)
        """, (user_id, interest))
        self.con.commit()

    #興味関心を取得する関数
    def get_interest(self, user_id):
        self.cur.execute("""
            SELECT interest FROM interests WHERE user_id = ?
        """, (user_id,))
        return self.cur.fetchall()

    #ゴールテーブルを作成する関数
    def create_table_goals(self):
        self.cur.execute("""
            CREATE TABLE IF NOT EXISTS goals
            (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            interest_id INTEGER,
            goal TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (interest_id) REFERENCES interests(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
            )
            """)
        
        self.con.commit()
    
    #ゴールを保存する関数
    def save_goal(self, user_id, interest, goal:str):
        # 既存の interest の id を取得
        self.cur.execute("SELECT id FROM interests WHERE interest = ? AND user_id = ?", (interest, user_id))
        row = self.cur.fetchone()
        if row is None:
            raise ValueError("興味関心の取得に失敗しました。")
        interest_id = row[0]

        # goals テーブルに、user_id、interest_id と goal を保存
        self.cur.execute("INSERT INTO goals (user_id, interest_id, goal) VALUES (?, ?, ?)", (user_id, interest_id, goal,))
        logging.info("ゴールと関連する興味関心がDBに保存されました。")
        self.con.commit()
    
    #ゴールを取得する関数
    def get_goal(self, user_id):
        self.cur.execute("SELECT * FROM goals WHERE user_id = ?", (user_id,))
        return self.cur.fetchall()

    #学習計画テーブルを作成する関数
    def create_table_learningPlans(self):
        self.cur.execute("""
            CREATE TABLE IF NOT EXISTS learning_plans
            (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                goal_id INTEGER,
                nextStep TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (goal_id) REFERENCES goals(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )""")

        self.con.commit()

    #DBに学習計画を保存する関数
    def save_learningPlans(self, user_id, goal:str, nextStep:str):
        #ゴールのIDを取得する
        self.cur.execute("SELECT id FROM goals WHERE goal = ? AND user_id = ? ORDER BY id DESC LIMIT 1", (goal, user_id))
        row = self.cur.fetchone()
        if row is None:
            raise ValueError("指定されたゴールがDBに見つかりません。")
        goal_id = row[0]
    
        #DBに保存する
        self.cur.execute(""" INSERT INTO learning_plans(user_id, goal_id, nextStep) VALUES(?, ?, ?)""", (user_id, goal_id, nextStep,))
        self.con.commit()

    #DBから学習計画データを取得する関数
    def get_learningsPlans(self, user_id):
        self.cur.execute("SELECT * FROM learning_plans WHERE user_id = ?", (user_id,))
        return self.cur.fetchall()
    

    #DBに学習記録テーブルを作成する
    def create_table_logs(self):
        self.cur.execute("""
            CREATE TABLE IF NOT EXISTS logs
            (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                log TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)

        self.con.commit()

    #DBに学習記録を保存する
    def save_log(self, user_id, log:str):
        self.cur.execute(""" INSERT INTO logs(user_id, log) VALUES(?, ?) """ , (user_id, log,))
        self.con.commit()

    #DBから学習記録を取得する
    def get_log(self, user_id):
        self.cur.execute(""" SELECT * FROM logs WHERE user_id = ? """, (user_id,))
        return self.cur.fetchall()
    
    #DBにアドバイステーブルを作成する
    def create_table_advices(self):
        self.cur.execute("""
            CREATE TABLE IF NOT EXISTS advices
            (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                log_id INTEGER,
                advice TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (log_id) REFERENCES logs(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            ) """)
        
        self.con.commit()
    
    #DBにアドバイスを保存する
    def save_advice(self, user_id, log:str, advice:str):
        #ログのIDを取得する
        self.cur.execute("""SELECT id FROM logs WHERE log = ? AND user_id = ? ORDER BY id DESC LIMIT 1""", (log, user_id))
        row = self.cur.fetchone()
        if row is None:
            raise ValueError("指定された学習記録がDBに見つかりません。")
        log_id = row[0]
    
        #DBに保存する
        self.cur.execute(""" INSERT INTO advices(user_id, log_id, advice) VALUES(?, ?, ?)""", (user_id, log_id, advice,))
        self.con.commit()
    
    #DBからアドバイスを取得する
    def get_advice(self, user_id):
        self.cur.execute(""" SELECT * FROM advices WHERE user_id = ? """, (user_id,))
        return self.cur.fetchall()
    
    #ユーザーテーブルを作成する関数
    def create_table_users(self):
        self.cur.execute("""
            CREATE TABLE IF NOT EXISTS users
            (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,  # 実際の実装では暗号化が必要
                email TEXT UNIQUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        self.con.commit()

    #ユーザー登録関数
    def register_user(self, username, password, email=None):
        try:
            self.cur.execute("""
                INSERT INTO users(username, password, email) VALUES(?, ?, ?)
            """, (username, password, email))
            self.con.commit()
            return True
        except sqlite3.IntegrityError:
            # ユーザー名またはメールが既に存在する場合
            return False

    #ユーザー認証関数
    def authenticate_user(self, username, password):
        self.cur.execute("""
            SELECT id, username FROM users WHERE username = ? AND password = ?
        """, (username, password))
        return self.cur.fetchone()

    def close(self):
        self.con.close()

    def delete_table_interests(self):
        self.cur.execute(""" DROP TABLE IF EXISTS interests""")
    
    def delete_table_goals(self):
        self.cur.execute(""" DROP TABLE IF EXISTS goals""")    
    
    def delete_table_learning_plans(self):
        self.cur.execute(""" DROP TABLE IF EXISTS learning_plans""")

    def delete_table_logs(self):
        self.cur.execute(""" DROP TABLE IF EXISTS logs""")

    def delete_table_advices(self):
        self.cur.execute(""" DROP TABLE IF EXISTS advices""")