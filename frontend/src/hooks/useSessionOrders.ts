import { useQuery } from '@tanstack/react-query';
import { getSessionOrders, SessionOrdersResponse, ApiError } from '@/lib/api';
import { useCustomerStore } from '@/store/useCustomerStore';

// Read-only list of every order placed in the current table session. Used by the
// lobby cart to show "what the table has ordered" without editing rights. Gated
// by `enabled` so it only runs when the lobby cart is actually open.
export function useSessionOrders(enabled = true) {
  const { sessionToken, isValid } = useCustomerStore();

  return useQuery<SessionOrdersResponse, ApiError>({
    queryKey: ['session-orders', sessionToken],
    queryFn: () => {
      if (!sessionToken || !isValid()) {
        throw new Error('No valid session');
      }
      return getSessionOrders(sessionToken);
    },
    enabled: enabled && !!sessionToken && isValid(),
    staleTime: 15000,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        return false;
      }
      return failureCount < 2;
    },
  });
}
