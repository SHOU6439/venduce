# データベースマイグレーション運用ガイド

## 基本コマンド

### マイグレーションファイルの作成

```bash
# モデルの変更を検出して自動生成
alembic revision --autogenerate -m "変更内容の説明"

# 空のマイグレーションファイルを作成（手動編集用)
alembic revision -m "変更内容の説明"
```

### マイグレーションの適用

```bash
# 最新まで適用
alembic upgrade head

# 特定のリビジョンまで適用
alembic upgrade <revision_id>

# 1つ先に進める
alembic upgrade +1
```

### マイグレーションの取り消し

```bash
# 1つ前に戻す
alembic downgrade -1

# 特定のリビジョンまで戻す
alembic downgrade <revision_id>

# 全て取り消す（注意！）
alembic downgrade base
```

### 履歴の確認

```bash
# 現在のリビジョンを表示
alembic current

# マイグレーション履歴を表示
alembic history

# 詳細履歴を表示
alembic history --verbose
```

## 開発フロー

### 1. モデルを変更

```python
# pride/backend/models.py
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    # 新しいカラムを追加
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
```

### 2. マイグレーションファイルを生成

```bash
docker exec -it pride-backend-1 bash
cd /app
alembic revision --autogenerate -m "Add updated_at to users table"
```

### 3. 生成されたファイルを確認・修正

```bash
# 生成されたファイルを確認
cat migrations/versions/<revision_id>_*.py
```

**確認ポイント:**

- [ ] `upgrade()` 関数の内容が正しいか
- [ ] `downgrade()` 関数で完全に元に戻せるか
- [ ] インデックス・制約が適切に設定されているか
- [ ] デフォルト値が正しいか
- [ ] NOT NULL 制約が適切か（既存データがある場合は注意）

### 4. マイグレーションを適用

```bash
# 開発環境
alembic upgrade head

# 本番環境（慎重に！）
alembic upgrade head
```

### 5. 動作確認

```bash
# テーブル構造を確認
docker exec -it pride-postgres-1 psql -U pride_user -d pride_db -c "\d users"

# データを確認
docker exec -it pride-postgres-1 psql -U pride_user -d pride_db -c "SELECT * FROM users;"
```

## 注意事項

### ⚠️ 本番環境でのマイグレーション

1. **必ずバックアップを取る**

   ```bash
   docker exec pride-postgres-1 pg_dump -U pride_user pride_db > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **downgrade の動作確認**

   - 開発環境で必ず `downgrade` をテストする
   - ロールバック手順を準備する

3. **データ損失のリスク**
   - カラム削除
   - NOT NULL 制約の追加（既存データが NULL の場合）
   - UNIQUE 制約の追加（重複データがある場合）

### 🚫 やってはいけないこと

- ❌ 適用済みのマイグレーションファイルを直接編集
- ❌ リビジョン ID を手動で変更
- ❌ `down_revision` を手動で変更
- ❌ マイグレーションファイルの削除（履歴を保持）
- ❌ 本番環境で直接 `alembic downgrade`（緊急時以外）

### ✅ ベストプラクティス

- ✅ マイグレーションファイルは Git にコミット
- ✅ わかりやすいメッセージを付ける
- ✅ 1 つのマイグレーションで 1 つの変更のみ
- ✅ 必ず `downgrade` の動作確認を行う
- ✅ 本番適用前にステージング環境でテスト

## トラブルシューティング

### マイグレーションの衝突

```bash
# 複数のブランチで同時にマイグレーションを作成した場合
alembic merge <revision1> <revision2> -m "Merge migrations"
```

### 既存 DB に Alembic を導入

```bash
# 現在のスキーマを初期リビジョンとしてマーク
alembic stamp head
```

### マイグレーション失敗時のリカバリ

```bash
# 1. 現在の状態を確認
alembic current

# 2. 問題のあるリビジョンを特定
alembic history

# 3. 1つ前に戻す
alembic downgrade -1

# 4. データベースを手動で修正（必要に応じて）

# 5. 再度適用
alembic upgrade head
```

## 環境変数

マイグレーションは以下の環境変数を使用します:

```bash
DATABASE_URL=postgresql://pride_user:pride_pass@postgres:5432/pride_db
```

設定場所: `backend/.env` または Docker 環境変数

## 参考リンク

- [Alembic 公式ドキュメント](https://alembic.sqlalchemy.org/)
- [SQLAlchemy 公式ドキュメント](https://www.sqlalchemy.org/)
