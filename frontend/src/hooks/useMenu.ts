import { useQuery } from '@tanstack/react-query';
import { fetchMenu, MenuResponse, ApiError } from '@/lib/api';
import { useCustomerStore } from '@/store/useCustomerStore';

export function useMenu() {
  const { sessionToken, isValid } = useCustomerStore();

  return useQuery<MenuResponse, ApiError>({
    queryKey: ['menu', sessionToken],
    queryFn: () => {
      if (!sessionToken || !isValid()) {
        throw new Error('No valid session');
      }
      return fetchMenu(sessionToken);
    },
    enabled: !!sessionToken && isValid(),
    staleTime: 5 * 60 * 1000, // Cache menu for 5 minutes
    retry: (failureCount, error) => {
      // Do not retry on auth/session errors
      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        return false;
      }
      return failureCount < 3;
    },
  });
}
