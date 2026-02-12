export interface User {
  id: string;
  username: string;
  avatar_url?: string;
}

export interface Comment {
  id: string;
  content: string;
  post_id: string;
  user_id: string;
  parent_comment_id: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  user: User;
  replies: Comment[];
}

export interface CommentCreate {
  content: string;
  parent_comment_id?: string;
}

export interface CommentUpdate {
  content: string;
}
