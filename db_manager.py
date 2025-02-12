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
                interest TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        self.con.commit()
    
    #興味関心を保存する関数
    def save_interests(self, interest:str):
        self.cur.execute("""INSERT INTO interests(interest) VALUES(?)""",
                         (interest,)
        )

        self.con.commit()

    #興味関心を取得する関数
    def get_interest(self):
        self.cur.execute(""" SELECT interest FROM interests""")
        return self.cur.fetchall()

    #ゴールテーブルを作成する関数
    def create_table_goals(self):
        self.cur.execute("""
            CREATE TABLE IF NOT EXISTS goals
            (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            interest_id INTEGER,
            goal TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (interest_id) REFERENCES interests(id)
            )
            """)
        
        self.con.commit()
    
    #ゴールを保存する関数
    def save_goal(self, interest, goal:str):
        # 既存の interest の id を取得
        self.cur.execute("SELECT id FROM interests WHERE interest = ?", (interest,))
        row = self.cur.fetchone()
        if row is None:
            raise ValueError("興味関心の取得に失敗しました。")
        interest_id = row[0]

        # goals テーブルに、interest_id と goal を保存
        self.cur.execute("INSERT INTO goals (interest_id, goal) VALUES (?, ?)", (interest_id, goal,))
        self.con.commit()
        logging.info("ゴールと関連する興味関心がDBに保存されました。")
    
    #ゴールを取得する関数
    def get_goal(self):
        self.cur.execute("SELECT * FROM goals")
        return self.cur.fetchall()

    #学習計画テーブルを作成する関数
    def create_table_learningPlans(self):
        self.cur.execute("""
            CREATE TABLE IF NOT EXISTS learning_plans
            (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                goal_id INTEGER,
                nextStep TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (goal_id) REFERENCES goals(id)
            )""")

        self.con.commit()

    #DBに学習計画を保存する関数
    def save_learningPlans(self, goal:str, nextStep:str):
        #ゴールのIDを取得する
        self.cur.execute("SELECT id FROM goals WHERE goal = ? ORDER BY id DESC LIMIT 1",(goal,))
        row = self.cur.fetchone()
        if row is None:
            raise ValueError("指定されたゴールがDBに見つかりません。")
        goal_id = row[0]
    
        #DBに保存する
        self.cur.execute(""" INSERT INTO learning_plans(goal_id, nextStep) VALUES(?, ?)""", (goal_id, nextStep,))
        self.con.commit()

    #DBから学習計画データを取得する関数
    def get_learningsPlans(self):
        self.cur.execute("SELECT * FROM learning_plans")
        return self.cur.fetchall()
    

    #DBに学習記録テーブルを作成する
    def create_table_logs(self):
        self.cur.execute("""
            CREATE TABLE IF NOT EXISTS logs
            (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                log TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        self.con.commit()

    #DBに学習記録を保存する
    def save_log(self, log:str):
        self.cur.execute(""" INSERT INTO logs(log) VALUES(?) """ , (log,))
        self.con.commit()

    #DBから学習記録を取得する
    def get_log(self):
        self.cur.execute(""" SELECT * FROM logs """)
        return self.cur.fetchall()
    
    #DBにアドバイステーブルを作成する
    def create_table_advices(self):
        self.cur.execute("""
            CREATE TABLE IF NOT EXISTS advices
            (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                log_id INTEGER,
                advice TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (log_id) REFERENCES logs(id)
            ) """)
        
        self.con.commit()
    
    #DBにアドバイスを保存する
    def save_advice(self, log:str, advice:str):
        #ゴールのIDを取得する
        self.cur.execute("""SELECT id FROM logs WHERE log = ? ORDER BY id DESC LIMIT 1""",(log,))
        row = self.cur.fetchone()
        if row is None:
            raise ValueError("指定された学習記録がDBに見つかりません。")
        log_id = row[0]
    
        #DBに保存する
        self.cur.execute(""" INSERT INTO advices(log_id, advice) VALUES(?, ?)""", (log_id, advice,))
        self.con.commit()
    
    #DBからアドバイスを取得する
    def get_advice(self):
        self.cur.execute(""" SELECT * FROM advices """)
        return self.cur.fetchall()
    
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