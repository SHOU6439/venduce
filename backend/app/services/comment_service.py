from sqlalchemy.orm import Session, selectinload, aliased
from sqlalchemy import select, func
from fastapi import HTTPException, status
from typing import List

from app.models.comment import Comment
from app.models.post import Post
from app.schemas.comment import CommentCreate


class CommentService:
    @staticmethod
    def _calculate_depth(db: Session, comment_id: str) -> int:
        """コメントの階層深度を計算する (Root=0)"""
        cte = select(Comment.id, Comment.parent_comment_id).where(Comment.id == comment_id).cte("cte", recursive=True)
        parent = aliased(Comment)
        cte = cte.union_all(
            select(parent.id, parent.parent_comment_id).join(cte, parent.id == cte.c.parent_comment_id)
        )
        count = db.scalar(select(func.count()).select_from(cte))
        return count - 1 if count else 0

    @staticmethod
    def create_comment(
        db: Session, comment_in: CommentCreate, post_id: str, user_id: str
    ) -> Comment:
        post = db.scalar(select(Post).where(Post.id == post_id))
        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Post not found"
            )

        if comment_in.parent_comment_id:
            parent_comment = db.scalar(
                select(Comment).where(Comment.id == comment_in.parent_comment_id)
            )
            if not parent_comment:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Parent comment not found"
                )

            if parent_comment.post_id != post_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Parent comment does not belong to this post"
                )

            MAX_DEPTH = 3
            parent_depth = CommentService._calculate_depth(db, comment_in.parent_comment_id)

            final_parent_id = comment_in.parent_comment_id
            if parent_depth >= MAX_DEPTH:
                final_parent_id = parent_comment.parent_comment_id
        else:
            final_parent_id = None

        new_comment = Comment(
            content=comment_in.content,
            post_id=post_id,
            user_id=user_id,
            parent_comment_id=final_parent_id
        )
        db.add(new_comment)
        db.commit()
        db.refresh(new_comment)

        return new_comment

    @staticmethod
    def get_comments_by_post_id(
        db: Session, post_id: str, limit: int = 20, offset: int = 0
    ) -> List[Comment]:
        post = db.scalar(select(Post).where(Post.id == post_id))
        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Post not found"
            )

        stmt = (
            select(Comment)
            .where(Comment.post_id == post_id)
            .where(Comment.parent_comment_id.is_(None))
            .where(Comment.is_deleted == False)
            .options(
                selectinload(Comment.user),
                selectinload(Comment.replies).selectinload(Comment.user),
                selectinload(Comment.replies).selectinload(Comment.replies).selectinload(Comment.user),
                selectinload(Comment.replies).selectinload(Comment.replies).selectinload(
                    Comment.replies).selectinload(Comment.user)
            )
            .order_by(Comment.created_at.desc())
            .limit(limit)
            .offset(offset)
        )

        return db.scalars(stmt).all()

    @staticmethod
    def _get_comment_or_404(db: Session, comment_id: str) -> Comment:
        comment = db.get(Comment, comment_id)
        if not comment or comment.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found"
            )
        return comment

    @staticmethod
    def update_comment(
        db: Session, comment_id: str, user_id: str, content: str
    ) -> Comment:
        comment = CommentService._get_comment_or_404(db, comment_id)

        if comment.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this comment"
            )

        comment.content = content
        db.commit()
        db.refresh(comment)
        return comment

    @staticmethod
    def delete_comment(db: Session, comment_id: str, user_id: str) -> None:
        comment = CommentService._get_comment_or_404(db, comment_id)

        if comment.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this comment"
            )

        comment.is_deleted = True

        top_q = select(Comment).where(Comment.id == comment_id).cte('cte', recursive=True)
        bottom_q = select(Comment).join(top_q, Comment.parent_comment_id == top_q.c.id)
        recursive_q = top_q.union(bottom_q)

        affected_ids = db.scalars(select(recursive_q.c.id)).all()

        if affected_ids:
            from sqlalchemy import update
            db.execute(
                update(Comment)
                .where(Comment.id.in_(affected_ids))
                .values(is_deleted=True)
            )

        db.commit()
