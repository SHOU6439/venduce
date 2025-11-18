@echo off
setlocal enabledelayedexpansion

REM ===================================
REM Pride プロジェクト管理スクリプト
REM ===================================

if "%1"=="" (
    echo 使い方: run.bat [コマンド]
    echo(
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
call docker compose build
if errorlevel 1 exit /b 1

if not exist .env (
    echo '.env' が見つかりません。'.env.example' をコピーして作成します...
    copy .env.example .env
)

echo RS256 鍵を生成中...
if not exist backend\keys (
    mkdir backend\keys
    openssl genpkey -algorithm RSA -out backend\keys\private.pem -pkeyopt rsa_keygen_bits:2048
    openssl rsa -in backend\keys\private.pem -pubout -out backend\keys\public.pem
    echo JWT_PRIVATE_KEY_PATH=backend/keys/private.pem >> .env
    echo JWT_PUBLIC_KEY_PATH=backend/keys/public.pem >> .env
    echo Generated RSA keys and updated .env to reference them.
)

echo Dockerコンテナを起動中...
call docker compose up -d

echo マイグレーションを適用します（コンテナ内で alembic を実行）...
call docker compose run --rm backend sh -c "alembic upgrade head || true"

echo テスト用データベースを作成中...
call docker compose exec postgres createdb -U pride_user pride_db_test 2>nul || true
echo テスト用データベースにマイグレーションを適用中...
call docker compose exec backend bash -c "DATABASE_URL=postgresql://pride_user:pride_password@postgres:5432/pride_db_test alembic upgrade head || true"

echo(
echo セットアップが完了しました！
exit /b 0

:up
echo Dockerコンテナを起動中...
call docker compose up -d
exit /b 0

:down
echo Dockerコンテナを停止中...
call docker compose down
exit /b 0

:logs
echo コンテナのログを表示中... ^(Ctrl+Cで終了^)
call docker compose logs -f
exit /b 0

:clean
echo Dockerコンテナを停止し、リソースをクリーンアップ中...
call docker compose down
call docker system prune -f
echo クリーンアップが完了しました！
exit /b 0

:rebuild
echo Dockerコンテナを再ビルド中...
call docker compose down
call docker compose up -d --build
echo 再ビルドが完了しました！
exit /b 0

:nocache
echo Dockerイメージをキャッシュ無しでビルド中...
call docker compose build --no-cache
echo(
echo ノーキャッシュビルドが完了しました！
exit /b 0
