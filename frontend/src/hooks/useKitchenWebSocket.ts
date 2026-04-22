import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useStaffStore } from '@/store/useStaffStore';
import { API_BASE_URL } from '@/lib/api';

export function useKitchenWebSocket() {
  const profile = useStaffStore((state) => state.profile);
  const accessToken = useStaffStore((state) => state.accessToken);
  const isAuthenticated = useStaffStore((state) => state.isAuthenticated);
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!accessToken || !isAuthenticated() || profile?.role !== 'KITCHEN') return;

    const urlObj = new URL(API_BASE_URL);
    const wsProtocol = urlObj.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${urlObj.host}/ws/kitchen/?access_token=${encodeURIComponent(accessToken)}`;

    let isSubscribed = true;

    const connect = () => {
      if (!isSubscribed) return;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'order_created' || data.type === 'order_updated') {
            // Invalidate the kitchen orders list to refetch the fresh state
            // This is the safest way to ensure items/notes are completely accurate when newly created
            queryClient.invalidateQueries({ queryKey: ['kitchen', 'orders'] });
          }
        } catch (e) {
          console.error('Kitchen WebSocket parsing error:', e);
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
