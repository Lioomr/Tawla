'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getKitchenOrders, updateOrderStatus } from '@/lib/api';
import { useStaffStore } from '@/store/useStaffStore';
import { useKitchenWebSocket } from '@/hooks/useKitchenWebSocket';
import { Loader2, Clock, ChefHat, LogOut } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  groupKitchenOrdersByTable,
  type KitchenGroupedOrder,
  type KitchenTableStatus,
} from '@/lib/lobby';

// Compact, public order reference — the public_token tail, never an internal id.
function orderRef(orderId: string): string {
  const tail = orderId.includes('_') ? orderId.split('_').slice(1).join('_') : orderId;
  return `#${tail.slice(0, 6).toUpperCase()}`;
}

// Per-status presentation for the table card (most-urgent-wins status).
const TABLE_STATUS_STYLE: Record<
  KitchenTableStatus,
  { card: string; header: string; badge: string }
> = {
  NEW: {
    card: 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]',
    header: 'bg-amber-500/10 border-amber-500/20',
    badge: 'bg-amber-500 text-zinc-950',
  },
  PREPARING: {
    card: 'border-blue-500/40',
    header: 'bg-blue-500/10 border-blue-500/20',
    badge: 'bg-blue-500 text-white',
  },
  READY: {
    card: 'border-emerald-500/40',
    header: 'bg-emerald-500/10 border-emerald-500/20',
    badge: 'bg-emerald-500 text-zinc-950',
  },
};

// Per-order status pill shown inside a guest group, so the kitchen can see which
// items are at which stage even when a table card mixes statuses.
const ORDER_STATUS_PILL: Record<string, string> = {
  NEW: 'bg-amber-500/20 text-amber-300',
  PREPARING: 'bg-blue-500/20 text-blue-300',
  READY: 'bg-emerald-500/20 text-emerald-300',
};

export default function KitchenDashboard() {
  const router = useRouter();
  const { accessToken, profile, isAuthenticated, clearAuth } = useStaffStore();
  const queryClient = useQueryClient();

  // Which table's batch action is currently running (drives per-card spinner).
  const [busyTable, setBusyTable] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated() || profile?.role !== 'KITCHEN') {
      router.replace('/staff/login');
    }
  }, [isAuthenticated, profile, router]);

  // Activate Real-time Kitchen Socket
  useKitchenWebSocket();

  const { data, isLoading } = useQuery({
    queryKey: ['kitchen', 'orders'],
    queryFn: async () => {
      if (!accessToken) throw new Error('Not authenticated');
      return getKitchenOrders(accessToken);
    },
    enabled: !!accessToken && profile?.role === 'KITCHEN',
    refetchInterval: 10000, // Backup polling just in case WS drops
  });

  // Advance a batch of orders to a target status using the existing per-order
  // PATCH (no batch endpoint on the backend). Tolerates partial failure: every
  // call settles, and the count of failures is reported back to the caller.
  const batchMutation = useMutation({
    mutationFn: async ({ orderIds, status }: { table: string; orderIds: string[]; status: string }) => {
      if (!accessToken) throw new Error('Not authenticated');
      const results = await Promise.allSettled(
        orderIds.map((id) => updateOrderStatus(accessToken, id, status)),
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      return { total: orderIds.length, failed };
    },
    onSuccess: ({ total, failed }) => {
      if (failed > 0) {
        alert(
          `${total - failed} of ${total} order(s) updated. ${failed} failed — they were left unchanged. Please retry.`,
        );
      }
    },
    onSettled: () => {
      setBusyTable(null);
      // Preserve realtime behavior: refetch the board after any change.
      queryClient.invalidateQueries({ queryKey: ['kitchen', 'orders'] });
    },
  });

  const tableGroups = useMemo(
    () => groupKitchenOrdersByTable(data?.orders ?? []),
    [data?.orders],
  );

  if (!isAuthenticated() || profile?.role !== 'KITCHEN') return null;

  const handleLogout = () => {
    clearAuth();
    router.replace('/staff/login');
  };

  const runBatch = (table: string, orderIds: string[], status: string) => {
    if (orderIds.length === 0 || batchMutation.isPending) return;
    setBusyTable(table);
    batchMutation.mutate({ table, orderIds, status });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-zinc-800">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-zinc-800 p-2 rounded-xl border border-zinc-700">
            <ChefHat className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Kitchen Display System</h1>
            <p className="text-xs font-bold tracking-widest text-emerald-400 uppercase">Live Updates Active</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 rounded-lg text-sm font-bold tracking-tight transition-colors border border-zinc-700"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </header>

      {/* Main Board */}
      <main className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-zinc-500" />
          </div>
        ) : tableGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 opacity-50">
            <ChefHat className="w-24 h-24 mb-6" />
            <h2 className="text-2xl font-bold tracking-tight mb-2">No Active Orders</h2>
            <p className="font-medium tracking-tight">The kitchen is clear. Waiting for new orders to arrive.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
            {tableGroups.map((group) => {
              const style = TABLE_STATUS_STYLE[group.status];
              const timeAgo = group.earliestCreatedAt
                ? formatDistanceToNow(new Date(group.earliestCreatedAt), { addSuffix: true })
                : null;
              const isBusy = busyTable === group.table && batchMutation.isPending;

              return (
                <div
                  key={group.table}
                  className={`bg-zinc-900 rounded-2xl overflow-hidden border ${style.card} flex flex-col max-h-[520px]`}
                >
                  {/* Table Header */}
                  <div className={`p-4 border-b ${style.header} flex justify-between items-start gap-3 shrink-0`}>
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-lg tracking-tight truncate">{group.table}</h3>
                      <p className="text-xs font-bold tracking-widest text-zinc-400 uppercase mt-0.5">
                        {group.orderCount} {group.orderCount === 1 ? 'order' : 'orders'} · {group.itemCount}{' '}
                        {group.itemCount === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end shrink-0">
                      <span
                        className={`text-xs font-black tracking-widest uppercase px-2 py-1 rounded-md ${style.badge}`}
                      >
                        {group.status}
                      </span>
                      {timeAgo && (
                        <div className="flex items-center text-xs font-medium text-zinc-400 mt-1">
                          <Clock className="w-3 h-3 mr-1" />
                          {timeAgo}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Orders — scroll inside the card when there are many items */}
                  <div className="p-3 flex-1 space-y-2.5 overflow-y-auto">
                    {group.orders.map((order) => (
                      <div
                        key={order.order_id}
                        className="rounded-xl border border-zinc-800/70 bg-zinc-800/20 p-3"
                      >
                        <KitchenOrderItems order={order} />
                      </div>
                    ))}
                  </div>

                  {/* Action Bar — acts on every order in the relevant stage */}
                  <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 shrink-0">
                    {group.status === 'NEW' ? (
                      <button
                        onClick={() => runBatch(group.table, group.newOrderIds, 'PREPARING')}
                        disabled={isBusy}
                        className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-black tracking-tight py-3.5 rounded-xl transition-colors text-base flex items-center justify-center gap-2"
                      >
                        {isBusy ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>Start Preparing ({group.newOrderIds.length})</>
                        )}
                      </button>
                    ) : group.status === 'PREPARING' ? (
                      <button
                        onClick={() => runBatch(group.table, group.preparingOrderIds, 'READY')}
                        disabled={isBusy}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:opacity-50 text-zinc-950 font-black tracking-tight py-3.5 rounded-xl transition-colors text-base flex items-center justify-center gap-2"
                      >
                        {isBusy ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>Mark Ready ({group.preparingOrderIds.length})</>
                        )}
                      </button>
                    ) : (
                      <div className="w-full bg-zinc-800 text-zinc-500 font-black tracking-tight py-3.5 rounded-xl text-center text-base">
                        Waiting for Waiter
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

// Items for a single order inside a guest group, prefixed with a compact,
// public order reference + that order's own status.
function KitchenOrderItems({ order }: { order: KitchenGroupedOrder }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[10px] font-bold tracking-wider text-zinc-500 font-mono">
          {orderRef(order.order_id)}
        </span>
        <span
          className={`text-[10px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded ${
            ORDER_STATUS_PILL[order.status] ?? 'bg-zinc-700 text-zinc-300'
          }`}
        >
          {order.status}
        </span>
      </div>
      <div className="space-y-1.5">
        {order.items.map((item, idx) => (
          <div key={idx} className="flex gap-2.5 items-start">
            <div className="flex-shrink-0 w-6 h-6 bg-zinc-800 rounded-md flex items-center justify-center font-black text-sm border border-zinc-700">
              {item.quantity}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold tracking-tight leading-tight">{item.name}</p>
              {item.notes && (
                <p className="text-xs font-medium tracking-tight text-amber-400/90 leading-snug">
                  Note: {item.notes}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
