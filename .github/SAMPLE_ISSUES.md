# サンプルIssue集

このファイルは、実際にGitHub Issueを作成する際の参考例です。
以下の内容をコピーして、GitHubのIssue作成画面に貼り付けてください。

---

## Issue #1: データベーススキーマ設計

**テンプレート: Task**
**ラベル: `type: task`, `area: database`, `phase: 1-foundation`, `priority: high`**

```markdown
## タスク概要
プロジェクト全体で使用するデータベーススキーマを設計し、Alembicマイグレーションファイルを作成する

## 背景
現在は基本的なUserモデルのみが存在するが、SNS × EC機能を実現するためには、投稿、商品、いいね、コメント、フォローなどの複数のテーブルが必要。

## 実施内容
- [ ] ER図の作成（draw.io など）。保存先は外部ストレージ（Notion/Google Drive 等）
- [ ] テーブル定義書の作成（形式任意）。保存先は外部ストレージ（Notion/Google Drive 等）
- [ ] 各テーブルのSQLAlchemyモデル実装
- [ ] Alembicマイグレーション設定
- [ ] 初期マイグレーションファイル作成
- [ ] リレーション関係の定義
- [ ] インデックスの設計

### 必要なテーブル一覧
1. **users** - ユーザー
   - id, username, email, password_hash, profile_image, bio, created_at, updated_at
   
2. **products** - 商品
   - id, name, description, price, brand_id, category_id, image_url, created_at, updated_at
   
3. **categories** - カテゴリ
   - id, name, slug, parent_id, created_at
   
4. **brands** - ブランド
   - id, name, slug, logo_url, created_at
   
5. **posts** - 投稿
   - id, user_id, product_id, content, created_at, updated_at, is_deleted
   
6. **post_images** - 投稿画像
   - id, post_id, image_url, order, created_at
   
7. **likes** - いいね
   - id, user_id, post_id, created_at
   
8. **comments** - コメント
   - id, post_id, user_id, parent_id, content, created_at, updated_at, is_deleted
   
9. **follows** - フォロー関係
   - id, follower_id, following_id, created_at
   
10. **purchases** - 購入履歴
    - id, user_id, product_id, purchased_at, order_id, price
    
11. **tags** - タグ
    - id, name, slug, created_at
    
12. **post_tags** - 投稿とタグの中間テーブル
    - id, post_id, tag_id, created_at

## 完了条件
- [ ] ER図が作成され、外部ストレージに保存され共有リンクがIssue本文に記載されている
- [ ] テーブル定義書が作成され、外部ストレージに保存され共有リンクがIssue本文に記載されている
- [ ] 全モデルが`backend/models.py`に実装されている
- [ ] マイグレーションが正常に実行できる
- [ ] SQLAdminで全テーブルが確認できる
- [ ] リレーション（Foreign Key）が正しく設定されている

## 参考資料
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Alembic Tutorial](https://alembic.sqlalchemy.org/en/latest/tutorial.html)

## 見積もり工数
2-3日
```

---

## Issue #2: JWT認証機能の実装

**テンプレート: Feature Request**
**ラベル: `type: feature`, `area: backend`, `phase: 1-foundation`, `priority: high`**

```markdown
## 機能概要
ユーザーがメールアドレスとパスワードで登録・ログインできる認証機能をJWTで実装する

## 背景・目的
ユーザーが安全にサービスを利用するため、認証・認可の仕組みが必要。
JWTを使用することで、ステートレスな認証を実現し、将来的なスケーラビリティを確保する。

## 詳細仕様

### API仕様

#### 1. ユーザー登録
**POST** `/api/auth/register`

Request:
```json
{
  "username": "user123",
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

Response (201):
```json
{
  "id": 1,
  "username": "user123",
  "email": "user@example.com",
  "created_at": "2025-10-20T12:00:00Z"
}
```

#### 2. ログイン
**POST** `/api/auth/login`

Request:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

Response (200):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "username": "user123",
    "email": "user@example.com"
  }
}
```

#### 3. 認証情報取得
**GET** `/api/auth/me`
- Authorization Header必須

Response (200):
```json
{
  "id": 1,
  "username": "user123",
  "email": "user@example.com",
  "profile_image": "https://...",
  "bio": "..."
}
```

### データモデル
User テーブルに以下を追加（#1で実装済みの場合は確認のみ）
- `password_hash`: パスワードハッシュ
- `is_active`: アカウントの有効/無効
- `is_verified`: メール認証済みフラグ（将来用）

### セキュリティ要件
- パスワードはbcryptでハッシュ化
- JWTの有効期限は24時間
- パスワードは最低8文字、大小英数字を含む
- メールアドレスの重複チェック
- レート制限（将来実装）

## 実装タスク
- [ ] `python-jose`と`passlib`をrequirements.txtに追加
- [ ] パスワードハッシュ化ユーティリティ作成
- [ ] JWT生成・検証ユーティリティ作成
- [ ] 認証用のDependency（`get_current_user`）実装
- [ ] ユーザー登録API実装
- [ ] ログインAPI実装
- [ ] 認証情報取得API実装
- [ ] バリデーション（Pydantic）実装
- [ ] エラーハンドリング実装
- [ ] 環境変数で秘密鍵管理（SECRET_KEY）

## 参考資料
- [FastAPI Security Tutorial](https://fastapi.tiangolo.com/tutorial/security/)
- [JWT.io](https://jwt.io/)

## 優先度
- [x] High（重要・緊急）

## 見積もり工数
3-4日
```

---

## Issue #3: フロントエンド - ログイン・会員登録ページ

**テンプレート: Feature Request**
**ラベル: `type: feature`, `area: frontend`, `phase: 1-foundation`, `priority: high`**

```markdown
## 機能概要
ユーザーがログイン・会員登録できるUIをNext.jsで実装する

## 背景・目的
バックエンドの認証API（#2）を利用して、ユーザーが実際にサービスにログインできるフロントエンド画面を作成する。

## 詳細仕様

### UI/UX
#### ログインページ (`/login`)
- メールアドレス入力フィールド
- パスワード入力フィールド（表示/非表示切り替えボタン）
- ログインボタン
- 会員登録ページへのリンク
- エラーメッセージ表示エリア

#### 会員登録ページ (`/register`)
- ユーザー名入力フィールド
- メールアドレス入力フィールド
- パスワード入力フィールド（強度インジケーター）
- パスワード確認入力フィールド
- 利用規約チェックボックス
- 登録ボタン
- ログインページへのリンク
- エラーメッセージ表示エリア

### 技術仕様
- 認証状態管理: Context API または Zustand
- フォームバリデーション: React Hook Form + Zod
- HTTPクライアント: fetch または axios
- トークン保存: localStorage（将来的にはhttpOnly Cookie検討）
- 認証後のリダイレクト: `/` （ホーム）

### 認証フロー
1. ユーザーがフォーム入力
2. クライアント側バリデーション
3. APIリクエスト（`/api/auth/login` or `/api/auth/register`）
4. 成功時: トークンを保存 → ホームへリダイレクト
5. 失敗時: エラーメッセージ表示

### Protected Routes
認証が必要なページにアクセスした際、未ログインの場合は`/login`へリダイレクト

## 実装タスク
- [ ] 認証Context（AuthProvider）の作成
- [ ] `/login`ページの実装
- [ ] `/register`ページの実装
- [ ] フォームバリデーションロジック
- [ ] API通信ロジック
- [ ] エラーハンドリング
- [ ] ローディング状態の表示
- [ ] Protected Route用のHOCまたはミドルウェア
- [ ] レスポンシブ対応（モバイルファースト）
- [ ] Tailwind CSSでスタイリング

## 参考資料
- [Next.js Authentication Patterns](https://nextjs.org/docs/authentication)
- [React Hook Form](https://react-hook-form.com/)
- [Zod](https://zod.dev/)

## 優先度
- [x] High（重要・緊急）

## 見積もり工数
3-4日

## 依存関係
- Blocked by: #2（JWT認証APIの実装）
```

---

## Issue #4: 商品管理CRUD API実装

**テンプレート: Feature Request**
**ラベル: `type: feature`, `area: backend`, `phase: 1-foundation`, `priority: high`**

```markdown
## 機能概要
管理者が商品（Product）の登録・取得・更新・削除を行うためのAPIを実装する

## 背景・目的
SNS × ECサイトの核となる「商品」情報を管理するため、商品のCRUD操作が必要。

## 詳細仕様

### API仕様

#### 1. 商品一覧取得
**GET** `/api/products`

Query Parameters:
- `page`: ページ番号（デフォルト: 1）
- `limit`: 取得件数（デフォルト: 20）
- `category_id`: カテゴリでフィルタ
- `brand_id`: ブランドでフィルタ
- `sort`: 並び順（`created_at`, `price`, `name`）

Response (200):
```json
{
  "items": [
    {
      "id": 1,
      "name": "商品名",
      "description": "商品説明",
      "price": 5000,
      "brand": {
        "id": 1,
        "name": "ブランド名"
      },
      "category": {
        "id": 1,
        "name": "カテゴリ名"
      },
      "image_url": "https://...",
      "created_at": "2025-10-20T12:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

#### 2. 商品詳細取得
**GET** `/api/products/{product_id}`

Response (200):
```json
{
  "id": 1,
  "name": "商品名",
  "description": "商品説明",
  "price": 5000,
  "brand_id": 1,
  "category_id": 1,
  "image_url": "https://...",
  "created_at": "2025-10-20T12:00:00Z",
  "updated_at": "2025-10-20T12:00:00Z"
}
```

#### 3. 商品登録（管理者のみ）
**POST** `/api/products`
- Authorization Header必須
- 管理者権限チェック

Request:
```json
{
  "name": "新商品",
  "description": "商品説明",
  "price": 5000,
  "brand_id": 1,
  "category_id": 1,
  "image_url": "https://..."
}
```

Response (201):
```json
{
  "id": 1,
  "name": "新商品",
  "description": "商品説明",
  "price": 5000,
  "brand_id": 1,
  "category_id": 1,
  "image_url": "https://...",
  "created_at": "2025-10-20T12:00:00Z"
}
```

#### 4. 商品更新（管理者のみ）
**PUT** `/api/products/{product_id}`

#### 5. 商品削除（管理者のみ）
**DELETE** `/api/products/{product_id}`

Response (204): No Content

### データモデル
Product テーブル（#1で定義済み）を使用

### 認可
- 商品一覧・詳細取得: 認証不要（公開）
- 商品登録・更新・削除: 管理者のみ

## 実装タスク
- [ ] Productモデルの確認・調整（#1）
- [ ] Pydanticスキーマ定義（ProductCreate, ProductUpdate, ProductResponse）
- [ ] 商品一覧取得エンドポイント実装
- [ ] ページネーション実装
- [ ] フィルタリング・ソート機能
- [ ] 商品詳細取得エンドポイント実装
- [ ] 商品登録エンドポイント実装（管理者権限チェック）
- [ ] 商品更新エンドポイント実装
- [ ] 商品削除エンドポイント実装（論理削除も検討）
- [ ] エラーハンドリング（404 Not Found等）

## 参考資料
- 依存: #1（データベース設計）
- 依存: #2（認証機能）

## 優先度
- [x] High（重要・緊急）

## 見積もり工数
3-4日
```

---

## Issue #5: CI/CDパイプラインの構築

**テンプレート: Task**
**ラベル: `type: task`, `area: devops`, `phase: 7-deploy`, `priority: medium`**

```markdown
## タスク概要
GitHub Actionsを使用して、自動テスト・ビルド・デプロイのCI/CDパイプラインを構築する

## 背景
継続的インテグレーション/デリバリーにより、コード品質を保ち、デプロイを自動化する

## 実施内容

### Phase 1: CI（自動テスト）
- [ ] `.github/workflows/ci.yml` の作成
- [ ] バックエンドの自動テスト実行
- [ ] フロントエンドの自動テスト実行
- [ ] Lintチェック（ESLint, Ruff/Black）
- [ ] PR作成時・更新時に自動実行

### Phase 2: CD（自動デプロイ）
- [ ] `.github/workflows/deploy.yml` の作成
- [ ] developブランチマージ時 → 開発環境デプロイ
- [ ] mainブランチマージ時 → 本番環境デプロイ
- [ ] Dockerイメージビルド・プッシュ
- [ ] デプロイ通知（Slack/Discord）

### Phase 3: セキュリティチェック
- [ ] 依存関係の脆弱性スキャン（Dependabot）
- [ ] シークレットスキャン
- [ ] コードスキャン（CodeQL）

## 完了条件
- [ ] PRのたびに自動テストが実行される
- [ ] テスト失敗時はマージできない設定
- [ ] mainへのマージで本番デプロイが実行される
- [ ] デプロイ失敗時の通知が届く

## 参考資料
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## 見積もり工数
3-4日

## 優先度
- [x] Medium（重要だが緊急ではない）
```

---

## これらのIssueを作成する手順

1. GitHubリポジトリの「Issues」タブをクリック
2. 「New issue」をクリック
3. 適切なテンプレートを選択
4. 上記の内容をコピー＆ペースト
5. ラベル、マイルストーン、アサインを設定
6. 「Submit new issue」をクリック

## 推奨作成順序

1. Issue #1: データベース設計（最優先）
2. Issue #2: JWT認証API
3. Issue #3: ログイン・会員登録UI
4. Issue #4: 商品管理API
5. 以降は開発の進捗に合わせて順次作成

これらのIssueを参考に、プロジェクトに合わせてカスタマイズしてください！
