"""ランキングのリアルタイム更新テストスクリプト

3つのランキング（ユーザー、売れてる商品、いいねが多い商品）が
WebSocket 経由でリアルタイムに滑らかに更新されることを確認するスクリプト。

手順:
    1. ブラウザでホームページ (http://localhost) を開く
    2. スクリプトを実行する
    3. ランキングがアニメーション付きで自動更新されるのを確認する

使い方:
    docker compose exec backend python -m scripts.test_ranking_realtime
"""

import os
import sys
import time
import json
import urllib.request

from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker

from app.models.post import Post
from app.models.product import Product
from app.models.post_products import PostProduct
from app.models.user import User

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://venduce_user:venduce_password@postgres:5432/venduce_db",
)

WS_NOTIFY_URL = "http://localhost:8000/api/internal/ws-notify-ranking"

# 小刻みに変動させることでアニメーションが見やすくなる
INTERVAL = 2.5       # 各ステップ間のインターバル（秒）
BOOST_PER_STEP = 20  # 1ステップあたりの加算量
NUM_STEPS = 8        # 上昇ステップ数


def notify_ranking():
    """FastAPI プロセスに ranking_updated ブロードキャストを依頼する"""
    try:
        req = urllib.request.Request(
            WS_NOTIFY_URL,
            data=b"{}",
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        urllib.request.urlopen(req)
    except Exception as e:
        print(f"   ⚠️  WS通知失敗: {e}")


def main():
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        print("=" * 60)
        print("🧪 ランキング リアルタイム更新テスト（滑らかアニメ版）")
        print("=" * 60)
        print()

        # ──────────────────────────────────────────────
        # テスト対象を選定: いいね数・購入数が少ない投稿を見つけ、
        # 段階的にブーストしてランキングを駆け上がらせる
        # ──────────────────────────────────────────────
        print("📋 準備: テスト対象を選定中...")

        # いいね数が少ない投稿（商品紐付きあり）
        like_target = (
            db.query(Post)
            .join(PostProduct, PostProduct.post_id == Post.id)
            .filter(Post.deleted_at.is_(None), Post.status == "public")
            .order_by(Post.like_count.asc())
            .first()
        )
        if not like_target:
            print("❌ 商品紐付きのある投稿が見つかりません")
            sys.exit(1)

        like_owner = db.query(User).filter(User.id == like_target.user_id).first()

        like_product_id = (
            db.query(PostProduct.product_id)
            .filter(PostProduct.post_id == like_target.id)
            .first()
        )
        like_product = db.query(Product).filter(Product.id == like_product_id[0]).first()

        # 購入数が少ない投稿（商品紐付きあり）
        purchase_target = (
            db.query(Post)
            .join(PostProduct, PostProduct.post_id == Post.id)
            .filter(Post.deleted_at.is_(None), Post.status == "public")
            .order_by(Post.purchase_count.asc())
            .first()
        )

        purchase_product_id = (
            db.query(PostProduct.product_id)
            .filter(PostProduct.post_id == purchase_target.id)
            .first()
        )
        purchase_product = db.query(Product).filter(Product.id == purchase_product_id[0]).first()

        # 元の値を保存
        orig_likes = like_target.like_count
        orig_purchases = purchase_target.purchase_count

        print(f"🎯 いいねブースト対象: {like_product.title}")
        print(f"   投稿者: {like_owner.username} (現在 like_count={orig_likes})")
        print(f"🎯 購入ブースト対象: {purchase_product.title}")
        print(f"   (現在 purchase_count={orig_purchases})")
        print()
        print(f"📊 設定: {BOOST_PER_STEP}/ステップ × {NUM_STEPS}回 = 合計 +{BOOST_PER_STEP * NUM_STEPS}")
        print(f"   間隔: {INTERVAL}秒")
        print()
        print("⏳ 3秒後に開始... ブラウザでホームページを確認してください!")
        time.sleep(3)

        # ──────────────────────────────────────────────
        # フェーズ 1: 段階的にいいね数をブースト → ユーザーランキング & いいね商品が徐々に上昇
        # ──────────────────────────────────────────────
        print()
        print(f"{'━' * 60}")
        print("📈 フェーズ 1: いいね数を段階的にブースト")
        print(f"{'━' * 60}")

        for i in range(1, NUM_STEPS + 1):
            like_target.like_count += BOOST_PER_STEP
            db.commit()
            notify_ranking()
            bar = "█" * i + "░" * (NUM_STEPS - i)
            print(f"   [{bar}] ステップ {i}/{NUM_STEPS}  like_count → {like_target.like_count}")
            time.sleep(INTERVAL)

        print(f"   ✅ いいね数: {orig_likes} → {like_target.like_count} (+{like_target.like_count - orig_likes})")
        print()

        # ──────────────────────────────────────────────
        # フェーズ 2: 段階的に購入数をブースト → 売れてる商品が徐々に上昇
        # ──────────────────────────────────────────────
        print(f"{'━' * 60}")
        print("📈 フェーズ 2: 購入数を段階的にブースト")
        print(f"{'━' * 60}")

        for i in range(1, NUM_STEPS + 1):
            purchase_target.purchase_count += BOOST_PER_STEP
            db.commit()
            notify_ranking()
            bar = "█" * i + "░" * (NUM_STEPS - i)
            print(f"   [{bar}] ステップ {i}/{NUM_STEPS}  purchase_count → {purchase_target.purchase_count}")
            time.sleep(INTERVAL)

        print(f"   ✅ 購入数: {orig_purchases} → {purchase_target.purchase_count} (+{purchase_target.purchase_count - orig_purchases})")
        print()

        # ──────────────────────────────────────────────
        # フェーズ 3: 段階的に元に戻す → ランキングが徐々に降下
        # ──────────────────────────────────────────────
        print(f"{'━' * 60}")
        print("📉 フェーズ 3: クリーンアップ — 段階的に元の値に復元")
        print(f"{'━' * 60}")

        current_likes = like_target.like_count
        current_purchases = purchase_target.purchase_count
        like_step = (current_likes - orig_likes) // NUM_STEPS
        purchase_step = (current_purchases - orig_purchases) // NUM_STEPS

        for i in range(1, NUM_STEPS + 1):
            if i == NUM_STEPS:
                # 最後のステップで確実に元の値に戻す
                like_target.like_count = orig_likes
                purchase_target.purchase_count = orig_purchases
            else:
                like_target.like_count -= like_step
                purchase_target.purchase_count -= purchase_step
            db.commit()
            notify_ranking()
            bar = "█" * i + "░" * (NUM_STEPS - i)
            print(f"   [{bar}] ステップ {i}/{NUM_STEPS}  likes={like_target.like_count} purchases={purchase_target.purchase_count}")
            time.sleep(INTERVAL)

        print(f"   ✅ いいね数: → {like_target.like_count} (復元)")
        print(f"   ✅ 購入数: → {purchase_target.purchase_count} (復元)")

        print()
        print("=" * 60)
        print("✅ テスト完了！ データは元の状態に復元されました")
        print("=" * 60)
        print()
        print("確認ポイント:")
        print("  1. カードが滑らかにスライドして入れ替わったか")
        print("  2. 数値がアニメーション付きで更新されたか")
        print("  3. 復元時に元の順番に滑らかに戻ったか")

    except Exception as e:
        print(f"\n❌ エラー: {e}")
        db.rollback()
        try:
            like_target.like_count = orig_likes
            purchase_target.purchase_count = orig_purchases
            db.commit()
            notify_ranking()
            print("🔄 データを復元しました")
        except Exception:
            db.rollback()
            print("⚠️  クリーンアップ失敗 — 手動で確認してください")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
