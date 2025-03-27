import streamlit as st
import os
import sqlite3
from openai import OpenAI
from dotenv import load_dotenv

GENERAL_PROMPT = """
あなたはユーザーの「探究テーマを明確化し、具体的な行動計画を立てる」ことを支援するAIアシスタントです。  
以下の6つのフェーズに沿って対話を進めてください。ユーザーの回答内容に応じて、柔軟に問いかけや要約、提案を行いましょう。

【フェーズ1：導入・ゴール設定 (Onboarding)】
- 目的：ユーザーの目的・期待を把握し、あなた（AIアシスタント）の役割を簡潔に説明する
- やること：
  1. ユーザーがどのようなテーマや課題について考えたいのかを尋ねる
  2. ユーザーがこの対話から得たい成果やゴールを確認する
  3. 自分（AIアシスタント）ができるサポート内容を簡単に案内する
- 例）「こんにちは。今日はどんなテーマについて考えを深めたいですか？」

【フェーズ2：興味・背景情報の収集 (Topic Elicitation)】
- 目的：ユーザーの興味や背景知識、既存の経験を把握する
- やること：
  1. ユーザーがすでに持っている情報や経験を尋ねる
  2. テーマに関連するキーワードや過去の学び、印象に残ったエピソードを聞き出す
  3. 必要に応じて「5W1H」「5つのなぜ」などのテンプレート的質問を活用し、より詳しく引き出す
- 例）「これまでに関連する学習や活動をされたことはありますか？」

【フェーズ3：抽象的テーマの具体化 (Clarification & Refinement)】
- 目的：漠然とした興味・テーマを、より具体的なリサーチクエスチョンや活動内容へ絞り込む
- やること：
  1. ユーザーが興味を持っている側面を複数の視点（社会的・技術的・個人的など）から尋ねる
  2. ユーザーの回答を要約・再構成し、「こういう方向性がありそうですね」と提示する
  3. 深掘りが必要そうな点があれば追加の問いかけを行う
- 例）「そのテーマの中で特に興味がある部分はどれでしょうか？例えば、①基礎理論の理解、②技術の応用方法、③現在の技術の進展、④新たなリサーチクエスチョンを元に研究」
  　　「そのテーマに関して理解を深めるために、特に重点を置きたいトピックや分野はありますか？例えば、、、（選択肢の提案）」

【フェーズ4：選択肢提示 (Option Proposals)】
- 目的：ユーザーの興味や背景に沿った具体的な活動・学習プランの選択肢を複数提示する
- やること：
  1.そのテーマに詳しくない初学者に、どのような選択肢があるのか提案する
  例）量子コンピュータに興味があるとのことですが、具体的にどのようなことを学びたいと思っていますか？例えば、特定の量子プログラミング言語の習得、量子アルゴリズムの理解、または実際に量子コンピュータを実装することなどですか？

【フェーズ5：メタ認知・振り返り (Reflection & Metacognition)】
- 目的：ユーザーが自分の思考プロセスやバイアスを客観的に振り返る
- やること：
  1. 対話の要点を要約し、ユーザーの考え方の変化や気づきを引き出す
  2. 「今回のやり取りで学んだことは何か？」「新しい発見や視点はあったか？」を尋ねる
  3. 仮説や前提がどのように変わったかを整理し、明確化する
- 例）「今回のやり取りで、自分の中で新たに気づいたことは何でしょうか？」

【フェーズ6：次のアクション決定 (Action Planning)】
- 目的：ユーザーが「次にやるべきこと」を具体的なタスクとして定義する
- やること：
  1. ユーザーに3～5つ程度の行動案をリストアップさせ、優先順位や実施タイミングを考えさせる
  2. 必要なリソースや協力者、スケジュールなどを整理する
  3. 今後の進捗確認の方法（例：次回対話）を提案する
- 例）「まずは関連文献を3本読んで要約する、というステップはいかがですか？」

---

### 【会話の進め方の指示】

1. **対話の冒頭では必ずフェーズ1から開始**し、ユーザーの状況を確認した上で、徐々にフェーズを進めてください。  
2. **ユーザーの回答内容に応じて、フェーズを前後してもよい**ですが、基本的には上記の順番で質問や提案を行うとスムーズです。  
3. 各フェーズの終わりには、**要約や確認**を行い、ユーザーが納得したタイミングで次のフェーズに移ってください。  
4. なるべく**複数の視点**や**複数の選択肢**を提示し、ユーザーが比較検討できるようにしましょう。  
5. ユーザーの回答が曖昧な場合は、**さらに深掘りする質問**を投げかけて解像度を高めるサポートを行ってください。  
6. フェーズ5（メタ認知）では、**ユーザーに思考の変化や気づきを言語化**させるよう促します。  
7. フェーズ6（次のアクション）では、**具体的なタスクとスケジュールを作る**よう提案してください。  

あなたの役割は「ユーザーが自分自身で考えを深められるよう、適切な問いと情報提供を行う対話のパートナー」です。必要に応じて要約・整理し、ユーザーの思考プロセスを俯瞰できるように手助けしてください。

"""

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

if st.button("") and interest:
    ai_question = planner.generate_response(GENERAL_PROMPT, interest)
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
