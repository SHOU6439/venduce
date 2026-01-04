# ディレクトリ構成ガイド（Backend: FastAPI / Frontend: Next.js）

---

## 全体像

```
venduce/
  backend/            # FastAPI + SQLAlchemy + Alembic
  frontend/           # Next.js (App Router, TS, Tailwind)
  .github/            # Issue/PRテンプレ、ワークフロー、ガイド
  compose.yml         # 開発用Docker Compose
  nginx.conf          # 逆プロキシなど（必要な場合）
  README.md           # プロジェクト入口
  docs/               # 開発ガイド等（このファイル）
```

---

## Backend（FastAPI）

目的

-   小さく始めて、機能増加に耐えられるモジュール分割
-   API のバージョニング、責務分離（router/schemas/models/services/repositories）
-   設定・DB・マイグレーションの一元化

推奨構成

```
backend/
  app/
    main.py                 # エントリポイント（ミドルウェア/ルート登録）
    core/
      config.py             # 設定（pydantic-settings）
      security.py           # 認証/パスワード/JWT等（必要に応じて）
      logging.py            # ログ設定（任意）
    db/
      database.py           # Engine/SessionLocal/依存関数（get_db）
      base.py               # Base と target_metadata（Alembic用）
      seed.py               # 初期データ投入（任意）
    models/                 # SQLAlchemyモデル
      user.py
      product.py
      __init__.py
    schemas/                # Pydantic v2 スキーマ
      user.py
      product.py
      __init__.py
    api/
      routers/            # ルーター（機能ごとに分割）
        auth.py
        users.py
        products.py
      deps.py             # 共通Depends（認証/DB など）
      __init__.py
    services/               # ユースケース/ビジネスロジック
      user_service.py
      product_service.py
    repositories/           # DBアクセス（ORMクエリ集約）
      user_repository.py
      product_repository.py
    admin/
      sqladmin.py           # SQLAdminセットアップ
    utils/
      pagination.py
      images.py
    __init__.py
  migrations/
    versions/
    env.py
  alembic.ini
  tests/
    conftest.py             # pytest設定、DB/session フィクスチャ
    factories/              # factory-boy ファクトリ（テストデータ生成）
      __init__.py
      user.py
      refresh_token.py
    routers/                # API ルーター テスト
      test_api_auth.py
    services/               # サービス層 ユニットテスト
      test_user_service.py
  requirements.txt
  Dockerfile
  .env.example
```

補足

-   今回はバージョニングなしで `/api/...` を使用（必要になったら後から `/api/v1` を導入可能）
-   `db/base.py` で `Base` と `target_metadata` を定義し、Alembic が参照
-   責務分離ポリシー
    -   Router: リクエスト/レスポンス変換、バリデーションの委譲、認可チェック、サービス呼び出しのみ（ビジネスロジックは禁止）
    -   Service: ユースケース単位のビジネスロジック、トランザクション境界の管理
    -   Repository: データアクセス（ORM クエリ/永続化）
-   最初は `models.py`/`schemas.py` を 1 ファイルで始め、増えたら分割でも OK
-   Enum
-   ドメイン共通で使う列挙値（例: 画像用途）は `app/models/enums.py` にまとめ、`str, Enum` 継承クラスとして宣言
-   Router / Service / Schema は必ず Enum を参照し、文字列リテラルをハードコードしない
-   DB へ保存するときは `enum.value` を使い、入力チェックは `AssetPurpose(value)` のようにキャストして ValueError を捕捉

運用ルール（Backend）

-   ルーティング（`api/routers/*.py`）
    -   ルーターにはビジネスロジックを書かない。入出力の I/O、認可チェック、サービス呼び出しのみ
    -   リクエスト/レスポンスの型は必ず Pydantic スキーマを介す（`schemas/`）
    -   ルートの命名はリソース基準（例: `/api/users`, `/api/products`）
-   スキーマ（`schemas/*.py`）
    -   Create/Update/Read を分ける（例: `UserCreate`, `UserUpdate`, `UserRead`）
    -   DB モデルの内部フィールドは返さない（password_hash など）
-   サービス（`services/*.py`）
    -   ユースケース単位で関数を定義し、必要ならトランザクション境界をここで管理
    -   複数リポジトリ/外部サービスのオーケストレーションはサービスで実施
-   リポジトリ（`repositories/*.py`）
    -   同種のクエリが重複/複雑化してきたら導入し、ORM 操作を集約
    -   返り値はドメインオブジェクト（モデル）か DTO（スキーマ）に限定
-   DB/セッション
    -   セッションは依存関数 `get_db()` で注入し、サービスで使い切る
    -   長い処理はできるだけサービスで明示的にトランザクション（commit/rollback）を管理
-   例外/エラー
    -   ドメイン例外を定義し、ルーターで HTTP 例外に変換（404/409/400 など）
    -   バリデーションは Pydantic、ビジネスルール違反はサービス層で例外を投げる
-   パフォーマンス
    -   N+1 が発生しそうな箇所は `selectinload/joinedload` を検討
    -   ページング/検索は `utils/pagination.py` 等にユーティリティ化
-   認証/認可
    -   認証は `core/security.py`（JWT/パスワード）に集約、Depends で注入
    -   ルーターではスコープ/ロールの軽い判定、詳細はサービスで
-   ログ
    -   重要なドメインイベントはサービスで構造化ログを出力
    -   エラーは stacktrace と相関 ID（可能なら）を付与
-   マイグレーション
    -   Alembic は `migrations/` を使用し、`env.py` は `app.db.base:target_metadata` を参照
    -   自動生成後は差分をレビューし、命名規則は `YYYYMMDDHHMM_<short_desc>`
-   環境変数/設定
    -   `core/config.py`（pydantic-settings）で集中管理し、`settings.X` から参照
    -   機密は `.env`、テンプレは `.env.example` に記載
-   テスト
    -   FastAPI の `TestClient` で API を疎通。サービス/リポジトリは単体テストも用意
    -   DB を使うテストはトランザクションロールバック or テスト専用 DB を利用
    -   テストデータ生成
        -   factory-boy を使用して、テストに必要なモデルインスタンスを生成
        -   `tests/factories/` に各モデル用ファクトリを配置し、関心ごとで分割
        -   テスト環境は本番と同じ PostgreSQL を使用し、各テスト後にテーブルをドロップして隔離
        -   例：`UserFactory(email="test@example.com", is_confirmed=True)`
    -   DI の使用方針
        -   テスト時は本物のサービスを使い、実装に近い状態でテストを実施
        -   外部副作用（メール送信など）は別途 Mock で切り離す（必要に応じて）
        -   依存関係は `conftest.py` の fixture で DB session を統一し、テスト間での隔離を確保

---

## Frontend（Next.js）

目的

-   App Router/Server Components を活用しつつ、関心ごとで整理
-   API クライアント層、型、状態管理の置き場を固定

推奨構成

```
frontend/
  app/
    (auth)/                 # ルートグループ（ログイン/登録）
      login/page.tsx
      register/page.tsx
    (feed)/
      page.tsx
    (product)/
      [id]/page.tsx
    layout.tsx
    globals.css
  components/
    ui/
      Button.tsx
      TextInput.tsx
    common/
      Header.tsx
      Footer.tsx
  features/
    auth/
      components/
      hooks/
      types.ts
      index.ts
    posts/
      components/
      hooks/
      types.ts
      index.ts
  lib/
    api/
      client.ts             # fetchラッパ（baseURL, ヘッダー, エラー処理）
      auth.ts
      products.ts
    utils/
      format.ts
      validators.ts
    constants.ts
  stores/
    auth.ts                 # Zustand/Context 等
  types/
    api.d.ts                # API由来の共通型
  public/
  tests/
    unit/
    e2e/
  next.config.ts
  tsconfig.json             # `@/*` のパスエイリアス推奨
  package.json
  .env.example
```

補足

-   認証トークンは当面 localStorage、将来的に httpOnly Cookie 検討
-   `lib/api/client.ts` に HTTP 処理を集約、SDK を薄く分割
-   型はバックエンドのスキーマに合わせ、Zod でランタイム検証も可能

運用ルール（Frontend）

-   ルーティング
    -   画面は App Router を使用。ルートグループは機能単位で括る（例: `(auth)`, `(product)`）
    -   画面数が増えたら機能境界で `features/<domain>/` を作る（コンポーネント/フック/型を内包）
-   データ取得
    -   HTTP アクセスは `lib/api/client.ts` に集約し、`lib/api/<domain>.ts` に薄い関数を置く
    -   可能な限り Server Components でデータを取得し、クライアント側は UI とイベントだけに集中
-   状態管理
    -   まずはローカルステート。2 画面以上で共有が必要になったら `stores/`（Zustand/Context）を導入
    -   認証状態など長寿命の状態のみグローバル化する
-   コンポーネント
    -   再利用 UI は `components/ui/`、レイアウト/共通枠は `components/common/`
    -   200 行超 or 2 画面以上で再利用になったら切り出す
-   型/バリデーション
    -   バックエンドのスキーマに合わせて `types/` に共通型を配置
    -   フォームが複雑化したら React Hook Form + Zod を導入
-   命名/パス
    -   パスエイリアス `@/*` を利用し、相対パスのネストを避ける
    -   ドメイン固有のものは `features/<domain>/` 直下で閉じる
-   スタイル
    -   Tailwind を基本とし、ユーティリティ/コンポーネントクラスは過度に抽象化しない
-   テスト
    -   ユニット（hooks, lib）と軽めの E2E（主要フロー）から開始。必要に応じて拡張
-   環境変数
    -   `NEXT_PUBLIC_API_BASE_URL` を基本に、増えてきたら `.env.example` に追記し、コード側は `process.env` 経由で参照

---

## ルート/インフラ

-   `.github/` にテンプレ/ガイド/CI 設定を集約
-   `infra/`（任意）に本番向け IaC/デプロイ設定
-   `.env.example` で環境変数のキー名方針を共有

---

## 小さく始めて拡張する指針

-   最初は `models.py`/`schemas.py`/`routers.py` を 1〜2 ファイルで開始
-   機能や行数が増えたら `models/`, `schemas/`, `api/routers/` に段階的分割
-   ビジネスロジックがルーターに肥大化したら `services/` を導入
-   クエリが重複/複雑化してきたら `repositories/` で集約

---

## 現在構成からの移行メモ

-   backend
    -   `backend/main.py` → `backend/app/main.py`
    -   `backend/database.py` → `backend/app/db/database.py`
    -   `backend/admin.py` → `backend/app/admin/sqladmin.py`
    -   `backend/models.py` → `backend/app/models/` へ段階的分割（当面は `__init__.py` で集約）
    -   Alembic の `env.py` は `app.db.base` の `target_metadata` を参照
-   frontend
    -   `components/`, `lib/api/`, `stores/` を追加
    -   `tsconfig.json` に `@/*` エイリアスを設定し import を整理

---

## 参考

-   FastAPI: https://fastapi.tiangolo.com/
-   SQLAlchemy: https://docs.sqlalchemy.org/
-   Alembic: https://alembic.sqlalchemy.org/
-   Next.js App Router: https://nextjs.org/docs
-   React Hook Form: https://react-hook-form.com/
-   Zod: https://zod.dev/
