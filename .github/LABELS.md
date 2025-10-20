# GitHub Labels設定ガイド

プロジェクトで使用する推奨ラベル一覧です。
GitHubリポジトリの「Issues」→「Labels」から以下のラベルを作成してください。

## 種類別

### Type（種類）
- `type: feature` - 新機能 (色: #0075ca)
- `type: bug` - バグ修正 (色: #d73a4a)
- `type: task` - タスク・雑務 (色: #fbca04)
- `type: refactor` - リファクタリング (色: #7057ff)
- `type: docs` - ドキュメント (色: #0075ca)
- `type: test` - テスト (色: #bfd4f2)

## 優先度

### Priority（優先度）
- `priority: critical` - 致命的 (色: #b60205)
- `priority: high` - 高 (色: #d93f0b)
- `priority: medium` - 中 (色: #fbca04)
- `priority: low` - 低 (色: #0e8a16)

## 領域

### Area（領域）
- `area: backend` - バックエンド (色: #d876e3)
- `area: frontend` - フロントエンド (色: #1d76db)
- `area: database` - データベース (色: #5319e7)
- `area: devops` - DevOps/インフラ (色: #006b75)
- `area: security` - セキュリティ (色: #b60205)
- `area: design` - デザイン/UI/UX (色: #e99695)

## ステータス

### Status（状態）
- `status: blocked` - ブロック中 (色: #e4e669)
- `status: in-progress` - 作業中 (色: #c5def5)
- `status: review` - レビュー待ち (色: #0e8a16)
- `status: ready` - 着手可能 (色: #0075ca)

## フェーズ

### Phase（開発フェーズ）
- `phase: 0-setup` - 環境構築 (色: #f9d0c4)
- `phase: 1-foundation` - 基盤機能 (色: #d4c5f9)
- `phase: 2-sns` - SNS機能 (色: #c5def5)
- `phase: 3-ec` - EC機能 (色: #c2e0c6)
- `phase: 4-admin` - 管理機能 (色: #fef2c0)
- `phase: 5-optimization` - 最適化 (色: #bfdadc)
- `phase: 6-quality` - 品質向上 (色: #d4c5f9)
- `phase: 7-deploy` - デプロイ (色: #0e8a16)

## その他

### Other
- `good first issue` - 初心者向け (色: #7057ff)
- `help wanted` - ヘルプ募集 (色: #008672)
- `question` - 質問 (色: #d876e3)
- `wontfix` - 対応しない (色: #ffffff)
- `duplicate` - 重複 (色: #cfd3d7)
- `needs-discussion` - 要議論 (色: #fbca04)

## 一括作成用スクリプト

GitHubのSettings > Labelsから手動で作成するか、GitHub APIを使用して一括作成できます。

```bash
# GitHub CLIを使った一括作成例（gh コマンドが必要）
gh label create "type: feature" --color "0075ca" --description "新機能"
gh label create "type: bug" --color "d73a4a" --description "バグ修正"
gh label create "type: task" --color "fbca04" --description "タスク・雑務"
# ... 以下同様
```
