import streamlit as st
import os
import sqlite3
from openai import OpenAI
from dotenv import load_dotenv


PLANNER_PROMPT = "あなたは優秀な学習支援者です。ユーザーの学びたいこと・興味に従って、学習計画を作成してください。あなたの達成する目標は「ユーザーが何をやればいいかわからないという状態に無い」ことです。また、応答は日本語で行ったください。"

OBJECT_PROMPT = "あなたは優秀な先生です。生徒の興味・関心を聞いて、「そのテーマの探究活動を通して何を探究したいのか」「なぜそのテーマを探究するのか」を生徒が言語化できるように質問を1つしてください。"

GOAL_PROMPT = "あなたは優秀な先生です。生徒の興味・関心と、その探究テーマを選ぶ目的を聞いて、「そのテーマの探究活動を通して何を達成したいのか」というゴールを言語化できるように質問を1つしてください。"

# Prompt定義（仮の値を設定。実際の内容に置き換えてください）
PROMPTS = {
    "目的": OBJECT_PROMPT,
    "目標": GOAL_PROMPT,
    "学習計画": PLANNER_PROMPT
}


# DBの管理
class DBManager:
    def __init__(self):
        self.conn = sqlite3.connect('learning.db')
        self.cursor = self.conn.cursor()
        self.init_tables()

    def init_tables(self):
        self.cursor.execute('''CREATE TABLE IF NOT EXISTS interests (id INTEGER PRIMARY KEY, interest TEXT)''')
        self.cursor.execute('''CREATE TABLE IF NOT EXISTS goals (id INTEGER PRIMARY KEY, goal TEXT)''')
        self.cursor.execute('''CREATE TABLE IF NOT EXISTS learning_plans (id INTEGER PRIMARY KEY, goal TEXT, next_step TEXT)''')
        self.cursor.execute('''CREATE TABLE IF NOT EXISTS dialogues (id INTEGER PRIMARY KEY, step TEXT, ai_question TEXT, user_response TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);''')
        self.conn.commit()

    def save_interest(self, interest):
        self.cursor.execute('INSERT INTO interests (interest) VALUES (?)', (interest,))
        self.conn.commit()

    def save_goal(self, goal):
        self.cursor.execute('INSERT INTO goals (goal) VALUES (?)', (goal,))
        self.conn.commit()

    def save_learning_plan(self, goal, plan):
        self.cursor.execute('INSERT INTO learning_plans (goal, next_step) VALUES (?,?)', (goal, plan))
        self.conn.commit()

    def save_dialogue(self, step, ai_question, user_response):
        self.cursor.execute('INSERT INTO dialogues (step, ai_question, user_response) VALUES (?, ?, ?)',
                            (step, ai_question, user_response))
        self.conn.commit()

    def close(self):
        self.conn.close()

# LLMとのやりとり
class LearningPlanner:
    def __init__(self):
        load_dotenv()
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = "gpt-4o"

    def generate_response(self, prompt, user_input):
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": user_input}
            ]
        )
        return response.choices[0].message.content

planner = LearningPlanner()
db = DBManager()

# Streamlit UI
st.title("探究学習AIアシスタント")

if 'dialogue_log' not in st.session_state:
    st.session_state.dialogue_log = []

# Step 1: ユーザーがテーマを入力
interest = st.text_input("① 探究したいテーマを入力してください")

if st.button("テーマを確定") and interest:
    ai_question = planner.generate_response(GOAL_PROMPT, interest)
    st.session_state.dialogue_log.append(("AI", ai_question))
    db.save_dialogue("目標", ai_question, interest)

# Step 2 & 3: AIとの問答を数回繰り返す
for idx, (sender, message) in enumerate(st.session_state.dialogue_log):
    st.write(f"{sender}: {message}")

if len(st.session_state.dialogue_log) > 0:
    user_response = st.text_input("あなたの回答", key=f"response_{len(st.session_state.dialogue_log)}")
    if st.button("回答を送信") and user_response:
        last_question = st.session_state.dialogue_log[-1][1]
        db.save_dialogue("目標", last_question, user_response)
        ai_question = planner.generate_response(GOAL_PROMPT, user_response)
        st.session_state.dialogue_log.append(("You", user_response))
        st.session_state.dialogue_log.append(("AI", ai_question))

# Step 4: 目標入力
final_goal = st.text_input("④ 最終的な目標を入力してください", key="final_goal")

# Step 5 & 6: 目的の解像度を上げる問答
if st.button("最終目標を確定") and final_goal:
    ai_question = planner.generate_response(OBJECT_PROMPT, final_goal)
    st.session_state.dialogue_log.append(("AI", ai_question))
    db.save_dialogue("目的", ai_question, final_goal)

# Step 7: 学習計画の作成
if st.button("学習計画を作成") and final_goal:
    plan = planner.generate_response(PLANNER_PROMPT, final_goal)
    st.write("提案された学習計画：", plan)
    db.save_dialogue("学習計画", "学習計画提案", plan)

# DB終了
st.button("終了", on_click=db.close)
