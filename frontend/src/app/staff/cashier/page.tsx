'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ApiError,
  getCashierTables,
  getCashierTableOrder,
  recordPayment,
  type CashierTableStatus,
  type CashierTableSummary,
} from '@/lib/api';
import { useStaffStore } from '@/store/useStaffStore';
import { useCashierWebSocket } from '@/hooks/useCashierWebSocket';
import {
  Loader2,
  LogOut,
  CircleDollarSign,
  Banknote,
  CheckCircle2,
  X,
  AlertTriangle,
  Receipt,
  Coffee,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ──────────────────────────────────────────────
// Status presentation map — table-state first.
// ──────────────────────────────────────────────
const STATUS_CONFIG: Record<
  CashierTableStatus,
  { label: string; dot: string; chip: string; card: string }
> = {
  EMPTY: {
    label: 'Empty',
    dot: 'bg-zinc-300',
    chip: 'bg-zinc-100 text-zinc-500',
    card: 'border-zinc-200 bg-white hover:border-zinc-300',
  },
  ORDERING: {
    label: 'Ordering',
    dot: 'bg-amber-400',
    chip: 'bg-amber-100 text-amber-700',
    card: 'border-amber-200 bg-amber-50/60 hover:border-amber-300',
  },
  PREPARING: {
    label: 'Preparing',
    dot: 'bg-blue-500',
    chip: 'bg-blue-100 text-blue-700',
    card: 'border-blue-200 bg-blue-50/60 hover:border-blue-300',
  },
  SERVED: {
    label: 'Served',
    dot: 'bg-emerald-500',
    chip: 'bg-emerald-100 text-emerald-700',
    card: 'border-emerald-300 bg-emerald-50/60 hover:border-emerald-400',
  },
};

function shortToken(token: string | null): string {
  if (!token) return '—';
  const tail = token.includes('_') ? token.split('_').slice(1).join('_') : token;
  return `#${tail.slice(0, 6).toUpperCase()}`;
}

function isPayable(table: Pick<CashierTableSummary, 'status' | 'payment_status' | 'order_id'>): boolean {
  return table.status === 'SERVED' && table.payment_status === 'PENDING' && !!table.order_id;
}

export default function CashierDashboard() {
  const router = useRouter();
  const { accessToken, profile, isAuthenticated, clearAuth } = useStaffStore();
  const queryClient = useQueryClient();

  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [paidToken, setPaidToken] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated() || profile?.role !== 'CASHIER') {
      router.replace('/staff/login');
    }
  }, [isAuthenticated, profile, router]);

  // Live updates: refetch the grid (and open detail) on order events.
  useCashierWebSocket();

  const {
    data: tables,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['cashier', 'tables'],
    queryFn: async () => {
      if (!accessToken) throw new Error('Not authenticated');
      return getCashierTables(accessToken);
    },
    enabled: !!accessToken && profile?.role === 'CASHIER',
    refetchInterval: 15000, // Backup polling in case the socket drops.
  });

  const detailQuery = useQuery({
    queryKey: ['cashier', 'table', selectedToken],
    queryFn: async () => {
      if (!accessToken || !selectedToken) throw new Error('Not authenticated');
      return getCashierTableOrder(accessToken, selectedToken);
    },
    enabled: !!accessToken && !!selectedToken && profile?.role === 'CASHIER',
  });

  const paymentMutation = useMutation({
    mutationFn: ({ orderId }: { orderId: string }) => {
      if (!accessToken) throw new Error('Not authenticated');
      return recordPayment(accessToken, orderId, 'CASH');
    },
    onSuccess: () => {
      setPaidToken(selectedToken);
      queryClient.invalidateQueries({ queryKey: ['cashier', 'tables'] });
      queryClient.invalidateQueries({ queryKey: ['cashier', 'table', selectedToken] });
    },
    onError: (err: unknown) => {
      const message = err instanceof ApiError || err instanceof Error ? err.message : 'Unknown error';
      alert(`Could not record payment: ${message}`);
    },
  });

  if (!isAuthenticated() || profile?.role !== 'CASHIER') return null;

  const handleLogout = () => {
    clearAuth();
    router.replace('/staff/login');
  };

  const closePanel = () => {
    setSelectedToken(null);
    setPaidToken(null);
  };

  const selectTable = (token: string) => {
    setPaidToken(null);
    setSelectedToken(token);
  };

  const unauthorized = isError && error instanceof ApiError && (error.status === 401 || error.status === 403);

  // Quick counter of tables that need payment collection.
  const payableCount = (tables ?? []).filter(isPayable).length;

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-950 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 px-6 py-4 flex justify-between items-center sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-zinc-900 p-2 rounded-xl text-white">
            <CircleDollarSign className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900">Cashier Station</h1>
            <p className="text-xs font-bold tracking-widest text-emerald-600 uppercase">
              {payableCount > 0 ? `${payableCount} Awaiting Payment` : 'Live Tables Active'}
            </p>
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

      {/* Body */}
      <div className="flex">
        {/* Table Grid */}
        <main className="flex-1 p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-32">
              <Loader2 className="w-10 h-10 animate-spin text-zinc-400" />
            </div>
          ) : unauthorized ? (
            <div className="flex flex-col items-center justify-center py-28 text-center">
              <AlertTriangle className="w-16 h-16 mb-4 text-amber-500" />
              <h2 className="text-2xl font-bold tracking-tight mb-2">Session Expired</h2>
              <p className="font-medium tracking-tight text-zinc-500 mb-6">
                Your access has expired. Please sign in again.
              </p>
              <button
                onClick={handleLogout}
                className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-bold tracking-tight rounded-xl transition-colors"
              >
                Back to Login
              </button>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-28 text-center">
              <AlertTriangle className="w-16 h-16 mb-4 text-red-500" />
              <h2 className="text-2xl font-bold tracking-tight mb-2">Could Not Load Tables</h2>
              <p className="font-medium tracking-tight text-zinc-500 mb-6">
                {error instanceof Error ? error.message : 'Something went wrong.'}
              </p>
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['cashier', 'tables'] })}
                className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-bold tracking-tight rounded-xl transition-colors"
              >
                Retry
              </button>
            </div>
          ) : !tables || tables.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 opacity-60 text-center">
              <Coffee className="w-20 h-20 mb-4 text-zinc-400" />
              <h2 className="text-2xl font-bold tracking-tight mb-2">No Tables Yet</h2>
              <p className="font-medium tracking-tight text-zinc-500">
                Tables created by your admin will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {tables.map((table) => {
                const cfg = STATUS_CONFIG[table.status];
                const payable = isPayable(table);
                const isSelected = selectedToken === table.table_token;
                return (
                  <button
                    key={table.table_token}
                    onClick={() => selectTable(table.table_token)}
                    className={`relative text-left rounded-2xl border-2 p-4 min-h-[140px] flex flex-col justify-between transition-all active:scale-[0.98] ${cfg.card} ${
                      isSelected ? 'ring-2 ring-zinc-900 ring-offset-2 ring-offset-zinc-100' : ''
                    } ${payable ? 'shadow-[0_0_18px_rgba(16,185,129,0.18)]' : 'shadow-sm'}`}
                  >
                    <div className="flex items-start justify-between">
                      <h3 className="font-black text-xl tracking-tight text-zinc-900">{table.table_name}</h3>
                      <span className={`w-3 h-3 rounded-full mt-1.5 ${cfg.dot} ${payable ? 'animate-pulse' : ''}`} />
                    </div>

                    <div>
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-black tracking-widest uppercase ${cfg.chip}`}
                      >
                        {cfg.label}
                      </span>

                      {table.order_id ? (
                        <div className="mt-3 flex items-end justify-between">
                          <span className="text-xs font-bold tracking-wider text-zinc-400">
                            {shortToken(table.order_id)}
                          </span>
                          <span className="font-extrabold text-lg tracking-tight text-zinc-900">
                            ${table.total_price}
                          </span>
                        </div>
                      ) : (
                        <div className="mt-3 text-xs font-semibold tracking-wide text-zinc-400">No active order</div>
                      )}

                      {payable && (
                        <div className="mt-2 text-[11px] font-black tracking-widest uppercase text-emerald-600">
                          Collect Payment
                        </div>
                      )}
                      {table.payment_status === 'PAID' && (
                        <div className="mt-2 flex items-center gap-1 text-[11px] font-black tracking-widest uppercase text-emerald-600">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Paid
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Table Detail Slide-over */}
      <AnimatePresence>
        {selectedToken && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePanel}
              className="fixed inset-0 z-40 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
              className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white shadow-2xl flex flex-col"
            >
              {/* Panel Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-200">
                <div>
                  <p className="text-xs font-bold tracking-widest text-zinc-400 uppercase">Table</p>
                  <h2 className="text-2xl font-black tracking-tight text-zinc-900">
                    {detailQuery.data?.table_name ?? '…'}
                  </h2>
                </div>
                <button
                  onClick={closePanel}
                  className="p-2 rounded-lg hover:bg-zinc-100 active:bg-zinc-200 transition-colors text-zinc-500"
                  aria-label="Close panel"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Panel Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                {detailQuery.isLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
                  </div>
                ) : detailQuery.isError ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <AlertTriangle className="w-12 h-12 mb-3 text-red-500" />
                    <p className="font-bold tracking-tight text-zinc-900 mb-1">Could not load order</p>
                    <p className="text-sm font-medium text-zinc-500 mb-4">
                      {detailQuery.error instanceof Error ? detailQuery.error.message : 'Try again.'}
                    </p>
                    <button
                      onClick={() => detailQuery.refetch()}
                      className="px-4 py-2 bg-zinc-900 text-white font-bold tracking-tight rounded-lg text-sm"
                    >
                      Retry
                    </button>
                  </div>
                ) : !detailQuery.data?.order_id ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center opacity-70">
                    <Receipt className="w-14 h-14 mb-3 text-zinc-300" />
                    <p className="font-bold tracking-tight text-zinc-700">No active order</p>
                    <p className="text-sm font-medium text-zinc-500">
                      This table has no order to settle right now.
                    </p>
                  </div>
                ) : (
                  <div>
                    {/* Status row */}
                    <div className="flex items-center gap-2 mb-5">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-black tracking-widest uppercase ${
                          STATUS_CONFIG[detailQuery.data.status].chip
                        }`}
                      >
                        {STATUS_CONFIG[detailQuery.data.status].label}
                      </span>
                      <span className="text-xs font-bold tracking-wider text-zinc-400">
                        {shortToken(detailQuery.data.order_id)}
                      </span>
                    </div>

                    {/* Items breakdown */}
                    <p className="text-xs font-bold tracking-widest text-zinc-400 uppercase mb-3">Order Items</p>
                    <ul className="space-y-3 mb-6">
                      {detailQuery.data.items.map((item, idx) => (
                        <li key={idx} className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold tracking-tight text-zinc-900">
                              <span className="text-zinc-400 mr-1.5">{item.quantity}×</span>
                              {item.name}
                            </p>
                            {item.notes && (
                              <p className="text-xs font-medium text-zinc-500 mt-0.5">“{item.notes}”</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>

                    {/* Total */}
                    <div className="flex items-center justify-between py-4 border-t border-zinc-200">
                      <span className="text-sm font-bold tracking-widest text-zinc-500 uppercase">Total</span>
                      <span className="text-3xl font-black tracking-tight text-zinc-900">
                        ${detailQuery.data.total_price}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Panel Footer — payment action */}
              {detailQuery.data?.order_id && (
                <div className="px-6 py-5 border-t border-zinc-200 bg-zinc-50">
                  {paidToken === selectedToken || detailQuery.data.payment_status === 'PAID' ? (
                    <div className="flex items-center justify-center gap-2 w-full py-4 bg-emerald-50 text-emerald-700 font-black tracking-tight rounded-xl border-2 border-emerald-200">
                      <CheckCircle2 className="w-5 h-5" />
                      Payment Collected
                    </div>
                  ) : isPayable(detailQuery.data) ? (
                    <button
                      onClick={() => paymentMutation.mutate({ orderId: detailQuery.data!.order_id! })}
                      disabled={paymentMutation.isPending}
                      className="flex items-center justify-center gap-2 w-full py-4 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-black tracking-tight rounded-xl shadow-sm transition-colors disabled:opacity-70"
                    >
                      {paymentMutation.isPending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Banknote className="w-5 h-5" />
                          Collect Cash — ${detailQuery.data.total_price}
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="flex items-center justify-center gap-2 w-full py-4 bg-zinc-100 text-zinc-400 font-bold tracking-tight rounded-xl border border-zinc-200 text-sm">
                      Awaiting kitchen / service
                    </div>
                  )}
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
