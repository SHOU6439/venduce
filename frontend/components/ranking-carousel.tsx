'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { UserRanking } from '@/components/user-ranking';
import { TrendingProducts } from '@/components/trending-products';
import { LikedProducts } from '@/components/liked-products';
import { cn } from '@/lib/utils';

const TABS = [
    { label: 'ユーザー', sublabel: 'ランキング' },
    { label: '売れている', sublabel: '商品' },
    { label: 'いいね', sublabel: '商品' },
] as const;

export function RankingCarousel() {
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const isScrollingByClick = useRef(false);

    // タブクリック → 対応パネルへスクロール
    const handleTabClick = useCallback((index: number) => {
        const container = scrollRef.current;
        if (!container) return;
        isScrollingByClick.current = true;
        setActiveIndex(index);
        container.scrollTo({
            left: container.offsetWidth * index,
            behavior: 'smooth',
        });
    }, []);

    // スワイプ / 横スクロール → アクティブタブ更新
    const handleScroll = useCallback(() => {
        if (isScrollingByClick.current) return;
        const container = scrollRef.current;
        if (!container) return;
        const index = Math.round(container.scrollLeft / container.offsetWidth);
        setActiveIndex(index);
    }, []);

    // プログラム的スクロール完了後フラグをリセット（onScrollEnd + setTimeout フォールバック）
    const handleScrollEnd = useCallback(() => {
        isScrollingByClick.current = false;
    }, []);

    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;
        let timer: ReturnType<typeof setTimeout>;
        const onScroll = () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                isScrollingByClick.current = false;
            }, 200);
        };
        container.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            container.removeEventListener('scroll', onScroll);
            clearTimeout(timer);
        };
    }, []);

    return (
        <div className="w-full">
            {/* タブバー */}
            <div className="flex border-b border-border mb-0 sticky top-14 md:top-16 z-10 bg-background">
                {TABS.map((tab, i) => (
                    <button
                        key={i}
                        onClick={() => handleTabClick(i)}
                        className={cn(
                            'flex-1 py-3 px-2 text-center transition-colors touch-manipulation',
                            'focus:outline-none',
                            activeIndex === i
                                ? 'border-b-2 border-primary text-primary font-semibold'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        <span className="block text-sm leading-tight">{tab.label}</span>
                        <span className="block text-xs leading-tight opacity-70">{tab.sublabel}</span>
                    </button>
                ))}
            </div>

            {/* スクロールコンテナ */}
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                onScrollEnd={handleScrollEnd}
                className="flex items-start overflow-x-auto snap-x snap-mandatory scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {/* パネル1: ユーザーランキング */}
                <div className="min-w-full snap-start">
                    <UserRanking isActive={activeIndex === 0} />
                </div>

                {/* パネル2: 売れている商品 */}
                <div className="min-w-full snap-start">
                    <TrendingProducts isActive={activeIndex === 1} />
                </div>

                {/* パネル3: いいね商品 */}
                <div className="min-w-full snap-start">
                    <LikedProducts isActive={activeIndex === 2} />
                </div>
            </div>
        </div>
    );
}
