"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/auth";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { Edit2, MoreHorizontal, Reply, Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteComment } from "../api/comments";
import { Comment } from "../types";
import { CommentForm } from "./CommentForm";

interface CommentItemProps {
  comment: Comment;
  postId: string;
  depth?: number;
  onRefresh: () => void;
  isLast?: boolean;
}

export function CommentItem({
  comment,
  postId,
  depth = 0,
  onRefresh,
  isLast = false,
}: CommentItemProps) {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const isOwner = user?.id === comment.user_id;
  const hasReplies = comment.replies && comment.replies.length > 0;

  const handleDelete = async () => {
    if (!window.confirm("本当に削除しますか？")) return;
    try {
      await deleteComment(comment.id);
      toast({ title: "コメントを削除しました" });
      onRefresh();
    } catch (error) {
      toast({
        title: "削除に失敗しました",
        description: "もう一度お試しください",
        variant: "destructive",
      });
    }
  };

  if (isEditing) {
    return (
      <div className="py-2 pl-2 border-l-2 border-primary/20">
        <CommentForm
          postId={postId}
          commentId={comment.id}
          initialContent={comment.content}
          onSuccess={() => {
            setIsEditing(false);
            onRefresh();
          }}
          onCancel={() => setIsEditing(false)}
          autoFocus
        />
      </div>
    );
  }

  return (
    <div className="relative group">
      {depth > 0 && (
        <>
          <div
            className="absolute -left-[2.25rem] top-0 w-[2.25rem] h-[2rem] border-b-[2px] border-l-[2px] border-gray-300 rounded-bl-xl pointer-events-none"
            aria-hidden="true"
          />
          {!isLast && (
            <div
              className="absolute -left-[2.25rem] top-0 bottom-0 w-px border-l-[2px] border-gray-300 pointer-events-none"
              aria-hidden="true"
            />
          )}
        </>
      )}

      <div className="flex gap-3 py-3 relative z-10 w-full bg-background/0">
        <Avatar className="h-8 w-8 mt-1 shrink-0 bg-background z-20">
          <AvatarImage src={comment.user.avatar_url} alt={comment.user.username} />
          <AvatarFallback>{comment.user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{comment.user.username}</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), {
                  addSuffix: true,
                  locale: ja,
                })}
              </span>
            </div>

            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">メニュー</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    編集
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={handleDelete}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    削除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="text-sm whitespace-pre-wrap leading-relaxed break-words">
            {comment.content}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-muted-foreground hover:text-foreground text-xs"
              onClick={() => setIsReplying(!isReplying)}
            >
              <Reply className="mr-1 h-3 w-3" />
              返信
            </Button>
          </div>

          {isReplying && (
            <div className="mt-3 pt-2">
              <CommentForm
                postId={postId}
                parentCommentId={comment.id}
                onSuccess={() => {
                  setIsReplying(false);
                  onRefresh();
                }}
                onCancel={() => setIsReplying(false)}
                autoFocus
                submitLabel="返信を投稿"
              />
            </div>
          )}
        </div>
      </div>

      {hasReplies && (
        <div className="pl-[3.25rem] relative">
          {comment.replies.map((reply, index) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postId={postId}
              depth={depth + 1}
              onRefresh={onRefresh}
              isLast={index === comment.replies.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
