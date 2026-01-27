import { client } from './client';
import { Asset } from '@/types/api';

export const uploadsApi = {
  uploadImage: async (file: File, purpose: 'post_image' | 'avatar' = 'post_image'): Promise<Asset> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('purpose', purpose);

    return client.post<Asset>('/api/uploads', formData);
  },
};
