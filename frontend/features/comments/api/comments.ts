import { client } from "@/lib/api/client";
import { Comment, CommentCreate, CommentUpdate } from "../types";

export const getComments = async (postId: string) => {
  return client.get<Comment[]>(`/api/posts/${postId}/comments`);
};

export const createComment = async (postId: string, data: CommentCreate) => {
  return client.post<Comment>(`/api/posts/${postId}/comments`, data);
};

export const updateComment = async (commentId: string, data: CommentUpdate) => {
  return client.patch<Comment>(`/api/comments/${commentId}`, data);
};

export const deleteComment = async (commentId: string) => {
  return client.delete<void>(`/api/comments/${commentId}`);
};
