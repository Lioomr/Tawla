import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useStaffStore } from '@/store/useStaffStore';
import { API_BASE_URL } from '@/lib/api';
import { normalizeTableRequestCreatedEvent } from '@/lib/tableRequests';

export function useWaiterWebSocket() {
  const profile = useStaffStore((state) => state.profile);
  const accessToken = useStaffStore((state) => state.accessToken);
  const isAuthenticated = useStaffStore((state) => state.isAuthenticated);
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!accessToken || !isAuthenticated() || profile?.role !== 'WAITER') return;

    const urlObj = new URL(API_BASE_URL);
    const wsProtocol = urlObj.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${urlObj.host}/ws/waiter/?access_token=${encodeURIComponent(accessToken)}`;

    let isSubscribed = true;

    const connect = () => {
      if (!isSubscribed) return;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        queryClient.invalidateQueries({ queryKey: ['waiter', 'tables'] });
        queryClient.invalidateQueries({ queryKey: ['waiter', 'requests'] });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'order_created' || data.type === 'order_updated') {
            // Refetch Waiter Tables if any order happens to change
            queryClient.invalidateQueries({ queryKey: ['waiter', 'tables'] });
            return;
          }

          if (data.type === 'table_request_created' && normalizeTableRequestCreatedEvent(data)) {
            queryClient.invalidateQueries({ queryKey: ['waiter', 'requests'] });
          }
        } catch (e) {
          console.error('Waiter WebSocket parsing error:', e);
        }
      };

      ws.onclose = () => {
        if (isSubscribed) {
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
  }, [accessToken, isAuthenticated, profile, queryClient]);
}
