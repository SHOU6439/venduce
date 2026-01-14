.PHONY: help setup up down logs clean rebuild nocache test

help:
	@echo "使い方: make [コマンド]"
	@echo ""
	@echo "利用可能なコマンド:"
	@echo "  setup	- バックエンドとフロントエンドの初期セットアップ"
	@echo "  up	   - Dockerコンテナを起動"
	@echo "  down	 - Dockerコンテナを停止"
	@echo "  logs	 - コンテナのログを表示"
	@echo "  clean	- コンテナを停止し、不要なリソースを削除"
	@echo "  restart	- コンテナを再起動"
	@echo "  rebuild  - コンテナを再ビルドして起動"
	@echo "  nocache  - キャッシュを使わずにDockerイメージをビルド"
	@echo "  test	 - テストを実行"

setup: build env-file keys up migrate test-db
	@echo ""
	@echo "セットアップが完了しました！"

build:
	@echo "Dockerイメージをビルド中..."
	docker compose build

env-file:
	@python setup.py env

keys:
	@python setup.py keys

up:
	@echo "Dockerコンテナを起動中..."
	docker compose up -d

down:
	@echo "Dockerコンテナを停止中..."
	docker compose down

logs:
	@echo "コンテナのログを表示中... (Ctrl+Cで終了)"
	docker compose logs -f

clean:
	@echo "Dockerコンテナを停止し、リソースをクリーンアップ中..."
	docker compose down
	docker system prune -f
	@echo "クリーンアップが完了しました！"

destroy:
	@echo "【警告】データベースのボリュームを含む全データを削除します。"
	@echo "本当によろしいですか？ (y/N)"
	@python -c "import sys; answer = input('> '); sys.exit(0 if answer.lower() == 'y' else 1)"
	docker compose down --volumes
	docker system prune -f
	@echo "全データの削除（初期化）が完了しました。"

restart: down up

rebuild: down build up
	@echo "再ビルドが完了しました！"

nocache:
	@echo "Dockerイメージをキャッシュ無しでビルド中..."
	docker compose build --no-cache
	@echo ""
	@echo "ノーキャッシュビルドが完了しました！"

migrate:
	@echo "マイグレーションを適用します（コンテナ内で alembic を実行）..."
	docker compose run --rm backend sh -c "alembic upgrade head || true"

test-db:
	@echo "テスト用データベースを再構築中..."
	docker compose exec postgres dropdb -U venduce_user --if-exists venduce_db_test
	docker compose exec postgres createdb -U venduce_user venduce_db_test
	@echo "テスト用データベースにマイグレーションを適用中..."
	docker compose exec backend bash -c "DATABASE_URL=postgresql://venduce_user:venduce_password@postgres:5432/venduce_db_test alembic upgrade head"

test:
	@echo "テストを実行中..."
	docker compose exec backend python -m pytest tests/ -v

db-merge:
	@echo "マイグレーションの競合を解消（merge heads）します..."
	docker compose run --rm backend alembic merge heads -m "merge_heads"

alembic:
	@# 使い方: make alembic cmd="history"
	docker compose run --rm backend alembic $(cmd)

ps:
	docker compose ps

back:
	docker exec -it venduce-backend-1 bash

front:
	docker exec -it venduce-frontend-1 bash
