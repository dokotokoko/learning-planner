@echo off
REM 探Qメイト 開発環境起動スクリプト (Windows)

echo 🚀 探Qメイト開発環境を起動しています...

REM バックエンド（FastAPI）の起動
echo 📡 FastAPIサーバーを起動中...
cd backend
start "FastAPI Server" cmd /k "python main.py"

REM 少し待機
timeout /t 3 /nobreak > nul

REM フロントエンド（React）の起動
echo ⚛️  Reactアプリを起動中...
cd ..\react-app
start "React App" cmd /k "npm run dev"

echo ✅ 起動完了！
echo.
echo 🌐 アクセス先:
echo    React アプリ: http://localhost:5173
echo    FastAPI サーバー: http://localhost:8000
echo    API ドキュメント: http://localhost:8000/docs
echo.
echo 📝 開発時は両方のターミナルを開いたままにしてください
echo 🛑 終了するには各ターミナルでCtrl+Cを押してください

pause 