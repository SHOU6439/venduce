'use client';

import Link from 'next/link';

interface HashtagCaptionProps {
    caption: string | null | undefined;
    className?: string;
}

/**
 * キャプションテキストのハッシュタグをクリッカブルリンクに変換する共有コンポーネント。
 * クリックすると /search?q=%23{tag} に遷移し、そのハッシュタグの投稿検索結果を表示する。
 */
export function HashtagCaption({ caption, className }: HashtagCaptionProps) {
    if (!caption) return null;

    const parts = caption.split(/(#[^\s#]+)/g);

    return (
        <span className={className}>
            {parts.map((part, i) => {
                if (part.startsWith('#')) {
                    const tag = part.slice(1); // # を除いたタグ名
                    return (
                        <Link
                            key={i}
                            href={`/search?q=${encodeURIComponent('#' + tag)}`}
                            className="text-blue-500 font-medium hover:text-blue-400 hover:underline mr-0.5"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {part}
                        </Link>
                    );
                }
                return <span key={i}>{part}</span>;
            })}
        </span>
    );
}
