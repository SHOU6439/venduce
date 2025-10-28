# Next.js のページ遷移ガイド

## ルート構造

```
frontend/app/
├── page.tsx              # / (ホーム)
├── login/
│   └── page.tsx          # /login (ログイン)
├── register/
│   └── page.tsx          # /register (会員登録)
├── products/
│   ├── page.tsx          # /products (商品一覧)
│   └── [id]/
│       └── page.tsx      # /products/:id (商品詳細)
├── posts/
│   ├── page.tsx          # /posts (投稿一覧)
│   └── [id]/
│       └── page.tsx      # /posts/:id (投稿詳細)
└── layout.tsx            # 全ページ共通レイアウト
```

## ページ一覧

| ルート           | ファイル                                                               | 説明                     |
| ---------------- | ---------------------------------------------------------------------- | ------------------------ |
| `/`              | [`app/page.tsx`](../frontend/app/page.tsx)                             | ホームページ（フィード） |
| `/login`         | [`app/login/page.tsx`](../frontend/app/login/page.tsx)                 | ログインページ           |
| `/register`      | [`app/register/page.tsx`](../frontend/app/register/page.tsx)           | 会員登録ページ           |
| `/products`      | [`app/products/page.tsx`](../frontend/app/products/page.tsx)           | 商品一覧ページ           |
| `/products/[id]` | [`app/products/[id]/page.tsx`](../frontend/app/products/[id]/page.tsx) | 商品詳細ページ           |

例：）[id] = 1

| `/posts` | [`app/posts/page.tsx`](../frontend/app/posts/page.tsx) | 投稿一覧ページ |
| `/posts/[id]` | [`app/posts/[id]/page.tsx`](../frontend/app/posts/[id]/page.tsx) | 投稿詳細ページ |

例：）[id] = １

## ページ遷移の実装

### 1. Link コンポーネントを使用

最も基本的な遷移方法です。`next/link` の `Link` コンポーネントを使用します。

```tsx
import Link from 'next/link';

export default function Home() {
  return (
    <nav>
      <Link href="/">ホーム</Link>
      <Link href="/login">ログイン</Link>
      <Link href="/products">商品一覧</Link>
      <Link href="/posts">投稿一覧</Link>
    </nav>
  );
}
```

### 2. 動的ルート（Dynamic Routes）

ID を含むルートへのリンク：

```tsx
// 商品詳細へのリンク
<Link href="/products/123">商品詳細</Link>

// 投稿詳細へのリンク
<Link href="/posts/456">投稿詳細</Link>
```

### 3. パラメータの取得

動的ルートのページでパラメータを取得：

```tsx
// filepath: app/products/[id]/page.tsx

interface ProductDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProductDetail({ params }: ProductDetailPageProps) {
  const { id } = await params; // URL の [id] を取得

  return <h1>商品ID: {id}</h1>;
}
```

### 4. useRouter を使用したプログラマティック遷移

イベントハンドラーでの遷移が必要な場合：

```tsx
'use client';

import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  const handleLoginSuccess = () => {
    router.push('/'); // ログイン後にホームへ遷移
  };

  return <button onClick={handleLoginSuccess}>ログイン</button>;
}
```

### 5. クライアントコンポーネント vs サーバーコンポーネント

- **Server Component** (デフォルト): Link コンポーネントでの遷移
- **Client Component** (`"use client"`): useRouter でのプログラマティック遷移

```tsx
// ✅ Server Component (推奨)
export default function ProductCard() {
  return <Link href="/products/123">詳細を見る</Link>;
}

// ⚠️ Client Component (イベント処理が必要な場合のみ)
('use client');
import { useRouter } from 'next/navigation';

export default function CheckoutButton() {
  const router = useRouter();

  const handleCheckout = async () => {
    // 決済処理...
    router.push('/');
  };

  return <button onClick={handleCheckout}>購入</button>;
}
```

## よくある遷移パターン

### ホーム → ログイン

```tsx
<Link href="/login">ログイン</Link>
```

### ログイン → ホーム（成功時）

```tsx
const router = useRouter();
router.push('/');
```

### 商品一覧 → 商品詳細

```tsx
<Link href={`/products/${product.id}`}>{product.name}</Link>
```

### 投稿一覧 → 投稿詳細

```tsx
<Link href={`/posts/${post.id}`}>投稿を表示</Link>
```

### 戻るボタン

```tsx
'use client';
import { useRouter } from 'next/navigation';

export default function BackButton() {
  const router = useRouter();
  return <button onClick={() => router.back()}>戻る</button>;
}
```

## 推奨事項

1. **できるだけ Link を使う** - プリロード、パフォーマンス最適化が自動的に行われる
2. **useRouter は必要な時だけ** - イベント処理、条件分岐での遷移など
3. **Server Components 優先** - パフォーマンスと SEO の利点がある
4. **動的ルートは [id] の形式** - 可読性が高い

## トラブルシューティング

### useRouter が undefined

```tsx
// ❌ Server Component では使えない
export default function Page() {
  const router = useRouter(); // エラー！
}

// ✅ "use client" を追加
('use client');
import { useRouter } from 'next/navigation';

export default function Page() {
  const router = useRouter(); // OK
}
```

### ルートが見つからない

確認事項：

- ファイルが正しいディレクトリにあるか
- ファイル名は `page.tsx` か
- URL が正しいか（大文字小文字を区別）

## 参考

- [Next.js Link コンポーネント](https://nextjs.org/docs/app/api-reference/components/link)
- [Next.js useRouter](https://nextjs.org/docs/app/api-reference/hooks/use-router)
- [Next.js Dynamic Routes](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes)
