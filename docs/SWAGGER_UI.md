# Swagger UI ガイド

Venduce API を Swagger UI（FastAPI が提供する `/docs`）から試すための手順をまとめています。

## 前提条件

1. `make up` でコンテナを起動し、`docker compose ps` で backend が稼働中であることを確認する
2. DB に「アクティブ & 本登録済み」のユーザーが 1 件以上存在する
    - `/api/auth/register` → メール確認 → `/api/auth/confirm` でも OK
    - もしくは管理者が直接 DB にユーザーを追加して `is_active`, `is_confirmed` を true にする

## アクセス方法

-   URL: `http://localhost:8000/docs`
-   FastAPI（backend コンテナ）が直接配信しています。nginx などのリバースプロキシを挟む場合も、このパスへ転送するだけで利用可能です。

## Authorize（認証）手順

Swagger UI は OAuth2 **Password** フローで `/api/auth/token` を呼び出します。

1. 右上の **Authorize** ボタンをクリック
2. モーダルに以下を入力
    - `username`: 本登録済みユーザーのメールアドレス
    - `password`: そのユーザーのパスワード
    - `scope` (任意): `remember` を入力すると「長寿命リフレッシュトークン」を要求
3. モーダル内の tokenUrl が `/api/auth/token` になっていることを確認（`app/main.py` の `custom_openapi()` が設定）
4. **Authorize** を押すとトークンが払い出され、Swagger が Bearer トークンを記憶します
5. モーダルを閉じると鍵アイコンが緑色になり、認証状態でリクエストできます

## 認証が必要なエンドポイントを試す

-   鍵マーク付きのルート（例: `GET /api/users/me`）を展開
-   **Try it out** → **Execute** を押すと、自動で `Authorization: Bearer <token>` ヘッダーが付きます
-   レスポンスはリクエスト欄の下に表示され、401/403 のときは API から返された JSON がそのまま確認できます

## 401 エラーの代表例と対処

| 症状                                           | 想定される原因                                                         | 対処方法                                                                                |
| ---------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `{"detail": "Could not validate credentials"}` | トークンが現在の DB に紐づいていない（ユーザー削除・DB 初期化後など）  | データ再作成後に **Authorize** を再実行し、新しいトークンを取得                         |
| `{"detail": {"code": "not_confirmed", ...}}`   | ユーザーが未確認状態                                                   | メール確認を完了させるか、DB で `is_confirmed` / `is_active` を true に更新             |
| Authorize 直後に 401                           | モーダルが既定の `/token` を指しており新エンドポイントを参照していない | `custom_openapi()` が読み込まれているか確認し、ブラウザをリロードしてから再度 Authorize |
| `curl` では成功するが Swagger では失敗         | ブラウザ側で古いトークンがキャッシュされている                         | モーダルで **Logout** → ページを更新 → 再度 Authorize                                   |

## ヒント

-   アクセストークンの寿命は `ACCESS_TOKEN_EXPIRE_MINUTES`（既定 15 分）なので、長時間の手動検証中は定期的に更新してください。
-   **Scopes** は自由入力ですが、現在有効なのは `remember` のみです。空欄なら通常 TTL でリフレッシュトークンを要求します。
-   nginx などで `/api/docs` をプロキシする際は、追加認証で `Authorization` ヘッダーが削除されないように注意してください。

以上で、Swagger UI からフロントエンド相当の動きを再現しつつ、エンドポイントの疎通確認が行えます。
