#!/bin/bash
# filepath: run.sh
# ===================================
# Prideプロジェクト管理スクリプト
# ===================================

show_usage() {
    echo "使い方: ./run.sh [コマンド]"
    echo ""
    echo "利用可能なコマンド:"
    echo "  setup    - バックエンドとフロントエンドの初期セットアップ"
    echo "  up       - Dockerコンテナを起動"
    echo "  down     - Dockerコンテナを停止"
    echo "  logs     - コンテナのログを表示"
    echo "  clean    - コンテナを停止し、不要なリソースを削除"
    echo "  rebuild  - コンテナを再ビルドして起動"
}

setup() {
    echo "バックエンドのセットアップ中..."
    cd backend
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    cd ..

    echo ""
    echo "フロントエンドのセットアップ中..."
    cd frontend
    npm install
    cd ..

    echo ""
    echo "セットアップが完了しました！"
}

up() {
    echo "Dockerコンテナを起動中..."
    docker compose up -d
}

down() {
    echo "Dockerコンテナを停止中..."
    docker compose down
}

logs() {
    echo "コンテナのログを表示中... (Ctrl+Cで終了)"
    docker compose logs -f
}

clean() {
    echo "Dockerコンテナを停止し、リソースをクリーンアップ中..."
    docker compose down
    docker system prune -f
    echo "クリーンアップが完了しました！"
}

rebuild() {
    echo "Dockerコンテナを再ビルド中..."
    docker compose down
    docker compose up -d --build
    echo "再ビルドが完了しました！"
}

# メイン処理
if [ $# -eq 0 ]; then
    show_usage
    exit 0
fi

case "$1" in
    setup)
        setup
        ;;
    up)
        up
        ;;
    down)
        down
        ;;
    logs)
        logs
        ;;
    clean)
        clean
        ;;
    rebuild)
        rebuild
        ;;
    *)
        echo "エラー: 不明なコマンド '$1'"
        echo "'./run.sh' を引数なしで実行すると、使い方が表示されます。"
        exit 1
        ;;
esac

exit 0