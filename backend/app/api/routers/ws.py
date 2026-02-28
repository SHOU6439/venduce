"""
WebSocket エンドポイント。

/ws/events?token=<JWT> で接続。
- 認証済みユーザー: ランキング更新 + バッジ通知を受信
- 未認証: ランキング更新のみ受信
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Optional
from app.core.ws_manager import ws_manager
from app.utils import jwt as jwt_utils

router = APIRouter()


def _authenticate(token: str | None) -> str | None:
    """JWT トークンからユーザー ID を抽出。失敗時は None。"""
    if not token:
        return None
    try:
        payload = jwt_utils.decode_token(token)
        user_id = payload.get("sub")
        if payload.get("typ") != "access":
            return None
        return user_id
    except Exception:
        return None


@router.websocket("/ws/events")
async def websocket_events(
    ws: WebSocket,
    token: Optional[str] = Query(default=None),
):
    """
    WebSocket イベントストリーム。

    クライアントは接続後、サーバーからのイベントを受信する（送信は不要）。
    イベント形式:
        {"event": "<event_name>", "data": {...}}

    イベント一覧:
        - ranking_updated: ランキングに影響するアクションが発生
        - badge_awarded:   バッジが付与された (認証ユーザーのみ)
    """
    user_id = _authenticate(token)
    await ws_manager.connect(ws, user_id)

    try:
        # クライアントからのメッセージは基本的に無視するが、
        # コネクション維持のために受信ループは必要
        while True:
            # ping/pong はuvicornが自動処理。
            # クライアントが明示的に送ってくるメッセージは読み捨て
            data = await ws.receive_text()
            # "ping" メッセージには "pong" を返す (アプリレベルのkeep-alive)
            if data == "ping":
                try:
                    await ws.send_text("pong")
                except Exception:
                    break
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        ws_manager.disconnect(ws, user_id)
