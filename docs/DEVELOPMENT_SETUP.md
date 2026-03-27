# 開発環境セットアップガイド

## ドキュメント一覧

| ドキュメント | 内容 |
|------------|------|
| [GETTING_STARTED.md](../GETTING_STARTED.md) | 開発を始めるためのガイド（まずはここから） |
| [DEVELOPMENT_PLAN.md](../DEVELOPMENT_PLAN.md) | プロジェクト全体の開発計画とロードマップ |
| [.github/WORKFLOW.md](../.github/WORKFLOW.md) | ブランチ戦略、開発フロー、コミット規約 |
| [.github/SAMPLE_ISSUES.md](../.github/SAMPLE_ISSUES.md) | Issue 作成の参考例 |
| [docs/DIRECTORY_STRUCTURE.md](./DIRECTORY_STRUCTURE.md) | Backend/Frontend の推奨ディレクトリ構成 |
| [docs/SWAGGER_UI.md](./SWAGGER_UI.md) | Swagger UI での OAuth2 認証と API テスト手順 |
| [docs/MIGRATE.md](./MIGRATE.md) | Alembic を使ったマイグレーション手順と注意点 |
| [docs/TESTING.md](./TESTING.md) | pytest の実行方法と Docker コンテナでの検証手順 |

---

## 前提条件

- Docker Desktop
- Python pip
- npm / Node.js
- `make`（Mac はデフォルトで利用可能）

---

## Windows 向け `make` セットアップ

Windows 環境では `make` がデフォルトで利用できないことが多いです。以下のいずれかの方法で用意してください。

### WSL2（推奨）

1. 管理者 PowerShell で WSL をインストール:

```powershell
wsl --install -d Ubuntu
```

2. Ubuntu を起動して make をインストール:

```bash
sudo apt update
sudo apt install -y build-essential make
```

3. WSL 内からリポジトリをチェックアウトするか、Windows 側のファイルを共有して `make` を実行。Docker Desktop は Windows 側で動かしておき、WSL から接続できます。

### Chocolatey

1. Chocolatey をインストール（管理者 PowerShell）:

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; `
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; `
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

2. make をインストール:

```powershell
choco install make -y
```

### Scoop

```powershell
iwr -useb get.scoop.sh | iex
scoop install make
```

> Git Bash に含まれる make はバージョン差や互換性の問題があるため、WSL2 を強く推奨します。

---

## Makefile コマンド一覧

```sh
# 初期セットアップ（Docker ビルド・.env 作成・RSA 鍵生成・マイグレーション・テスト DB 作成）
make setup

# コンテナを起動
make up

# コンテナを停止
make down

# コンテナを停止して削除し、リソースをクリーンアップ
make clean

# コンテナを再ビルドして起動
make rebuild

# キャッシュなしでイメージを再ビルド
make nocache

# コンテナのログを表示
make logs

# テストを実行
make test

# 利用可能なすべてのコマンドを表示
make help
```

---

## 開発を始める前に

1. **開発計画を確認**: [DEVELOPMENT_PLAN.md](../DEVELOPMENT_PLAN.md) でプロジェクト全体の流れを把握
2. **GitHub ラベル設定**: ラベルは自動同期されます（`backend`, `frontend`, `bug`, `feature`, `task`, `high`, `medium`, `low`）
3. **ワークフロー確認**: [WORKFLOW.md](../.github/WORKFLOW.md) でブランチ戦略とコミット規約を確認
4. **最初の Issue 作成**: [SAMPLE_ISSUES.md](../.github/SAMPLE_ISSUES.md) を参考に Issue #1（データベース設計）から始める
