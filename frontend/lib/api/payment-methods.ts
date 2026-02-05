import { client } from './client';
import { PaymentMethod } from '@/types/api';

export const paymentMethodsApi = {
  listPaymentMethods: async (): Promise<PaymentMethod[]> => {
    return client.get<PaymentMethod[]>('/api/payment-methods');
  },

  getPaymentMethod: async (paymentMethodId: string): Promise<PaymentMethod> => {
    return client.get<PaymentMethod>(`/api/payment-methods/${paymentMethodId}`);
  },

  createPaymentMethod: async (data: {
    payment_type: string;
    name: string;
    is_default?: boolean;
    details?: Record<string, unknown>;
  }): Promise<PaymentMethod> => {
    return client.post<PaymentMethod>('/api/payment-methods', data);
  },

  updatePaymentMethod: async (
    paymentMethodId: string,
    data: {
      name?: string;
      is_default?: boolean;
    }
  ): Promise<PaymentMethod> => {
    return client.patch<PaymentMethod>(`/api/payment-methods/${paymentMethodId}`, data);
  },

  deletePaymentMethod: async (paymentMethodId: string): Promise<void> => {
    await client.delete(`/api/payment-methods/${paymentMethodId}`);
  },
};
