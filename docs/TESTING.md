# テスト実行ガイド

## 目次
- 前提
- Docker コンテナ内での実行（推奨：開発コンテナと同じ環境で）
- 個別テストの実行方法
---

## 前提

- リポジトリルートでの手順を想定しています。
- Python 依存は `backend/requirements.txt` を参照します。ローカル実行では仮想環境（venv, pyenv-virtualenv など）を推奨。
- コンテナ実行は Docker Compose 構成（`compose.yml`）を想定。
- テストフレームワークは `pytest`、API テストは `fastapi.testclient`（内部で `httpx`）を利用します。

---

## 1) Docker コンテナ内での実行

プロジェクトは Docker Compose を使って開発環境を起動します。コンテナ内でテストを実行すると開発環境に近い状態で検証できます。

1. コンテナをビルド & 起動

```bash
docker compose up -d --build backend
```

- ビルドがすでにされてる場合はビルド不要
```bash
docker compose up -d backend
```

2. コンテナ内でテストを実行

```bash
# 全テスト
docker compose exec backend bash -lc "cd /app && PYTHONPATH=/app pytest -q"

# 単一テスト（例）
docker compose exec backend bash -lc "cd /app && PYTHONPATH=/app pytest -q tests/test_user_service.py::test_create_user_success"
```

メモ:
- コンテナ内で `PYTHONPATH=/app` を指定すると、`app` パッケージが確実に import 可能になります（コンテナ設定により異なる場合あり）。
- requirements を変更した場合は再ビルドが必要です（`--build` オプション）。

---

## 2) 個別テスト／テストグループの実行

- 特定ファイルのみ: `pytest tests/test_file.py`。
- 特定テスト関数のみ: `pytest tests/test_file.py::test_name`。
- テストマークを使う: `pytest -m integration` など（事前にマーク付けが必要）。

例（TestClient を使った API テスト）:

```bash
docker compose exec backend bash -lc "cd /app && PYTHONPATH=/app pytest -q tests/test_api_auth.py::test_register_api_conflict"
```

## テスト方針

- **基本方針（推奨）: Factory ベースのテスト（統合寄り）**
	- 多くの API/ユースケース テストは `factory-boy` を使って DB に実際のモデルを作成（`tests/factories/`）し、`db_session` fixture を使って後片付けを確実にする。これにより ORM の制約やトランザクション整合性、マイグレーションの問題を捕捉しやすくなる。
	- 利点: 実際の DB を利用するため、本番に近い統合的なテストが可能。予期せぬ DB 制約違反を検出できる。

- **補助方針: Fake（in-memory mock）ベースのテスト（ユニット寄り）**
	- `tests/fakes/` に置いた軽量なモック（例: `fake_user_service.py`）は、サービス層や外部副作用を持つ処理を隔離した純ユニットテストに用いる。依存関係を `app.deps` のオーバーライドで差し替えて利用する。
	- 利点: DB が不要な早いユニットテストを作りやすい。外部 API を模擬する場合に有効。

- **選び方の例**
	- エンドポイントの入力バリデーション・権限チェック・トークン処理などは factory+DB を使った統合的テストを優先。
	- サービス単体のアルゴリズムや外部 API のハンドリング（メール送信や外部 API 呼び出し）は Fake を使ってユニットテスト化する。

- **依存オーバーライドの例（FastAPI）**
	- `conftest.py` で `app.dependency_overrides[get_user_service] = lambda: FakeUserService()` のように設定してテスト単位で差し替える。

