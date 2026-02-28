"""Silver Seller バッジを指定ユーザーに付与するスクリプト。

使い方:
    docker compose exec backend python -m scripts.award_silver_badge
"""

import os
import sys

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.badge import Badge, UserBadge
from app.models.user import User

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://venduce_user:venduce_password@postgres:5432/venduce_db",
)

TARGET_EMAIL = "shian35777@gmail.com"
BADGE_SLUG = "driven-silver"


def main():
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

        # バッジ検索
        badge = db.query(Badge).filter(Badge.slug == BADGE_SLUG).first()
        if not badge:
            print(f"❌ バッジが見つかりません: {BADGE_SLUG}")
            sys.exit(1)
        print(f"✅ バッジ: {badge.name} ({badge.slug})")

        # 既存チェック
        existing = (
            db.query(UserBadge)
            .filter(UserBadge.user_id == user.id, UserBadge.badge_id == badge.id)
            .first()
        )
        if existing:
            print(f"⚠️  既に付与済み（notified={existing.notified}）")
            # notified を False にリセット（エフェクト再表示用）
            existing.notified = False
            db.commit()
            print("🔄 notified を False にリセットしました（エフェクト再表示）")
            return

        # 付与（notified=False で作成 → フロントでエフェクト表示される）
        ub = UserBadge(user_id=user.id, badge_id=badge.id, notified=False)
        db.add(ub)
        db.commit()
        print(f"🎉 {badge.name} を {user.username} に付与しました！")

    finally:
        db.close()


if __name__ == "__main__":
    main()
