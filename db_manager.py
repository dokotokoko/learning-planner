import sqlite3
import json

#DB名
DB_FILE = "learning_assistant.db"

class DBManager:
    def __init__(self) :
        self.con = sqlite3.connect("DB_FILE")
        self.cur = self.con.cursor()

    #学習計画テーブルを作成する関数
    def create_table_learningPlans(self):
        self.cur.execute("""
            CREATE TABLE IF NOT EXISTS learning_plans
            (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                interest TEXT,
                goal TEXT,
                nextStep TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        self.con.commit()

    #DBに学習計画を保存する関数
    def save_learningPlans(self, interest:str, goal:str, nextStep:str):
        self.cur.execute("INSERT INTO learning_plans(interest, goal, nextStep) VALUES(?, ?, ?)",
                    (interest, goal, nextStep))

        self.con.commit()

    #DBから学習計画データを取得する関数
    def get_learningsPlans(self):
        self.cur.execute("SELECT * FROM learning_plans")
        return self.cur.fetchall()

    def close(self):
        self.con.close()
        
