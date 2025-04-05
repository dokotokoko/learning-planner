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

# 4つのステップをそれぞれactive判定
def is_active(step_number):
    current_page = st.session_state.page
    return "active" if step_number <= current_page else ""

def make_sequence_bar():
    st.markdown(f"""
    <style>
    .step-container {{
        display: flex;
        justify-content: space-between;
        margin: 30px 0;
        max-width: 600px;
    }}
    .step {{
        position: relative;
        flex: 1;
        text-align: center;
    }}
    .step .circle {{
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background-color: #cccccc;
        margin: 0 auto;
        z-index: 2;
        position: relative;
    }}
    .step.active .circle {{
        background-color: #2E8EF6; /* アクティブ時の色 */
    }}
    .step .label {{
        margin-top: 8px;
    }}
    /* 線（バー）のスタイル */
    .step::before {{
        content: "";
        position: absolute;
        top: 15px; /* 円の縦位置に合わせる */
        left: -50%;
        width: 100%;
        height: 4px;
        background-color: #cccccc;
        z-index: 1;
    }}
    .step:first-child::before {{
        content: none; /* 先頭ステップの左側には線を描画しない */
    }}
    .step.active::before {{
        background-color: #2E8EF6; /* アクティブ時の色 */
    }}
    </style>

    <div class="step-container">
        <div class="step {is_active(1)}">
            <div class="circle"></div>
            <div class="label">Step 1</div>
        </div>
        <div class="step {is_active(2)}">
            <div class="circle"></div>
            <div class="label">Step 2</div>
        </div>
        <div class="step {is_active(3)}">
            <div class="circle"></div>
            <div class="label">Step 3</div>
        </div>
        <div class="step {is_active(4)}">
            <div class="circle"></div>
            <div class="label">Step 4</div>
        </div>
    </div>
    """, unsafe_allow_html=True)

# セッション状態で認証状態を管理
if "authenticated" not in st.session_state:
    st.session_state.authenticated = False
if "user_id" not in st.session_state:
    st.session_state.user_id = None


db_path = os.path.abspath("IBL-assistant.db")
print("SQLite DB path:", db_path)

#DB名
DB_FILE = "IBL-assistant.db"

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

    # シンプルなユーザーテーブルを作成
    def create_table_users(self):
        self.cur.execute("""
            CREATE TABLE IF NOT EXISTS users
            (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                access_code TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        self.con.commit()
    
    # 事前に許可されたユーザーを追加
    def add_test_users(self, users_list):
        for username, access_code in users_list:
            try:
                self.cur.execute("""
                    INSERT INTO users(username, access_code) 
                    VALUES(?, ?) 
                    ON CONFLICT(username) DO NOTHING
                """, (username, access_code))
            except sqlite3.IntegrityError:
                pass  # 既に存在する場合は無視
        self.con.commit()
    
    # シンプル認証
    def verify_user(self, username, access_code):
        self.cur.execute("""
            SELECT id FROM users WHERE username = ? AND access_code = ?
        """, (username, access_code))
        user = self.cur.fetchone()
        return user[0] if user else None

    # DBManagerクラスに追加するメソッド
    def add_user(self, username, access_code):
        try:
            self.cur.execute("""
                INSERT INTO users(username, access_code) 
                VALUES(?, ?)
            """, (username, access_code))
            self.con.commit()
            return True
        except sqlite3.IntegrityError:
            # ユーザー名が既に存在する場合
            return False

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

# メインの実行フロー
def main():
    # DBの初期化
    DB = DBManager()
    DB.create_table_users()
    
    # 認証状態の確認
    if not st.session_state.authenticated:
        login_page()
    else:
        # 認証済みならページを表示
        if st.session_state.page == 1:
            page1()
        elif st.session_state.page == 2:
            page2()
        elif st.session_state.page == 3:
            page3()
        
        # サイドバーにログイン情報表示
        with st.sidebar:
            st.write(f"ログイン中: {st.session_state.username}")
            if st.button("ログアウト"):
                st.session_state.authenticated = False
                st.session_state.user_id = None
                st.session_state.username = None
                # セッションクリア
                for key in list(st.session_state.keys()):
                    if key not in ["authenticated", "user_id", "username"]:
                        del st.session_state[key]
                st.rerun()

@st.dialog("test")
def guide_step1():
    st.write('これはガイドライン表示のテストです')

    st.markdown("""
    <style>
    .my-text {
        color: white;
        font-size: 24px;
        background-color: #008080;
        padding: 10px;
        border-radius: 10px;
    }
    </style>
    <p class='my-text'>Hello World!</p>
    """, unsafe_allow_html=True)

    greet = st.text_input('test')
    if st.button('閉じる'):
        st.rerun()   

# ページごとの内容を定義
def page1():

    #ページの最初にガイドラインを表示
    guide_step1()

    st.title("探究学習アシスタント")
    st.write("これは最初の画面です。")

    #現在のステップを表示
    make_sequence_bar()

    #DB初期化
    DB.create_table_interests()
    DB.create_table_goals()
    DB.create_table_learningPlans()

    theme = st.text_input("探究学習のテーマを入力してください。")

    if theme:  # 入力があった場合のみ保存
        DB.save_interests(user_id=st.session_state.user_id, interest=theme)

    if st.button("次へ"):
        next_page()
        st.rerun()

def page2():
    st.title("Step2：探究学習の目標を決めよう！")
    
    #現在のステップを表示
    make_sequence_bar()

    # 変数を関数の先頭で初期化
    user_theme_str = ""
    
    # 会話履歴の初期化（存在しない場合のみ）
    if 'dialogue_log' not in st.session_state:
        st.session_state.dialogue_log = []
        
        # 初期メッセージは会話履歴が空の時だけ追加する
        user_theme = DB.get_interest(user_id=st.session_state.user_id)
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
        user_message = st.chat_input("AIアシスタントからの質問に回答してください。")
        
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
            DB.save_goal(user_id=st.session_state.user_id, interest=user_theme_str, goal=final_goal)
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
    
    #現在のステップを表示
    make_sequence_bar()

    # 会話履歴の初期化（存在しない場合のみ）
    if 'dialogue_log_plan' not in st.session_state:
        st.session_state.dialogue_log_plan = []
        
        # 初期メッセージは会話履歴が空の時だけ追加する
        user_goal = DB.get_goal(user_id=st.session_state.user_id)
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
        user_goal = DB.get_goal(user_id=st.session_state.user_id)
        if user_goal and len(user_goal) > 0:
            user_goal_str = user_goal[0][3]  # goalカラムの位置に応じて調整
            
        # 学習計画を保存するテキストエリア
        if 'learning_plan' not in st.session_state:
            st.session_state.learning_plan = ""
        
        learning_plan = st.text_area("改めて活動内容を整理しましょう", st.session_state.learning_plan)
        
        if learning_plan != st.session_state.learning_plan:
            st.session_state.learning_plan = learning_plan
            if user_goal_str:  # user_goal_strが空でない場合のみ保存を実行
                DB.save_learningPlans(user_id=st.session_state.user_id, goal=user_goal_str, nextStep=learning_plan)
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

# ログイン画面
def login_page():
    st.title("探究学習アシスタント - ログイン")
    
    # タブを作成してログインと登録を分ける
    tab1, tab2 = st.tabs(["ログイン", "新規ユーザー登録"])
    
    # ログインタブ
    with tab1:
        username = st.text_input("ユーザー名", key="login_username")
        access_code = st.text_input("アクセスコード", type="password", key="login_password")
        
        if st.button("ログイン", key="login_button"):
            user_id = DB.verify_user(username, access_code)
            if user_id:
                st.session_state.authenticated = True
                st.session_state.user_id = user_id
                st.session_state.username = username
                st.success("ログインしました！")
                st.rerun()
            else:
                st.error("ユーザー名またはアクセスコードが正しくありません")
    
    # 新規ユーザー登録タブ
    with tab2:
        new_username = st.text_input("ユーザー名", key="reg_username")
        new_access_code = st.text_input("アクセスコード", type="password", key="reg_password")
        confirm_code = st.text_input("アクセスコード（確認）", type="password", key="confirm_password")
        
        if st.button("登録", key="register_button"):
            if new_access_code != confirm_code:
                st.error("アクセスコードが一致しません")
            elif not new_username or not new_access_code:
                st.error("ユーザー名とアクセスコードを入力してください")
            else:
                # ユーザー追加のためのメソッドも追加する必要があります
                success = DB.add_user(new_username, new_access_code)
                if success:
                    st.success("ユーザー登録が完了しました。ログインしてください。")
                else:
                    st.error("そのユーザー名は既に使用されています")

# アプリケーション実行
if __name__ == "__main__":
    # グローバル変数初期化
    planner = LearningPlanner()
    DB = DBManager()
    
    # メイン処理実行
    main()