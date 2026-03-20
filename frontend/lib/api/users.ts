import { client } from './client';
import { UserProfile, UserPostStats, UserRankingItem, RankingResponse, PublicUserProfile, Post, Purchase, PaginatedResponseCursor } from '@/types/api';

interface PaginatedPosts {
  items: Post[];
  meta: { next_cursor?: string | null; has_more: boolean; returned: number };
}

interface PaginatedPurchases {
  items: Purchase[];
  meta: { next_cursor?: string | null; has_more: boolean; returned: number };
}

export const usersApi = {
  getProfile: async (username?: string): Promise<UserProfile> => {
    if (username) {
      console.warn('Username lookup is not yet supported; falling back to /me');
    }
    const profile = await client.get<UserProfile>('/api/users/me');
    // avatar_asset.public_url → avatar_url へ正規化
    if (!profile.avatar_url && profile.avatar_asset?.public_url) {
      profile.avatar_url = profile.avatar_asset.public_url;
    }
    return profile;
  },
  updateProfile: async (data: Partial<UserProfile>): Promise<UserProfile> => {
    return client.patch<UserProfile>('/api/users/me', data);
  },
  getMyStats: async (): Promise<UserPostStats> => {
    return client.get<UserPostStats>('/api/users/me/stats');
  },
  getUserRanking: async (limit = 10, offset = 0): Promise<RankingResponse> => {
    return client.get<RankingResponse>(`/api/users/ranking?limit=${limit}&offset=${offset}`);
  },
  getUserByUsername: async (username: string): Promise<PublicUserProfile> => {
    return client.get<PublicUserProfile>(`/api/users/${encodeURIComponent(username)}`);
  },
  getUserStats: async (username: string): Promise<UserPostStats> => {
    return client.get<UserPostStats>(`/api/users/${encodeURIComponent(username)}/stats`);
  },
  getUserPosts: async (username: string, cursor?: string): Promise<PaginatedPosts> => {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    params.set('limit', '30');
    return client.get<PaginatedPosts>(
      `/api/users/${encodeURIComponent(username)}/posts?${params.toString()}`
    );
  },
  getUserLikedPosts: async (username: string, cursor?: string): Promise<PaginatedPosts> => {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    params.set('limit', '30');
    return client.get<PaginatedPosts>(
      `/api/users/${encodeURIComponent(username)}/likes?${params.toString()}`
    );
  },
  getUserPurchases: async (username: string, cursor?: string): Promise<PaginatedPurchases> => {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    params.set('limit', '20');
    return client.get<PaginatedPurchases>(
      `/api/users/${encodeURIComponent(username)}/purchases?${params.toString()}`
    );
  },
  updateSettings: async (data: { is_purchase_history_public?: boolean }): Promise<UserProfile> => {
    return client.patch<UserProfile>('/api/users/me', data);
  },
  searchUsers: async (query: string, limit = 20): Promise<PublicUserProfile[]> => {
    const params = new URLSearchParams({ q: query, limit: limit.toString() });
    return client.get<PublicUserProfile[]>(`/api/users/search?${params.toString()}`);
  },
};
