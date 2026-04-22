import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCustomerStore } from '@/store/useCustomerStore';
import { API_BASE_URL, OrderDetailsResponse } from '@/lib/api';

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

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Based on POSTMAN_REALTIME_GUIDE.md: { type: "order_updated", order_id: "ord_xxx", status: "READY" }
          if ((data.type === 'order_updated' || data.type === 'order_created') && data.order_id && data.status) {
            queryClient.setQueryData<OrderDetailsResponse>(['order', data.order_id], (oldData) => {
              if (!oldData) return oldData;
              return {
                ...oldData,
                status: data.status,
              };
            });
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
