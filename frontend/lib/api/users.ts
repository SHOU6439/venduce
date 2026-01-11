import { client } from './client';
import { UserProfile } from '@/types/api';

export const usersApi = {
  getProfile: async (username?: string): Promise<UserProfile> => {
    if (username) {
      // バックエンド未対応のため、自分自身のプロフィールのみ取得可能
      console.warn('Username lookup is not yet supported; falling back to /me');
    }
    return client.get<UserProfile>('/api/users/me');
  },
  // プロフィール更新など必要に応じて追加
};
