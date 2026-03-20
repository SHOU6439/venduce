"""全カテゴリのバッジを一括付与するスクリプト。

notified=False で付与するので、フロントエンドでログイン中であれば
WebSocket 経由でリアルタイムにエフェクトが表示される。

既に付与済みの場合は notified を False にリセットし、エフェクトを再表示する。

使い方:
    # Seller バッジ3種のみ
    docker compose exec backend python -m scripts.award_all_badges

    # 全種類のバッジを付与
    docker compose exec backend python -m scripts.award_all_badges --all
"""

import os
import sys
import time
import urllib.request
import json

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.badge import Badge, UserBadge
from app.models.user import User

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://venduce_user:venduce_password@postgres:5432/venduce_db",
)

TARGET_EMAIL = "shian35777@gmail.com"
BADGE_SLUGS_DEFAULT = ["driven-silver", "driven-gold", "driven-platinum"]


def main():
    award_all = "--all" in sys.argv

    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        # ユーザー検索
        user = db.query(User).filter(User.email == TARGET_EMAIL).first()
        if not user:
            print(f"❌ ユーザーが見つかりません: {TARGET_EMAIL}")
            sys.exit(1)
        print(f"✅ ユーザー: {user.username} ({user.id})")

        # バッジ取得
        if award_all:
            badges = db.query(Badge).order_by(Badge.sort_order.asc()).all()
            print(f"📋 全バッジ ({len(badges)} 種) を付与します")
        else:
            badges = db.query(Badge).filter(Badge.slug.in_(BADGE_SLUGS_DEFAULT)).order_by(Badge.sort_order.asc()).all()
            if len(badges) != len(BADGE_SLUGS_DEFAULT):
                found = {b.slug for b in badges}
                missing = set(BADGE_SLUGS_DEFAULT) - found
                print(f"❌ バッジが見つかりません: {missing}")
                sys.exit(1)

        awarded = 0
        reset = 0

        for badge in badges:
            existing = (
                db.query(UserBadge)
                .filter(UserBadge.user_id == user.id, UserBadge.badge_id == badge.id)
                .first()
            )
            if existing:
                existing.notified = False
                reset += 1
                print(f"🔄 {badge.name} ({badge.slug}) - notified を False にリセット")
            else:
                ub = UserBadge(user_id=user.id, badge_id=badge.id, notified=False)
                db.add(ub)
                awarded += 1
                print(f"🎉 {badge.name} ({badge.slug}) を付与しました！")

            # 1件ずつ commit して、WebSocket 通知を発火
            db.commit()

            # FastAPI プロセス内の WebSocket 通知エンドポイントを叩く
            try:
                payload = json.dumps({
                    "user_id": user.id,
                    "badge_slug": badge.slug,
                    "badge_name": badge.name,
                    "badge_icon": badge.icon,
                    "badge_color": badge.color,
                }).encode()
                req = urllib.request.Request(
                    "http://localhost:8000/api/internal/ws-notify-badge",
                    data=payload,
                    headers={"Content-Type": "application/json"},
                    method="POST",
                )
                urllib.request.urlopen(req)
                print(f"   📡 WebSocket 通知送信")
            except Exception as e:
                print(f"   ⚠️  WS通知失敗 (エフェクトは初回フェッチで表示されます): {e}")

            # 次のバッジまで少し待つ（エフェクトが重ならないように）
            time.sleep(1.5)

        print(f"\n✅ 完了: 新規付与 {awarded} 件、リセット {reset} 件")
        print("💡 WebSocket 接続中なら、リアルタイムでエフェクトが表示されます")

    finally:
        db.close()


if __name__ == "__main__":
    main()
