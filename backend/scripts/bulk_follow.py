"""ダミーユーザー一括フォロースクリプト。

mode=followers : ダミーユーザー N 人がターゲットをフォローする（デフォルト）
mode=following : ターゲットがダミーユーザー N 人をフォローする

使い方:
    # ダミー100人がターゲットをフォロー（フォロワー増加）
    docker compose exec backend python -m scripts.bulk_follow

    # ターゲットがダミー100人をフォロー（フォロー中増加）
    docker compose exec backend python -m scripts.bulk_follow --mode following
"""

import os
import sys
import argparse

from sqlalchemy import create_engine, update
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError
from ulid import ULID

from app.models.user import User
from app.models.follow import Follow
from app.core.security import hash_password

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://venduce_user:venduce_password@postgres:5432/venduce_db",
)

engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(bind=engine)

DUMMY_PASSWORD = "password123"
DUMMY_USER_PREFIX = "bulk_follower_"


def get_or_create_dummy_user(db, index: int) -> User:
    """ダミーユーザーを取得または作成する（is_active=True で作成）。"""
    username = f"{DUMMY_USER_PREFIX}{index:03d}"
    email = f"{DUMMY_USER_PREFIX}{index:03d}@example.com"

    user = db.query(User).filter(User.username == username).first()
    if user:
        # 既存ユーザーが is_active=False の場合は有効化する
        if not user.is_active:
            user.is_active = True
            db.flush()
        return user

    user = User(
        id=str(ULID()),
        email=email,
        username=username,
        first_name="Follower",
        last_name=f"{index:03d}",
        password_hash=hash_password(DUMMY_PASSWORD),
        is_active=True,
        is_confirmed=True,
    )
    db.add(user)
    db.flush()
    return user


def bulk_follow(target_email: str, count: int, mode: str) -> None:
    db = SessionLocal()
    try:
        # ターゲットユーザーを検索
        target = db.query(User).filter(User.email == target_email).first()
        if not target:
            print(f"[ERROR] メールアドレス '{target_email}' のユーザーが見つかりません。")
            sys.exit(1)

        if mode == "followers":
            print(f"[INFO] モード: ダミーユーザー {count} 人が @{target.username} をフォロー")
        else:
            print(f"[INFO] モード: @{target.username} がダミーユーザー {count} 人をフォロー")

        skipped = 0
        followed = 0

        for i in range(1, count + 1):
            try:
                dummy = get_or_create_dummy_user(db, i)

                if dummy.id == target.id:
                    skipped += 1
                    continue

                if mode == "followers":
                    follower_id = dummy.id
                    following_id = target.id
                else:
                    follower_id = target.id
                    following_id = dummy.id

                exists = (
                    db.query(Follow)
                    .filter(
                        Follow.follower_id == follower_id,
                        Follow.following_id == following_id,
                    )
                    .first()
                )
                if exists:
                    skipped += 1
                    continue

                follow = Follow(
                    id=str(ULID()),
                    follower_id=follower_id,
                    following_id=following_id,
                )
                db.add(follow)
                db.flush()
                followed += 1

                if i % 10 == 0:
                    print(f"  ... {i}/{count} 処理済み")

            except IntegrityError:
                db.rollback()
                skipped += 1
                continue

        db.commit()
        print(f"\n[完了]")
        print(f"  フォロー追加 : {followed} 件")
        print(f"  スキップ     : {skipped} 件（既存または自己フォロー）")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ダミーユーザー一括フォロースクリプト")
    parser.add_argument(
        "--target",
        default="shian35777@gmail.com",
        help="対象ユーザーのメールアドレス",
    )
    parser.add_argument(
        "--count",
        type=int,
        default=100,
        help="ダミーユーザーの数（デフォルト: 100）",
    )
    parser.add_argument(
        "--mode",
        choices=["followers", "following"],
        default="followers",
        help="followers: ダミーがターゲットをフォロー / following: ターゲットがダミーをフォロー",
    )
    args = parser.parse_args()

    bulk_follow(args.target, args.count, args.mode)
