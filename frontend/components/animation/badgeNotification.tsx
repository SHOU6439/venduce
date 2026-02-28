'use client';

import { useState, useEffect, useCallback } from 'react';
import { BadgeDefinition } from '@/types/api';
import { badgesApi } from '@/lib/api/badges';
import { useAuthStore } from '@/stores/auth';
import { useWsEvents } from '@/components/ws-provider';

/** バッジアイコン SVG（badge-display.tsx と統一 / icon フィールドベース） */
function BadgeIconLarge({ icon, color }: { icon: string; color: string }) {
    const s = 80;
    const props = { width: s, height: s, viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg" };
    const stroke = { stroke: color, strokeWidth: "1.5", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

    switch (icon) {
        case 'trophy':
            return (
                <svg {...props}>
                    <path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2M6 3h12v7a6 6 0 0 1-12 0V3zM9 21h6M12 16v5" {...stroke} fill={color} fillOpacity="0.2" />
                </svg>
            );
        case 'crown':
            return (
                <svg {...props}>
                    <path d="M2 20h20L19 8l-5 5-2-7-2 7-5-5-3 12z" {...stroke} fill={color} fillOpacity="0.25" />
                    <path d="M2 20h20" {...stroke} />
                </svg>
            );
        case 'pencil':
            return (
                <svg {...props}>
                    <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" {...stroke} fill={color} fillOpacity="0.2" />
                </svg>
            );
        case 'heart':
            return (
                <svg {...props}>
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" {...stroke} fill={color} fillOpacity="0.2" />
                </svg>
            );
        case 'users':
            return (
                <svg {...props}>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" {...stroke} />
                    <circle cx="9" cy="7" r="4" {...stroke} fill={color} fillOpacity="0.2" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" {...stroke} />
                </svg>
            );
        case 'shopping-bag':
            return (
                <svg {...props}>
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" {...stroke} fill={color} fillOpacity="0.1" />
                </svg>
            );
        case 'sparkle':
            return (
                <svg {...props}>
                    <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" {...stroke} fill={color} fillOpacity="0.25" />
                </svg>
            );
        default:
            return (
                <svg {...props}>
                    <circle cx="12" cy="9" r="6" {...stroke} fill={color} fillOpacity="0.2" />
                    <path d="M8.5 14.5L7 22l5-3 5 3-1.5-7.5" {...stroke} />
                </svg>
            );
    }
}

/** パーティクル（紙吹雪風） */
function Particles({ color }: { color: string }) {
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {Array.from({ length: 20 }).map((_, i) => {
                const left = Math.random() * 100;
                const delay = Math.random() * 0.5;
                const duration = 1.5 + Math.random() * 1;
                const size = 4 + Math.random() * 6;
                return (
                    <div
                        key={i}
                        className="absolute rounded-full opacity-0"
                        style={{
                            left: `${left}%`,
                            top: '50%',
                            width: size,
                            height: size,
                            backgroundColor: i % 3 === 0 ? color : i % 3 === 1 ? '#FFD700' : '#fff',
                            animation: `badge-particle ${duration}s ${delay}s ease-out forwards`,
                        }}
                    />
                );
            })}
            <style>{`
                @keyframes badge-particle {
                    0% { opacity: 1; transform: translate(0, 0) scale(1); }
                    100% { opacity: 0; transform: translate(${Math.random() > 0.5 ? '' : '-'}${30 + Math.random() * 60}px, -${80 + Math.random() * 120}px) scale(0.3); }
                }
            `}</style>
        </div>
    );
}

/** 単一バッジのお祝い表示 */
function BadgeCelebration({
    badge,
    onDone,
}: {
    badge: BadgeDefinition;
    onDone: () => void;
}) {
    const [phase, setPhase] = useState<'enter' | 'show' | 'exit'>('enter');

    useEffect(() => {
        const t1 = setTimeout(() => setPhase('show'), 50);
        const t2 = setTimeout(() => setPhase('exit'), 3500);
        const t3 = setTimeout(onDone, 4200);
        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        };
    }, [onDone]);

    return (
        <div
            className="fixed inset-0 z-9999 flex items-center justify-center transition-opacity duration-500"
            style={{
                opacity: phase === 'enter' ? 0 : phase === 'exit' ? 0 : 1,
                backgroundColor: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
            }}
            onClick={onDone}
        >
            <div
                className="relative flex flex-col items-center gap-4 transition-all duration-700 ease-out"
                style={{
                    transform: phase === 'show' ? 'scale(1) translateY(0)' : 'scale(0.5) translateY(30px)',
                    opacity: phase === 'show' ? 1 : 0,
                }}
            >
                {/* 光の輪 */}
                <div
                    className="absolute rounded-full"
                    style={{
                        width: 180,
                        height: 180,
                        background: `radial-gradient(circle, ${badge.color}40 0%, transparent 70%)`,
                        animation: 'badge-glow 2s ease-in-out infinite',
                    }}
                />

                {/* バッジアイコン */}
                <div
                    className="relative"
                    style={{ animation: 'badge-bounce 0.6s 0.3s ease-out' }}
                >
                    <BadgeIconLarge icon={badge.icon} color={badge.color} />
                </div>

                {/* テキスト */}
                <div className="text-center">
                    <p className="text-xs font-medium uppercase tracking-widest text-white/70">
                        バッジ獲得！
                    </p>
                    <p
                        className="mt-1 text-2xl font-bold"
                        style={{ color: badge.color }}
                    >
                        {badge.name}
                    </p>
                    <p className="mt-1 text-sm text-white/80">{badge.description}</p>
                </div>

                <Particles color={badge.color} />
            </div>

            <style>{`
                @keyframes badge-glow {
                    0%, 100% { transform: scale(1); opacity: 0.6; }
                    50% { transform: scale(1.15); opacity: 1; }
                }
                @keyframes badge-bounce {
                    0% { transform: scale(0.3); }
                    50% { transform: scale(1.15); }
                    70% { transform: scale(0.95); }
                    100% { transform: scale(1); }
                }
            `}</style>
        </div>
    );
}

/**
 * バッジ通知マネージャー。
 * - 初回ログイン時に HTTP で未通知バッジを取得（ページリロード時の取りこぼし防止）
 * - 以後は WebSocket の badge_awarded イベントでリアルタイム受信
 *
 * layout.tsx などアプリ全体のレイアウトに1つだけ配置する。
 */
export function BadgeNotificationManager() {
    const user = useAuthStore((state) => state.user);
    const ws = useWsEvents();
    const [queue, setQueue] = useState<BadgeDefinition[]>([]);
    const [current, setCurrent] = useState<BadgeDefinition | null>(null);

    // 初回: HTTP で未通知バッジを取得（WS 接続前に付与されたバッジの救済）
    useEffect(() => {
        if (!user) return;

        const fetchUnnotified = async () => {
            try {
                const data = await badgesApi.getNotifications();
                if (data.badges.length > 0) {
                    setQueue((prev) => [...prev, ...data.badges]);
                }
            } catch {
                // 認証切れ等はスルー
            }
        };

        const timer = setTimeout(fetchUnnotified, 2000);
        return () => clearTimeout(timer);
    }, [user]);

    // WebSocket: badge_awarded イベントでリアルタイム受信
    useEffect(() => {
        if (!user) return;

        const handler = (e: CustomEvent) => {
            const badge = e.detail as BadgeDefinition;
            if (badge && badge.name) {
                setQueue((prev) => [...prev, badge]);
            }
        };

        ws.addEventListener('badge_awarded', handler as any);
        return () => ws.removeEventListener('badge_awarded', handler as any);
    }, [user, ws]);

    // キューから1つずつ表示
    useEffect(() => {
        if (current || queue.length === 0) return;
        const [next, ...rest] = queue;
        setCurrent(next);
        setQueue(rest);
    }, [queue, current]);

    const handleDone = useCallback(() => {
        setCurrent(null);
    }, []);

    if (!current) return null;

    return <BadgeCelebration badge={current} onDone={handleDone} />;
}
