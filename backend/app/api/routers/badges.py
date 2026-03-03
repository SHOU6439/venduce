from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.models.user import User
from app.deps import get_current_user, get_current_user_optional, get_badge_service
from app.services.badge_service import BadgeService
from app.schemas.badge import BadgeRead, UserBadgeRead, NewBadgeNotification


router = APIRouter(prefix="/api/badges", tags=["badges"])


def _badge_to_read(b) -> BadgeRead:
    """Badge モデルを BadgeRead に変換するヘルパー。"""
    cat = b.category
    cat_str = cat.value if hasattr(cat, "value") else str(cat)
    return BadgeRead(
        id=b.id, slug=b.slug, name=b.name, description=b.description,
        icon=b.icon, color=b.color, threshold=b.threshold,
        sort_order=b.sort_order, category=cat_str,
    )


def _userbadge_to_read(ub) -> UserBadgeRead:
    """UserBadge モデルを UserBadgeRead に変換するヘルパー。"""
    return UserBadgeRead(badge=_badge_to_read(ub.badge), awarded_at=ub.created_at)


# ------------------------------------------------------------------
# エンドポイント
# ------------------------------------------------------------------

@router.post("/seed", response_model=List[BadgeRead])
def seed_default_badges(
    badge_service: BadgeService = Depends(get_badge_service),
) -> List[BadgeRead]:
    """デフォルトバッジ定義を初期化する（冪等、何度呼んでも安全）。"""
    badge_service.ensure_default_badges()
    all_badges = badge_service.get_all_badges()
    return [_badge_to_read(b) for b in all_badges]


@router.get("/definitions", response_model=List[BadgeRead])
def list_badge_definitions(
    badge_service: BadgeService = Depends(get_badge_service),
) -> List[BadgeRead]:
    """全バッジ定義一覧を返す。"""
    badges = badge_service.get_all_badges()
    return [_badge_to_read(b) for b in badges]


@router.get("/users/{user_id}", response_model=List[UserBadgeRead])
def get_user_badges(
    user_id: str,
    badge_service: BadgeService = Depends(get_badge_service),
) -> List[UserBadgeRead]:
    """指定ユーザーが獲得済みのバッジ一覧を返す（認証不要）。"""
    user_badges = badge_service.get_user_badges(user_id)
    return [_userbadge_to_read(ub) for ub in user_badges]


@router.get("/me", response_model=List[UserBadgeRead])
def get_my_badges(
    current_user: User = Depends(get_current_user),
    badge_service: BadgeService = Depends(get_badge_service),
) -> List[UserBadgeRead]:
    """自分が獲得済みのバッジ一覧を返す。"""
    user_badges = badge_service.get_user_badges(current_user.id)
    return [_userbadge_to_read(ub) for ub in user_badges]


@router.get("/me/notifications", response_model=NewBadgeNotification)
def get_badge_notifications(
    current_user: User = Depends(get_current_user),
    badge_service: BadgeService = Depends(get_badge_service),
) -> NewBadgeNotification:
    """未通知のバッジ一覧を返す。取得後に通知済みにマークする。"""
    unnotified = badge_service.get_unnotified_badges(current_user.id)
    badges = [_badge_to_read(ub.badge) for ub in unnotified]
    if unnotified:
        badge_service.mark_badges_notified(
            current_user.id, [ub.badge_id for ub in unnotified],
        )
    return NewBadgeNotification(badges=badges)


@router.post("/me/evaluate", response_model=List[UserBadgeRead])
def evaluate_my_badges(
    current_user: User = Depends(get_current_user),
    badge_service: BadgeService = Depends(get_badge_service),
) -> List[UserBadgeRead]:
    """手動でバッジ判定を実行する（デバッグ・テスト用）。"""
    badge_service.ensure_default_badges()
    newly = badge_service.evaluate_and_award(current_user.id)
    return [_userbadge_to_read(ub) for ub in newly]
