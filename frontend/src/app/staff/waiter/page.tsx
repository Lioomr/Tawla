'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError, getWaiterTables, serveWaiterOrder, recordPayment } from '@/lib/api';
import { useStaffStore } from '@/store/useStaffStore';
import { useWaiterWebSocket } from '@/hooks/useWaiterWebSocket';
import { Loader2, LogOut, CheckCircle, CreditCard, Banknote, Clock, UtensilsCrossed } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function WaiterDashboard() {
  const router = useRouter();
  const { accessToken, profile, isAuthenticated, clearAuth } = useStaffStore();
  const queryClient = useQueryClient();

  const [paymentModalOpen, setPaymentModalOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated() || profile?.role !== 'WAITER') {
      router.replace('/staff/login');
    }
  }, [isAuthenticated, profile, router]);

  // Activate Real-time Waiter Socket
  useWaiterWebSocket();

  const { data, isLoading } = useQuery({
    queryKey: ['waiter', 'tables'],
    queryFn: async () => {
      if (!accessToken) throw new Error('Not authenticated');
      return getWaiterTables(accessToken);
    },
    enabled: !!accessToken && profile?.role === 'WAITER',
    refetchInterval: 15000, 
  });

  const serveMutation = useMutation({
    mutationFn: ({ orderId }: { orderId: string }) => {
      if (!accessToken) throw new Error('Not authenticated');
      return serveWaiterOrder(accessToken, orderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waiter', 'tables'] });
    },
    onError: (err: unknown) => {
      const message = err instanceof ApiError || err instanceof Error ? err.message : 'Unknown error';
      alert(`Error serving order: ${message}`);
    }
  });

  const paymentMutation = useMutation({
    mutationFn: ({ orderId, method }: { orderId: string; method: string }) => {
      if (!accessToken) throw new Error('Not authenticated');
      return recordPayment(accessToken, orderId, method);
    },
    onSuccess: () => {
      setPaymentModalOpen(null);
      queryClient.invalidateQueries({ queryKey: ['waiter', 'tables'] });
    },
    onError: (err: unknown) => {
      const message = err instanceof ApiError || err instanceof Error ? err.message : 'Unknown error';
      alert(`Error recording payment: ${message}`);
      setPaymentModalOpen(null);
    }
  });

  if (!isAuthenticated() || profile?.role !== 'WAITER') return null;

  const handleLogout = () => {
    clearAuth();
    router.replace('/staff/login');
  };

  const handleServe = (orderId: string) => {
    serveMutation.mutate({ orderId });
  };

  const handlePayment = (orderId: string, method: string) => {
    paymentMutation.mutate({ orderId, method });
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 px-6 py-4 flex justify-between items-center sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-zinc-900 p-2 rounded-xl text-white">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900">Waitstaff Dashboard</h1>
            <p className="text-xs font-bold tracking-widest text-emerald-600 uppercase">Live Tables Active</p>
          </div>
        </div>
        
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 rounded-lg text-sm font-bold tracking-tight transition-colors border border-zinc-200 text-zinc-700"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </header>

      {/* Main Board */}
      <main className="p-6 max-w-7xl mx-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-zinc-400" />
          </div>
        ) : !data?.tables || data.tables.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 opacity-60">
            <CheckCircle className="w-20 h-20 mb-4 text-emerald-500" />
            <h2 className="text-2xl font-bold tracking-tight mb-2">All Tables Clean</h2>
            <p className="font-medium tracking-tight text-zinc-500">There are currently no active tables.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.tables.map((tableData) => {
              
              // Payment is tracked separately from order status, so only terminal cancelled orders are removed here.
              const actionableOrders = tableData.orders.filter((o) => o.status !== 'CANCELLED');
              
              if (actionableOrders.length === 0) return null;

              // Check if any order needs serving Action Priority
              const needsServing = actionableOrders.some(o => o.status === 'READY');

              return (
                <div 
                  key={tableData.table} 
                  className={`bg-white rounded-2xl overflow-hidden border-2 shadow-sm transition-colors ${
                    needsServing ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500' : 'border-zinc-200'
                  }`}
                >
                  {/* Table Header */}
                  <div className={`p-4 border-b flex justify-between items-center ${needsServing ? 'bg-emerald-50 border-emerald-100' : 'bg-zinc-50 border-zinc-200'}`}>
                    <div>
                      <h3 className="font-black text-2xl tracking-tight text-zinc-900">{tableData.table}</h3>
                      <p className="text-xs font-bold tracking-widest text-zinc-500 uppercase mt-0.5">
                        {actionableOrders.length} Active {actionableOrders.length === 1 ? 'Order' : 'Orders'}
                      </p>
                    </div>
                    {needsServing && (
                      <span className="px-3 py-1 bg-emerald-500 text-white rounded-full text-xs font-black tracking-widest uppercase animate-pulse">
                        Requires Service
                      </span>
                    )}
                  </div>

                  {/* Orders List */}
                  <div className="p-4 space-y-4">
                    {actionableOrders.map((order) => {
                      const isReady = order.status === 'READY';
                      const isServed = order.status === 'SERVED';
                      // Other states: NEW, PREPARING
                      const isBusy = order.status === 'NEW' || order.status === 'PREPARING';

                      return (
                        <div key={order.order_id} className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="text-xs font-bold tracking-widest text-zinc-400 uppercase mb-1">
                                Order #{order.order_id.split('_')[1].substring(0, 6)}
                              </p>
                              <div className="flex flex-col">
                                <span className={`text-sm font-black tracking-widest uppercase mb-1 ${
                                  isReady ? 'text-emerald-600' :
                                  isServed ? 'text-blue-600' :
                                  'text-amber-500'
                                }`}>
                                  {order.status}
                                </span>
                                <div className="flex items-center text-xs font-semibold text-zinc-500">
                                  <Clock className="w-3.5 h-3.5 mr-1" />
                                  Ordered {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-extrabold text-xl tracking-tight">${order.total_price}</span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="mt-4 pt-4 border-t border-zinc-200 flex gap-2">
                            {isReady && (
                              <button
                                onClick={() => handleServe(order.order_id)}
                                disabled={serveMutation.isPending}
                                className="flex-1 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-black tracking-tight py-3 rounded-lg shadow-sm transition-colors text-sm flex items-center justify-center gap-2"
                              >
                                {serveMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Serve to Table'}
                              </button>
                            )}

                            {isServed && order.payment_status === 'PAID' && (
                              <div className="flex-1 bg-emerald-50 text-emerald-600 font-black tracking-tight py-3 rounded-lg text-center text-sm border-2 border-emerald-200 flex items-center justify-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                Payment Collected
                              </div>
                            )}

                            {isServed && order.payment_status !== 'PAID' && (
                              <button
                                onClick={() => setPaymentModalOpen(order.order_id)}
                                className="flex-1 bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-950 text-white font-black tracking-tight py-3 rounded-lg shadow-sm transition-colors text-sm flex items-center justify-center gap-2"
                              >
                                Collect Payment
                              </button>
                            )}

                            {isBusy && (
                              <div className="flex-1 bg-zinc-100 text-zinc-400 font-bold tracking-tight py-3 rounded-lg text-center text-sm border border-zinc-200">
                                Kitchen Preparing...
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Payment Modal */}
      <AnimatePresence>
        {paymentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-6 rounded-3xl shadow-2xl max-w-sm w-full border border-zinc-100"
            >
              <h3 className="text-2xl font-black tracking-tight mb-2 text-zinc-900">Record Payment</h3>
              <p className="font-medium text-zinc-500 mb-6">Select how the customer paid for this order.</p>
              
              <div className="space-y-3">
                <button
                  onClick={() => handlePayment(paymentModalOpen, 'CASH')}
                  disabled={paymentMutation.isPending}
                  className="w-full relative flex items-center p-4 bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-500 rounded-xl transition-colors active:scale-[0.98]"
                >
                  <Banknote className="w-8 h-8 text-emerald-600 mr-4" />
                  <span className="font-black text-xl text-emerald-900 tracking-tight">Cash</span>
                </button>
                
                <button
                  onClick={() => handlePayment(paymentModalOpen, 'ONLINE')}
                  disabled={paymentMutation.isPending}
                  className="w-full relative flex items-center p-4 bg-blue-50 hover:bg-blue-100 border-2 border-blue-500 rounded-xl transition-colors active:scale-[0.98]"
                >
                  <CreditCard className="w-8 h-8 text-blue-600 mr-4" />
                  <span className="font-black text-xl text-blue-900 tracking-tight">Card / Online</span>
                </button>
              </div>

              <button
                onClick={() => setPaymentModalOpen(null)}
                disabled={paymentMutation.isPending}
                className="w-full mt-6 py-3 font-bold tracking-tight text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
