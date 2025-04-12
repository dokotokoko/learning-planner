import streamlit as st
from streamlit_chat import message
from st_supabase_connection import SupabaseConnection
import logging

from module.llm_api import learning_plannner
from prompt.prompt import goal_prompt, content_prompt

# DBの設定
DB_FILE = "IBL-assistant.db"

# ロギング設定 (任意)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class StreamlitApp:
    def __init__(self):
        """アプリケーションの初期化"""
        self.planner = learning_plannner()
        self._initialize_session_state()
        # Supabase接続を初期化
        try:
            self.conn = st.connection("supabase", type=SupabaseConnection)
            logging.info("Supabase接続を初期化しました。")
            # Supabaseテーブルを初期化
            self._initialize_supabase_tables()
        except Exception as e:
            st.error(f"データベース接続またはテーブル初期化中にエラーが発生しました: {e}")
            logging.error(f"データベース接続/初期化エラー: {e}", exc_info=True)
            # エラーが発生した場合、アプリの続行が難しい可能性があるため停止
            st.stop()

    def _initialize_session_state(self):
        """セッション状態の初期化"""
        if "page" not in st.session_state:
            st.session_state.page = 1
        if "authenticated" not in st.session_state:
            st.session_state.authenticated = False
        if "user_id" not in st.session_state:
            st.session_state.user_id = None
        if "username" not in st.session_state:
            st.session_state.username = None

    def _initialize_supabase_tables(self):
        """Supabaseに必要なテーブルが存在しない場合に作成する"""
        logging.info("Supabaseテーブルの初期化を試みます (注意: テーブルは事前に作成することを推奨)")
        # try:
            # Usersテーブル (パスワードはTEXT型のままですが、ハッシュ化推奨)
            # self.conn.query(""" # conn.query は SELECT 用のため CREATE TABLE には不向き
            #     CREATE TABLE IF NOT EXISTS users (
            #         id SERIAL PRIMARY KEY,
            #         username VARCHAR(255) UNIQUE NOT NULL,
            #         access_code TEXT NOT NULL, -- Supabase Authを使用しない場合、ハッシュ化して保存することを強く推奨します
            #         created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            #     );
            # """, ttl=0).execute() # ttl=0でキャッシュ無効
            #
            # # Interestsテーブル
            # self.conn.query("""
            #     CREATE TABLE IF NOT EXISTS interests (
            #         id SERIAL PRIMARY KEY,
            #         user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- 外部キー制約を追加
            #         interest TEXT,
            #         created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            #     );
            # """, ttl=0).execute()
            #
            # # Goalsテーブル
            # self.conn.query("""
            #     CREATE TABLE IF NOT EXISTS goals (
            #         id SERIAL PRIMARY KEY,
            #         user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            #         interest_id INT REFERENCES interests(id) ON DELETE SET NULL, -- 興味が消えたらNULLにするか、CASCADEで一緒に消すかなど検討
            #         goal TEXT,
            #         created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            #     );
            # """, ttl=0).execute()
            #
            # # Learning Plansテーブル
            # self.conn.query("""
            #     CREATE TABLE IF NOT EXISTS learning_plans (
            #         id SERIAL PRIMARY KEY,
            #         user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            #         goal_id INT REFERENCES goals(id) ON DELETE SET NULL, -- ゴールが消えたらNULLにするか、CASCADEで一緒に消すかなど検討
            #         nextStep TEXT,
            #         created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            #     );
            # """, ttl=0).execute()
            #
            # logging.info("Supabaseテーブルの初期化確認が完了しました。")

        # except Exception as e:
        #     st.error(f"テーブル作成/確認中にエラーが発生しました: {e}")
        #     logging.error(f"テーブル作成/確認エラー: {e}", exc_info=True)
            # テーブル作成失敗は致命的な可能性があるため停止
            # st.stop()
        # ---> テーブル作成は Supabase Studio で事前に行うことを推奨するため、
        # ---> アプリケーション起動時の CREATE TABLE 処理はコメントアウトします。
        pass # テーブル作成処理は行わない

    def next_page(self):
        """次のページに進む"""
        st.session_state.page += 1

    def prev_page(self):
        """前のページに戻る"""
        st.session_state.page -= 1

    def is_active(self, step_number):
        """指定されたステップが現在のページと同じかそれ以前なら'active'を返す"""
        current_page = st.session_state.page
        return "active" if step_number <= current_page else ""

    def make_sequence_bar(self):
        """ステッププログレスバーを表示"""
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
            <div class="step {self.is_active(1)}">
                <div class="circle"></div>
                <div class="label">Step 1</div>
            </div>
            <div class="step {self.is_active(2)}">
                <div class="circle"></div>
                <div class="label">Step 2</div>
            </div>
            <div class="step {self.is_active(3)}">
                <div class="circle"></div>
                <div class="label">Step 3</div>
            </div>
            <div class="step {self.is_active(4)}">
                <div class="circle"></div>
                <div class="label">Step 4</div>
            </div>
        </div>
        """, unsafe_allow_html=True)

    @st.dialog("このステップでやること！")
    def show_guide_dialog(self, step_number):
        """各ステップのガイドダイアログを表示"""
        dialog_key = f"dialog_closed_page{step_number}"
        
        # 既に表示済みかチェック
        if dialog_key not in st.session_state or not st.session_state[dialog_key]:
            dialog_title = {
                1: "テーマ設定の思考サポート",
                2: "ゴール設定の思考サポート", 
                3: "アイディエーションの思考サポート",
                4: "最終成果物作成の思考サポート"
            }
            
            dialog_content = {
                1: """この画面では、探究学習のテーマを入力してください。
                後からゴールや学習計画を設定する際の出発点となります。
                
                例えば以下のような視点で考えてみましょう：
                - 社会問題や身近な疑問・課題
                - 将来の夢や目標に関連するテーマ
                - これまでに学んできた中で特に興味を持ったこと""",
                
                2: """この画面では、テーマを具体的な目標に落とし込みます。
                
                以下の質問に答えていくことで、目標が明確になります：
                - なぜそのテーマに興味を持ったのですか？
                - 探究を通じて何を理解したいですか？
                - 最終的にどんな成果物を作りたいですか？""",
                
                3: """この画面では、目標達成のための具体的な活動内容を考えます。
                
                以下のような観点で検討してみましょう：
                - どんな調査・実験が必要か
                - 誰に話を聞くか
                - どんな資料を集めるか
                - どのように分析するか""",
                
                4: """最終ステップでは、これまでの探究活動をまとめます。
                
                以下の点を整理しましょう：
                - 何を学んだか
                - どんな成果が得られたか
                - 今後の課題は何か"""
            }

            st.write(dialog_content[step_number])
            st.session_state[dialog_key] = True


    def render_page1(self):
        """テーマ設定ページの表示"""      
        st.title("Step1: 自分の興味から探究学習のテーマを決める！")

        # 現在のステップを表示
        self.make_sequence_bar()

        theme = st.text_input("探究学習のテーマを入力してください。")

        if st.button("テーマを決定する"):
            if theme:
                try:
                    self.conn.table("interests").insert({"user_id": st.session_state.user_id, "interest": theme}).execute()
                    st.success(f"テーマ '{theme}' を保存しました (user_id: {st.session_state.user_id})")
                    st.session_state.user_theme = theme
                except Exception as e:
                    st.error(f"テーマの保存に失敗: {str(e)}")
                    logging.error(f"テーマ保存エラー: {e}", exc_info=True)

        if st.button("次へ"):
            self.next_page()
            st.rerun()

        # このページでやることのガイドを表示（インデックス指定）
        page_index = 1;
        dialog_key = f"dialog_closed_page{page_index}"
        # 既に表示済みかチェック
        if dialog_key not in st.session_state or not st.session_state[dialog_key]:
            self.show_guide_dialog(1)

    def render_page2(self):
        """ゴール設定ページの表示"""      
        st.title("Step2：探究学習の目標を決めよう！")
        
        # 現在のステップを表示
        self.make_sequence_bar()

        # 変数を関数の先頭で初期化
        user_theme_str = ""

        # このページでやることのガイドを表示（インデックス指定）
        page_index = 2;
        dialog_key = f"dialog_closed_page{page_index}"
        # 既に表示済みかチェック
        if dialog_key not in st.session_state or not st.session_state[dialog_key]:
            self.show_guide_dialog(2) 
        
        # 会話履歴の初期化（存在しない場合のみ）
        if 'dialogue_log' not in st.session_state:
            st.session_state.dialogue_log = []
            
            # 初期メッセージは会話履歴が空の時だけ追加する
            try:
                user_theme_result = self.conn.table("interests")\
                                          .select("interest")\
                                          .eq("user_id", st.session_state.user_id)\
                                          .order("created_at", desc=True)\
                                          .limit(1)\
                                          .execute()
                
                if user_theme_result.data:
                    user_theme_str = user_theme_result.data[0]['interest']
                    st.write(f"あなたの探究テーマ: {user_theme_str}")
                    
                    # セッション状態に保存して後で使えるようにする
                    st.session_state.user_theme_str = user_theme_str
                    
                    # 初期メッセージを生成して対話履歴に追加
                    ai_question = self.planner.generate_response(prompt=goal_prompt, user_input=user_theme_str)
                    st.session_state.dialogue_log.append(("AI", ai_question))
                else:
                    st.warning("テーマが登録されていません。前の画面で登録してください。")
                    return  # テーマがない場合は処理を中断
            except Exception as e:
                 st.error(f"テーマの読み込みに失敗: {e}")
                 logging.error(f"テーマ読み込みエラー: {e}", exc_info=True)
                 return # 読み込み失敗時も中断
        else:
            # セッション状態から取得 (再描画時など)
            if 'user_theme_str' in st.session_state:
                user_theme_str = st.session_state.user_theme_str
            else:
                # 念のため、セッションにもなければDBから再取得試行
                try:
                    user_theme_result = self.conn.table("interests")\
                                              .select("interest")\
                                              .eq("user_id", st.session_state.user_id)\
                                              .order("created_at", desc=True)\
                                              .limit(1)\
                                              .execute()
                    if user_theme_result.data:
                        user_theme_str = user_theme_result.data[0]['interest']
                        st.session_state.user_theme_str = user_theme_str
                    else:
                        st.warning("テーマが見つかりません。Step1からやり直してください。")
                        # ここで st.stop() または return するかは要件次第
                except Exception as e:
                    st.error(f"テーマの再取得に失敗: {e}")
                    logging.error(f"テーマ再取得エラー: {e}", exc_info=True)

        # 対話履歴の表示
        for sender, msg_content in st.session_state.dialogue_log:
            with st.chat_message("assistant" if sender == "AI" else "user"):
                st.write(msg_content)

        # 対話回数をカウント（AIの発言回数をカウント）
        ai_messages_count = sum(1 for sender, _ in st.session_state.dialogue_log if sender == "AI")
        user_messages_count = sum(1 for sender, _ in st.session_state.dialogue_log if sender == "user")
        # 対話回数が3回未満の場合のみ、入力フィールドを表示
        if user_messages_count < 3:
            # ユーザー入力
            user_message = st.chat_input("AIアシスタントからの質問に回答してください。", key="goal_input")
            
            if user_message:  # ユーザーが何か入力した場合のみ実行
                # 対話履歴に追加
                st.session_state.dialogue_log.append(("user", user_message))
                
                # AIの応答を生成
                response = self.planner.generate_response(prompt=goal_prompt, user_input=user_message)
                
                # 対話履歴に追加
                st.session_state.dialogue_log.append(("AI", response))
                
                # 画面を再読み込みして最新の対話を表示
                st.rerun()
        else:
            # 対話が3回に達した場合のメッセージ
            st.success("目標設定のための対話が完了しました。「次へ」ボタンをクリックして次のステップに進みましょう。")
            
            # 最終目標を保存するテキストエリア
            if 'final_goal' not in st.session_state:
                st.session_state.final_goal = "" # 初期化
                # 過去のデータがあれば読み込む
                try:
                    goal_result = self.conn.table("goals")\
                                        .select("goal")\
                                        .eq("user_id", st.session_state.user_id)\
                                        .order("created_at", desc=True)\
                                        .limit(1)\
                                        .execute()
                    if goal_result.data:
                        st.session_state.final_goal = goal_result.data[0]['goal']
                except Exception as e:
                    logging.warning(f"過去のゴールの読み込みに失敗: {e}")
            
            final_goal_input = st.text_area("学習目標を整理しましょう", value=st.session_state.final_goal, key="final_goal_text_area")
            
            # テキストエリアの内容が変更されたらDBに保存
            if final_goal_input != st.session_state.final_goal:
                st.session_state.final_goal = final_goal_input
                # --- DB操作の変更 --- 
                try:
                    # 対応するinterest_idを取得
                    interest_id = None
                    if 'user_theme_str' in st.session_state:
                        interest_result = self.conn.table("interests")\
                                                  .select("id")\
                                                  .eq("user_id", st.session_state.user_id)\
                                                  .eq("interest", st.session_state.user_theme_str)\
                                                  .order("created_at", desc=True)\
                                                  .limit(1)\
                                                  .execute()
                        if interest_result.data:
                            interest_id = interest_result.data[0]['id']
                        else:
                            st.warning(f"テーマ '{st.session_state.user_theme_str}' のIDが見つかりません。先にテーマを保存してください。")
                            # interest_id がなければ goals に保存できないため return か、interest_idなしで保存するか検討
                            # return # ここでは保存を中止
                    else:
                        st.warning("テーマ情報がセッションにありません。Goalを保存できませんでした。")
                        # return
                    
                    if interest_id:
                        # self.db_manager.save_goal(st.session_state.user_id, st.session_state.user_theme_str, final_goal_input)
                        # 既存のゴールがあれば更新、なければ挿入 (upsert) または Insert のみ
                        # ここでは単純にInsert（同じユーザーIDで複数のゴールを持てる仕様とする）
                        self.conn.table("goals").insert({
                            "user_id": st.session_state.user_id,
                            "interest_id": interest_id,
                            "goal": final_goal_input
                        }).execute()
                        st.success("学習目標を保存しました。")
                        st.rerun() # 保存後に再実行して表示を更新
                    else:
                         st.error("関連するテーマが見つからなかったため、目標を保存できませんでした。")

                except Exception as e:
                     st.error(f"学習目標の保存に失敗: {e}")
                     logging.error(f"ゴール保存エラー: {e}", exc_info=True)
                # --- 変更ここまで --- 

        col1, col2 = st.columns(2)
        with col1:
            if st.button("前へ"):
                self.prev_page()
                st.rerun()
        with col2:
            if st.button("次へ"):
                # 目標がセットされていれば次のページへ
                if user_messages_count >= 3 and 'final_goal' in st.session_state and st.session_state.final_goal:
                    self.next_page()
                    st.rerun()
                elif user_messages_count < 3:
                    st.warning("まずは3回の対話を完了させてください。")
                else:
                    st.warning("最終的な学習目標を入力してください。")

    def render_page3(self):
        """アイディエーションページの表示"""
        st.title("Step3：アイディエーション ~探究学習の内容を決めよう！")
        
        # 現在のステップを表示
        self.make_sequence_bar()

        # このページでやることのガイドを表示（インデックス指定）       
        page_index = 3;
        dialog_key = f"dialog_closed_page{page_index}"
        # 既に表示済みかチェック
        if dialog_key not in st.session_state or not st.session_state[dialog_key]:
            self.show_guide_dialog(3)

        # --- DB操作の変更 (ゴールの取得) ---
        user_goal_str = ""
        try:
            goal_result = self.conn.table("goals")\
                              .select("goal")\
                              .eq("user_id", st.session_state.user_id)\
                              .order("created_at", desc=True)\
                              .limit(1)\
                              .execute()
            if goal_result.data:
                user_goal_str = goal_result.data[0]['goal']
                st.session_state.user_goal_str = user_goal_str # セッションにも保存
                st.write(f"あなたの探究活動の目標: {user_goal_str}")
            elif 'final_goal' in st.session_state: # DBになくてもセッションにあれば使う
                 user_goal_str = st.session_state.final_goal
                 st.write(f"あなたの探究活動の目標 (セッションから): {user_goal_str}")
            else:
                st.warning("目標が登録されていません。前の画面で登録してください。")
                # return ここで止めると以降の処理ができない
        except Exception as e:
            st.error(f"目標の読み込みに失敗: {e}")
            logging.error(f"目標読み込みエラー: {e}", exc_info=True)
            # return
        # --- 変更ここまで ---

        # 会話履歴の初期化（存在しない場合のみ）
        if 'dialogue_log_plan' not in st.session_state:
            st.session_state.dialogue_log_plan = []
            
            # 初期メッセージは会話履歴が空の時だけ追加する (目標が取得できていれば)
            if user_goal_str:
                ai_question = self.planner.generate_response(prompt=content_prompt, user_input=user_goal_str)
                st.session_state.dialogue_log_plan.append(("AI", ai_question))
            # else: # 目標がない場合は初期質問をスキップ（あるいは別のメッセージ）
            #     st.info("目標を設定してから、活動内容の相談を開始します。")

        # 対話履歴の表示
        for sender, msg_content in st.session_state.dialogue_log_plan:
            with st.chat_message("assistant" if sender == "AI" else "user"):
                st.write(msg_content)

        # 対話回数をカウント（AIの発言回数をカウント）
        ai_messages_count = sum(1 for sender, _ in st.session_state.dialogue_log_plan if sender == "AI")
        user_messages_count = sum(1 for sender, _ in st.session_state.dialogue_log_plan if sender == "user")
        # 対話回数が6回未満の場合のみ、入力フィールドを表示
        if user_messages_count < 6:
            # ユーザー入力
            user_message = st.chat_input("あなたの回答を入力してください", key="plan_input")
            
            if user_message:  # ユーザーが何か入力した場合のみ実行
                # 対話履歴に追加
                st.session_state.dialogue_log_plan.append(("user", user_message))
                
                # AIの応答を生成
                response = self.planner.generate_response(prompt=content_prompt, user_input=user_message)
                
                # 対話履歴に追加
                st.session_state.dialogue_log_plan.append(("AI", response))
                
                # 画面を再読み込みして最新の対話を表示
                st.rerun()
        else:
            # 対話が完了した場合のメッセージ
            st.success("活動内容を決める対話が完了しました。「次へ」ボタンをクリックして次のステップに進みましょう。")
            
            # 学習計画を保存するテキストエリア
            if 'learning_plan' not in st.session_state:
                st.session_state.learning_plan = "" # 初期化
                 # 過去のデータがあれば読み込む
                try:
                    plan_result = self.conn.table("learning_plans")\
                                        .select("nextStep")\
                                        .eq("user_id", st.session_state.user_id)\
                                        .order("created_at", desc=True)\
                                        .limit(1)\
                                        .execute()
                    if plan_result.data:
                        st.session_state.learning_plan = plan_result.data[0]['nextStep']
                except Exception as e:
                    logging.warning(f"過去の学習計画の読み込みに失敗: {e}")
            
            learning_plan_input = st.text_area("改めて活動内容を整理しましょう", value=st.session_state.learning_plan, key="learning_plan_text_area")
            
            if learning_plan_input != st.session_state.learning_plan:
                st.session_state.learning_plan = learning_plan_input
                 # --- DB操作の変更 --- 
                try:
                    # 対応する goal_id を取得 (user_goal_str を使う)
                    goal_id = None
                    current_goal_str = st.session_state.get('user_goal_str') # セッションから最新のゴール文字列を取得
                    if current_goal_str:
                         goal_result = self.conn.table("goals")\
                                           .select("id")\
                                           .eq("user_id", st.session_state.user_id)\
                                           .eq("goal", current_goal_str)\
                                           .order("created_at", desc=True)\
                                           .limit(1)\
                                           .execute()
                         if goal_result.data:
                             goal_id = goal_result.data[0]['id']
                         else:
                             st.warning(f"目標 '{current_goal_str}' のIDが見つかりません。先に目標を保存してください。")
                    else:
                         st.warning("目標情報がセッションにありません。活動計画を保存できませんでした。")

                    if goal_id:
                        # self.db_manager.save_learningPlans(st.session_state.user_id, user_goal_str, learning_plan_input)
                        # Insert or Upsert
                        self.conn.table("learning_plans").insert({
                            "user_id": st.session_state.user_id,
                            "goal_id": goal_id,
                            "nextStep": learning_plan_input
                        }).execute()
                        st.success("活動計画を保存しました。")
                        st.rerun()
                    else:
                         st.error("関連する目標が見つからなかったため、活動計画を保存できませんでした。")
                except Exception as e:
                     st.error(f"活動計画の保存に失敗: {e}")
                     logging.error(f"活動計画保存エラー: {e}", exc_info=True)
                # --- 変更ここまで --- 

        col1, col2 = st.columns(2)
        with col1:
            if st.button("前へ"):
                self.prev_page()
                st.rerun()
        with col2:
            if st.button("次へ"):
                # 学習計画がセットされていれば次のページへ
                if user_messages_count >= 6 and 'learning_plan' in st.session_state and st.session_state.learning_plan:
                    self.next_page()
                    st.rerun()
                elif user_messages_count < 6:
                    st.warning("まずは対話を完了させてください。")
                else:
                    st.warning("活動内容を整理してください。")

    def render_page4(self):
        """最終ページ（まとめ）の表示"""      
        st.title("Step4：まとめ")
        
        # 現在のステップを表示
        self.make_sequence_bar()
        
        # このページでやることのガイドを表示（インデックス指定）  
        page_index = 4;
        dialog_key = f"dialog_closed_page{page_index}"
        # 既に表示済みかチェック
        if dialog_key not in st.session_state or not st.session_state[dialog_key]:
            self.show_guide_dialog(4)
        
        # --- DB操作の変更 (データの取得) --- 
        theme_str = "データなし"
        goal_str = "データなし"
        plan_str = "データなし"
        try:
            user_theme_result = self.conn.table("interests")\
                                      .select("interest")\
                                      .eq("user_id", st.session_state.user_id)\
                                      .order("created_at", desc=True).limit(1).execute()
            user_goal_result = self.conn.table("goals")\
                                     .select("goal")\
                                     .eq("user_id", st.session_state.user_id)\
                                     .order("created_at", desc=True).limit(1).execute()
            user_plan_result = self.conn.table("learning_plans")\
                                     .select("nextStep")\
                                     .eq("user_id", st.session_state.user_id)\
                                     .order("created_at", desc=True).limit(1).execute()

            if user_theme_result.data:
                theme_str = user_theme_result.data[0]['interest']
            if user_goal_result.data:
                goal_str = user_goal_result.data[0]['goal']
            if user_plan_result.data:
                plan_str = user_plan_result.data[0]['nextStep']

            st.write("### 探究学習の内容")
            st.write(f"**テーマ**: {theme_str}")
            st.write(f"**目標**: {goal_str}")
            st.write(f"**活動内容**: {plan_str}")
            
            st.write("### 次のステップ")
            st.write("探究学習の計画が完成しました。この計画に沿って、実際に探究活動を進めていきましょう。")
            st.write("定期的に進捗を振り返り、必要に応じて計画を見直すことも大切です。")

        except Exception as e:
             st.error(f"データの読み込み中にエラーが発生しました: {e}")
             logging.error(f"まとめページデータ読み込みエラー: {e}", exc_info=True)
             st.warning("データが完全に読み込めませんでした。前のステップに戻って確認してください。")
        # --- 変更ここまで --- 

        if st.button("前へ"):
            self.prev_page()
            st.rerun()

    def render_login_page(self):
        """ログイン画面の表示"""
        st.title("探究学習アシスタント - ログイン")
        
        tab1, tab2 = st.tabs(["ログイン", "新規ユーザー登録"])
        
        # ログインタブ
        with tab1:
            username = st.text_input("ユーザー名", key="login_username")
            access_code = st.text_input("アクセスコード", type="password", key="login_password")
            
            if st.button("ログイン", key="login_button"):
                try:
                    # Supabaseからユーザーを検索
                    # TODO: access_codeはハッシュ化して比較するべき
                    result = self.conn.table("users").select("id").eq("username", username).eq("access_code", access_code).execute()
                    if result.data:
                        user_id = result.data[0]['id']
                        st.session_state.authenticated = True
                        st.session_state.user_id = user_id
                        st.session_state.username = username
                        st.success("ログインしました！")
                        st.rerun()
                    else:
                        st.error("ユーザー名またはアクセスコードが正しくありません")
                        user_id = None
                except Exception as e:
                    st.error(f"ログイン処理中にエラーが発生しました: {e}")
                    logging.error(f"ログインエラー: {e}", exc_info=True)
        
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
                    try:
                        # Supabaseにユーザーを挿入
                        # TODO: new_access_code はハッシュ化して保存するべき
                        insert_data = {"username": new_username, "access_code": new_access_code}
                        result = self.conn.table("users").insert(insert_data).execute()
                        # resultの内容を確認して成功判定しても良い
                        st.success("ユーザー登録が完了しました。ログインしてください。")
                        success = True
                    except Exception as e:
                        # PostgRESTエラーを解析して重複を判定することも可能
                        if "duplicate key value violates unique constraint" in str(e):
                             st.error("そのユーザー名は既に使用されています")
                        else:
                             st.error(f"ユーザー登録中にエラーが発生しました: {e}")
                        logging.error(f"ユーザー登録エラー: {e}", exc_info=True)
                        success = False

    def setup_sidebar(self):
        """サイドバーの設定"""
        if st.session_state.authenticated:
            with st.sidebar:
                st.write(f"ログイン中: {st.session_state.username}")
                if st.button("ログアウト"):
                    # ログアウト処理は DBManager に依存していないので基本そのまま
                    st.session_state.authenticated = False
                    st.session_state.user_id = None
                    st.session_state.username = None
                    # 他のセッション状態もクリア
                    keys_to_keep = {"authenticated", "user_id", "username"}
                    for key in list(st.session_state.keys()):
                        if key not in keys_to_keep:
                            del st.session_state[key]
                    st.rerun()

    def run(self):
        """アプリケーションの実行"""
        # サイドバーの設定
        self.setup_sidebar()
        
        # 認証状態の確認
        if not st.session_state.authenticated:
            self.render_login_page()
        else:
            # 認証済みならページを表示
            if st.session_state.page == 1:
                self.render_page1()
            elif st.session_state.page == 2:
                self.render_page2()
            elif st.session_state.page == 3:
                self.render_page3()
            elif st.session_state.page == 4:
                self.render_page4()

# アプリケーション実行
if __name__ == "__main__":
    app = StreamlitApp()
    app.run()