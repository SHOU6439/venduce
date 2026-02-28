'use client';

import { BadgeDefinition, UserBadge } from '@/types/api';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

/** バッジアイコン (icon フィールド → SVG) */
function BadgeIcon({ icon, color, size = 24 }: { icon: string; color: string; size?: number }) {
    const s = size;
    const props = { width: s, height: s, viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg" };
    const stroke = { stroke: color, strokeWidth: "2", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

    switch (icon) {
        case 'trophy':
            return (
                <svg {...props}>
                    <path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2M6 3h12v7a6 6 0 0 1-12 0V3zM9 21h6M12 16v5" {...stroke} />
                </svg>
            );
        case 'crown':
            return (
                <svg {...props}>
                    <path d="M2 20h20L19 8l-5 5-2-7-2 7-5-5-3 12z" {...stroke} fill={color} fillOpacity="0.15" />
                    <path d="M2 20h20" {...stroke} />
                </svg>
            );
        case 'pencil':
            return (
                <svg {...props}>
                    <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" {...stroke} fill={color} fillOpacity="0.15" />
                </svg>
            );
        case 'heart':
            return (
                <svg {...props}>
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" {...stroke} fill={color} fillOpacity="0.15" />
                </svg>
            );
        case 'users':
            return (
                <svg {...props}>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" {...stroke} />
                    <circle cx="9" cy="7" r="4" {...stroke} fill={color} fillOpacity="0.15" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" {...stroke} />
                </svg>
            );
        case 'shopping-bag':
            return (
                <svg {...props}>
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" {...stroke} fill={color} fillOpacity="0.05" />
                </svg>
            );
        case 'sparkle':
            return (
                <svg {...props}>
                    <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" {...stroke} fill={color} fillOpacity="0.2" />
                </svg>
            );
        default:
            // medal (default)
            return (
                <svg {...props}>
                    <circle cx="12" cy="9" r="6" {...stroke} fill={color} fillOpacity="0.15" />
                    <path d="M8.5 14.5L7 22l5-3 5 3-1.5-7.5" {...stroke} />
                </svg>
            );
    }
}

/** 単一バッジチップ */
export function BadgeChip({ badge, size = 28 }: { badge: BadgeDefinition; size?: number }) {
    return (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors"
                        style={{
                            borderColor: badge.color,
                            color: badge.color,
                            background: `${badge.color}10`,
                        }}
                    >
                        <BadgeIcon icon={badge.icon} color={badge.color} size={size * 0.6} />
                        <span>{badge.name}</span>
                    </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-52 text-center">
                    <p className="font-semibold">{badge.name}</p>
                    <p className="text-xs text-muted-foreground">{badge.description}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

/** バッジ一覧表示（プロフィールの統計下など） */
export function BadgeList({ badges, size = 28 }: { badges: UserBadge[]; size?: number }) {
    if (!badges || badges.length === 0) return null;
    return (
        <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
            {badges.map((ub) => (
                <BadgeChip key={ub.badge.id} badge={ub.badge} size={size} />
            ))}
        </div>
    );
}
