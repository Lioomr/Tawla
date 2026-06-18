import { useQuery } from '@tanstack/react-query';
import { getTableRequests } from '@/lib/api';
import { useCustomerStore } from '@/store/useCustomerStore';
import type { SessionTableRequestsResponse } from '@/lib/tableRequests';

// Stable query key so useOrderWebSocket (reconnect / resolved events) and the
// create mutation can invalidate or patch the same cache entry.
export function tableRequestsQueryKey(sessionToken: string | null) {
  return ['table-requests', sessionToken] as const;
}

// Hydrates the customer's own table requests for the current session so the
// menu can restore button states across a refresh. The payload is validated in
// getTableRequests; this hook only owns fetch lifecycle. Refreshes are driven by
// query invalidation (socket reconnect / resolved events / new request).
export function useTableRequests() {
  const sessionToken = useCustomerStore((s) => s.sessionToken);
  const isValid = useCustomerStore((s) => s.isValid);

  return useQuery<SessionTableRequestsResponse>({
    queryKey: tableRequestsQueryKey(sessionToken),
    queryFn: () => getTableRequests(sessionToken as string),
    enabled: !!sessionToken && isValid(),
    staleTime: 30000,
  });
}
