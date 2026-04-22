'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStaffStore } from '@/store/useStaffStore';
import { useAdminToast } from '@/components/admin/AdminToast';
import ShimmerSkeleton from '@/components/admin/ShimmerSkeleton';
import {
  ApiError,
  getAdminTables, createAdminTable, updateAdminTable, deleteAdminTable,
  AdminTable,
} from '@/lib/api';
import { Loader2, Plus, Pencil, Trash2, X, Check, Grid3X3, Copy, QrCode } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminTablesPage() {
  const { accessToken } = useStaffStore();
  const queryClient = useQueryClient();
  const { showToast } = useAdminToast();
  const token = accessToken || '';

  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<{ token: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState<AdminTable | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'tables'],
    queryFn: () => getAdminTables(token),
    enabled: !!token,
  });

  const createMut = useMutation({
    mutationFn: (name: string) => createAdminTable(token, name),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'tables'] }); setNewName(''); setError(''); showToast('Table created'); },
    onError: (e: unknown) => setError(e instanceof ApiError ? e.message : 'Failed to create table'),
  });

  const updateMut = useMutation({
    mutationFn: ({ tableToken, name }: { tableToken: string; name: string }) => updateAdminTable(token, tableToken, name),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'tables'] }); setEditing(null); setError(''); showToast('Table updated'); },
    onError: (e: unknown) => setError(e instanceof ApiError ? e.message : 'Failed to update table'),
  });

  const deleteMut = useMutation({
    mutationFn: (tableToken: string) => deleteAdminTable(token, tableToken),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'tables'] }); setDeleting(null); setError(''); showToast('Table deleted'); },
    onError: (e: unknown) => setError(e instanceof ApiError ? e.message : 'Failed to delete table'),
  });

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopied(token);
    showToast('Token copied to clipboard');
    setTimeout(() => setCopied(null), 2000);
  };

  const tables = data?.tables || [];

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-stone-900">Table Management</h1>
          <p className="text-stone-500 font-medium mt-1 text-sm">Create and manage restaurant tables</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm font-bold p-3 rounded-xl">{error}</div>
      )}

      {/* Add Table */}
      <div className="flex gap-3">
        <input type="text" placeholder="New table name (e.g. Table 5)" value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && newName.trim()) createMut.mutate(newName.trim()); }}
          className="flex-1 bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-stone-300 focus:border-transparent outline-none shadow-sm" />
        <button onClick={() => newName.trim() && createMut.mutate(newName.trim())}
          disabled={createMut.isPending || !newName.trim()}
          className="px-5 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-bold tracking-tight hover:bg-stone-800 disabled:opacity-50 flex items-center gap-2 transition-colors">
          {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add Table
        </button>
      </div>

      {/* Table Grid */}
      {isLoading ? (
        <ShimmerSkeleton variant="card" rows={6} />
      ) : tables.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-12 text-center">
          <Grid3X3 className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-400 font-medium text-sm">No tables yet</p>
          <p className="text-stone-400 font-medium text-xs mt-1">Create your first table above to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.map((table, index) => (
            <motion.div
              key={table.table_token}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.03 }}
              className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-5 group hover:shadow-md hover:border-stone-300/80 transition-all duration-200"
            >
              {editing?.token === table.table_token ? (
                <div className="space-y-3">
                  <input type="text" value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter' && editing.name.trim()) updateMut.mutate({ tableToken: table.table_token, name: editing.name.trim() }); if (e.key === 'Escape') setEditing(null); }}
                    autoFocus
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-stone-400" />
                  <div className="flex gap-2">
                    <button onClick={() => editing.name.trim() && updateMut.mutate({ tableToken: table.table_token, name: editing.name.trim() })}
                      className="flex-1 py-2 text-xs font-bold text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors flex items-center justify-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Save
                    </button>
                    <button onClick={() => setEditing(null)}
                      className="flex-1 py-2 text-xs font-bold text-stone-500 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                        <Grid3X3 className="w-4.5 h-4.5 text-blue-500" />
                      </div>
                      <h3 className="font-bold tracking-tight text-stone-900 text-base">{table.name}</h3>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditing({ token: table.table_token, name: table.name })}
                        className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleting(table)}
                        className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <code className="text-[11px] font-mono text-stone-400 bg-stone-100 px-2 py-1 rounded-md truncate flex-1">{table.table_token}</code>
                    <button onClick={() => copyToken(table.table_token)}
                      className="p-1.5 text-stone-300 hover:text-stone-600 transition-colors rounded-lg hover:bg-stone-100" title="Copy token">
                      {copied === table.table_token ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-stone-400">
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Use token for QR/NFC linking</span>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full border border-stone-200">
              <h3 className="text-lg font-black tracking-tight mb-2 text-stone-900">Delete Table</h3>
              <p className="text-stone-500 font-medium text-sm mb-6">Are you sure you want to delete &ldquo;{deleting.name}&rdquo;? This cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleting(null)} disabled={deleteMut.isPending}
                  className="flex-1 py-2.5 font-bold tracking-tight text-stone-500 bg-stone-100 rounded-xl hover:bg-stone-200 transition-colors text-sm">Cancel</button>
                <button onClick={() => deleteMut.mutate(deleting.table_token)} disabled={deleteMut.isPending}
                  className="flex-1 py-2.5 font-bold tracking-tight text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors flex items-center justify-center text-sm">
                  {deleteMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
