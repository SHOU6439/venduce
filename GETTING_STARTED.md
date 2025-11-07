# 📋 次にやること（Quick Start）

開発計画とテンプレートの準備が完了しました！
以下の手順で開発を始めましょう。

## ステップ 1: GitHubリポジトリの設定 ⚙️

### 1.1 ラベルの作成
```bash
# GitHubリポジトリのSettings > Labelsから、
# .github/LABELS.md を参考に以下のラベルを作成してください

# よく使うラベル（最優先）
- type: feature
- type: bug
- type: task
- priority: high
- priority: medium
- priority: low
- area: backend
- area: frontend
```

または、GitHub CLIで一括作成:
```bash
cd /Users/shoudanyan/Programming/Project/pride
gh label create "type: feature" --color "0075ca" --description "新機能"
gh label create "type: bug" --color "d73a4a" --description "バグ修正"
gh label create "type: task" --color "fbca04" --description "タスク"
gh label create "priority: high" --color "d93f0b" --description "優先度: 高"
gh label create "area: backend" --color "d876e3" --description "バックエンド"
gh label create "area: frontend" --color "1d76db" --description "フロントエンド"
gh label create "phase: 1-foundation" --color "d4c5f9" --description "Phase 1: 基盤機能"
```

### 1.2 ブランチプロテクションの設定（推奨）
GitHubリポジトリの Settings > Branches から：
- `main` ブランチを保護
- "Require a pull request before merging" を有効化
- "Require approvals" を1に設定（チーム開発の場合）

---

## ステップ 2: 最初のIssueを作成 📝

### Issue #1: データベーススキーマ設計
`.github/SAMPLE_ISSUES.md` の "Issue #1" をコピーして作成

**ラベル:**
- `type: task`
- `area: database`
- `phase: 1-foundation`
- `priority: high`

**作成手順:**
1. GitHubリポジトリで「Issues」タブを開く
2. 「New issue」をクリック
3. 「タスク」テンプレートを選択
4. Issue #1の内容を貼り付け
5. ラベルとマイルストーン（Phase 1）を設定
6. 「Submit new issue」

---

## ステップ 3: 開発ブランチを作成 🌿

```bash
cd /Users/shoudanyan/Programming/Project/pride

# mainブランチを最新化して、Issue用の作業ブランチを作成
git checkout main
git pull origin main
git checkout -b feature/1-database-schema
```

---

## ステップ 4: データベース設計を開始 🗄️

### 4.1 ER図の作成
- [draw.io](https://app.diagrams.net/) などでER図を作成
- 保存はリポジトリ外（Notion/Google Drive 等）に行い、共有リンクを関連Issueに記載

### 4.2 モデルファイルの編集
`backend/models.py` を編集して、必要なモデルを追加

参考: `.github/SAMPLE_ISSUES.md` のIssue #1に記載されたテーブル一覧（図面・定義書は外部ストレージに保存）

### 4.3 Alembicマイグレーションの初期化
```bash
cd backend

# Alembicの初期化（migrations ディレクトリを作成）
alembic init migrations

# マイグレーションファイル作成
alembic revision --autogenerate -m "Initial schema"

# マイグレーション実行
alembic upgrade head
```

---

## ステップ 5: Pull Requestの作成 🔄

作業が完了したら：

```bash
git add .
git commit -m "feat: データベーススキーマを設計・実装"
git push origin feature/1-database-schema
```

GitHubでPRを作成：
1. 「Pull requests」タブを開く
2. 「New pull request」をクリック
3. `feature/1-database-schema` → `main` へのPR
4. PRテンプレートに沿って記入
5. `Closes #1` でIssueをリンク
6. レビュアーをアサイン（チーム開発の場合）
7. 「Create pull request」

---

## ステップ 6: 次のIssueを作成 ➡️

Issue #1が完了したら、次のIssueを作成：

### おすすめの順序
1. ✅ Issue #1: データベース設計
2. 📝 Issue #2: JWT認証API実装
3. 📝 Issue #3: ログイン・会員登録UI
4. 📝 Issue #4: 商品管理API
5. 📝 投稿機能の実装...

`.github/SAMPLE_ISSUES.md` を参考に、順次Issueを作成していきましょう。

---

## 便利なコマンド集 🛠️

### 開発環境の起動
```bash
./run.sh up        # Docker起動
./run.sh down      # Docker停止
```

### データベース確認
```bash
# SQLAdminで確認
open http://localhost/admin/

# または、PostgreSQLに直接接続
docker exec -it pride-db-1 psql -U pride_user -d pride_db
```

### バックエンド開発
```bash
cd backend

# パッケージ追加後
pip install -r requirements.txt

# マイグレーション作成
alembic revision --autogenerate -m "メッセージ"

# マイグレーション適用
alembic upgrade head
```

### フロントエンド開発
```bash
cd frontend

# パッケージ追加
npm install

# 開発サーバー
npm run dev
```

---

## 定期的にやること 📅

### 毎日
- [ ] mainブランチを最新に保つ（`git pull origin main`）
- [ ] 作業開始前に、担当Issueを「in-progress」にする
- [ ] 小さな単位でコミット

### 毎週
- [ ] 進捗確認ミーティング（チームの場合）
- [ ] DEVELOPMENT_PLAN.mdの更新
- [ ] クローズしたIssueの振り返り

### マイルストーン達成時
- [ ] mainへのリリースPR（必要に応じて）
- [ ] タグ付け（`v0.1.0`等）
- [ ] リリースノート作成

---

## 困ったときは 🆘

### コンフリクトが発生
→ `.github/WORKFLOW.md` の「トラブルシューティング」を参照

### Issueの書き方がわからない
→ `.github/SAMPLE_ISSUES.md` を参考にする

### 全体の流れがわからない
→ `DEVELOPMENT_PLAN.md` を読み直す

### 技術的な質問
→ Issueに `question` ラベルを付けて質問を投稿

---

## 🎉 準備完了！

これで開発を始める準備が整いました！

まずは **Issue #1: データベース設計** から始めましょう。

Happy Coding! 🚀
