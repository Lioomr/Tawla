import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCustomerStore } from '@/store/useCustomerStore';
import { useLobbyStore } from '@/store/useLobbyStore';
import { API_BASE_URL, OrderDetailsResponse } from '@/lib/api';
import type { GuestEventPayload } from '@/lib/lobby';
import { tableRequestsQueryKey } from '@/hooks/useTableRequests';
import {
  markTableRequestResolved,
  normalizeTableRequestResolvedEvent,
  type SessionTableRequestsResponse,
} from '@/lib/tableRequests';

// Single customer-session socket. Carries both order events (NEW/PREPARING/…)
// and shared-table guest events (guest_joined / guest_updated) on the same
// channel. REST is the source of truth; this applies small live deltas and
// triggers a refetch of the table-orders list. Mounted on both the menu page
// (so a solo device can flip into lobby live) and the order-status page.
export function useOrderWebSocket() {
  const sessionToken = useCustomerStore((state) => state.sessionToken);
  const isValid = useCustomerStore((state) => state.isValid);
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!sessionToken || !isValid()) return;

    const urlObj = new URL(API_BASE_URL);
    const wsProtocol = urlObj.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${urlObj.host}/ws/orders/?session_token=${sessionToken}`;

    let isSubscribed = true;

    const connect = () => {
      if (!isSubscribed) return;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // Resync after (re)connect: realtime may have missed events while down.
        queryClient.invalidateQueries({ queryKey: ['session-orders', sessionToken] });
        queryClient.invalidateQueries({ queryKey: ['session-roster', sessionToken] });
        queryClient.invalidateQueries({ queryKey: tableRequestsQueryKey(sessionToken) });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'guest_joined' || data.type === 'guest_updated') {
            if (typeof data.guest_token === 'string' && typeof data.mode === 'string') {
              useLobbyStore.getState().applyGuestEvent(data as GuestEventPayload);
              // Reconcile against the authoritative roster (full guest list).
              queryClient.invalidateQueries({ queryKey: ['session-roster', sessionToken] });
            }
            return;
          }

          if (data.type === 'table_request_resolved') {
            const resolved = normalizeTableRequestResolvedEvent(data);
            if (resolved) {
              // Optimistically flip the matching request, then resync from REST
              // so the menu reflects the resolution even if the cache was empty.
              queryClient.setQueryData<SessionTableRequestsResponse>(
                tableRequestsQueryKey(sessionToken),
                (old) => markTableRequestResolved(old, resolved.request_token),
              );
              queryClient.invalidateQueries({ queryKey: tableRequestsQueryKey(sessionToken) });
            }
            return;
          }

          // { type: "order_updated" | "order_created", order_id, status }
          if ((data.type === 'order_updated' || data.type === 'order_created') && data.order_id && data.status) {
            queryClient.setQueryData<OrderDetailsResponse>(['order', data.order_id], (oldData) => {
              if (!oldData) return oldData;
              return {
                ...oldData,
                status: data.status,
              };
            });
            // Keep the lobby "table orders" list fresh as the table orders.
            queryClient.invalidateQueries({ queryKey: ['session-orders', sessionToken] });
          }
        } catch (e) {
          console.error('WebSocket parsing error:', e);
        }
      };

      ws.onclose = () => {
        if (isSubscribed) {
          // Auto-reconnect delay
          setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      isSubscribed = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [sessionToken, isValid, queryClient]);
}
