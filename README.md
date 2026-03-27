# Venduce — SNS × EC プラットフォーム

> 「買ったモノを投稿して、繋がる。」
> インフルエンサーの購買行動を可視化するSNS型ECサイト

---

## 概要

Venduceは、SNSの「シェア・つながる」体験とECの「購入」を融合させたWebアプリケーションです。ユーザーが購入した商品を投稿で紹介し、その投稿経由での購入が追跡・可視化されます。フォロワーの購買行動がフィードに流れ、バッジやランキングで購買インフルエンサーとしての地位が可視化される仕組みを実装しました。

---

## 技術スタック

### Backend
| 技術 | 用途 |
|------|------|
| FastAPI | REST API / WebSocket |
| SQLAlchemy | ORM |
| Alembic | DBマイグレーション |
| PostgreSQL | メインDB |
| Pydantic v2 | スキーマバリデーション |
| pytest + factory-boy | テスト |

### Frontend
| 技術 | 用途 |
|------|------|
| Next.js 15 (App Router) | フレームワーク |
| React 19 | UIライブラリ |
| TypeScript | 型安全 |
| Tailwind CSS | スタイリング |
| Zustand | グローバル状態管理 |

### インフラ・認証
| 技術 | 用途 |
|------|------|
| Docker Compose | コンテナオーケストレーション |
| Nginx | リバースプロキシ |
| JWT (RS256 / HS256) | 認証 |
| ULID | ID生成 |
| SQLAdmin | 管理画面 |

---

## 主な機能

### SNS機能
- 投稿作成・編集・削除（画像複数枚・商品リンク・タグ付き）
- フォロー / フォロワー管理、フォローフィード
- いいね・コメント（ネスト返信対応）
- タグ検索・ユーザー検索・全体検索

### EC機能
- 商品CRUD（SKU・価格・在庫・ステータス管理）
- カテゴリ / ブランド管理（多対多）
- 購入登録・購入履歴・購入元投稿の帰属追跡（`referring_post_id`）
- 支払い方法管理

### ゲーミフィケーション
- バッジシステム（Silver / Gold / Platinum）— 購買影響力に応じて自動付与
- バッジ獲得アニメーション
- ユーザーランキング

### 通知・リアルタイム
- 通知記録（Like / Follow / Comment / Purchase / Ranking / Badge）
- 既読管理
- WebSocket基盤（リアルタイム通知に対応）

### セキュリティ・認証
- JWT認証（RS256非対称鍵）＋ リフレッシュトークン
- メール確認フロー
- ユーザーフラグ管理（`is_active` / `is_confirmed` / 管理者）

---

## アーキテクチャ

```
venduce/
├── backend/               # FastAPI アプリケーション
│   ├── app/
│   │   ├── api/routers/   # エンドポイント（I/O・認可のみ）
│   │   ├── services/      # ビジネスロジック・ユースケース
│   │   ├── models/        # SQLAlchemy モデル
│   │   ├── schemas/       # Pydantic v2 スキーマ
│   │   ├── core/          # 設定・JWT・パスワード
│   │   └── db/            # DB接続・Alembic用メタデータ
│   └── tests/
│       ├── routers/       # APIルーターテスト
│       ├── services/      # サービス層ユニットテスト
│       └── factories/     # factory-boy テストデータ生成
├── frontend/              # Next.js アプリケーション
│   └── app/
│       ├── (auth)/        # ログイン・会員登録
│       ├── (feed)/        # フィード
│       ├── (product)/     # 商品一覧・詳細
│       └── ...
├── compose.yml            # 開発用 Docker Compose
├── compose.prod.yml       # 本番用 Docker Compose
└── nginx.conf             # リバースプロキシ設定
```

バックエンドはRouter / Serviceの2層構成です。Routerはリクエスト/レスポンスの変換と認可チェックに専念し、ビジネスロジックはServiceに集約します。最初から層を増やしすぎると見通しが悪くなるため、クエリが複雑化・重複してきた段階でRepositoryを切り出す方針にしています。

### API エンドポイント一覧

| 機能 | エンドポイント |
|------|--------------|
| 認証 | `/api/auth/*` |
| ユーザー | `/api/users/*` |
| プロフィール | `/api/profile/*` |
| 商品 | `/api/products/*` |
| カテゴリ / ブランド | `/api/categories/*` `/api/brands/*` |
| 投稿 | `/api/posts/*` |
| いいね / コメント | `/api/likes/*` `/api/comments/*` |
| フォロー | `/api/follows/*` |
| タグ | `/api/tags/*` |
| バッジ | `/api/badges/*` |
| 購入 / 支払い | `/api/purchases/*` `/api/payment-methods/*` |
| 通知 | `/api/notifications/*` |
| アップロード | `/api/uploads/*` |
| WebSocket | `/ws/*` |
| 管理者 | `/api/admin/*` |

---

## ローカル開発環境のセットアップ

### 前提条件
- Docker Desktop
- `make`（Mac はデフォルト利用可能）

### 起動手順

```sh
# 初期セットアップ（Dockerビルド・.env生成・RSA鍵生成・マイグレーション）
make setup

# 開発サーバー起動
make up
```

### アクセス先

| サービス | URL |
|---------|-----|
| Frontend (Next.js) | http://localhost:3000 |
| Backend API (FastAPI) | http://localhost:8000/api |
| Swagger UI | http://localhost:8000/docs |
| 管理画面 (SQLAdmin) | http://localhost/admin/ |

### よく使うコマンド

```sh
make up       # コンテナ起動
make down     # コンテナ停止
make rebuild  # 再ビルド＆起動
make test     # テスト実行
make logs     # ログ表示
make help     # コマンド一覧
```

---

## ドキュメント

| ドキュメント | 内容 |
|------------|------|
| [GETTING_STARTED.md](./GETTING_STARTED.md) | 開発を始めるためのガイド |
| [docs/DEVELOPMENT_SETUP.md](./docs/DEVELOPMENT_SETUP.md) | Windows セットアップ・Makefile コマンド詳細 |
| [docs/DIRECTORY_STRUCTURE.md](./docs/DIRECTORY_STRUCTURE.md) | ディレクトリ構成と設計方針 |
| [docs/SWAGGER_UI.md](./docs/SWAGGER_UI.md) | Swagger UI での API テスト手順 |
| [docs/MIGRATE.md](./docs/MIGRATE.md) | Alembic マイグレーション手順 |
| [docs/TESTING.md](./docs/TESTING.md) | pytest 実行方法 |
