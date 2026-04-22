'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useStaffStore } from '@/store/useStaffStore';
import { useAdminToast } from '@/components/admin/AdminToast';
import SearchInput from '@/components/admin/SearchInput';
import ShimmerSkeleton from '@/components/admin/ShimmerSkeleton';
import { getAdminOrders } from '@/lib/api';
import { ClipboardList, RefreshCw, Copy, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';

const STATUS_TABS = ['ALL', 'NEW', 'PREPARING', 'READY', 'SERVED', 'CANCELLED'];

const STATUS_DOT: Record<string, string> = {
  NEW: 'bg-amber-400',
  PREPARING: 'bg-blue-400',
  READY: 'bg-emerald-400',
  SERVED: 'bg-stone-400',
  CANCELLED: 'bg-red-400',
};

const PAYMENT_ICON: Record<string, { color: string; label: string }> = {
  PAID: { color: 'text-emerald-600 bg-emerald-50', label: 'Paid' },
  PENDING: { color: 'text-amber-600 bg-amber-50', label: 'Pending' },
  FAILED: { color: 'text-red-500 bg-red-50', label: 'Failed' },
};

export default function AdminOrdersPage() {
  const { accessToken } = useStaffStore();
  const { showToast } = useAdminToast();
  const token = accessToken || '';
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['admin', 'orders'],
    queryFn: () => getAdminOrders(token),
    enabled: !!token,
    refetchInterval: 15000,
  });

  const orders = data?.orders || [];

  const filteredOrders = useMemo(() => {
    let result = orders;
    if (activeTab !== 'ALL') {
      result = result.filter(o => o.status === activeTab);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o =>
        o.order_id.toLowerCase().includes(q) ||
        o.table.toLowerCase().includes(q)
      );
    }
    return result;
  }, [orders, activeTab, searchQuery]);

  const copyOrderId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    showToast('Order ID copied');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: orders.length };
    STATUS_TABS.slice(1).forEach(s => { counts[s] = orders.filter(o => o.status === s).length; });
    return counts;
  }, [orders]);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-stone-900">Orders Overview</h1>
          <p className="text-stone-500 font-medium mt-1 text-sm">View all orders across your restaurant</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-stone-400 font-medium">
          <RefreshCw className="w-3 h-3 animate-spin [animation-duration:3s]" />
          <span>Auto-refreshing</span>
          {dataUpdatedAt > 0 && (
            <span className="text-stone-300">·</span>
          )}
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {STATUS_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold tracking-tight whitespace-nowrap transition-all ${
              activeTab === tab
                ? 'bg-stone-900 text-white shadow-sm'
                : 'bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-700'
            }`}
          >
            {tab}
            {tabCounts[tab] > 0 && (
              <span className={`ml-1.5 text-[10px] font-bold ${activeTab === tab ? 'text-stone-400' : 'text-stone-400'}`}>
                {tabCounts[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      <SearchInput placeholder="Search by order ID or table..." onSearch={setSearchQuery} className="max-w-sm" />

      {/* Orders Table */}
      <section className="bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <ShimmerSkeleton variant="table" rows={6} columns={6} />
        ) : filteredOrders.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <ClipboardList className="w-10 h-10 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-400 font-medium text-sm">
              {searchQuery || activeTab !== 'ALL' ? 'No orders match your filter' : 'No orders yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-left bg-stone-50/50">
                  <th className="px-5 py-3 font-bold tracking-tight text-stone-400 text-xs uppercase">Order</th>
                  <th className="px-5 py-3 font-bold tracking-tight text-stone-400 text-xs uppercase">Table</th>
                  <th className="px-5 py-3 font-bold tracking-tight text-stone-400 text-xs uppercase">Status</th>
                  <th className="px-5 py-3 font-bold tracking-tight text-stone-400 text-xs uppercase">Total</th>
                  <th className="px-5 py-3 font-bold tracking-tight text-stone-400 text-xs uppercase">Payment</th>
                  <th className="px-5 py-3 font-bold tracking-tight text-stone-400 text-xs uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredOrders.map((order) => (
                  <motion.tr
                    key={order.order_id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-stone-50/60 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => copyOrderId(order.order_id)}
                        className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-stone-500 bg-stone-100 hover:bg-stone-200 px-2 py-1 rounded-md transition-colors"
                      >
                        {order.order_id.substring(0, 12)}…
                        {copiedId === order.order_id ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3 text-stone-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-5 py-3.5 font-bold tracking-tight text-stone-800">{order.table}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-tight text-stone-600">
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[order.status] || 'bg-stone-300'}`} />
                        {order.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-bold tracking-tight text-stone-800">${order.total_price}</td>
                    <td className="px-5 py-3.5">
                      {order.payment_status ? (
                        <span className={`text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-md ${PAYMENT_ICON[order.payment_status]?.color || 'bg-stone-100 text-stone-500'}`}>
                          {PAYMENT_ICON[order.payment_status]?.label || order.payment_status}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-stone-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-medium text-stone-400">
                      {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
