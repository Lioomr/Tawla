'use client';

import { useQuery } from '@tanstack/react-query';
import { useStaffStore } from '@/store/useStaffStore';
import { useRouter } from 'next/navigation';
import { getAdminAnalytics, getAdminOrders, getAdminTables } from '@/lib/api';
import { ShoppingBag, DollarSign, Grid3X3, ClipboardList, UtensilsCrossed, Users, BarChart3, ArrowRight } from 'lucide-react';
import StatCard from '@/components/admin/StatCard';
import ShimmerSkeleton from '@/components/admin/ShimmerSkeleton';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

const STATUS_DOT: Record<string, string> = {
  NEW: 'bg-amber-400',
  PREPARING: 'bg-blue-400',
  READY: 'bg-emerald-400',
  SERVED: 'bg-stone-400',
  CANCELLED: 'bg-red-400',
};

export default function AdminOverviewPage() {
  const { accessToken } = useStaffStore();
  const router = useRouter();
  const token = accessToken || '';

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: () => getAdminAnalytics(token),
    enabled: !!token,
    refetchInterval: 30000,
  });

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['admin', 'orders'],
    queryFn: () => getAdminOrders(token),
    enabled: !!token,
    refetchInterval: 15000,
  });

  const { data: tablesData } = useQuery({
    queryKey: ['admin', 'tables'],
    queryFn: () => getAdminTables(token),
    enabled: !!token,
  });

  const recentOrders = (ordersData?.orders || []).slice(0, 5);
  const activeTables = tablesData?.tables?.length ?? 0;

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-3xl font-black tracking-tight text-stone-900">Dashboard</h1>
        <p className="text-stone-500 font-medium mt-1">Overview of your restaurant operations</p>
      </motion.div>

      {/* ─── Stat Cards ─── */}
      {analyticsLoading ? (
        <ShimmerSkeleton variant="stat" rows={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={ShoppingBag}
            label="Orders Today"
            value={analytics?.orders_today ?? 0}
            accentColor="blue"
            delay={0}
          />
          <StatCard
            icon={DollarSign}
            label="Revenue"
            value={analytics?.totalRevenue ?? 0}
            prefix="$"
            accentColor="emerald"
            delay={0.05}
          />
          <StatCard
            icon={Grid3X3}
            label="Tables"
            value={activeTables}
            accentColor="amber"
            delay={0.1}
          />
          <StatCard
            icon={BarChart3}
            label="Popular Items"
            value={analytics?.popular_items?.length ?? 0}
            accentColor="purple"
            delay={0.15}
          />
        </div>
      )}

      {/* ─── Quick Actions ─── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {[
          { label: 'Menu', icon: UtensilsCrossed, href: '/staff/admin/menu', color: 'text-amber-600 bg-amber-50 hover:bg-amber-100' },
          { label: 'Tables', icon: Grid3X3, href: '/staff/admin/tables', color: 'text-blue-600 bg-blue-50 hover:bg-blue-100' },
          { label: 'Staff', icon: Users, href: '/staff/admin/staff', color: 'text-purple-600 bg-purple-50 hover:bg-purple-100' },
          { label: 'Analytics', icon: BarChart3, href: '/staff/admin/analytics', color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' },
        ].map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.href}
              onClick={() => router.push(action.href)}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-sm tracking-tight transition-all duration-200 ${action.color}`}
            >
              <Icon className="w-4.5 h-4.5" />
              {action.label}
              <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-40" />
            </button>
          );
        })}
      </motion.div>

      {/* ─── Recent Orders ─── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <ClipboardList className="w-4.5 h-4.5 text-stone-400" />
            <h2 className="text-base font-bold tracking-tight text-stone-900">Recent Orders</h2>
          </div>
          <button
            onClick={() => router.push('/staff/admin/orders')}
            className="text-xs font-bold text-stone-400 hover:text-stone-700 flex items-center gap-1 transition-colors"
          >
            View All <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {ordersLoading ? (
          <ShimmerSkeleton variant="table" rows={5} columns={5} />
        ) : recentOrders.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <ClipboardList className="w-10 h-10 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-400 font-medium text-sm">No orders yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-left">
                  <th className="px-6 py-3 font-bold tracking-tight text-stone-400 text-xs uppercase">Order</th>
                  <th className="px-6 py-3 font-bold tracking-tight text-stone-400 text-xs uppercase">Table</th>
                  <th className="px-6 py-3 font-bold tracking-tight text-stone-400 text-xs uppercase">Status</th>
                  <th className="px-6 py-3 font-bold tracking-tight text-stone-400 text-xs uppercase">Total</th>
                  <th className="px-6 py-3 font-bold tracking-tight text-stone-400 text-xs uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {recentOrders.map((order) => (
                  <tr key={order.order_id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="px-6 py-3.5">
                      <code className="text-xs font-mono font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                        {order.order_id.substring(0, 12)}…
                      </code>
                    </td>
                    <td className="px-6 py-3.5 font-bold tracking-tight text-stone-800">{order.table}</td>
                    <td className="px-6 py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-tight text-stone-600">
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[order.status] || 'bg-stone-300'}`} />
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-bold tracking-tight text-stone-800">${order.total_price}</td>
                    <td className="px-6 py-3.5 text-xs font-medium text-stone-400">
                      {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.section>
    </div>
  );
}
