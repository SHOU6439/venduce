'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useWebSocket, type WsEventBus } from '@/hooks/use-websocket';

const WsContext = createContext<WsEventBus | null>(null);

/**
 * アプリ全体で WebSocket 接続を 1 つ共有するプロバイダー。
 * layout.tsx の最上位に配置する。
 */
export function WebSocketProvider({ children }: { children: ReactNode }) {
    const bus = useWebSocket();
    return <WsContext.Provider value={bus}>{children}</WsContext.Provider>;
}

/**
 * WebSocket イベントバスを取得するフック。
 * WebSocketProvider の配下でのみ使用可能。
 */
export function useWsEvents(): WsEventBus {
    const ctx = useContext(WsContext);
    if (!ctx) {
        throw new Error('useWsEvents must be used within <WebSocketProvider>');
    }
    return ctx;
}
