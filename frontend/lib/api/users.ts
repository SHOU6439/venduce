import { client } from './client';
import { UserProfile } from '@/types/api';

export const usersApi = {
  getProfile: async (username?: string): Promise<UserProfile> => {
    if (username) {
      console.warn('Username lookup is not yet supported; falling back to /me');
    }
    return client.get<UserProfile>('/api/users/me');
  },
};
