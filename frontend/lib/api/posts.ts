import { client } from './client';
import { Post } from '@/types/api';

const normalizePost = (post: Post): Post => ({
  ...post,
  assets: post.assets ?? post.images ?? [],
  images: post.images ?? post.assets ?? [],
});

export const postsApi = {
  getPosts: async (cursor?: string): Promise<Post[]> => {
    const response = await client.get<Post[] | { items: Post[] }>('/api/posts');
    const items = Array.isArray(response) ? response : response.items || [];
    return items.map(normalizePost);
  },

  getPost: async (id: string): Promise<Post> => {
    const post = await client.get<Post>(`/api/posts/${id}`);
    return normalizePost(post);
  },

  createPost: async (data: { caption: string; asset_ids: string[]; product_ids: string[]; tags?: string[] }) => {
    const created = await client.post<Post>('/api/posts', data);
    return normalizePost(created);
  },

  getRelatedPosts: async (productId: string): Promise<Post[]> => {
    const response = await client.get<Post[] | { items: Post[] }>('/api/posts');
    const allPosts = Array.isArray(response) ? response : response.items || [];

    return allPosts
      .map(normalizePost)
      .filter((p) => p.products?.some((prod) => prod.id === productId))
      .slice(0, 4);
  },
};
