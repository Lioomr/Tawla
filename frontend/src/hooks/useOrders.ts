import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createOrder, getOrder, CreateOrderPayload } from '@/lib/api';
import { useCustomerStore } from '@/store/useCustomerStore';
import { useLobbyStore } from '@/store/useLobbyStore';

export function useCreateOrder() {
  const { sessionToken, guestToken, isValid } = useCustomerStore();
  const addMyOrderId = useLobbyStore((s) => s.addMyOrderId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateOrderPayload) => {
      if (!sessionToken || !isValid()) {
        throw new Error('No valid session');
      }
      // Attach the guest token so the backend can attribute the order; harmless
      // when undefined (solo) and required for honest "your items" labelling.
      return createOrder(sessionToken, payload, guestToken ?? undefined);
    },
    onSuccess: (order) => {
      // Remember this is OUR order — the only order we can truthfully call "yours"
      // in the lobby (the backend order payloads carry no guest attribution).
      addMyOrderId(order.order_id);
      queryClient.invalidateQueries({ queryKey: ['session-orders', sessionToken] });
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
