import { client } from './client';
import { Purchase, PaginatedResponseCursor } from '@/types/api';

export const purchasesApi = {
  createPurchase: async (data: {
    product_id: string;
    quantity: number;
    price_cents: number;
    total_amount_cents: number;
    currency?: string;
    payment_method_id: string;
    referring_post_id?: string | null;
  }): Promise<Purchase> => {
    return client.post<Purchase>('/api/purchases', {
      ...data,
      currency: data.currency || 'JPY',
    });
  },

  listUserPurchases: async (
    userId: string,
    options?: {
      cursor?: string | null;
      limit?: number;
    }
  ): Promise<PaginatedResponseCursor<Purchase>> => {
    const params = new URLSearchParams();
    if (options?.cursor) params.set('cursor', options.cursor);
    if (options?.limit) params.set('limit', String(options.limit));

    const queryString = params.toString();
    const endpoint = queryString ? `/api/purchases/${userId}?${queryString}` : `/api/purchases/${userId}`;

    return client.get<PaginatedResponseCursor<Purchase>>(endpoint);
  },

  getPurchase: async (purchaseId: string): Promise<Purchase> => {
    return client.get<Purchase>(`/api/purchases/${purchaseId}`);
  },
};
