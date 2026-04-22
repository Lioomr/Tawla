'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getKitchenOrders, updateOrderStatus } from '@/lib/api';
import { useStaffStore } from '@/store/useStaffStore';
import { useKitchenWebSocket } from '@/hooks/useKitchenWebSocket';
import { Loader2, Clock, ChefHat, LogOut } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function KitchenDashboard() {
  const router = useRouter();
  const { accessToken, profile, isAuthenticated, clearAuth } = useStaffStore();
  const queryClient = useQueryClient();

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

  const updateMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) => {
      if (!accessToken) throw new Error('Not authenticated');
      return updateOrderStatus(accessToken, orderId, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen', 'orders'] });
    }
  });

  if (!isAuthenticated() || profile?.role !== 'KITCHEN') return null;

  const handleLogout = () => {
    clearAuth();
    router.replace('/staff/login');
  };

  // Filter out completed orders
  const activeOrders = data?.orders.filter(
    (o) => o.status === 'NEW' || o.status === 'PREPARING' || o.status === 'READY'
  ) || [];

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
        ) : activeOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 opacity-50">
            <ChefHat className="w-24 h-24 mb-6" />
            <h2 className="text-2xl font-bold tracking-tight mb-2">No Active Orders</h2>
            <p className="font-medium tracking-tight">The kitchen is clear. Waiting for new orders to arrive.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
            {activeOrders.map((order) => {
              const timeAgo = formatDistanceToNow(new Date(order.created_at), { addSuffix: true });
              
              // Status Color Logic
              const isNew = order.status === 'NEW';
              const isPreparing = order.status === 'PREPARING';
              
              return (
                <div 
                  key={order.order_id} 
                  className={`bg-zinc-900 rounded-2xl overflow-hidden border ${isNew ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'border-zinc-800'} flex flex-col`}
                >
                  {/* Order Header */}
                  <div className={`p-4 border-b ${isNew ? 'bg-amber-500/10 border-amber-500/20' : 'bg-zinc-800/50 border-zinc-800'} flex justify-between items-center`}>
                    <div>
                      <h3 className="font-extrabold text-lg tracking-tight">{order.table}</h3>
                      <p className="text-xs font-bold tracking-widest text-zinc-400 uppercase mt-0.5 max-w-[120px] truncate">
                        ID: {order.order_id.split('_')[1] || order.order_id}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className={`text-xs font-black tracking-widest uppercase px-2 py-1 rounded-md ${
                        isNew ? 'bg-amber-500 text-zinc-950' : 
                        isPreparing ? 'bg-blue-500 text-white' : 
                        'bg-emerald-500 text-zinc-950'
                      }`}>
                        {order.status}
                      </span>
                      <div className="flex items-center text-xs font-medium text-zinc-400 mt-1">
                        <Clock className="w-3 h-3 mr-1" />
                        {timeAgo}
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="p-4 flex-1 space-y-4">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex gap-4 p-3 bg-zinc-800/30 rounded-xl border border-zinc-800/50">
                        <div className="flex-shrink-0 w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center font-black text-lg border border-zinc-700">
                          {item.quantity}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold tracking-tight text-lg leading-tight mb-1">{item.name}</p>
                          {item.notes && (
                            <p className="text-sm font-medium tracking-tight text-amber-400/90 leading-snug">
                              Note: {item.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action Bar */}
                  <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
                    {isNew ? (
                      <button
                        onClick={() => updateMutation.mutate({ orderId: order.order_id, status: 'PREPARING' })}
                        disabled={updateMutation.isPending}
                        className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-black tracking-tight py-4 rounded-xl transition-colors text-lg"
                      >
                        Start Preparing
                      </button>
                    ) : isPreparing ? (
                      <button
                        onClick={() => updateMutation.mutate({ orderId: order.order_id, status: 'READY' })}
                        disabled={updateMutation.isPending}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:opacity-50 text-zinc-950 font-black tracking-tight py-4 rounded-xl transition-colors text-lg"
                      >
                        Mark as Ready
                      </button>
                    ) : (
                      <div className="w-full bg-zinc-800 text-zinc-500 font-black tracking-tight py-4 rounded-xl text-center text-lg">
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
