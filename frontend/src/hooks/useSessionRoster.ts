import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ApiError, getSessionRoster, SessionRosterResponse } from '@/lib/api';
import { useCustomerStore } from '@/store/useCustomerStore';
import { useLobbyStore } from '@/store/useLobbyStore';
import { classifyRosterError, normalizeRoster } from '@/lib/lobby';

// Fetches the authoritative table roster (GET /table/session/) and hydrates the
// lobby store. Runs when both tokens exist and the session is valid (i.e. on
// menu/lobby load, right after session start), and is refetched on WebSocket
// reconnect / guest events via query invalidation in useOrderWebSocket.
//
// Session/guest errors are mapped to the existing recovery behavior:
//   invalid_session / expired_session -> session-expired page
//   invalid_guest -> clear the guest token and reset lobby (graceful fallback)
export function useSessionRoster() {
  const router = useRouter();
  const sessionToken = useCustomerStore((s) => s.sessionToken);
  const guestToken = useCustomerStore((s) => s.guestToken);
  const isValid = useCustomerStore((s) => s.isValid);
  const setGuestToken = useCustomerStore((s) => s.setGuestToken);

  const query = useQuery<SessionRosterResponse, ApiError>({
    queryKey: ['session-roster', sessionToken, guestToken],
    queryFn: async () => {
      const raw = await getSessionRoster(sessionToken as string, guestToken as string);
      // Validate defensively before it touches the store.
      const normalized = normalizeRoster(raw);
      if (normalized) {
        useLobbyStore.getState().applyRoster(normalized);
      }
      return raw;
    },
    enabled: !!sessionToken && !!guestToken && isValid(),
    staleTime: 10000,
    retry: (failureCount, error) => {
      // Don't retry on auth/validation failures — they need recovery, not retries.
      if (error instanceof ApiError && [400, 401, 403].includes(error.status)) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const error = query.error;
  useEffect(() => {
    if (!(error instanceof ApiError)) return;
    const kind = classifyRosterError(error.code);
    if (kind === 'session_invalid') {
      router.replace('/session-expired');
    } else if (kind === 'guest_invalid') {
      // Stale/invalid guest token: clear it and reset lobby so we stop hitting the
      // error and fall back to a clean state. Session-scoped ordering still works.
      setGuestToken(null);
      useLobbyStore.getState().reset();
    }
  }, [error, router, setGuestToken]);

  return query;
}
