import { client } from './client';
import { Post, CreatePostPayload } from '@/types/api';

const normalizePost = (post: Post): Post => {
  let user = post.user;
  if (user && (user as any).avatar_asset && (user as any).avatar_asset.public_url) {
    user = {
      ...user,
      avatar_url: (user as any).avatar_asset.public_url,
    };
  }
  return {
    ...post,
    user,
    assets: post.assets ?? post.images ?? [],
    images: post.images ?? post.assets ?? [],
  };
};

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

  createPost: async (data: CreatePostPayload) => {
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
