# 開発ワークフロー

## ブランチ戦略

```
main（デフォルト）
  ├── feature/xxx（機能開発）
  ├── fix/xxx（バグ修正）
  └── refactor/xxx（リファクタ／その他）
```

今回の運用は“ゆるめ”です。developブランチは使わず、mainから直接作業ブランチを生やして進めます。

### ブランチ命名規則

- `feature/issue番号-機能名` - 新機能開発
  - 例: `feature/1-user-authentication`
- `fix/issue番号-修正内容` - バグ修正
  - 例: `fix/15-login-error`
- `refactor/issue番号-対象` - リファクタリング
  - 例: `refactor/20-database-queries`
- `docs/説明` - ドキュメント更新
  - 例: `docs/update-readme`

## 開発フロー

### 1. Issue作成
```
1. 実装したい機能や修正したいバグをIssueとして作成
2. 適切なテンプレート（Feature/Bug/Task）を選択
3. ラベル、優先度、マイルストーンを設定
4. 必要に応じてアサイン
```

### 2. ブランチ作成
```bash
# mainブランチから最新の状態を取得してブランチを作成
git checkout main
git pull origin main
git checkout -b feature/1-user-authentication
```

### 3. 実装・コミット
```bash
# 変更をステージング
git add .

# コミット（最低限、何を変更したかが分かるメッセージにする）
git commit -m "ユーザー認証APIを追加"
```

#### コミットメッセージの最低限ルール
- 何を変更したのかが分かる短い要約を書く（日本語でOK）
- 必要に応じて詳細や理由を2行目以降に追記
- 関連Issueがあれば本文末に `Refs #123` や `Closes #123` を記載

例:
```bash
ユーザー登録APIを追加（入力バリデーション含む）
ログイン時のバリデーションエラーを修正
READMEにセットアップ手順を追記
DB接続処理をリファクタ
```

### 4. プッシュ
```bash
git push origin feature/1-user-authentication
```

### 5. Pull Request作成
```
1. GitHubでPRを作成
2. PRテンプレートに沿って記入
3. Closes #1 でIssueとリンク
4. レビュアーを指定
5. 適切なラベルを付与
```

### 6. コードレビュー
```
- レビュアーがコードを確認
- 必要に応じて修正依頼
- Approve後にマージ可能
```

### 7. マージ
```
- Squash and Merge を推奨
- mainブランチへマージ
- リリース運用はCI/CD設定後に調整（簡易運用ではmain=本番）
```

## コードレビューチェックリスト

### 機能面
- [ ] 要件を満たしているか
- [ ] エッジケースを考慮しているか
- [ ] エラーハンドリングが適切か

### コード品質
- [ ] 可読性が高いか
- [ ] 適切な命名がされているか
- [ ] 重複コードがないか
- [ ] コメントが適切か（必要なところだけ）

### セキュリティ
- [ ] SQLインジェクション対策されているか
- [ ] XSS対策されているか
- [ ] 認証・認可が適切か
- [ ] センシティブ情報がハードコードされていないか

### パフォーマンス
- [ ] N+1クエリがないか
- [ ] 不要なAPI呼び出しがないか
- [ ] 適切なインデックスが設定されているか

### テスト
- [ ] テストが追加されているか
- [ ] 既存のテストがパスするか
- [ ] カバレッジが下がっていないか

## リリースフロー

### 開発環境へのデプロイ
```bash
# mainブランチへマージで自動デプロイ（CI/CD設定後に調整）
```

### 本番環境へのリリース
```bash
# 1. mainへのPRをレビューしてマージ
# 2. 必要に応じてタグ作成（任意）
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

## トラブルシューティング

### コンフリクトが発生した場合
```bash
# mainの最新を取得
git checkout main
git pull origin main

# 自分のブランチへマージ（またはrebaseでも可）
git checkout feature/1-user-authentication
git merge main

# コンフリクト解決後
git add .
git commit -m "Merge main into feature/1-user-authentication"
git push origin feature/1-user-authentication
```

### 誤ったブランチで作業した場合
```bash
# 変更を一時保存
git stash

# 正しいブランチへ移動
git checkout -b feature/correct-branch

# 変更を適用
git stash pop
```

## Tips

- 小さな変更を頻繁にコミット
- PRは小さく保つ（500行以下が理想）
- マージ前に自分でもコードを再確認
- レビューコメントには感謝の気持ちを
- 疑問点は遠慮なく質問する
