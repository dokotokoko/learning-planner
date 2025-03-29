import csv
import yaml
from streamlit_authenticator.utilities.hasher import Hasher
import os

# スクリプトのディレクトリを基準にした絶対パスを生成
current_dir = os.path.dirname(os.path.abspath(__file__))

# CSVファイルと設定ファイルのパスを設定
users_csv_path = os.path.join(current_dir, "sample_userInfo.csv")
config_yaml_path = os.path.join(current_dir, "config.yaml")

# ファイルの存在チェックを追加（推奨）
if not os.path.exists(users_csv_path):
    raise FileNotFoundError(f"CSVファイルが見つかりません: {users_csv_path}")

## ユーザー設定の一覧が記述されたデータを読み込み
with open(users_csv_path, "r") as f:
    csvreader = csv.DictReader(f)
    users = list(csvreader)

## yaml 設定一覧が記述されたデータを読み込み
with open(config_yaml_path,"r") as f:
    yaml_data = yaml.safe_load(f)

## パスワードのハッシュ化
users_dict = {}
hasher = Hasher()
for user in users:
    user["password"] = hasher.hash(user["password"])
    tmp_dict = {
        "name": user["name"],
        "password": user["password"],
        "email": user["email"],
    }
    users_dict[user["id"]] = tmp_dict

## yaml 書き込み
yaml_data["credentials"]["usernames"] = users_dict
with open(config_yaml_path, "w") as f:
    yaml.dump(yaml_data, f)
    print("完了")
