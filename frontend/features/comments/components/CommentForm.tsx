"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { createComment, updateComment } from "../api/comments";

const commentSchema = z.object({
  content: z
    .string()
    .min(1, "コメントを入力してください")
    .max(1000, "コメントは1000文字以内で入力してください"),
});

type CommentFormValues = z.infer<typeof commentSchema>;

interface CommentFormProps {
  postId: string;
  parentCommentId?: string;
  commentId?: string;
  initialContent?: string;
  autoFocus?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
  submitLabel?: string;
}

export function CommentForm({
  postId,
  parentCommentId,
  commentId,
  initialContent = "",
  autoFocus = false,
  onSuccess,
  onCancel,
  submitLabel,
}: CommentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      content: initialContent,
    },
  });

  const onSubmit = async (values: CommentFormValues) => {
    setIsSubmitting(true);
    try {
      if (commentId) {
        await updateComment(commentId, { content: values.content });
        toast({ title: "コメントを更新しました" });
      } else {
        await createComment(postId, {
          content: values.content,
          parent_comment_id: parentCommentId,
        });
        toast({ title: "コメントを投稿しました" });
        form.reset();
      }
      onSuccess?.();
    } catch (error) {
      toast({
        title: "エラーが発生しました",
        description: "コメントの送信に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  placeholder={
                    parentCommentId ? "返信を入力..." : "コメントを入力..."
                  }
                  className="resize-none min-h-[100px]"
                  autoFocus={autoFocus}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              キャンセル
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel || (commentId ? "更新する" : "投稿する")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
