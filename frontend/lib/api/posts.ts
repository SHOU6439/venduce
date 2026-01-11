import { client } from './client';
import { Post } from '@/types/api';

const normalizePost = (post: Post): Post => ({
  ...post,
  assets: post.assets ?? post.images ?? [],
  images: post.images ?? post.assets ?? [],
});

export const postsApi = {
  getPosts: async (cursor?: string): Promise<Post[]> => {
    // 実際の実装ではページネーション対応が必要
    const response = await client.get<Post[]>('/api/posts');
    return response.map(normalizePost);
  },

  getPost: async (id: string): Promise<Post> => {
    const post = await client.get<Post>(`/api/posts/${id}`);
    return normalizePost(post);
  },

  createPost: async (data: { caption: string; asset_ids: string[]; product_ids: string[]; tags?: string[] }) => {
    const created = await client.post<Post>('/api/posts', data);
    return normalizePost(created);
  },

  // 簡易実装: 全投稿からフィルタリング（サーバー実装待ちの場合はこれ）または専用エンドポイント
  getRelatedPosts: async (productId: string): Promise<Post[]> => {
    // 将来的には `/products/${productId}/posts` など
    const allPosts = await client.get<Post[]>('/api/posts');
    return allPosts
      .map(normalizePost)
      .filter((p) => p.products.some((prod) => prod.id === productId))
      .slice(0, 4);
  },
};
