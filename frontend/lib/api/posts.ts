import { client } from "./client";
import { Post } from "@/types/api";

const normalizePost = (post: Post): Post => ({
  ...post,
  assets: post.assets ?? post.images ?? [],
  images: post.images ?? post.assets ?? [],
});

export interface PaginatedPostsResponse {
  items: Post[];
  meta: {
    next_cursor?: string | null;
    has_more: boolean;
    returned: number;
  };
}

export const postsApi = {
  getPosts: async (cursor?: string): Promise<Post[]> => {
    const response = await client.get<Post[] | { items: Post[] }>("/api/posts");
    const items = Array.isArray(response) ? response : response.items || [];
    return items.map(normalizePost);
  },

  getPostsInfinite: async (
    params: { cursor?: string | null; limit?: number } = {},
  ): Promise<PaginatedPostsResponse> => {
    const searchParams = new URLSearchParams();
    if (params.cursor)
      searchParams.set("cursor", params.cursor);
    if (params.limit) searchParams.set("limit", String(params.limit));

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/api/posts?${queryString}` : "/api/posts";
    const response = await client.get<PaginatedPostsResponse>(endpoint);

    return {
      items: response.items.map(normalizePost),
      meta: response.meta,
    };
  },

  getPost: async (id: string): Promise<Post> => {
    const post = await client.get<Post>(`/api/posts/${id}`);
    return normalizePost(post);
  },

  createPost: async (data: {
    caption: string;
    asset_ids: string[];
    product_ids: string[];
    tags?: string[];
  }) => {
    const created = await client.post<Post>("/api/posts", data);
    return normalizePost(created);
  },

  getRelatedPosts: async (productId: string): Promise<Post[]> => {
    const response = await client.get<Post[] | { items: Post[] }>("/api/posts");
    const allPosts = Array.isArray(response) ? response : response.items || [];

    return allPosts
      .map(normalizePost)
      .filter((p) => p.products?.some((prod) => prod.id === productId))
      .slice(0, 4);
  },
};
