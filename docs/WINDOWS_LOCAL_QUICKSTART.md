# Windows ローカル最短起動（非 Docker）

このドキュメントは、Docker を使わずに Windows（PowerShell / cmd）で最短起動するための手順です。リポジトリ直下をカレントディレクトリとして実行してください。

## 前提
- Python 3.10 以上（仮想環境は任意）
- Node.js 18 以上（Vite 5 利用のため）
- 文字コードは UTF-8、改行は CRLF（既定）想定

## 初回のみ（依存インストール・環境変数）

PowerShell:
```powershell
python -m venv .venv
.\\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
@'
SUPABASE_URL=https://example.supabase.co
SUPABASE_KEY=dummy-anon-key
OPENAI_API_KEY=sk-test-xxxxxxxxxxxxxxxxxxxx
ENABLE_CORS=true
'@ | Out-File -Encoding utf8 -FilePath .\\.env
cd react-app
npm ci
cd ..
```

cmd:
```batch
python -m venv .venv
.\\.venv\Scripts\activate.bat
pip install -r backend\requirements.txt
echo SUPABASE_URL=https://example.supabase.co> .env
echo SUPABASE_KEY=dummy-anon-key>> .env
echo OPENAI_API_KEY=sk-test-xxxxxxxxxxxxxxxxxxxx>> .env
echo ENABLE_CORS=true>> .env
cd react-app
npm ci
cd ..
```

## 2回目以降（起動）

- Backend（別タブ）
```powershell
cd $env:WORKSPACE  # リポジトリ直下
.\\.venv\Scripts\Activate.ps1
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

- Frontend（別タブ）
```powershell
cd react-app
$env:VITE_API_URL='http://127.0.0.1:8000'
npm run dev
```

cmd での起動:
```batch
cd %WORKSPACE%
.\\.venv\Scripts\activate.bat
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000

cd %WORKSPACE%\react-app
set VITE_API_URL=http://127.0.0.1:8000
npm run dev
```

## 停止・再起動
- Ctrl + C で停止。
- ポート詰まり時は PowerShell:
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess | Stop-Process -Force
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
```

## ポート競合時
- Backend を 8001、Frontend を 3001 に変更：
```powershell
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8001
$env:VITE_API_URL='http://127.0.0.1:8001'
cd react-app; npm run dev -- --port 3001
```

## 動作確認
- Backend: http://127.0.0.1:8000/health
- Docs: http://127.0.0.1:8000/docs
- Frontend: http://127.0.0.1:3000/

## よくあるエラー
- CORS エラー: `.env` に `ENABLE_CORS=true` を設定し Backend 再起動。
- モジュール未検出（Frontend）: `cd react-app && npm ci`。
- uvicorn 未検出（Backend）: 仮想環境を有効化して `pip install -r backend/requirements.txt`。

## メモ
- `.env` は「ルート」から起動する場合はルートに置くのが確実です。`backend/` から実行する場合は `backend/.env` に同等の内容を置いてください。
- Supabase / OpenAI の鍵がダミーのままでも起動はできますが、多くの API は失敗します。まずは `/` と `/health` の疎通確認を行ってください。
