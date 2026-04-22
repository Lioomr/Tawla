'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useStaffStore } from '@/store/useStaffStore';
import SearchInput from '@/components/admin/SearchInput';
import ShimmerSkeleton from '@/components/admin/ShimmerSkeleton';
import { getAdminAuditLogs, AuditLogEntry } from '@/lib/api';
import { Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const ACTION_COLORS: Record<string, string> = {
  'kitchen': 'bg-amber-400',
  'waiter': 'bg-blue-400',
  'admin': 'bg-purple-400',
  'payment': 'bg-emerald-400',
};

const ACTION_BADGE: Record<string, string> = {
  'kitchen': 'bg-amber-50 text-amber-600',
  'waiter': 'bg-blue-50 text-blue-600',
  'admin': 'bg-purple-50 text-purple-600',
  'payment': 'bg-emerald-50 text-emerald-600',
};

function getActionGroup(action: string): string {
  return action.split('.')[0];
}

function MetadataViewer({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="bg-stone-950 rounded-xl p-4 text-xs font-mono space-y-1 border border-stone-800 mt-3">
        {entries.map(([key, value]) => (
          <div key={key} className="flex gap-2">
            <span className="text-purple-400 flex-shrink-0">{key}</span>
            <span className="text-stone-500">:</span>
            <span className="text-emerald-400 break-all">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function AuditRow({ entry }: { entry: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const hasMetadata = Object.keys(entry.metadata).length > 0;
  const group = getActionGroup(entry.action);
  const dotColor = ACTION_COLORS[group] || 'bg-stone-300';
  const badgeColor = ACTION_BADGE[group] || 'bg-stone-100 text-stone-500';

  return (
    <div className="flex gap-4 group">
      {/* Timeline */}
      <div className="flex flex-col items-center pt-1.5 flex-shrink-0">
        <div className={`w-2.5 h-2.5 rounded-full ${dotColor} ring-4 ring-white shadow-sm`} />
        <div className="w-[2px] flex-1 bg-stone-200 mt-1" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-6 min-w-0">
        <div
          onClick={() => hasMetadata && setExpanded(!expanded)}
          className={`${hasMetadata ? 'cursor-pointer' : ''}`}
        >
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-md ${badgeColor}`}>
              {entry.action}
            </span>
            {entry.actor_name && (
              <span className="text-xs font-bold text-stone-600">by {entry.actor_name}</span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-stone-500 font-medium">
            <span>{entry.target_type}</span>
            <span className="text-stone-300">·</span>
            <code className="text-stone-400 font-mono truncate">{String(entry.target_identifier)}</code>
            <span className="text-stone-300">·</span>
            <span
              className="text-stone-400"
              title={format(new Date(entry.created_at), 'PPpp')}
            >
              {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
            </span>
          </div>

          {hasMetadata && (
            <button className="flex items-center gap-1 text-[10px] font-bold text-stone-400 hover:text-stone-600 mt-1.5 transition-colors">
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? 'Hide' : 'Show'} metadata
            </button>
          )}
        </div>

        <AnimatePresence>
          {expanded && hasMetadata && <MetadataViewer data={entry.metadata} />}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function AdminAuditLogPage() {
  const { accessToken } = useStaffStore();
  const token = accessToken || '';
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit-logs'],
    queryFn: () => getAdminAuditLogs(token),
    enabled: !!token,
  });

  const logs = data?.audit_logs || [];

  const filteredLogs = useMemo(() => {
    if (!searchQuery) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(l =>
      l.action.toLowerCase().includes(q) ||
      l.target_type.toLowerCase().includes(q) ||
      l.actor_name?.toLowerCase().includes(q) ||
      String(l.target_identifier).toLowerCase().includes(q)
    );
  }, [logs, searchQuery]);

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-stone-900">Audit Log</h1>
          <p className="text-stone-500 font-medium mt-1 text-sm">Accountability trail for all staff actions</p>
        </div>
        <span className="text-xs font-bold text-stone-400 bg-stone-100 px-2.5 py-1 rounded-lg">
          {logs.length} events
        </span>
      </div>

      <SearchInput placeholder="Search by action, target, or actor..." onSearch={setSearchQuery} className="max-w-sm" />

      <section className="bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center gap-2.5">
          <Shield className="w-4 h-4 text-stone-400" />
          <h2 className="text-sm font-bold tracking-tight text-stone-900">Activity Timeline</h2>
        </div>

        {isLoading ? (
          <ShimmerSkeleton variant="table" rows={8} columns={4} />
        ) : filteredLogs.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Shield className="w-10 h-10 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-400 font-medium text-sm">
              {searchQuery ? 'No events match your search' : 'No audit events recorded yet'}
            </p>
          </div>
        ) : (
          <div className="px-6 pt-5 pb-2">
            {filteredLogs.map((entry, i) => (
              <AuditRow key={`${entry.action}-${entry.created_at}-${i}`} entry={entry} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
