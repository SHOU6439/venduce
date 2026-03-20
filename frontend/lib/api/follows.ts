import { client } from './client';
import { FollowStatus, FollowUserItem, PaginatedResponseCursor, Post } from '@/types/api';

export const followsApi = {
    followUser: async (userId: string): Promise<{ detail: string }> => {
        return client.post<{ detail: string }>(`/api/follows/${userId}`, {});
    },

    unfollowUser: async (userId: string): Promise<{ detail: string }> => {
        return client.delete<{ detail: string }>(`/api/follows/${userId}`);
    },

    getFollowStatus: async (userId: string): Promise<FollowStatus> => {
        return client.get<FollowStatus>(`/api/follows/${userId}/status`);
    },

    getFollowers: async (
        userId: string,
        cursor?: string,
        limit = 20,
    ): Promise<PaginatedResponseCursor<FollowUserItem>> => {
        const params = new URLSearchParams();
        if (cursor) params.set('cursor', cursor);
        params.set('limit', limit.toString());
        return client.get<PaginatedResponseCursor<FollowUserItem>>(
            `/api/follows/${userId}/followers?${params.toString()}`,
        );
    },

    getFollowing: async (
        userId: string,
        cursor?: string,
        limit = 20,
    ): Promise<PaginatedResponseCursor<FollowUserItem>> => {
        const params = new URLSearchParams();
        if (cursor) params.set('cursor', cursor);
        params.set('limit', limit.toString());
        return client.get<PaginatedResponseCursor<FollowUserItem>>(
            `/api/follows/${userId}/following?${params.toString()}`,
        );
    },

    getFollowFeed: async (
        cursor?: string,
        limit = 20,
    ): Promise<PaginatedResponseCursor<Post>> => {
        const params = new URLSearchParams();
        if (cursor) params.set('cursor', cursor);
        params.set('limit', limit.toString());
        return client.get<PaginatedResponseCursor<Post>>(
            `/api/follows/feed/timeline?${params.toString()}`,
        );
    },
};
