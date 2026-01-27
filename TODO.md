# 無限スクロール（Infinite Scroll）を実装する

## タスク

- [ ] **1. バックエンド API の準備**
  - [ ] 商品一覧エンドポイント (`/api/products`) が `skip`/`limit` パラメータに対応していることを確認
  - [ ] 投稿一覧エンドポイント (`/api/posts`) が `skip`/`limit` パラメータに対応していることを確認
  - [ ] レスポンス形式が `{ items, total, skip, limit }` 構造になっていることを確認

- [ ] **2. フロントエンド API クライアントの作成**
  - [ ] `frontend/lib/api/products.ts` にページネーション対応関数を追加
  - [ ] `frontend/lib/api/posts.ts` にページネーション対応関数を追加

- [ ] **3. 無限スクロール Hook の実装**
  - [ ] `frontend/lib/useInfiniteScroll.ts` を新規作成
  - [ ] Intersection Observer で最後の要素を検出
  - [ ] `loading`/`error` 状態を提供
  - [ ] `fetchMore` コールバックを実装

- [ ] **4. 商品一覧ページへの適用**
  - [ ] `frontend/app/(product)` の商品一覧コンポーネントを更新
  - [ ] useInfiniteScroll hook を統合
  - [ ] 既存の `ProductsGrid` コンポーネントを無限スクロール対応に改修

- [ ] **5. 投稿一覧ページへの適用**
  - [ ] `frontend/app/posts/page.tsx` を更新
  - [ ] useInfiniteScroll hook を統合
  - [ ] ダミー表示を削除し実装に置き換え

- [ ] **6. テストと最適化**
  - [ ] スクロール時のパフォーマンスを確認
  - [ ] 適切なバッチサイズ（`limit=20` など）を検証
  - [ ] ローディング状態の UX を確認
  - [ ] `make test` で全テストが通ることを確認

## 適用範囲

- 商品一覧
- 投稿一覧
