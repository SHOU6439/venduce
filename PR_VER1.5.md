# PR 概要

**Ver 1.5 — SNS 機能フル実装**

フォロー / バッジ / 通知 / 管理者パネル / ランキング改善 / WebSocket リアルタイム通信基盤など、SNS × EC プラットフォームとしてのコア機能群を一括実装。

**統計**: 65+ ファイル変更（37 既存ファイル修正 + 28 新規ファイル追加） / +2,600 行以上

## 関連 Issue

Closes #

## 変更内容

### 1. フォロー機能

- ユーザー間のフォロー / アンフォロー / フォロー状態確認
- フォロワー一覧・フォロー中一覧（カーソルページネーション対応）
- フォローフィード（タイムライン）
- **Backend**: `Follow` モデル、`FollowService`、`/api/follows` ルーター、マイグレーション追加
- **Frontend**: `followsApi` クライアント、プロフィールにフォロワー/フォロー中カウント表示、フォロワーリストモーダル、フィードに「おすすめ / フォロー中」タブ切り替え

### 2. バッジシステム

- 18 種類のデフォルトバッジ定義（6 カテゴリ: 投稿経由購入貢献 / 投稿数 / いいね獲得 / フォロワー数 / 購入数 / 初アクション）
- いいね / 投稿 / 購入 / フォロー時にバッジ自動判定・付与
- WebSocket 経由のリアルタイムバッジ獲得通知（全画面獲得エフェクト）
- **Backend**: `Badge` / `UserBadge` モデル、`BadgeCategory` Enum、`BadgeService`、`/api/badges` ルーター、マイグレーション 2 件
- **Frontend**: `badgesApi`、`BadgeChip` / `BadgeList` コンポーネント、`BadgeNotificationManager`（WebSocket + API ポーリング）、プロフィール・レイアウトに統合

### 3. 通知システム

- いいね / フォロー / コメント / 投稿経由購入の通知をリアルタイム配信
- 自分自身への通知は自動除外
- 未読カウント管理 + 一括既読
- **Backend**: `Notification` モデル、`NotificationType` Enum、`NotificationService`（WebSocket プッシュ対応）、`/api/notifications` ルーター、マイグレーション追加
- **Frontend**: `notificationsApi`、`useNotifications` フック、ヘッダー通知ベル（ポップオーバーに最新 10 件 + 未読バッジ）、通知一覧ページ（無限スクロール、種類別アイコン・リンク先分岐）

### 4. WebSocket リアルタイム通信基盤

- `ranking_updated` / `badge_awarded` / `notification` イベントをサーバーからクライアントにプッシュ
- **Backend**: `ConnectionManager`（broadcast / send_to_user / 認証済み＋匿名接続管理 / 自動切断クリーンアップ）、`WebSocket /ws/events` エンドポイント、内部 API（スクリプトからの WebSocket 発火用）
- **Frontend**: `useWebSocket` フック（指数バックオフ再接続、ping keep-alive）、`WebSocketProvider`（アプリ全体で 1 接続共有、EventTarget ベースのイベントバス）
- **nginx**: `/ws/` WebSocket プロキシ設定追加（`Upgrade` / `Connection` ヘッダー、86400s タイムアウト）

### 5. ランキングシステム改善

- ユーザーランキング・商品ランキング（売上数 / いいね数）をサーバーサイド集計に全面移行
- いいね / 購入時に `ranking_updated` WebSocket ブロードキャストでリアルタイム更新
- **Backend**: `GET /api/users/ranking`、`GET /api/products/trending`、`GET /api/products/most-liked` 追加
- **Frontend**: `framer-motion` による順位変動アニメーション（LayoutGroup / AnimatePresence）、ランクアップ / ダウンインジケーター、無限スクロール、WebSocket 連動リフレッシュ

### 6. 管理者パネル

- `is_admin=true` のユーザーのみアクセス可能な管理画面をフルスクラッチ実装
- **Backend**: `/api/admin` ルーター（ダッシュボード統計、ユーザー / 商品 / カテゴリー / ブランド / 投稿 / 購入の CRUD・ソフト削除 / ハード削除対応）
- **Frontend**: `adminApi` クライアント、`AdminGuard` コンポーネント、サイドバーナビゲーション付き管理レイアウト、7 ページ（ダッシュボード / ユーザー管理 / 商品管理 / 投稿管理 / 購入管理 / カテゴリー管理 / ブランド管理）

### 7. 他ユーザープロフィールページ

- `@username` による公開プロフィール表示
- 投稿 / いいね / 購入タブ（購入はプライバシー設定に応じて表示制御）
- フォローボタン・バッジ表示統合
- **Backend**: `GET /api/users/{username}`、`/stats`、`/posts`、`/likes`、`/purchases` + `GET /api/users/search` + `PublicUserRead` スキーマ
- **Frontend**: `/users/[username]` ページ新設、`usersApi` 拡張

### 8. プライバシー設定 & ユーザーモデル拡張

- `is_purchase_history_public` カラム追加（デフォルト true）
- **Backend**: User モデル・スキーマ拡張、マイグレーション追加
- **Frontend**: プライバシー設定コンポーネント、設定ページに「プライバシー」タブ追加、auth ストアに `is_admin` フィールド追加

### 9. いいね機能の改善

- 投稿一覧・詳細で `is_liked` フィールドをバックエンド側で算出してレスポンスに含める
- 楽観的更新 + エラー時ロールバック
- 自分がいいねした投稿の一覧取得
- **Backend**: `get_liked_post_ids_for_user`（バッチ取得）、`get_liked_posts_by_user`、`GET /api/users/me/likes`
- **Frontend**: `likePost` / `unlikePost` / `getLikedPosts` API、投稿詳細にいいねボタン追加、プロフィールに「いいね」タブ

### 10. 検索機能の拡張

- 検索ページに「ユーザー」タブを追加（商品・投稿・ユーザーの 3 タブ検索）
- アバター付きユーザーカード表示、クリックで `/users/{username}` へ遷移

### 11. UI/UX 改善

- **ヘッダー**: モバイル対応（ハンバーガーメニュー `Sheet`、モバイル検索ボタン）、管理パネルリンク（admin のみ表示）、通知ベル統合
- **フィード**: ユーザー名クリックでプロフィール遷移、投稿ごとの商品ボタンをモバイルでも常時表示
- **プロフィール**: 編集を Dialog モーダル化、保存後に auth ストアも即座更新、投稿グリッドのレスポンシブ改善

### 12. インフラ & ドキュメント

- `nginx.conf`: WebSocket プロキシ (`/ws/`) ルート追加
- `Makefile`: `make seed` にバッジ定義シード追加
- `DEVELOPMENT_PLAN.md`: 22 項目のチェックボックスを完了に更新

## DB マイグレーション（新規 5 件）

| ファイル | 内容 |
|---|---|
| `ddddfb28f5bf` | `badges` / `user_badges` テーブル作成 |
| `82c998e132c0` | `badges` に `category` カラム追加 |
| `a80d409ece8a` | `follows` テーブル作成 |
| `630a62d47916` | `users` に `is_purchase_history_public` カラム追加 |
| `67ebb8ff90b1` | `notifications` テーブル作成 |

## 新規依存パッケージ

- **Frontend**: `framer-motion` ^12.34.3（ランキングアニメーション用）

## 変更種別

- [x] 新機能追加
- [ ] バグ修正
- [ ] リファクタリング
- [x] ドキュメント更新
- [ ] テスト追加
- [ ] その他

## スクリーンショット・動作確認

<!-- UIの変更がある場合はスクリーンショットを添付 -->

### Before

<!-- 変更前の状態（必要に応じて） -->

### After

<!-- 変更後の状態 -->

## テスト

- [x] ローカルで動作確認済み
- [ ] 単体テスト追加・実施済み
- [x] 既存のテストが全てパスすることを確認

### テスト観点

- フォロー / アンフォローの正常系・重複防止
- バッジ自動付与の各条件閾値（投稿数、いいね数、フォロワー数など）
- 通知の生成・WebSocket 配信・自分自身除外
- 管理者パネルの権限チェック（非管理者がアクセスした場合の 403/404）
- ランキングのサーバーサイド集計精度
- 他ユーザープロフィールのプライバシー設定（購入履歴の公開/非公開）
- WebSocket 接続の再接続挙動（指数バックオフ）

## レビュー観点

- WebSocket `ConnectionManager` のスレッドセーフ性・接続クリーンアップ
- バッジ評価ロジック（`BadgeService.evaluate_and_award`）のパフォーマンス（N+1 クエリの有無）
- 管理者 API の認可チェック（`require_admin` 依存性が全エンドポイントに適用されているか）
- フロントエンドの楽観的更新のロールバック処理が正しく実装されているか
- `framer-motion` の `LayoutGroup` / `AnimatePresence` のパフォーマンス影響
- マイグレーションの順序依存関係が正しいか

## 補足事項

- バッジのデフォルト定義は `make seed` で投入される（`BadgeService.ensure_default_badges`）
- WebSocket は認証済み（JWT トークン付き）と未認証の両方をサポート。未認証ではランキング更新のみ受信可能
- `is_purchase_history_public` は既存ユーザーに対してデフォルト `true` で追加（Breaking Change なし）
- 内部 API（`/api/internal/ws-notify-badge`, `/api/internal/ws-notify-ranking`）はスクリプトからの WebSocket 発火用途であり、外部公開は想定していない

## チェックリスト

- [ ] コードに不要なコメントやデバッグコードが残っていない
- [ ] コーディング規約に準拠している
- [x] 必要なドキュメントを更新した
- [ ] Breaking Change がある場合は明記した
- [x] マイグレーションファイルが必要な場合は作成した
- [x] PR の実装内容にあわせて、開発計画を更新した
