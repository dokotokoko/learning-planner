import streamlit as st
import os
import sys
import sqlite3
from openai import OpenAI
from dotenv import load_dotenv
import logging


# セッション状態で現在のページ番号を管理
if "page" not in st.session_state:
    st.session_state.page = 1

def next_page():
    st.session_state.page += 1

def prev_page():
    st.session_state.page -= 1

#DB名
DB_FILE = "learning_assistant.db"

class DBManager:
    def __init__(self) :
        self.con = sqlite3.connect(DB_FILE)
        self.cur = self.con.cursor()

    #興味関心テーブルを作成する関数
    def create_table_interests(self):
        # 既存のテーブルを削除（必要に応じて）
        self.cur.execute("DROP TABLE IF EXISTS interests")

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
        # テーブルが存在する場合は削除
        self.cur.execute("DROP TABLE IF EXISTS learning_plans")

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
DB = DBManager()

GOAL_PROMPT = """
あなたは高校生の探究学習を伴走する経験の豊富な教師です。
生徒の回答内容に応じて、言語化や思考を小さなステップで促すように、柔軟に問いかけや要約、

全部で3回の問答で生徒の言語化が進むように調整しながら、負荷が大きすぎないように質問は1つだけにしてください。

【フェーズ1：導入・ゴール設定 (Onboarding)】
- 目的：ユーザーの興味や背景知識、既存の経験を把握して、具体的な活動目標を設定する
- やること：
  1. そのテーマを探究することで、生徒が最終的にどうなりたいのか明確にする思考を促す
  2. そのテーマの探究のアウトプットとして、どのように日常や社会に接続できそうか、具体的な選択肢を複数提案しながら質問する
  3. テーマに関連するキーワードや過去の学び、印象に残ったエピソードを聞き出す
  4. 必要に応じて「5W1H」「5つのなぜ」などのテンプレート的質問を活用し、より詳しく引き出す
- 例）「これまでに関連する学習や活動をされたことはありますか？」
"""

CONTENT_PROMPT = """
あなたは高校生の探究学習を伴走する経験の豊富な教師です。
生徒の回答内容に応じて、言語化や思考を小さなステップで促すように、柔軟に問いかけや要約、提案を行いましょう。

全部で3回の問答で生徒の言語化が進むように調整しながら、負荷が大きすぎないように質問は1つだけにしてください。

【抽象的テーマの具体化 (Clarification & Refinement)】
- 目的：漠然とした興味・テーマを、より具体的なリサーチクエスチョンや活動内容へ絞り込む
- やること：
  1. ユーザーが興味を持っている側面を複数の視点（社会的・技術的・個人的など）から尋ねる
  2. ユーザーの回答を要約・再構成し、「こういう方向性がありそうですね」と提示する
  3. 深掘りが必要そうな点があれば追加の問いかけを行う
- 例）「そのテーマの中で特に興味がある部分はどれでしょうか？例えば、①基礎理論の理解、②技術の応用方法、③現在の技術の進展、④新たなリサーチクエスチョンを元に研究」
  　　「そのテーマに関して理解を深めるために、特に重点を置きたいトピックや分野はありますか？例えば、、、（選択肢の提案）」

【選択肢提示 (Option Proposals)】
- 目的：ユーザーの興味や背景に沿った具体的な活動・学習プランの選択肢を複数提示する
- やること：
  1.そのテーマに詳しくない初学者に、どのような選択肢があるのか提案する
  例）量子コンピュータに興味があるとのことですが、具体的にどのようなことを学びたいと思っていますか？例えば、特定の量子プログラミング言語の習得、量子アルゴリズムの理解、または実際に量子コンピュータを実装することなどですか？
"""
# ページごとの内容を定義
def page1():
    st.title("探究学習アシスタント")
    st.write("これは最初の画面です。")

    #DB初期化
    DB.create_table_interests()
    DB.create_table_goals()
    DB.create_table_learningPlans()

    theme = st.text_input("探究学習のテーマを入力してください")
    DB.save_interests(user_id=0, interest=theme)

    if st.button("次へ"):
        next_page()
        st.rerun()

def page2():
    st.title("Step2：探究学習の目標を決めよう！")
    st.write("")

    # 変数を関数の先頭で初期化
    user_theme_str = ""
    
    # 会話履歴の初期化（存在しない場合のみ）
    if 'dialogue_log' not in st.session_state:
        st.session_state.dialogue_log = []
        
        # 初期メッセージは会話履歴が空の時だけ追加する
        user_theme = DB.get_interest(user_id=0)
        if user_theme and len(user_theme) > 0:
            user_theme_str = user_theme[0][0]
            st.write(f"あなたの探究テーマ: {user_theme_str}")
            
            # セッション状態に保存して後で使えるようにする
            st.session_state.user_theme_str = user_theme_str
            
            # 初期メッセージを生成して対話履歴に追加
            ai_question = planner.generate_response(prompt=GOAL_PROMPT, user_input=user_theme_str)
            st.session_state.dialogue_log.append(("AI", ai_question))
        else:
            st.warning("テーマが登録されていません。前の画面で登録してください。")
            return  # テーマがない場合は処理を中断
    else:
        # セッション状態から取得
        if 'user_theme_str' in st.session_state:
            user_theme_str = st.session_state.user_theme_str

    # 対話履歴の表示
    for sender, message in st.session_state.dialogue_log:
        with st.chat_message("assistant" if sender == "AI" else "user"):
            st.write(message)

    # 対話回数をカウント（AIの発言回数をカウント）
    ai_messages_count = sum(1 for sender, _ in st.session_state.dialogue_log if sender == "AI")
    user_messages_count = sum(1 for sender, _ in st.session_state.dialogue_log if sender == "user")
    # 対話回数が3回未満の場合のみ、入力フィールドを表示
    if user_messages_count < 3:
        # ユーザー入力
        user_message = st.chat_input("あなたの回答を入力してください")
        
        if user_message:  # ユーザーが何か入力した場合のみ実行
            # 対話履歴に追加
            st.session_state.dialogue_log.append(("user", user_message))
            
            # AIの応答を生成
            response = planner.generate_response(prompt=GOAL_PROMPT, user_input=user_message)
            
            # 対話履歴に追加
            st.session_state.dialogue_log.append(("AI", response))
            
            # 画面を再読み込みして最新の対話を表示
            st.rerun()
    else:
        # 対話が3回に達した場合のメッセージ
        st.success("目標設定のための対話が完了しました。「次へ」ボタンをクリックして次のステップに進みましょう。")
        
        # 最終目標を保存するテキストエリア
        if 'final_goal' not in st.session_state:
            st.session_state.final_goal = ""
        
        final_goal = st.text_area("学習目標を整理しましょう", st.session_state.final_goal)
        
        if final_goal != st.session_state.final_goal:
            st.session_state.final_goal = final_goal
            DB.save_goal(user_id=0, interest=user_theme_str, goal=final_goal)
            st.rerun()

    col1, col2 = st.columns(2)
    with col1:
        if st.button("前へ"):
            prev_page()
            st.rerun()
    with col2:
        if st.button("次へ"):
            # 目標がセットされていれば次のページへ
            if ai_messages_count >= 3 and 'final_goal' in st.session_state and st.session_state.final_goal:
                next_page()
                st.rerun()
            elif ai_messages_count < 3:
                st.warning("まずは3回の対話を完了させてください。")
            else:
                st.warning("最終的な学習目標を入力してください。")

def page3():
    st.title("Step3：アイディエーション ~探究学習の内容を決めよう！")
    st.write("")

    # 会話履歴の初期化（存在しない場合のみ）
    if 'dialogue_log_plan' not in st.session_state:
        st.session_state.dialogue_log_plan = []
        
        # 初期メッセージは会話履歴が空の時だけ追加する
        user_goal = DB.get_goal(user_id=0)
        if user_goal and len(user_goal) > 0:
            user_goal_str = user_goal[0][3]
            st.write(f"あなたの探究活動の目標: {user_goal_str}")
            
            # 初期メッセージを生成して対話履歴に追加
            ai_question = planner.generate_response(prompt=CONTENT_PROMPT, user_input=user_goal_str)
            st.session_state.dialogue_log_plan.append(("AI", ai_question))
        else:
            st.warning("テーマが登録されていません。前の画面で登録してください。")
            return  # テーマがない場合は処理を中断

    # 対話履歴の表示
    for sender, message in st.session_state.dialogue_log_plan:
        with st.chat_message("assistant" if sender == "AI" else "user"):
            st.write(message)

    # 対話回数をカウント（AIの発言回数をカウント）
    ai_messages_count = sum(1 for sender, _ in st.session_state.dialogue_log_plan if sender == "AI")
    user_messages_count = sum(1 for sender, _ in st.session_state.dialogue_log_plan if sender == "user")
    # 対話回数が3回未満の場合のみ、入力フィールドを表示
    if user_messages_count < 6:
        # ユーザー入力
        user_message = st.chat_input("あなたの回答を入力してください")
        
        if user_message:  # ユーザーが何か入力した場合のみ実行
            # 対話履歴に追加
            st.session_state.dialogue_log_plan.append(("user", user_message))
            
            # AIの応答を生成
            response = planner.generate_response(prompt=CONTENT_PROMPT, user_input=user_message)
            
            # 対話履歴に追加
            st.session_state.dialogue_log_plan.append(("AI", response))
            
            # 画面を再読み込みして最新の対話を表示
            st.rerun()
    else:
        # 対話が3回に達した場合のメッセージ
        st.success("活動内容を決める対話が完了しました。「次へ」ボタンをクリックして次のステップに進みましょう。")
        
        # 初期化：user_goal_str変数
        user_goal_str = ""
        user_goal = DB.get_goal(user_id=0)
        if user_goal and len(user_goal) > 0:
            user_goal_str = user_goal[0][3]  # goalカラムの位置に応じて調整
            
        # 学習計画を保存するテキストエリア
        if 'learning_plan' not in st.session_state:
            st.session_state.learning_plan = ""
        
        learning_plan = st.text_area("改めて活動内容を整理しましょう", st.session_state.learning_plan)
        
        if learning_plan != st.session_state.learning_plan:
            st.session_state.learning_plan = learning_plan
            if user_goal_str:  # user_goal_strが空でない場合のみ保存を実行
                DB.save_learningPlans(user_id=0, goal=user_goal_str, nextStep=learning_plan)
            st.rerun()

    col1, col2 = st.columns(2)
    with col1:
        if st.button("前へ"):
            prev_page()
            st.rerun()
    with col2:
        if st.button("次へ"):
            # 学習計画がセットされていれば次のページへ
            if ai_messages_count >= 3 and 'learning_plan' in st.session_state and st.session_state.learning_plan:
                next_page()
                st.rerun()
            elif ai_messages_count < 3:
                st.warning("まずは3回の対話を完了させてください。")
            else:
                st.warning("活動内容を整理してください。")

# ページの表示
if st.session_state.page == 1:
    page1()
elif st.session_state.page == 2:
    page2()
elif st.session_state.page == 3:
    page3()