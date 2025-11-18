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
    echo "  nocache  - キャッシュを使わずにDockerイメージをビルド"
}

setup() {
    echo "Dockerイメージをビルド中..."
    docker compose build
    if [ ! -f .env ]; then
        echo "'.env' が見つかりません。'.env.example' をコピーして作成します..."
        cp .env.example .env
    fi
    JWT_ALG=$(grep -E '^JWT_ALGORITHM=' .env | cut -d'=' -f2 | tr -d '"')
    JWT_ALG=${JWT_ALG:-RS256}

    if [ "$JWT_ALG" = "RS256" ]; then
        # Prefer path-based keys (JWT_PRIVATE_KEY_PATH). If neither path nor inline key
        # is configured, generate files under backend/keys and point env to them.
        HAS_PRIVATE_PATH=$(grep -E '^JWT_PRIVATE_KEY_PATH=' .env | sed -E "s/^JWT_PRIVATE_KEY_PATH=(.*)$/\1/") || true
        HAS_PRIVATE_INLINE=$(grep -E '^JWT_PRIVATE_KEY=' .env | sed -E "s/^JWT_PRIVATE_KEY=(.*)$/\1/") || true

        if [ -z "$HAS_PRIVATE_PATH" ] && ( [ -z "$HAS_PRIVATE_INLINE" ] || [ "$HAS_PRIVATE_INLINE" = '""' ] ); then
            echo "RS256 鍵が .env に設定されていないため、RSA 鍵を生成して backend/keys に保存します..."
            mkdir -p backend/keys
            openssl genpkey -algorithm RSA -out backend/keys/private.pem -pkeyopt rsa_keygen_bits:2048
            openssl rsa -in backend/keys/private.pem -pubout -out backend/keys/public.pem

            # Ensure .env points to the key file paths. Replace existing placeholders or append.
            if grep -q '^JWT_PRIVATE_KEY_PATH=' .env; then
                sed -i '' -e "s|^JWT_PRIVATE_KEY_PATH=.*$|JWT_PRIVATE_KEY_PATH=backend/keys/private.pem|" .env || sed -i -e "s|^JWT_PRIVATE_KEY_PATH=.*$|JWT_PRIVATE_KEY_PATH=backend/keys/private.pem|" .env
            else
                printf '\nJWT_PRIVATE_KEY_PATH=backend/keys/private.pem\n' >> .env
            fi
            if grep -q '^JWT_PUBLIC_KEY_PATH=' .env; then
                sed -i '' -e "s|^JWT_PUBLIC_KEY_PATH=.*$|JWT_PUBLIC_KEY_PATH=backend/keys/public.pem|" .env || sed -i -e "s|^JWT_PUBLIC_KEY_PATH=.*$|JWT_PUBLIC_KEY_PATH=backend/keys/public.pem|" .env
            else
                printf 'JWT_PUBLIC_KEY_PATH=backend/keys/public.pem\n' >> .env
            fi

            echo "Generated RSA keys and updated .env to reference them (JWT_*_KEY_PATH)."
            echo "Note: backend/keys/ is not committed if it's in .gitignore."
        else
            echo ".env に既に JWT_PRIVATE_KEY または JWT_PRIVATE_KEY_PATH が設定されています。鍵の生成はスキップします。"
        fi
    else
        echo "JWT_ALGORITHM は $JWT_ALG です。RS256 でない場合は .env の設定を確認してください。"
    fi

    echo "マイグレーションを適用します（コンテナ内で alembic を実行）..."
    docker compose run --rm backend sh -c "alembic upgrade head || true"

    echo "テスト用データベースを作成中..."
    docker compose exec postgres createdb -U pride_user pride_db_test || true
    echo "テスト用データベースにマイグレーションを適用中..."
    docker compose exec backend bash -c "DATABASE_URL=postgresql://pride_user:pride_password@postgres:5432/pride_db_test alembic upgrade head || true"

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

nocache() {
    echo "Dockerイメージをキャッシュ無しでビルド中..."
    docker compose build --no-cache
    echo ""
    echo "ノーキャッシュビルドが完了しました！"
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
    nocache)
        nocache
        ;;
    *)
        echo "エラー: 不明なコマンド '$1'"
        echo "'./run.sh' を引数なしで実行すると、使い方が表示されます。"
        exit 1
        ;;
esac

exit 0
