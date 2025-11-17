@echo off
REM ===================================
REM Pride プロジェクト管理スクリプト
REM ===================================

if "%1"=="" (
    echo 使い方: run.bat [コマンド]
    echo.
    echo 利用可能なコマンド:
    echo   setup    - バックエンドとフロントエンドの初期セットアップ
    echo   up       - Dockerコンテナを起動
    echo   down     - Dockerコンテナを停止
    echo   logs     - コンテナのログを表示
    echo   clean    - コンテナを停止し、不要なリソースを削除
    echo   rebuild  - コンテナを再ビルドして起動
    echo   nocache  - キャッシュを使わずにDockerイメージをビルド
    exit /b 0
)

if "%1"=="setup" goto setup
if "%1"=="up" goto up
if "%1"=="down" goto down
if "%1"=="logs" goto logs
if "%1"=="clean" goto clean
if "%1"=="rebuild" goto rebuild
if "%1"=="nocache" goto nocache

echo エラー: 不明なコマンド '%1'
echo 'run.bat' を引数なしで実行すると、使い方が表示されます。
exit /b 1

:setup
echo Dockerイメージをビルド中...
docker compose build
if not exist .env (
    echo '.env' が見つかりません。'.env.example' をコピーして作成します...
    copy .env.example .env
)
for /f "tokens=2 delims==" %%%%A in ('findstr /R "^JWT_ALGORITHM=" .env') do set JWT_ALG=%%%%A
if "%JWT_ALG%"=="" set JWT_ALG=RS256

if "%JWT_ALG%"=="RS256" (
    setlocal enabledelayedexpansion
    for /f "tokens=2 delims==" %%%%A in ('findstr /R "^JWT_PRIVATE_KEY_PATH=" .env') do set HAS_PRIVATE_PATH=%%%%A
    
    if "!HAS_PRIVATE_PATH!"=="" (
        for /f "tokens=2 delims==" %%%%A in ('findstr /R "^JWT_PRIVATE_KEY=" .env') do set HAS_PRIVATE_INLINE=%%%%A
        
        if "!HAS_PRIVATE_INLINE!"=="" (
            echo RS256 鍵が .env に設定されていないため、RSA 鍵を生成して backend/keys に保存します...
            if not exist backend\keys mkdir backend\keys
            openssl genpkey -algorithm RSA -out backend\keys\private.pem -pkeyopt rsa_keygen_bits:2048
            openssl rsa -in backend\keys\private.pem -pubout -out backend\keys\public.pem
            
            findstr /R "^JWT_PRIVATE_KEY_PATH=" .env >nul
            if errorlevel 1 (
                echo JWT_PRIVATE_KEY_PATH=backend/keys/private.pem >> .env
            )
            findstr /R "^JWT_PUBLIC_KEY_PATH=" .env >nul
            if errorlevel 1 (
                echo JWT_PUBLIC_KEY_PATH=backend/keys/public.pem >> .env
            )
            
            echo Generated RSA keys and updated .env to reference them (JWT_*_KEY_PATH).
            echo Note: backend/keys/ is not committed if it's in .gitignore.
        ) else (
            echo .env に既に JWT_PRIVATE_KEY が設定されています。鍵の生成はスキップします。
        )
    ) else (
        echo .env に既に JWT_PRIVATE_KEY_PATH が設定されています。鍵の生成はスキップします。
    )
    endlocal
) else (
    echo JWT_ALGORITHM は %JWT_ALG% です。RS256 でない場合は .env の設定を確認してください。
)

echo マイグレーションを適用します（コンテナ内で alembic を実行）...
docker compose run --rm backend sh -c "alembic upgrade head || true"

echo.
echo セットアップが完了しました！
exit /b 0

:up
echo Dockerコンテナを起動中...
docker compose up -d
exit /b 0

:down
echo Dockerコンテナを停止中...
docker compose down
exit /b 0

:logs
echo コンテナのログを表示中... (Ctrl+Cで終了)
docker compose logs -f
exit /b 0

:clean
echo Dockerコンテナを停止し、リソースをクリーンアップ中...
docker compose down
docker system prune -f
echo クリーンアップが完了しました！
exit /b 0

:rebuild
echo Dockerコンテナを再ビルド中...
docker compose down
docker compose up -d --build
echo 再ビルドが完了しました！
exit /b 0

:nocache
echo Dockerイメージをキャッシュ無しでビルド中...
docker compose build --no-cache
echo.
echo ノーキャッシュビルドが完了しました！
exit /b 0
