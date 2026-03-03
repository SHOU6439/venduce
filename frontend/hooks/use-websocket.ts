/**
 * WebSocket イベントストリームのフック。
 *
 * サーバーから push されるイベントを受信し、
 * コンポーネント側で addEventListener / removeEventListener で購読する。
 *
 * 使い方:
 *   const ws = useWebSocket();
 *   useEffect(() => {
 *     const handler = (e: CustomEvent) => { console.log(e.detail); };
 *     ws.addEventListener('ranking_updated', handler);
 *     return () => ws.removeEventListener('ranking_updated', handler);
 *   }, [ws]);
 */

'use client';

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/stores/auth';

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';

/**
 * API のベース URL から WebSocket URL を導出する。
 * http:// → ws://, https:// → wss://
 */
function deriveWsUrl(): string {
    const override = process.env.NEXT_PUBLIC_WS_BASE_URL;
    if (override) return override;

    return API_BASE_URL.replace(/^http/, 'ws');
}

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 15000]; // 指数バックオフ
const PING_INTERVAL = 30_000; // 30 秒ごとに ping

type EventHandler = (event: CustomEvent) => void;

export interface WsEventBus {
    addEventListener(event: string, handler: EventHandler): void;
    removeEventListener(event: string, handler: EventHandler): void;
}

/**
 * アプリ全体で 1 つの WebSocket 接続を共有するフック。
 * 返り値の EventBus に対してイベントを購読できる。
 */
export function useWebSocket(): WsEventBus {
    const accessToken = useAuthStore((s) => s.accessToken);
    const wsRef = useRef<WebSocket | null>(null);
    const busRef = useRef<EventTarget>(new EventTarget());
    const retryCountRef = useRef(0);
    const mountedRef = useRef(true);
    const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const getToken = useCallback((): string | null => {
        // Zustand ストアの値を優先、なければ cookie から
        if (accessToken) return accessToken;
        if (typeof document === 'undefined') return null;
        const cookie = document.cookie
            .split('; ')
            .find((row) => row.startsWith('access_token='))
            ?.split('=')[1];
        return cookie || null;
    }, [accessToken]);

    const connect = useCallback(() => {
        if (!mountedRef.current) return;
        if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) return;

        const token = getToken();
        const base = deriveWsUrl();
        const url = token
            ? `${base}/ws/events?token=${encodeURIComponent(token)}`
            : `${base}/ws/events`;

        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            retryCountRef.current = 0;
            // ping keep-alive
            pingTimerRef.current = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send('ping');
                }
            }, PING_INTERVAL);
        };

        ws.onmessage = (ev) => {
            if (ev.data === 'pong') return;
            try {
                const msg = JSON.parse(ev.data) as { event: string; data: unknown };
                busRef.current.dispatchEvent(
                    new CustomEvent(msg.event, { detail: msg.data }),
                );
            } catch {
                // invalid JSON → ignore
            }
        };

        ws.onclose = () => {
            if (pingTimerRef.current) {
                clearInterval(pingTimerRef.current);
                pingTimerRef.current = null;
            }
            // このインスタンスが現在の wsRef と同じ場合のみリセット/再接続する。
            // cleanup → remount の間に古い ws の onclose が非同期発火しても
            // 新しい接続（wsRef に格納済み）を null 上書きしないようにする。
            if (wsRef.current !== ws) return;
            wsRef.current = null;
            if (!mountedRef.current) return;
            const delay =
                RECONNECT_DELAYS[
                    Math.min(retryCountRef.current, RECONNECT_DELAYS.length - 1)
                ];
            retryCountRef.current++;
            setTimeout(connect, delay);
        };

        ws.onerror = () => {
            // onerror の後に onclose が呼ばれるため、再接続はそちらで処理
        };
    }, [getToken]);

    // 接続の開始・再接続（トークン変更時も再接続）
    useEffect(() => {
        mountedRef.current = true;
        connect();

        return () => {
            mountedRef.current = false;
            if (pingTimerRef.current) {
                clearInterval(pingTimerRef.current);
                pingTimerRef.current = null;
            }
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [connect]);

    // トークンが変わったら再接続
    useEffect(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.close(); // onclose で自動再接続される
        }
    }, [accessToken]);

    // 安定した EventBus インターフェースを返す
    const bus = useMemo<WsEventBus>(
        () => ({
            addEventListener(event: string, handler: EventHandler) {
                busRef.current.addEventListener(event, handler as EventListener);
            },
            removeEventListener(event: string, handler: EventHandler) {
                busRef.current.removeEventListener(event, handler as EventListener);
            },
        }),
        [],
    );

    return bus;
}
