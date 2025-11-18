# Pride - SNS × EC プラットフォーム

> 買ったモノを自慢できる、SNS 型 EC サイト

## 📖 ドキュメント

- **[🚀 開発を始める](./GETTING_STARTED.md)** - まずはここから！次にやることガイド
- [ディレクトリ構成ガイド](./docs/DIRECTORY_STRUCTURE.md) - Backend/Frontend の推奨構成
- [開発計画](./DEVELOPMENT_PLAN.md) - プロジェクト全体の開発計画とロードマップ
- [ワークフロー](./.github/WORKFLOW.md) - ブランチ戦略、開発フロー、コミット規約
- [サンプル Issue](./.github/SAMPLE_ISSUES.md) - Issue 作成の参考例

## 前提条件

- Docker Desktop
- Python pip
- npm and node.js

Windows ユーザー向けの補足

Windows 環境では `make` がデフォルトで利用できないことが多いです。以下のいずれかの方法で `make` を用意してください（WSL2 が最も推奨されます）。

- WSL2（推奨）
  1. 管理者 PowerShell で WSL をインストール（Windows 10/11 の最新で利用可能）:

	  ```powershell
	  wsl --install -d Ubuntu
	  ```

  2. Ubuntu を起動して make をインストール:

	  ```bash
	  sudo apt update
	  sudo apt install -y build-essential make
	  ```

  3. WSL 内からリポジトリをチェックアウトするか、Windows 側でファイルを共有して `make` を実行してください。Docker Desktop は Windows 側で動かしておき、WSL から Docker に接続できます。

- Chocolatey（PowerShell 管理者での方法）

  1. Chocolatey をインストール（管理者 PowerShell）:

	  ```powershell
	  Set-ExecutionPolicy Bypass -Scope Process -Force; \
	  [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; \
	  iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
	  ```

  2. make をインストール:

	  ```powershell
	  choco install make -y
	  ```

- Scoop（PowerShell ユーザー向けの別案）

  ```powershell
  iwr -useb get.scoop.sh | iex
  scoop install make
  ```

注: Git Bash の環境に含まれる make はバージョン差や互換性の違いがある場合があるため、WSL2 を強く推奨します。

# Setup

## 環境構築

プロジェクトの環境構築には **Makefile** を使用します。

### 前提条件

- Docker Desktop がインストールされていること
- `make` コマンドが利用可能であること（Mac は デフォルトで利用可能、Windows は WSL2 または Git Bash を推奨）

### 初期セットアップ

```sh
# 初期セットアップ（Docker ビルド、.env 作成、RSA 鍵生成、マイグレーション、テスト DB 作成）
make setup
```

### よく使うコマンド

```sh
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

### Makefile の詳細

各コマンドの詳細については、プロジェクト直下の `Makefile` を参照してください。

# URL まとめ

## Next.js

```sh
http://localhost:3000
```

## FastAPI

```sh
http://localhost:8000/api
```

### docs

```sh
http://localhost:8000/docs
```

## SQLAdmin

```sh
http://localhost/admin/
```

---

## 🚀 開発を始める前に

1. **開発計画を確認**: [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) でプロジェクト全体の流れを把握
2. **GitHub ラベル設定**: ラベルは自動同期されます（`backend`, `frontend`, `bug`, `feature`, `task`, `high`, `medium`, `low`）。必要に応じてメンテナが追加します。
3. **ワークフロー確認**: [WORKFLOW.md](./.github/WORKFLOW.md) でブランチ戦略とコミット規約を確認
4. **最初の Issue 作成**: [SAMPLE_ISSUES.md](./.github/SAMPLE_ISSUES.md) を参考に Issue #1（データベース設計）から始める

## 📋 現在の開発状況

- ✅ Phase 0: 開発環境整備完了
- 🔄 Phase 1: 基盤機能実装中（次: データベース設計）

詳細は [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) を参照してください。
