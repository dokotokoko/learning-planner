import streamlit as st
import streamlit_authenticator as stauth
import os

import yaml
from yaml.loader import SafeLoader

## ユーザー設定読み込み
# スクリプトのディレクトリを基準にした絶対パスを生成
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
yaml_path = os.path.join(parent_dir, "config", "config.yaml")

# ファイルの存在チェック
if not os.path.exists(yaml_path):
    raise FileNotFoundError(f"設定ファイルが見つかりません: {yaml_path}")

with open(yaml_path) as file:
    config = yaml.load(file, Loader=SafeLoader)

authenticator = stauth.Authenticate(
    credentials=config['credentials'],
    cookie_name=config['cookie']['name'],
    cookie_key=config['cookie']['key'],
    cookie_expiry_days=config['cookie']['expiry_days'],
)

## UI 
authenticator.login()
if st.session_state["authentication_status"]:
    ## ログイン成功
    with st.sidebar:
        st.markdown(f'## Welcome *{st.session_state["name"]}*')
        authenticator.logout('Logout', 'sidebar')
        st.divider()
    st.write('# ログインしました!')

elif st.session_state["authentication_status"] is False:
    ## ログイン成功ログイン失敗
    st.error('Username/password is incorrect')

elif st.session_state["authentication_status"] is None:
    ## デフォルト
    st.warning('Please enter your username and password')
