from __future__ import annotations

from typing import List, Optional
from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.badge import Badge, UserBadge
from app.models.post import Post
from app.models.like import Like
from app.models.follow import Follow
from app.models.purchase import Purchase
from app.models.enums import PostStatus, PurchaseStatus, BadgeCategory
from app.core.ws_manager import fire_and_forget_send_to_user


# ------------------------------------------------------------------
# デフォルトバッジ定義
# (slug, name, description, icon, color, threshold, sort_order, category)
# ------------------------------------------------------------------
DEFAULT_BADGES = [
    # --- 購入貢献 (driven_purchases) ---
    ("driven-silver", "Silver Seller", "10人に購入させた実績", "medal", "#C0C0C0", 10, 10, BadgeCategory.DRIVEN_PURCHASES),
    ("driven-gold", "Gold Seller", "50人に購入させた実績", "trophy", "#FFD700", 50, 11, BadgeCategory.DRIVEN_PURCHASES),
    ("driven-platinum", "Platinum Seller", "100人に購入させた実績", "crown", "#E5E4E2", 100, 12, BadgeCategory.DRIVEN_PURCHASES),

    # --- 投稿数 (posts) ---
    ("posts-beginner", "はじめての投稿者", "10件の投稿を達成", "pencil", "#4CAF50", 10, 20, BadgeCategory.POSTS),
    ("posts-active", "アクティブ投稿者", "50件の投稿を達成", "pencil", "#2196F3", 50, 21, BadgeCategory.POSTS),
    ("posts-master", "投稿マスター", "100件の投稿を達成", "pencil", "#9C27B0", 100, 22, BadgeCategory.POSTS),

    # --- いいね獲得 (likes_received) ---
    ("likes-popular", "人気者", "累計50いいね獲得", "heart", "#E91E63", 50, 30, BadgeCategory.LIKES_RECEIVED),
    ("likes-star", "スター", "累計200いいね獲得", "heart", "#FF5722", 200, 31, BadgeCategory.LIKES_RECEIVED),
    ("likes-legend", "レジェンド", "累計1000いいね獲得", "heart", "#F44336", 1000, 32, BadgeCategory.LIKES_RECEIVED),

    # --- フォロワー数 (followers) ---
    ("followers-rising", "ライジングスター", "フォロワー10人達成", "users", "#00BCD4", 10, 40, BadgeCategory.FOLLOWERS),
    ("followers-influencer", "インフルエンサー", "フォロワー100人達成", "users", "#FF9800", 100, 41, BadgeCategory.FOLLOWERS),
    ("followers-celebrity", "セレブリティ", "フォロワー1000人達成", "users", "#FFC107", 1000, 42, BadgeCategory.FOLLOWERS),

    # --- 購入数 (purchases_made) ---
    ("buyer-first", "はじめてのお買い物", "初めての購入を達成", "shopping-bag", "#8BC34A", 1, 50, BadgeCategory.PURCHASES_MADE),
    ("buyer-regular", "リピーター", "10回の購入を達成", "shopping-bag", "#03A9F4", 10, 51, BadgeCategory.PURCHASES_MADE),
    ("buyer-vip", "VIPバイヤー", "50回の購入を達成", "shopping-bag", "#673AB7", 50, 52, BadgeCategory.PURCHASES_MADE),

    # --- 初アクション (first_action) ---
    ("first-post", "デビュー投稿", "初めての投稿", "sparkle", "#4DD0E1", 1, 60, BadgeCategory.FIRST_ACTION),
    ("first-like", "はじめてのいいね", "初めていいねを押した", "sparkle", "#F48FB1", 1, 61, BadgeCategory.FIRST_ACTION),
    ("first-follow", "はじめてのフォロー", "初めてフォローした", "sparkle", "#AED581", 1, 62, BadgeCategory.FIRST_ACTION),
]


class BadgeService:
    """バッジの管理と自動付与を担当するサービス。"""

    def __init__(self, db: Session):
        self.db = db

    # ------------------------------------------------------------------
    # バッジマスター管理
    # ------------------------------------------------------------------

    def ensure_default_badges(self) -> List[Badge]:
        """デフォルトバッジがDBに存在しなければ作成する（冪等）。"""
        existing = {b.slug for b in self.db.query(Badge.slug).all()}
        created: list[Badge] = []
        for slug, name, desc, icon, color, threshold, sort_order, category in DEFAULT_BADGES:
            if slug not in existing:
                badge = Badge(
                    slug=slug,
                    name=name,
                    description=desc,
                    icon=icon,
                    color=color,
                    threshold=threshold,
                    sort_order=sort_order,
                    category=category,
                )
                self.db.add(badge)
                created.append(badge)
        if created:
            self.db.commit()
            for b in created:
                self.db.refresh(b)
        return created

    def get_all_badges(self) -> List[Badge]:
        """全バッジ定義を sort_order 昇順で返す。"""
        return self.db.query(Badge).order_by(Badge.sort_order.asc()).all()

    def get_badge_by_slug(self, slug: str) -> Optional[Badge]:
        return self.db.query(Badge).filter(Badge.slug == slug).first()

    # ------------------------------------------------------------------
    # ユーザーバッジ
    # ------------------------------------------------------------------

    def get_user_badges(self, user_id: str) -> List[UserBadge]:
        """ユーザーが獲得したバッジ一覧を返す。"""
        return (
            self.db.query(UserBadge)
            .filter(UserBadge.user_id == user_id)
            .join(Badge)
            .order_by(Badge.sort_order.asc())
            .all()
        )

    def award_badge(self, user_id: str, badge_id: str) -> Optional[UserBadge]:
        """バッジを付与する。既に持っていれば None を返す。"""
        ub = UserBadge(user_id=user_id, badge_id=badge_id)
        self.db.add(ub)
        try:
            self.db.commit()
            self.db.refresh(ub)
            return ub
        except IntegrityError:
            self.db.rollback()
            return None

    def revoke_badge(self, user_id: str, badge_id: str) -> bool:
        """バッジを剥奪する。削除した場合 True。"""
        ub = (
            self.db.query(UserBadge)
            .filter(UserBadge.user_id == user_id, UserBadge.badge_id == badge_id)
            .first()
        )
        if not ub:
            return False
        self.db.delete(ub)
        self.db.commit()
        return True

    def has_badge(self, user_id: str, badge_slug: str) -> bool:
        """指定 slug のバッジをユーザーが持っているか。"""
        return (
            self.db.query(UserBadge)
            .join(Badge)
            .filter(UserBadge.user_id == user_id, Badge.slug == badge_slug)
            .first()
            is not None
        )

    # ------------------------------------------------------------------
    # メトリクス算出
    # ------------------------------------------------------------------

    def get_user_total_driven_purchases(self, user_id: str) -> int:
        """ユーザーの投稿経由の累計購入数を算出する。"""
        result = (
            self.db.query(Post.purchase_count)
            .filter(
                Post.user_id == user_id,
                Post.deleted_at.is_(None),
                Post.status == PostStatus.PUBLIC,
            )
            .all()
        )
        return sum(r[0] for r in result)

    def get_user_post_count(self, user_id: str) -> int:
        """ユーザーの公開投稿数を算出する。"""
        return (
            self.db.query(func.count())
            .select_from(Post)
            .filter(
                Post.user_id == user_id,
                Post.deleted_at.is_(None),
                Post.status == PostStatus.PUBLIC,
            )
            .scalar() or 0
        )

    def get_user_total_likes_received(self, user_id: str) -> int:
        """ユーザーの投稿が受けた累計いいね数を算出する。"""
        return (
            self.db.query(func.coalesce(func.sum(Post.like_count), 0))
            .filter(
                Post.user_id == user_id,
                Post.deleted_at.is_(None),
                Post.status == PostStatus.PUBLIC,
            )
            .scalar() or 0
        )

    def get_user_follower_count(self, user_id: str) -> int:
        """ユーザーのフォロワー数を算出する。"""
        return (
            self.db.query(func.count())
            .select_from(Follow)
            .filter(Follow.following_id == user_id)
            .scalar() or 0
        )

    def get_user_purchases_made(self, user_id: str) -> int:
        """ユーザーが行った購入数を算出する。"""
        return (
            self.db.query(func.count())
            .select_from(Purchase)
            .filter(
                Purchase.buyer_id == user_id,
                Purchase.status == PurchaseStatus.COMPLETED,
            )
            .scalar() or 0
        )

    def get_user_given_likes_count(self, user_id: str) -> int:
        """ユーザーが押したいいね数を算出する。"""
        return (
            self.db.query(func.count())
            .select_from(Like)
            .filter(Like.user_id == user_id)
            .scalar() or 0
        )

    def get_user_following_count(self, user_id: str) -> int:
        """ユーザーがフォローしている数を算出する。"""
        return (
            self.db.query(func.count())
            .select_from(Follow)
            .filter(Follow.follower_id == user_id)
            .scalar() or 0
        )

    def _get_metric_for_category(self, user_id: str, category: BadgeCategory) -> int:
        """カテゴリに応じたメトリクスを算出する。"""
        if category == BadgeCategory.DRIVEN_PURCHASES:
            return self.get_user_total_driven_purchases(user_id)
        elif category == BadgeCategory.POSTS:
            return self.get_user_post_count(user_id)
        elif category == BadgeCategory.LIKES_RECEIVED:
            return self.get_user_total_likes_received(user_id)
        elif category == BadgeCategory.FOLLOWERS:
            return self.get_user_follower_count(user_id)
        elif category == BadgeCategory.PURCHASES_MADE:
            return self.get_user_purchases_made(user_id)
        elif category == BadgeCategory.FIRST_ACTION:
            # first_action はスラッグ毎に個別判定
            return 0
        return 0

    def _get_first_action_metric(self, user_id: str, badge_slug: str) -> int:
        """初アクション系バッジの達成判定。"""
        if badge_slug == "first-post":
            return self.get_user_post_count(user_id)
        elif badge_slug == "first-like":
            return self.get_user_given_likes_count(user_id)
        elif badge_slug == "first-follow":
            return self.get_user_following_count(user_id)
        return 0

    def evaluate_and_award(
        self,
        user_id: str,
        categories: Optional[List[BadgeCategory]] = None,
    ) -> List[UserBadge]:
        """ユーザーのメトリクスに基づいてバッジを自動付与する。

        categories を指定すると、そのカテゴリのバッジのみ判定する。
        None の場合は全カテゴリを判定する。
        新しく付与されたバッジのリストを返す。
        """
        if categories:
            badges = (
                self.db.query(Badge)
                .filter(Badge.category.in_([c.value for c in categories]))
                .all()
            )
        else:
            badges = self.get_all_badges()

        existing_badge_ids = {
            ub.badge_id
            for ub in self.db.query(UserBadge.badge_id)
            .filter(UserBadge.user_id == user_id)
            .all()
        }

        # カテゴリごとのメトリクスをキャッシュ
        metric_cache: dict[str, int] = {}

        newly_awarded: list[UserBadge] = []
        for badge in badges:
            if badge.id in existing_badge_ids:
                continue

            # メトリクス取得
            cat = badge.category
            if cat == BadgeCategory.FIRST_ACTION.value or cat == BadgeCategory.FIRST_ACTION:
                metric = self._get_first_action_metric(user_id, badge.slug)
            else:
                cat_key = cat if isinstance(cat, str) else cat.value
                if cat_key not in metric_cache:
                    metric_cache[cat_key] = self._get_metric_for_category(
                        user_id,
                        BadgeCategory(cat_key) if isinstance(cat, str) else cat,
                    )
                metric = metric_cache[cat_key]

            if metric >= badge.threshold:
                ub = UserBadge(user_id=user_id, badge_id=badge.id)
                self.db.add(ub)
                newly_awarded.append(ub)

        if newly_awarded:
            self.db.commit()
            for ub in newly_awarded:
                self.db.refresh(ub)
            # WebSocket でバッジ獲得通知を送信
            for ub in newly_awarded:
                badge = ub.badge
                cat = badge.category
                cat_str = cat.value if hasattr(cat, "value") else str(cat)
                fire_and_forget_send_to_user(
                    user_id,
                    "badge_awarded",
                    {
                        "id": badge.id,
                        "slug": badge.slug,
                        "name": badge.name,
                        "description": badge.description,
                        "icon": badge.icon,
                        "color": badge.color,
                        "threshold": badge.threshold,
                        "sort_order": badge.sort_order,
                        "category": cat_str,
                    },
                )

        return newly_awarded

    # ------------------------------------------------------------------
    # 未通知バッジ
    # ------------------------------------------------------------------

    def get_unnotified_badges(self, user_id: str) -> List[UserBadge]:
        """未通知のバッジ一覧を返す。"""
        return (
            self.db.query(UserBadge)
            .filter(UserBadge.user_id == user_id, UserBadge.notified.is_(False))
            .join(Badge)
            .order_by(Badge.sort_order.asc())
            .all()
        )

    def mark_badges_notified(self, user_id: str, badge_ids: List[str]) -> None:
        """指定バッジを通知済みにマークする。"""
        self.db.query(UserBadge).filter(
            UserBadge.user_id == user_id,
            UserBadge.badge_id.in_(badge_ids),
        ).update({"notified": True}, synchronize_session="fetch")
        self.db.commit()
