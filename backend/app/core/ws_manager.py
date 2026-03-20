"""
WebSocket 接続マネージャー。

サーバー側から接続クライアントにイベントをプッシュする。
- broadcast: 全接続者へ配信
- send_to_user: 特定ユーザーのみに配信
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """グローバルシングルトンとして利用する WebSocket コネクション管理。"""

    def __init__(self) -> None:
        # user_id -> set of WebSocket connections (同一ユーザーが複数タブで接続可)
        self._connections: dict[str, set[WebSocket]] = {}
        # 認証なし接続 (ランキング等の公開チャンネル用)
        self._anonymous: set[WebSocket] = set()

    # ------------------------------------------------------------------
    # 接続管理
    # ------------------------------------------------------------------

    async def connect(self, ws: WebSocket, user_id: str | None = None) -> None:
        await ws.accept()
        if user_id:
            self._connections.setdefault(user_id, set()).add(ws)
        else:
            self._anonymous.add(ws)
        logger.info("WS connected: user=%s  total=%d", user_id or "anon", self._total())

    def disconnect(self, ws: WebSocket, user_id: str | None = None) -> None:
        if user_id and user_id in self._connections:
            self._connections[user_id].discard(ws)
            if not self._connections[user_id]:
                del self._connections[user_id]
        self._anonymous.discard(ws)
        logger.info("WS disconnected: user=%s  total=%d", user_id or "anon", self._total())

    def _total(self) -> int:
        return sum(len(s) for s in self._connections.values()) + len(self._anonymous)

    # ------------------------------------------------------------------
    # 全クライアントの WebSocket 一覧
    # ------------------------------------------------------------------

    def _all_sockets(self) -> list[WebSocket]:
        sockets: list[WebSocket] = []
        for s in self._connections.values():
            sockets.extend(s)
        sockets.extend(self._anonymous)
        return sockets

    # ------------------------------------------------------------------
    # 送信ヘルパー (同期コンテキストから非同期キューにポスト)
    # ------------------------------------------------------------------

    async def _safe_send(self, ws: WebSocket, data: dict[str, Any]) -> bool:
        """1 コネクションへ安全に送信。失敗時は False を返す。"""
        try:
            await ws.send_json(data)
            return True
        except Exception:
            return False

    async def broadcast(self, event: str, payload: dict[str, Any] | None = None) -> None:
        """全接続者にイベントを配信する。"""
        message = {"event": event, "data": payload or {}}
        dead: list[tuple[str | None, WebSocket]] = []

        for uid, sockets in self._connections.items():
            for ws in sockets:
                if not await self._safe_send(ws, message):
                    dead.append((uid, ws))

        for ws in self._anonymous:
            if not await self._safe_send(ws, message):
                dead.append((None, ws))

        for uid, ws in dead:
            self.disconnect(ws, uid)

    async def send_to_user(
        self, user_id: str, event: str, payload: dict[str, Any] | None = None,
    ) -> None:
        """特定ユーザーの全コネクションにイベントを配信する。"""
        sockets = self._connections.get(user_id, set())
        if not sockets:
            return
        message = {"event": event, "data": payload or {}}
        dead: list[WebSocket] = []
        for ws in sockets:
            if not await self._safe_send(ws, message):
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, user_id)


# グローバルシングルトン
ws_manager = ConnectionManager()

# アプリ起動時に保存するメインイベントループ
# def (同期) エンドポイントのスレッドプールからでも WS 送信できるようにする
_main_loop: asyncio.AbstractEventLoop | None = None


def set_main_loop(loop: asyncio.AbstractEventLoop) -> None:
    """アプリ起動時にメインのイベントループを登録する。"""
    global _main_loop
    _main_loop = loop


def _schedule(coro) -> None:
    """
    async コルーチンを適切なループにスケジュールする共通ヘルパー。

    - 非同期コンテキスト (async def エンドポイント) → loop.create_task()
    - 同期コンテキスト (def エンドポイント / スレッドプール) → run_coroutine_threadsafe()
    - ループ未登録の場合（テスト等）→ 何もしない
    """
    try:
        # async コンテキストからの呼び出し
        loop = asyncio.get_running_loop()
        loop.create_task(coro)
    except RuntimeError:
        # sync スレッドからの呼び出し: 起動時に保存したループ経由でスケジュール
        if _main_loop is not None and _main_loop.is_running():
            asyncio.run_coroutine_threadsafe(coro, _main_loop)
        else:
            coro.close()  # "coroutine was never awaited" 警告を防ぐ


def fire_and_forget_broadcast(event: str, payload: dict[str, Any] | None = None) -> None:
    """
    同期コンテキスト (FastAPI の def エンドポイント等) から
    非同期 broadcast をスケジュールするヘルパー。
    """
    _schedule(ws_manager.broadcast(event, payload))


def fire_and_forget_send_to_user(
    user_id: str, event: str, payload: dict[str, Any] | None = None,
) -> None:
    """同期コンテキストから特定ユーザーへのイベント送信をスケジュール。"""
    _schedule(ws_manager.send_to_user(user_id, event, payload))
