# Venduce 要件定義

## プロジェクト概要

買ったモノを自慢できるSNS型ECプラットフォーム。ユーザーが購入した商品を投稿で紹介し、その投稿経由での購入を可視化する。

## アーキテクチャ

- バックエンド: FastAPI + SQLAlchemy + Alembic + PostgreSQL
- フロントエンド: Next.js 15.5.6 + React 19 + TypeScript + Tailwind
- 認証: JWT (RS256/HS256)
- ID生成: ULID
- ファイル保管: ローカルストレージ
- 開発環境: Docker Compose + Nginx リバースプロキシ

## 実装済み機能

### ユーザー管理

- ユーザー登録・ログイン・ログアウト
- JWT認証 + リフレッシュトークン
- メール確認フロー
- プロフィール取得・更新
- プロフィール画像アップロード
- ユーザー検索
- 管理者フラグ + is_active/is_confirmed フラグ
- 購入履歴公開/非公開設定

### 投稿・SNS

- 投稿作成・編集・削除（キャプション・画像複数・商品リンク・タグ付き）
- 投稿ステータス（public/draft/archived）
- ビュー数・いいね数・購入数カウント
- いいね追加・削除・数取得
- コメント投稿・編集・削除（ネスト返信対応）
- フォロー・アンフォロー
- フォロワー/フォロー中リスト
- フォローフィード
- メタデータ保存（JSONB）

### 商品管理

- 商品CRUD（SKU・価格・在庫・ステータス）
- カテゴリ管理（多対多）
- ブランド管理
- 商品画像アップロード（複数）
- メタデータ保存（JSONB）

### 購入・支払い

- 購入登録API
- 購入と投稿の帰属記録（referring_post_id）
- 購入ステータス管理
- 購入履歴取得
- 支払い方法登録・管理

### ゲーミフィケーション

- バッジシステム（Silver/Gold/Platinum）
- バッジ自動付与ロジック
- ユーザーバッジ取得・削除
- バッジ一覧取得
- バッジ獲得時のアニメーション

### タグ・検索

- タグ定義・管理
- 投稿タグ付与
- タグでの検索・フィルタリング

### 通知

- 通知記録（Like/Follow/Comment/Purchase/Ranking/Badge）
- 通知一覧取得
- 既読フラグ管理
- WebSocket基盤（リアルタイム通知の基盤は整備済み）

### フロントエンド

- ホーム・ログイン・会員登録
- フィード・投稿作成・投稿詳細
- 商品一覧・商品詳細
- プロフィール・プロフィール設定
- 購入確認・購入完了・購入履歴
- 注文管理・通知
- ユーザー検索・全体検索
- SQLAdmin管理画面（ユーザー・商品・カテゴリ・ブランド）

### API エンドポイント

| 機能 | ルーター | 実装状況 |
|------|---------|---------|
| 認証 | /api/auth/* | 実装済み |
| ユーザー | /api/users/* | 実装済み |
| プロフィール | /api/profile/* | 実装済み |
| 商品 | /api/products/* | 実装済み |
| カテゴリ | /api/categories/* | 実装済み |
| ブランド | /api/brands/* | 実装済み |
| 投稿 | /api/posts/* | 実装済み |
| いいね | /api/likes/* | 実装済み |
| コメント | /api/comments/* | 実装済み |
| フォロー | /api/follows/* | 実装済み |
| タグ | /api/tags/* | 実装済み |
| バッジ | /api/badges/* | 実装済み |
| 購入 | /api/purchases/* | 実装済み |
| 支払い方法 | /api/payment-methods/* | 実装済み |
| 通知 | /api/notifications/* | 実装済み |
| アップロード | /api/uploads/* | 実装済み |
| WebSocket | /ws/* | 実装済み |
| 管理者 | /api/admin/* | 実装済み |

## データベーステーブル

- users（ユーザー）
- products（商品）
- categories（カテゴリ）
- brands（ブランド）
- posts（投稿）
- post_assets（投稿画像）
- post_products（投稿に紐付けた商品）
- post_tags（投稿-タグ中間テーブル）
- likes（いいね）
- comments（コメント）
- follows（フォロー関係）
- tags（タグ）
- badges（バッジ定義）
- user_badges（ユーザーバッジ）
- purchases（購入履歴）
- payment_methods（支払い方法）
- assets（ファイル資産）
- notifications（通知）
- refresh_tokens（リフレッシュトークン）
