import { useMutation, useQuery } from '@tanstack/react-query';
import { createOrder, getOrder, CreateOrderPayload } from '@/lib/api';
import { useCustomerStore } from '@/store/useCustomerStore';

export function useCreateOrder() {
  const { sessionToken, isValid } = useCustomerStore();

  return useMutation({
    mutationFn: async (payload: CreateOrderPayload) => {
      if (!sessionToken || !isValid()) {
        throw new Error('No valid session');
      }
      return createOrder(sessionToken, payload);
    },
  });
}

export function useOrderQuery(orderId: string) {
  const { sessionToken, isValid } = useCustomerStore();

  return useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      if (!sessionToken || !isValid() || !orderId) {
        throw new Error('No valid session or order ID');
      }
      return getOrder(sessionToken, orderId);
    },
    enabled: !!sessionToken && isValid() && !!orderId,
    staleTime: 30000, 
  });
}
