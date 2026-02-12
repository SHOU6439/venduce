"use client";

import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/auth";
import { Loader2, MessageSquare } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getComments } from "../api/comments";
import { Comment } from "../types";
import { CommentForm } from "./CommentForm";
import { CommentItem } from "./CommentItem";

interface CommentListProps {
  postId: string;
}

export function CommentList({ postId }: CommentListProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { isAuthenticated } = useAuthStore();

  const fetchComments = useCallback(async () => {
    try {
      const data = await getComments(postId);
      setComments(data);
    } catch (error) {
      toast({
        title: "コメントの取得に失敗しました",
        description: "時間を置いて再度お試しください",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [postId, toast]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 text-xl font-semibold">
        <MessageSquare className="h-5 w-5" />
        <h2>コメント</h2>
      </div>

      {isAuthenticated ? (
        <div className="bg-muted/30 p-4 rounded-lg">
          <CommentForm postId={postId} onSuccess={fetchComments} />
        </div>
      ) : (
        <div className="bg-muted/50 p-6 rounded-lg text-center text-muted-foreground text-sm">
          コメントを投稿するにはログインが必要です
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              まだコメントはありません。最初のコメントを投稿しましょう！
            </div>
          ) : (
            comments.map((comment, index) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                postId={postId}
                onRefresh={fetchComments}
                isLast={index === comments.length - 1}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
