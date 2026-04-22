'use client';

import { useQuery } from '@tanstack/react-query';
import { useStaffStore } from '@/store/useStaffStore';
import { getAdminAnalytics } from '@/lib/api';
import { ShoppingBag, DollarSign, TrendingUp, Trophy } from 'lucide-react';
import StatCard from '@/components/admin/StatCard';
import ShimmerSkeleton from '@/components/admin/ShimmerSkeleton';
import { motion } from 'framer-motion';

const RANK_STYLE = [
  { bg: 'bg-amber-400', text: 'text-white', label: '🥇' },
  { bg: 'bg-stone-400', text: 'text-white', label: '🥈' },
  { bg: 'bg-amber-700', text: 'text-white', label: '🥉' },
];

export default function AdminAnalyticsPage() {
  const { accessToken } = useStaffStore();
  const token = accessToken || '';

  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: () => getAdminAnalytics(token),
    enabled: !!token,
    refetchInterval: 30000,
  });

  const popularItems = data?.popular_items || [];
  const maxQuantity = popularItems.length > 0 ? Math.max(...popularItems.map(i => i.total_quantity)) : 1;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3"
      >
        <div>
          <h1 className="text-3xl font-black tracking-tight text-stone-900">Analytics</h1>
          <p className="text-stone-500 font-medium mt-1 text-sm">Overview of today&apos;s operations</p>
        </div>
        {dataUpdatedAt > 0 && (
          <span className="text-[11px] font-medium text-stone-400">
            Last updated: {new Date(dataUpdatedAt).toLocaleTimeString()}
          </span>
        )}
      </motion.div>

      {/* Hero Stat Cards */}
      {isLoading ? (
        <ShimmerSkeleton variant="stat" rows={2} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            icon={ShoppingBag}
            label="Orders Today"
            value={data?.orders_today ?? 0}
            accentColor="blue"
            delay={0}
          />
          <StatCard
            icon={DollarSign}
            label="Total Revenue"
            value={data?.totalRevenue ?? 0}
            prefix="$"
            accentColor="emerald"
            delay={0.05}
          />
        </div>
      )}

      {/* Popular Items — Bar Chart */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-stone-100 flex items-center gap-2.5">
          <Trophy className="w-4.5 h-4.5 text-amber-500" />
          <h2 className="text-base font-bold tracking-tight text-stone-900">Top Popular Items</h2>
        </div>

        {isLoading ? (
          <ShimmerSkeleton variant="table" rows={5} columns={3} />
        ) : popularItems.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <TrendingUp className="w-10 h-10 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-400 font-medium text-sm">No order data available yet</p>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {popularItems.map((item, index) => {
              const percentage = (item.total_quantity / maxQuantity) * 100;
              const rankStyle = RANK_STYLE[index];

              return (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.06 }}
                  className="flex items-center gap-4"
                >
                  {/* Rank badge */}
                  <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                    {rankStyle ? (
                      <span className="text-lg">{rankStyle.label}</span>
                    ) : (
                      <span className="w-7 h-7 bg-stone-200 rounded-lg flex items-center justify-center text-xs font-black text-stone-500">
                        {index + 1}
                      </span>
                    )}
                  </div>

                  {/* Name + Bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold tracking-tight text-stone-800 text-sm truncate">{item.name}</span>
                      <span className="text-sm font-black tracking-tight text-stone-900 tabular-nums ml-3">
                        {item.total_quantity}
                        <span className="text-xs font-medium text-stone-400 ml-1">sold</span>
                      </span>
                    </div>
                    <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.6, delay: 0.2 + index * 0.06, ease: [0.22, 1, 0.36, 1] }}
                        className={`h-full rounded-full ${
                          index === 0
                            ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                            : index === 1
                            ? 'bg-gradient-to-r from-stone-400 to-stone-500'
                            : index === 2
                            ? 'bg-gradient-to-r from-amber-600 to-amber-700'
                            : 'bg-stone-300'
                        }`}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.section>
    </div>
  );
}
