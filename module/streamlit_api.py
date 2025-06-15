import streamlit as st
from streamlit_chat import message
from st_supabase_connection import SupabaseConnection
import logging

from module.llm_api import learning_plannner
from prompt.prompt import system_prompt

# DBの設定
DB_FILE = "IBL-assistant.db"

# ロギング設定 (任意)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- 追加: 外部CSSファイルを読み込むヘルパー関数 ---   
def local_css(file_name):
    try:
        with open(file_name, encoding='utf-8') as f:
            st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)
            logging.info(f"CSSファイル '{file_name}' を正常に読み込みました。")
    except FileNotFoundError:
        logging.error(f"CSSファイル '{file_name}' が見つかりません。")
        st.error(f"⚠️ CSSファイル '{file_name}' が見つかりません。デザインが正しく表示されない可能性があります。")
    except Exception as e:
        logging.error(f"CSSファイル '{file_name}' の読み込み中にエラーが発生しました: {e}")
        st.error(f"⚠️ CSSファイルの読み込み中にエラーが発生しました: {e}")
# --- 追加ここまで ---

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
            st.session_state.page = "landing"  # 初期ページをランディングページに設定
        if "authenticated" not in st.session_state:
            st.session_state.authenticated = False
        if "user_id" not in st.session_state:
            st.session_state.user_id = None
        if "username" not in st.session_state:
            st.session_state.username = None
        if "general_inquiry_history" not in st.session_state:
            st.session_state.general_inquiry_history = []
        if "is_initial_setup" not in st.session_state:
            st.session_state.is_initial_setup = False

    def _initialize_supabase_tables(self):
        """Supabaseテーブルの初期化（必要に応じて）"""
        # 本来はSupabase側で事前にテーブルを作成するべきですが、
        # 開発段階では自動作成を試行することも可能です
        logging.info("Supabaseテーブルの初期化を試みます (注意: テーブルは事前に作成することを推奨)")

    def next_page(self):
        """次のページに進む"""
        current_page = st.session_state.page
        if current_page == "step1":
            st.session_state.page = "step2"
        elif current_page == "step2":
            st.session_state.page = "step3"
        elif current_page == "step3":
            st.session_state.page = "step4"
        # step4からは自動で次に進まない（ユーザーが明示的に選択）

    def prev_page(self):
        """前のページに戻る"""
        current_page = st.session_state.page
        if current_page == "step2":
            st.session_state.page = "step1"
        elif current_page == "step3":
            st.session_state.page = "step2"
        elif current_page == "step4":
            st.session_state.page = "step3"

    def is_active(self, step_number):
        """指定されたステップが現在のページと同じかそれ以前なら'active'を返す"""
        current_page = st.session_state.page
        
        # ページ識別子を数字にマッピング
        page_mapping = {
            "step1": 1,
            "step2": 2, 
            "step3": 3,
            "step4": 4
        }
        
        current_step = page_mapping.get(current_page, 0)
        return "active" if step_number <= current_step else ""

    def make_sequence_bar(self):
        """ステッププログレスバーを表示"""
        st.markdown(f"""
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
                1: """まずはあなたの興味・知的好奇心を教えてください！！。

                後からゴールや学習計画を設定する際の出発点となります。

                興味 = 探究学習のエネルギー
                
                例えば以下のような視点で考えてみましょう：
                - 社会問題や身近な疑問・課題
                - 将来の夢や目標に関連するテーマ
                - これまでに学んできた中で特に興味を持ったこと""",
                
                2: """この画面では、テーマを具体的な目標に落とし込みます。

                目標 = 方向性と目指すゴール
                
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

    def render_step1(self):
        """テーマ設定ページの表示"""      
        st.title("Step1: 自分の興味から探究学習のテーマを決める！")

        # 現在のステップを表示
        self.make_sequence_bar()

        theme = st.text_input("あなたが探究したいテーマを入力してください。例：AIによるメタ認知支援")

        if st.button("テーマを決定する"):
            if theme:
                try:
                    self.conn.table("interests").insert({"user_id": st.session_state.user_id, "interest": theme}).execute()
                    st.success(f"テーマ '{theme}' を保存しました！")
                    st.session_state.user_theme = theme
                except Exception as e:
                    st.error(f"テーマの保存に失敗: {str(e)}")
                    logging.error(f"テーマ保存エラー: {e}", exc_info=True)

        col1, col2 = st.columns(2)
        with col1:
            if st.button("ホームへ戻る", key="back_to_home_from_step1"):
                self.set_page("home")
                st.rerun()
        with col2:
            if st.button("次へ"):
                self.next_page()
                st.rerun()

        # このページでやることのガイドを表示
        page_index = 1
        dialog_key = f"dialog_closed_page{page_index}"
        if dialog_key not in st.session_state or not st.session_state[dialog_key]:
            self.show_guide_dialog(1)

    def render_step2(self):
        """ゴール設定ページの表示"""      
        st.title("Step2：探究学習の目標を決めよう！")
        
        # 現在のステップを表示
        self.make_sequence_bar()

        # このページでやることのガイドを表示
        page_index = 2
        dialog_key = f"dialog_closed_page{page_index}"
        if dialog_key not in st.session_state or not st.session_state[dialog_key]:
            self.show_guide_dialog(2) 
        
        # ユーザーテーマの取得
        user_theme_str = ""
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
                st.session_state.user_theme_str = user_theme_str
            else:
                st.warning("テーマが登録されていません。前の画面で登録してください。")
                if st.button("テーマ登録ページに戻る", key="back_to_step1_from_step2"):
                    self.set_page("step1")
                    st.rerun()
                return
        except Exception as e:
            st.error(f"テーマの読み込みに失敗: {e}")
            logging.error(f"テーマ読み込みエラー: {e}", exc_info=True)
            return

        # 初期メッセージを生成（テーマがある場合）
        initial_message = None
        if user_theme_str and 'dialogue_log' not in st.session_state:
            initial_message = self.planner.generate_response(prompt=system_prompt, user_input=user_theme_str)

        # 統一された対話インターフェースを使用（無制限対話）
        chat_status = self.render_chat_interface(
            page_number="step2",
            history_key='dialogue_log',
            input_key='goal_input',
            placeholder='AIアシスタントからの質問に回答してください...',
            initial_message=initial_message,
            max_exchanges=float('inf')  # 無制限対話に変更
        )

        # 対話とは並行して、いつでも目標を整理できるエリアを表示
        st.markdown("---")
        st.subheader("💭 あなたの目標")
        st.write("AIとの対話して決まった目標を入力して「次へ」を押してください。")
        
        # 過去の目標を確認する機能を追加
        col_main, col_history = st.columns([3, 1])
        
        with col_history:
            if st.button("📜 過去の目標を見る", key="show_past_goals", help="これまでに設定した目標を確認できます"):
                self.show_goal_history()
        
        with col_main:
            # 最終目標を保存するテキストエリア（常に空白から開始）
            if 'final_goal' not in st.session_state:
                st.session_state.final_goal = ""
            
            final_goal_input = st.text_area(
                "目標を入力してください",
                value=st.session_state.final_goal, 
                key="final_goal_text_area",
                height=150,
                help="AIとの対話を踏まえて、あなたの探究学習の目標を自由に記述してください"
            )
        
        # テキストエリアの内容が変更されたらセッションに保存
        if final_goal_input != st.session_state.final_goal:
            st.session_state.final_goal = final_goal_input

        # ナビゲーションボタン
        col1, col2 = st.columns(2)
        with col1:
            if st.button("前へ"):
                self.prev_page()
                st.rerun()
        with col2:
            if st.button("次へ"):
                if st.session_state.final_goal.strip():
                    # DBに保存してから次へ進む
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
                        
                        if interest_id:
                            self.conn.table("goals").insert({
                                "user_id": st.session_state.user_id,
                                "interest_id": interest_id,
                                "goal": st.session_state.final_goal
                            }).execute()
                            st.success("学習目標を保存しました。")
                            self.next_page()
                            st.rerun()
                        else:
                            st.error("関連するテーマが見つからなかったため、目標を保存できませんでした。")
                    except Exception as e:
                        st.error(f"学習目標の保存に失敗: {e}")
                        logging.error(f"ゴール保存エラー: {e}", exc_info=True)
                else:
                    st.warning("学習目標を入力してから次へ進んでください。")

    def render_step3(self):
        """アイディエーションページの表示"""
        st.title("Step3：アイディエーション ~探究学習の活動内容を決めよう！")
        
        # 現在のステップを表示
        self.make_sequence_bar()

        # このページでやることのガイドを表示       
        page_index = 3
        dialog_key = f"dialog_closed_page{page_index}"
        if dialog_key not in st.session_state or not st.session_state[dialog_key]:
            self.show_guide_dialog(3)

        # ユーザーの目標を取得
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
                st.session_state.user_goal_str = user_goal_str
                st.write(f"あなたの探究活動の目標: {user_goal_str}")
            elif 'final_goal' in st.session_state:
                user_goal_str = st.session_state.final_goal
                st.write(f"あなたの探究活動の目標 (セッションから): {user_goal_str}")
            else:
                st.warning("目標が登録されていません。前の画面で登録してください。")
                if st.button("目標設定ページに戻る", key="back_to_step2_from_step3"):
                    self.set_page("step2")
                    st.rerun()
                return
        except Exception as e:
            st.error(f"目標の読み込みに失敗: {e}")
            logging.error(f"目標読み込みエラー: {e}", exc_info=True)
            return

        # 初期メッセージを生成（目標がある場合）
        initial_message = None
        if user_goal_str and 'dialogue_log_plan' not in st.session_state:
            initial_message = self.planner.generate_response(prompt=system_prompt, user_input=user_goal_str)

        # 統一された対話インターフェースを使用（無制限対話）
        chat_status = self.render_chat_interface(
            page_number="step3",
            history_key='dialogue_log_plan',
            input_key='plan_input',
            placeholder='あなたの回答を入力してください...',
            initial_message=initial_message,
            max_exchanges=float('inf')  # 無制限対話に変更
        )

        # 対話とは並行して、いつでも活動内容を整理できるエリアを表示
        st.markdown("---")
        st.subheader("📋 活動内容の整理")
        st.write("AIとの対話を参考に、あなたの探究学習の活動内容を整理してみましょう。いい感じに言語化できたら「次へ」に進んでください。")
        
        # 過去の活動内容を確認する機能を追加
        col_main, col_history = st.columns([3, 1])
        
        with col_history:
            if st.button("📜 過去の活動内容を見る", key="show_past_plans", help="これまでに設定した活動内容を確認できます"):
                self.show_plan_history()
        
        with col_main:
            # 学習計画を保存するテキストエリア（常に空白から開始）
            if 'learning_plan' not in st.session_state:
                st.session_state.learning_plan = ""
            
            learning_plan_input = st.text_area(
                "活動内容を整理しましょう", 
                value=st.session_state.learning_plan, 
                key="learning_plan_text_area",
                height=150,
                help="AIとの対話を踏まえて、あなたの探究学習の具体的な活動内容を自由に記述してください"
            )
        
        # テキストエリアの内容が変更されたらセッションに保存
        if learning_plan_input != st.session_state.learning_plan:
            st.session_state.learning_plan = learning_plan_input

        # ナビゲーションボタン
        col1, col2 = st.columns(2)
        with col1:
            if st.button("前へ"):
                self.prev_page()
                st.rerun()
        with col2:
            if st.button("次へ"):
                if st.session_state.learning_plan.strip():
                    # DBに保存してから次へ進む
                    try:
                        # 対応する goal_id を取得
                        goal_id = None
                        current_goal_str = st.session_state.get('user_goal_str')
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
                        
                        if goal_id:
                            self.conn.table("learning_plans").insert({
                                "user_id": st.session_state.user_id,
                                "goal_id": goal_id,
                                "nextStep": st.session_state.learning_plan
                            }).execute()
                            st.success("活動計画を保存しました。")
                            self.next_page()
                            st.rerun()
                        else:
                            st.error("関連する目標が見つからなかったため、活動計画を保存できませんでした。")
                    except Exception as e:
                        st.error(f"活動計画の保存に失敗: {e}")
                        logging.error(f"活動計画保存エラー: {e}", exc_info=True)
                else:
                    st.warning("活動内容を入力してから次へ進んでください。")

    def render_step4(self):
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
        st.title("探Qメイト - ログイン")
        st.write("AIを活用した探究学習支援アプリケーションです。探究テーマから学習目標の設定、学習計画の作成までを対話形式でサポートします。")
        
        tab1, tab2 = st.tabs(["ログイン", "新規ユーザー登録"])
        
        # ログインタブ
        with tab1:
            username = st.text_input("ユーザー名", key="login_username")
            access_code = st.text_input("パスワード", type="password", key="login_password")

            st.markdown(
                """
                <style>
                .stButton button {
                    font-size: 16px;
                    font-weight: bold; /* Bold text */
                    color: #FFFFFF;
                    background-color: #0e3558; /* Dark blue color */
                    border: none;
                    border-radius: 25px; /* Rounded corners */
                    padding: 10px 20px;
                    cursor: pointer;
                    transition: background-color 0.3s ease, transform 0.3s ease;
                }
                .stButton button:hover {
                    background-color: #47d7ac; /* Green background on hover */
                    color: #FFFFFF; /* Keep text white on hover */
                    transform: scale(1.05); /* Slightly enlarge on hover */
                }
                </style>
                """,
                unsafe_allow_html=True,
            )
            
            if st.button("ログイン", key="login_button"):
                try:
                    # Supabaseからユーザーを検索
                    # TODO: access_codeはハッシュ化して比較するべき
                    result = self.conn.table("users").select("id").eq("username", username).eq("password", access_code).execute()
                    if result.data:
                        user_id = result.data[0]["id"]
                        st.session_state.authenticated = True
                        st.session_state.user_id = user_id
                        st.session_state.username = username
                        st.session_state.page = "home" # ログイン後ホームページへ
                        st.success("ログインしました！")
                        st.rerun()
                    else:
                        st.error("ユーザー名またはパスワードが正しくありません")
                        user_id = None
                except Exception as e:
                    st.error(f"ログイン処理中にエラーが発生しました: {e}")
                    logging.error(f"ログインエラー: {e}", exc_info=True)
        
        # 新規ユーザー登録タブ
        with tab2:
            new_username = st.text_input("ユーザー名", key="reg_username")
            new_access_code = st.text_input("パスワード", type="password", key="reg_password")
            confirm_code = st.text_input("パスワード（確認）", type="password", key="confirm_password")
            
            if st.button("登録", key="register_button"):
                if new_access_code != confirm_code:
                    st.error("パスワードが一致しません")
                elif not new_username or not new_access_code:
                    st.error("ユーザー名とパスワードを入力してください")
                else:
                    try:
                        # Supabaseにユーザーを挿入
                        # TODO: new_access_code はハッシュ化して保存するべき
                        insert_data = {"username": new_username, "password": new_access_code}
                        result = self.conn.table("users").insert(insert_data).execute()
                        if result.data:
                            # 登録成功後、自動的にログインしてホームに遷移
                            user_id = result.data[0]["id"]
                            st.session_state.authenticated = True
                            st.session_state.user_id = user_id
                            st.session_state.username = new_username
                            st.session_state.page = "home"
                            st.success("ユーザー登録が完了しました。探究学習を始めましょう！")
                            st.rerun()
                        else:
                            st.error("ユーザー登録に失敗しました")
                    except Exception as e:
                        # PostgRESTエラーを解析して重複を判定することも可能
                        if "duplicate key value violates unique constraint" in str(e):
                             st.error("そのユーザー名は既に使用されています")
                        else:
                             st.error(f"ユーザー登録中にエラーが発生しました: {e}")
                        logging.error(f"ユーザー登録エラー: {e}", exc_info=True)

    def setup_sidebar(self):
        """サイドバーの設定"""
        with st.sidebar:
            st.markdown(f"こんにちは、{st.session_state.username}さん")
            
            # ログアウトボタンはページ横断で常に表示
            if st.button("ログアウト", key="logout_button", use_container_width=True):
                self.logout()
                
            st.divider()
            
            # メインナビゲーション
            st.write("🧭 **ナビゲーション**")
            
            current_page = st.session_state.page
            
            # ホームページボタン
            if current_page != "home":
                st.button("🏠 ホームへ戻る", on_click=self.navigate_to_home, key="sidebar_nav_home", use_container_width=True)
            else:
                st.button("**🏠 ホーム** ⬅️", key="sidebar_nav_home_current", use_container_width=True, disabled=True)
            
            # 4ステップのナビゲーション（ホーム以外で表示）
            if current_page != "home":
                st.write("📚 **探究学習プロセス**")
                step_buttons = [
                    ("1️⃣ Step 1: テーマ設定", "step1"),
                    ("2️⃣ Step 2: ゴール設定", "step2"),
                    ("3️⃣ Step 3: アイディエーション", "step3"),
                    ("4️⃣ Step 4: まとめ", "step4")
                ]
                
                for label, step_id in step_buttons:
                    # 現在のページは強調表示
                    if current_page == step_id:
                        st.button(f"**{label}** ⬅️", key=f"sidebar_nav_{step_id}_current", use_container_width=True, disabled=True)
                    else:
                        if step_id == "step1":
                            st.button(label, on_click=self.navigate_to_step1, key=f"sidebar_nav_{step_id}", use_container_width=True)
                        elif step_id == "step2":
                            st.button(label, on_click=self.navigate_to_step2, key=f"sidebar_nav_{step_id}", use_container_width=True)
                        elif step_id == "step3":
                            st.button(label, on_click=self.navigate_to_step3, key=f"sidebar_nav_{step_id}", use_container_width=True)
                        elif step_id == "step4":
                            st.button(label, on_click=self.navigate_to_step4, key=f"sidebar_nav_{step_id}", use_container_width=True)
                            
            st.divider()
            
            # その他の機能
            st.write("🔧 **その他の機能**")
            
            # 相談窓口ボタン
            if current_page != "inquiry":
                st.button("❓ 行き詰ってたらここにおいで！", on_click=self.navigate_to_inquiry, key="sidebar_nav_inquiry", use_container_width=True)
            else:
                st.button("**❓ 行き詰ってたらここにおいで！** ⬅️", key="sidebar_nav_inquiry_current", use_container_width=True, disabled=True)
                
            # プロフィール設定ボタン
            if current_page != "profile":
                st.button("⚙️ プロフィール設定", on_click=self.navigate_to_profile, key="sidebar_nav_profile", use_container_width=True)
            else:
                st.button("**⚙️ プロフィール設定** ⬅️", key="sidebar_nav_profile_current", use_container_width=True, disabled=True)

    def set_page(self, page_value):
        """ページを設定するヘルパー関数"""
        st.session_state.page = page_value
        # 相談窓口やホームページ以外から移動する場合は履歴をクリア（必要に応じて調整）
        if page_value not in ["general_inquiry", "home"]:
            if "general_inquiry_history" in st.session_state:
                 st.session_state.general_inquiry_history = []
        # elif page_value == "home": # ホームに移動したときに相談履歴をクリアする場合
        #     if "general_inquiry_history" in st.session_state:
        #          st.session_state.general_inquiry_history = []

    def run(self):
        """アプリケーションの実行"""
        # --- 追加: CSSファイルの読み込み ---
        local_css("static/style.css") 
        # --- 追加ここまで ---

        # 認証状態の確認
        if not st.session_state.authenticated:
            # 未認証ユーザーの場合、ページに応じて表示
            if st.session_state.page == "landing":
                self.render_landing_page()
            elif st.session_state.page == "login":
                # サイドバーの設定（ログインページのみ）
                self.setup_sidebar()
                self.render_login_page()
            else:
                # その他の場合はランディングページにリダイレクト
                self.set_page("landing")
                st.rerun()
        else:
            # 認証済みユーザーの場合
            # サイドバーの設定
            self.setup_sidebar()
            
            # ページを表示
            if st.session_state.page == "home":
                self.render_home_page()
            elif st.session_state.page == "profile":
                self.render_profile_page()
            elif st.session_state.page == "step1":
                self.render_step1()
            elif st.session_state.page == "step2":
                self.render_step2()
            elif st.session_state.page == "step3":
                self.render_step3()
            elif st.session_state.page == "step4":
                self.render_step4()
            elif st.session_state.page == "inquiry":
                self.render_inquiry_page()
            else:
                # 認証済みユーザーが不正なページにいる場合はホームにリダイレクト
                self.set_page("home")
                st.rerun()

    # --- ヘルパーメソッドを追加 ---
    def save_chat_log(self, page: str, sender: str, message_content: str):
        """チャットログをデータベースに保存"""
        try:
            self.conn.table("chat_logs").insert({
                "user_id": st.session_state.user_id,
                "page": page,
                "sender": sender,
                "message": message_content
            }).execute()
        except Exception as e:
            logging.error(f"チャットログ保存エラー: {e}", exc_info=True)
    
    @st.dialog("📜 過去の目標一覧")
    def show_goal_history(self):
        """過去の目標をダイアログで表示"""
        try:
            goal_result = self.conn.table("goals")\
                                .select("goal, created_at")\
                                .eq("user_id", st.session_state.user_id)\
                                .order("created_at", desc=True)\
                                .execute()
            
            if goal_result.data:
                st.write("これまでに設定した目標の履歴です：")
                for i, record in enumerate(goal_result.data):
                    created_date = record['created_at'][:10]  # YYYY-MM-DD形式
                    st.markdown(f"**{i+1}. {created_date}**")
                    st.write(f"{record['goal']}")
                    st.markdown("---")
                    
                st.info("💡 参考にして新しい目標を設定してください。")
            else:
                st.write("まだ目標が設定されていません。")
                st.info("💡 初回の目標設定ですね！新しい目標を入力してください。")
        except Exception as e:
            st.error(f"履歴の読み込みに失敗しました: {e}")
            logging.error(f"目標履歴読み込みエラー: {e}", exc_info=True)
    
    @st.dialog("📜 過去の活動内容一覧")
    def show_plan_history(self):
        """過去の活動内容をダイアログで表示"""
        try:
            plan_result = self.conn.table("learning_plans")\
                                .select("nextStep, created_at")\
                                .eq("user_id", st.session_state.user_id)\
                                .order("created_at", desc=True)\
                                .execute()
            
            if plan_result.data:
                st.write("これまでに設定した活動内容の履歴です：")
                for i, record in enumerate(plan_result.data):
                    created_date = record['created_at'][:10]  # YYYY-MM-DD形式
                    st.markdown(f"**{i+1}. {created_date}**")
                    st.write(f"{record['nextStep']}")
                    st.markdown("---")
                    
                st.info("💡 参考にして新しい活動内容を設定してください。")
            else:
                st.write("まだ活動内容が設定されていません。")
                st.info("💡 初回の活動内容設定ですね！新しい内容を入力してください。")
        except Exception as e:
            st.error(f"履歴の読み込みに失敗しました: {e}")
            logging.error(f"活動内容履歴読み込みエラー: {e}", exc_info=True)
    
    def render_goal_history_list(self):
        """目標履歴をリスト形式で表示"""
        try:
            goal_result = self.conn.table("goals")\
                                .select("goal, created_at, id")\
                                .eq("user_id", st.session_state.user_id)\
                                .order("created_at", desc=True)\
                                .execute()
            
            if goal_result.data:
                st.markdown(f"**📊 登録された目標: {len(goal_result.data)}件**")
                
                for i, record in enumerate(goal_result.data):
                    created_date = record['created_at'][:10]  # YYYY-MM-DD形式
                    created_time = record['created_at'][11:19]  # HH:MM:SS形式
                    
                    with st.container():
                        col1, col2 = st.columns([1, 5])
                        with col1:
                            st.markdown(f"**#{i+1}**")
                            st.caption(f"📅 {created_date}")
                            st.caption(f"🕐 {created_time}")
                        with col2:
                            st.markdown(f"**目標内容:**")
                            st.write(record['goal'])
                        
                        if i < len(goal_result.data) - 1:  # 最後の項目以外に区切り線
                            st.markdown("---")
            else:
                st.info("📝 まだ目標が設定されていません。\n\n探究学習を始めて、最初の目標を設定してみましょう！")
                
        except Exception as e:
            st.error(f"目標履歴の読み込みに失敗しました: {e}")
            logging.error(f"目標履歴表示エラー: {e}", exc_info=True)
    
    def render_plan_history_list(self):
        """活動内容履歴をリスト形式で表示"""
        try:
            plan_result = self.conn.table("learning_plans")\
                                .select("nextStep, created_at, id")\
                                .eq("user_id", st.session_state.user_id)\
                                .order("created_at", desc=True)\
                                .execute()
            
            if plan_result.data:
                st.markdown(f"**📊 登録された活動内容: {len(plan_result.data)}件**")
                
                for i, record in enumerate(plan_result.data):
                    created_date = record['created_at'][:10]  # YYYY-MM-DD形式
                    created_time = record['created_at'][11:19]  # HH:MM:SS形式
                    
                    with st.container():
                        col1, col2 = st.columns([1, 5])
                        with col1:
                            st.markdown(f"**#{i+1}**")
                            st.caption(f"📅 {created_date}")
                            st.caption(f"🕐 {created_time}")
                        with col2:
                            st.markdown(f"**活動内容:**")
                            st.write(record['nextStep'])
                        
                        if i < len(plan_result.data) - 1:  # 最後の項目以外に区切り線
                            st.markdown("---")
            else:
                st.info("📝 まだ活動内容が設定されていません。\n\n探究学習を進めて、活動計画を立ててみましょう！")
                
        except Exception as e:
            st.error(f"活動内容履歴の読み込みに失敗しました: {e}")
            logging.error(f"活動内容履歴表示エラー: {e}", exc_info=True)
    
    def render_theme_history_list(self):
        """テーマ履歴をリスト形式で表示"""
        try:
            theme_result = self.conn.table("interests")\
                                .select("interest, created_at, id")\
                                .eq("user_id", st.session_state.user_id)\
                                .order("created_at", desc=True)\
                                .execute()
            
            if theme_result.data:
                st.markdown(f"**📊 登録されたテーマ: {len(theme_result.data)}件**")
                
                for i, record in enumerate(theme_result.data):
                    created_date = record['created_at'][:10]  # YYYY-MM-DD形式
                    created_time = record['created_at'][11:19]  # HH:MM:SS形式
                    
                    with st.container():
                        col1, col2 = st.columns([1, 5])
                        with col1:
                            st.markdown(f"**#{i+1}**")
                            st.caption(f"📅 {created_date}")
                            st.caption(f"🕐 {created_time}")
                        with col2:
                            st.markdown(f"**テーマ:**")
                            st.write(record['interest'])
                        
                        if i < len(theme_result.data) - 1:  # 最後の項目以外に区切り線
                            st.markdown("---")
            else:
                st.info("📝 まだテーマが設定されていません。\n\n探究学習を始めて、興味のあるテーマを見つけてみましょう！")
                
        except Exception as e:
            st.error(f"テーマ履歴の読み込みに失敗しました: {e}")
            logging.error(f"テーマ履歴表示エラー: {e}", exc_info=True)
    


    def load_user_profile(self):
        """ユーザーのプロフィール情報をロードする"""
        try:
            result = self.conn.table("user_profiles")\
                        .select("profile_data")\
                        .eq("user_id", st.session_state.user_id)\
                        .execute()
            if result.data:
                profile_data = result.data[0]['profile_data']
                return {
                    "likes": profile_data.get("likes", []),
                    "interests": profile_data.get("interests", []),
                    "wants_to_try": profile_data.get("wants_to_try", [])
                }
            else:
                return {"likes": [], "interests": [], "wants_to_try": []}
        except Exception as e:
            logging.error(f"プロフィール読み込みエラー: {e}", exc_info=True)
            return {"likes": [], "interests": [], "wants_to_try": []}

    def save_user_profile(self, likes: list, interests: list, wants_to_try: list):
        """ユーザーのプロフィール情報を保存する（JSON形式）"""
        try:
            # プロフィールが既に存在するかチェック
            existing = self.conn.table("user_profiles")\
                        .select("id")\
                        .eq("user_id", st.session_state.user_id)\
                        .execute()
            
            profile_data = {
                "likes": likes,
                "interests": interests,
                "wants_to_try": wants_to_try
            }
            
            if existing.data:
                # 既存のプロフィールを更新
                result = self.conn.table("user_profiles")\
                          .update({"profile_data": profile_data})\
                          .eq("user_id", st.session_state.user_id)\
                          .execute()
            else:
                # 新規プロフィールを作成
                insert_data = {
                    "user_id": st.session_state.user_id,
                    "profile_data": profile_data
                }
                result = self.conn.table("user_profiles")\
                          .insert(insert_data)\
                          .execute()
            
            return True
        except Exception as e:
            logging.error(f"プロフィール保存エラー: {e}", exc_info=True)
            return False

    def render_tag_input(self, label: str, items: list, key: str, placeholder: str = "", help_text: str = ""):
        """動的タグ入力ウィジェットをレンダリング（編集モード付き）"""
        st.write(f"**{label}**")
        if help_text:
            st.caption(help_text)
        
        # 編集モードの状態管理
        edit_mode_key = f"edit_mode_{key}"
        if edit_mode_key not in st.session_state:
            st.session_state[edit_mode_key] = False
        
        # 2カラムレイアウト
        col1, col2 = st.columns([1, 1])
        
        with col1:            
            # 新しいタグ追加用の入力フィールド
            new_item = st.text_input(
                "項目名を入力",
                key=f"new_{key}",
                placeholder=placeholder,
                label_visibility="collapsed"
            )
            
            # 追加ボタンを入力欄の直下に配置
            if st.button("➕ 追加", key=f"add_{key}", disabled=not new_item.strip(), use_container_width=True):
                if new_item.strip():
                    if new_item.strip() not in items:
                        items.append(new_item.strip())
                        st.success(f"✅ '{new_item.strip()}'を追加しました！")
                        st.rerun()
                    else:
                        st.warning("⚠️ 既に存在しています")
            
            # 一括追加機能
            with st.expander("📝 一括追加"):
                bulk_input = st.text_area(
                    "カンマ区切りで入力",
                    key=f"bulk_{key}",
                    placeholder="例: 音楽, 映画, 読書",
                    help="カンマ(,)で区切って複数項目を追加",
                    height=80
                )
                if st.button("一括追加", key=f"bulk_add_{key}", use_container_width=True):
                    if bulk_input.strip():
                        new_items = [item.strip() for item in bulk_input.split(",") if item.strip()]
                        added_count = 0
                        for item in new_items:
                            if item and item not in items:
                                items.append(item)
                                added_count += 1
                        
                        if added_count > 0:
                            st.success(f"✅ {added_count}個追加しました！")
                            st.rerun()
                        else:
                            st.info("ℹ️ 新しい項目はありませんでした")
        
        with col2:
            if items:
                # 登録数と編集ボタン
                col2_header1, col2_header2 = st.columns([2, 1])
                # タグ一覧の表示
                for i, item in enumerate(items):
                    if st.session_state[edit_mode_key]:
                        # 編集モード: 削除ボタン付きで表示
                        tag_col1, tag_col2 = st.columns([4, 1])
                        with tag_col1:
                            st.write(f"🏷️ {item}")
                        with tag_col2:
                            if st.button("✕", key=f"delete_{key}_{i}_{item}", help=f"'{item}'を削除"):
                                items.remove(item)
                                st.success(f"🗑️ '{item}'を削除しました")
                                st.rerun()
                    else:
                        # 表示モード: 削除ボタンなし
                        st.write(f"🏷️ {item}")

                # 編集モードの切り替えボタン
                if st.session_state[edit_mode_key]:
                    if st.button("✅ 完了", key=f"finish_edit_{key}", use_container_width=True):
                        st.session_state[edit_mode_key] = False
                        st.success("📝 編集を完了しました")
                        st.rerun()
                else:
                    if st.button("✏️ 編集", key=f"start_edit_{key}", use_container_width=True):
                        st.session_state[edit_mode_key] = True
                        st.info("💡 各タグの✕ボタンで削除できます")
                        st.rerun()             

                # 編集モード中の追加操作
                if st.session_state[edit_mode_key]:
                    st.divider()
                    col2_action1, col2_action2 = st.columns(2)
                    with col2_action1:
                        if st.button("🔄 並び替え", key=f"sort_{key}", use_container_width=True):
                            items.sort()
                            st.success("🔄 アルファベット順に並び替えました")
                            st.rerun()
                    with col2_action2:
                        if st.button("🗑️ 全削除", key=f"clear_all_{key}", use_container_width=True):
                            if st.session_state.get(f"confirm_clear_{key}", False):
                                items.clear()
                                st.session_state[edit_mode_key] = False
                                st.success("🗑️ 全て削除しました")
                                st.rerun()
                            else:
                                st.session_state[f"confirm_clear_{key}"] = True
                                st.warning("⚠️ もう一度押すと全削除されます")
                                st.rerun()
                    
                    # 確認状態をリセット（他のボタンが押された場合）
                    if f"confirm_clear_{key}" in st.session_state and st.session_state[f"confirm_clear_{key}"] == True:
                        # 少し待ってから確認状態をリセット
                        import time
                        time.sleep(0.1)
                        if st.session_state.get(f"confirm_clear_{key}", False):
                            st.session_state[f"confirm_clear_{key}"] = False
            else:
                st.info("📝 まだタグが追加されていません")
                st.caption("👈 左側の入力欄からタグを追加してください")
        
        return items

    def render_chat_interface(self, 
                             page_number: str, 
                             history_key: str, 
                             input_key: str, 
                             placeholder: str = "回答を入力してください...",
                             initial_message: str = None,
                             max_exchanges: int = 3):
        """統一された対話インターフェースをレンダリング
        
        Args:
            page_number: ページ番号（ログ保存用）
            history_key: セッション状態の履歴キー
            input_key: 入力フィールドのキー
            placeholder: 入力フィールドのプレースホルダー
            initial_message: 初期メッセージ（AIからの最初の発話）
            max_exchanges: 最大対話回数（float('inf')で無制限）
            
        Returns:
            dict: 対話の状態情報
            - is_complete: 対話が完了したか
            - user_message_count: ユーザーメッセージ数
            - ai_message_count: AIメッセージ数
        """
        # 対話履歴の初期化
        if history_key not in st.session_state:
            st.session_state[history_key] = []
            
            # 初期メッセージがある場合は追加
            if initial_message:
                st.session_state[history_key].append({"role": "assistant", "content": initial_message})

        # 対話履歴の表示
        chat_container = st.container()
        with chat_container:
            for msg in st.session_state[history_key]:
                with st.chat_message(msg["role"]):
                    st.write(msg["content"])

        # 対話回数をカウント
        user_message_count = sum(1 for msg in st.session_state[history_key] if msg["role"] == "user")
        ai_message_count = sum(1 for msg in st.session_state[history_key] if msg["role"] == "assistant")
        
        # 無制限対話の場合は常にFalse、そうでなければ上限チェック
        is_complete = False if max_exchanges == float('inf') else user_message_count >= max_exchanges

        # 対話が完了していない場合のみ入力フィールドを表示
        if not is_complete:
            # カスタム入力フィールド（Ctrl+Enterで送信、Enterで改行）
            st.markdown("""
            <style>
            .custom-input-container {
                position: relative;
                margin: 10px 0;
            }
            .input-help {
                font-size: 0.8rem;
                color: #666;
                margin-bottom: 5px;
            }
            </style>
            """, unsafe_allow_html=True)
            
            st.markdown('<div class="input-help">💡 Enterで改行、Ctrl+Enterで送信</div>', unsafe_allow_html=True)
            
            # セッション状態で入力値を管理
            input_state_key = f"{input_key}_text"
            if input_state_key not in st.session_state:
                st.session_state[input_state_key] = ""
            
            # フォームを使用してCtrl+Enterを処理
            with st.form(key=f"{input_key}_form"):
                user_input = st.text_area(
                    label="メッセージを入力",
                    value=st.session_state[input_state_key],
                    placeholder=placeholder,
                    height=100,
                    key=f"{input_key}_textarea",
                    label_visibility="collapsed"
                )
                
                # JavaScript for Ctrl+Enter functionality
                st.markdown(f"""
                <script>
                document.addEventListener('DOMContentLoaded', function() {{
                    const textArea = document.querySelector('textarea[data-testid="{input_key}_textarea"]');
                    if (textArea) {{
                        textArea.addEventListener('keydown', function(e) {{
                            if (e.ctrlKey && e.key === 'Enter') {{
                                e.preventDefault();
                                const submitButton = document.querySelector('button[data-testid="{input_key}_submit"]');
                                if (submitButton) {{
                                    submitButton.click();
                                }}
                            }}
                        }});
                    }}
                }});
                </script>
                """, unsafe_allow_html=True)
                
                col1, col2, col3 = st.columns([1, 1, 1])
                with col2:
                    submit_clicked = st.form_submit_button(
                        "📤 送信 (Ctrl+Enter)", 
                        use_container_width=True,
                        type="primary"
                    )
            
            # 送信処理
            if submit_clicked and user_input.strip():
                # ユーザーメッセージのログ保存
                self.save_chat_log(page=page_number, sender="user", message_content=user_input)
                
                # 対話履歴に追加
                st.session_state[history_key].append({"role": "user", "content": user_input})
                
                # AIの応答を生成
                response = self.planner.generate_response(prompt=system_prompt, user_input=user_input)
                
                # AIメッセージのログ保存
                self.save_chat_log(page=page_number, sender="AI", message_content=response)
                
                # 対話履歴に追加
                st.session_state[history_key].append({"role": "assistant", "content": response})
                
                # 入力フィールドをクリア
                st.session_state[input_state_key] = ""
                
                # 画面を再読み込み
                st.rerun()
            elif submit_clicked and not user_input.strip():
                st.warning("メッセージを入力してから送信してください。")
        
        return {
            "is_complete": is_complete,
            "user_message_count": user_message_count,
            "ai_message_count": ai_message_count
        }

    def render_inquiry_page(self):
        """なんでも相談窓口ページの表示"""
        st.title("❓ なんでも相談窓口")
        st.write("探究学習に関するあらゆる疑問や悩みをAIアシスタントに相談できます。")
        st.info("💡 困ったことがあれば、何でもお気軽にお聞きください！")
        
        # 統一された対話インターフェースを使用
        chat_status = self.render_chat_interface(
            page_number="inquiry",
            history_key='general_inquiry_history',
            input_key='general_inquiry_input',
            placeholder='相談内容を入力してください...',
            initial_message=None,  # 初期メッセージなし
            max_exchanges=float('inf')  # 無制限対話
        )
        
        # 履歴クリアボタン
        col1, col2, col3 = st.columns([1, 1, 1])
        with col2:
            if st.button("🗑️ 履歴をクリア", key="clear_inquiry_history", use_container_width=True):
                if 'general_inquiry_history' in st.session_state:
                    st.session_state.general_inquiry_history = []
                    st.success("履歴をクリアしました。")
                    st.rerun()

    def navigate_to_step1(self):
        """Step1に移動"""
        self.set_page("step1")

    def navigate_to_step2(self):
        """Step2に移動"""
        self.set_page("step2")

    def navigate_to_step3(self):
        """Step3に移動"""
        self.set_page("step3")

    def navigate_to_step4(self):
        """Step4に移動"""
        self.set_page("step4")

    def navigate_to_inquiry(self):
        """相談窓口に移動"""
        self.set_page("inquiry")

    def navigate_to_profile(self):
        """プロフィール設定に移動"""
        self.set_page("profile")

    def navigate_to_home(self):
        """ホームページに移動"""
        self.set_page("home")

    def render_profile_page(self):
        """プロフィール設定ページを表示"""
        st.title("🎯 プロフィール設定")
        st.markdown("---")
        
        # プロフィール情報をロード
        profile = self.load_user_profile()
        
        # 「好きなこと」セクションのみ表示
        st.subheader("💖 好きなこと・興味関心")
        st.markdown("あなたの興味や関心を教えてください。これらの情報は、あなたに最適な探究学習を提案するために使用されます。")
        
        # 2カラムレイアウト
        col1, col2 = st.columns([1, 1])
        
        with col1:
            st.markdown("#### 🔍 新しい項目を追加")
            
        with col2:
            st.markdown("#### 📋 現在の登録項目")
        
        # タグ入力ウィジェット
        likes = profile["likes"]
        self.render_tag_input(
            label="",
            items=likes,
            key="likes",
            placeholder="例: 音楽、映画、読書、スポーツ",
            help_text="興味のあることを自由に追加してください"
        )
        
        # 保存ボタン
        st.markdown("---")
        col1, col2, col3 = st.columns([1, 1, 1])
        with col2:
            if st.button("💾 保存", key="save_profile", use_container_width=True, type="primary"):
                if self.save_user_profile(likes, [], []):  # 現在は likes のみを保存
                    st.success("✅ プロフィールを保存しました！")
                    st.balloons()
                else:
                    st.error("❌ 保存に失敗しました。再試行してください。")
        
        # 学習履歴セクションを追加
        st.markdown("---")
        st.subheader("📚 学習履歴")
        st.markdown("これまでの探究学習の記録を確認できます。")
        
        # タブで目標・活動内容・テーマを分ける
        tab1, tab2, tab3 = st.tabs(["🎯 目標履歴", "📋 活動内容履歴", "💡 テーマ履歴"])
        
        with tab1:
            self.render_goal_history_list()
        
        with tab2:
            self.render_plan_history_list()
            
        with tab3:
            self.render_theme_history_list()
        
        # ホームに戻るボタン
        st.markdown("---")
        if st.button("🏠 ホームに戻る", key="profile_to_home", use_container_width=True):
            self.set_page("home")
            st.rerun()

    def render_landing_page(self):
        """魅力的なランディングページを表示"""
        # ヘッダー部分
        st.markdown("""
        <div class="landing-header">
            <div class="header-content">
                <div class="logo-section">
                    <h1 class="main-title">🔍 探Qメイト</h1>
                    <p class="subtitle">AI と一緒に、あなただけの探究学習を始めよう</p>
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)
        
        # 隠しボタン（実際の処理用）
        col1, col2, col3 = st.columns([1, 1, 1])
        with col2:
            if st.button("🚀 今すぐ始める", key="start-btn", use_container_width=True, type="primary"):
                self.set_page("login")
                st.rerun()
        
        # 特徴セクション
        st.markdown("""
        <div class="features-section">
            <h2 class="section-title">✨ なぜ探Qメイトなのか？</h2>
            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon">🎯</div>
                    <h3>個人最適化された学習</h3>
                    <p>あなたの興味・関心に基づいて、AIが最適な探究テーマを提案。一人ひとりに合わせた学習体験を提供します。</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🤖</div>
                    <h3>AI チューターの伴走</h3>
                    <p>最新のGPT-4を活用したAIチューターが、あなたの学習を24時間サポート。質問や相談にいつでも対応します。</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">📈</div>
                    <h3>段階的な学習設計</h3>
                    <p>テーマ設定から目標設定、活動計画まで、4つのステップで体系的に探究学習を組み立てることができます。</p>
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)
        
        # 学習フローセクション
        st.markdown("""
        <div class="flow-section">
            <h2 class="section-title">🛤️ 学習の流れ</h2>
            <div class="flow-steps">
                <div class="flow-step">
                    <div class="step-number">1</div>
                    <div class="step-content">
                        <h3>🎯 テーマ発見</h3>
                        <p>あなたの興味・関心から探究したいテーマを見つけます</p>
                    </div>
                </div>
                <div class="flow-arrow">→</div>
                <div class="flow-step">
                    <div class="step-number">2</div>
                    <div class="step-content">
                        <h3>🎖️ 目標設定</h3>
                        <p>AIとの対話を通じて具体的な学習目標を設定します</p>
                    </div>
                </div>
                <div class="flow-arrow">→</div>
                <div class="flow-step">
                    <div class="step-number">3</div>
                    <div class="step-content">
                        <h3>📋 計画作成</h3>
                        <p>目標達成のための具体的な活動計画を立てます</p>
                    </div>
                </div>
                <div class="flow-arrow">→</div>
                <div class="flow-step">
                    <div class="step-number">4</div>
                    <div class="step-content">
                        <h3>🎉 成果まとめ</h3>
                        <p>学習成果を整理し、次のステップを見つけます</p>
                    </div>
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)

        #使ってくれた生徒や先生の感想
        
        # CTA セクション
        st.markdown("""
        <div class="cta-section-bottom">
            <h2 class="cta-title">🌟 今すぐ探究学習を始めよう！</h2>
            <p class="cta-description">AIと一緒に、あなたの興味を深い学びに変えませんか？</p>
        </div>
        """, unsafe_allow_html=True)
        
        # 最終CTAボタン
        col1, col2, col3 = st.columns([1, 2, 1])
        with col2:
            if st.button("🚀 無料で始める", key="final-cta", use_container_width=True, type="primary"):
                self.set_page("login")
                st.rerun()
        
        # フッター
        st.markdown("""
        <div class="footer">
            <p>© 2024 探Qメイト - AIが支援する探究学習プラットフォーム</p>
        </div>
        """, unsafe_allow_html=True)

    def logout(self):
        """ログアウト処理"""
        st.session_state.authenticated = False
        st.session_state.user_id = None
        st.session_state.username = None
        
        # セッション状態をクリア（必要な項目のみ保持）
        keys_to_keep = {"authenticated", "user_id", "username", "page"}
        for key in list(st.session_state.keys()):
            if key not in keys_to_keep:
                del st.session_state[key]
                
        # ランディングページにリダイレクト
        self.set_page("landing")
        st.rerun()

    def render_home_page(self):
        """ホームページの表示"""
        st.title(f"ようこそ、{st.session_state.username}さん！")
        st.write("どちらの機能を利用しますか？")

        col1, col2 = st.columns(2)
        with col1:
            if st.button("課題設定プロセスを開始する", key="start_process_button"):
                self.set_page("step1")
                st.rerun()
        with col2:
            if st.button("行き詰ってたらここにおいで！", key="goto_general_inquiry_button"):
                self.set_page("inquiry")
                st.rerun()

# アプリケーション実行
if __name__ == "__main__":
    app = StreamlitApp()
    app.run()