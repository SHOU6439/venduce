// Next.js 16 Turbopack のプリレンダリング時に layout 由来の hooks が
// null context で呼ばれるバグを回避するため force-dynamic を設定する。
export const dynamic = 'force-dynamic';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ padding: '4rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '4rem', fontWeight: 'bold' }}>404</h1>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>ページが見つかりません</p>
      <Link href="/" style={{ color: '#0070f3', textDecoration: 'underline' }}>
        ホームに戻る
      </Link>
    </div>
  );
}
