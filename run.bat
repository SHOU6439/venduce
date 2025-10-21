@echo off
REM ===================================
REM Prideプロジェクト管理スクリプト
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
    exit /b 0
)

if "%1"=="setup" goto setup
if "%1"=="up" goto up
if "%1"=="down" goto down
if "%1"=="logs" goto logs
if "%1"=="clean" goto clean
if "%1"=="rebuild" goto rebuild

echo エラー: 不明なコマンド '%1'
echo 'run.bat' を引数なしで実行すると、使い方が表示されます。
exit /b 1

:setup
echo Dockerイメージをビルド中...
docker compose build
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
