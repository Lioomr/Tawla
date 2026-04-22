'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStaffStore } from '@/store/useStaffStore';
import { useAdminToast } from '@/components/admin/AdminToast';
import ShimmerSkeleton from '@/components/admin/ShimmerSkeleton';
import {
  ApiError,
  getAdminStaff, createAdminStaff, updateAdminStaff, deleteAdminStaff,
  AdminStaff, AdminStaffCreatePayload, AdminStaffUpdatePayload,
} from '@/lib/api';
import { Loader2, Plus, Pencil, Trash2, Users, X, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ROLE_OPTIONS = ['KITCHEN', 'WAITER', 'ADMIN'];
const ROLE_STYLE: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  ADMIN: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-l-purple-500', icon: '👑' },
  KITCHEN: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-l-amber-500', icon: '🍳' },
  WAITER: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-l-blue-500', icon: '🍽️' },
};

function StaffInitials({ name }: { name: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div className="w-10 h-10 bg-stone-200 rounded-xl flex items-center justify-center">
      <span className="text-xs font-black text-stone-600 tracking-tight">{initials}</span>
    </div>
  );
}

export default function AdminStaffPage() {
  const { accessToken } = useStaffStore();
  const queryClient = useQueryClient();
  const { showToast } = useAdminToast();
  const token = accessToken || '';

  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<AdminStaff | null>(null);
  const [deleting, setDeleting] = useState<AdminStaff | null>(null);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', name: '', role: 'WAITER' });

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'staff'],
    queryFn: () => getAdminStaff(token),
    enabled: !!token,
  });

  const createMut = useMutation({
    mutationFn: (p: AdminStaffCreatePayload) => createAdminStaff(token, p),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] }); setModal(null); resetForm(); setError(''); showToast('Staff member created'); },
    onError: (e: unknown) => setError(e instanceof ApiError ? e.message : 'Failed to create staff member'),
  });

  const updateMut = useMutation({
    mutationFn: (p: AdminStaffUpdatePayload) => updateAdminStaff(token, p),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] }); setModal(null); setEditTarget(null); resetForm(); setError(''); showToast('Staff member updated'); },
    onError: (e: unknown) => setError(e instanceof ApiError ? e.message : 'Failed to update staff member'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteAdminStaff(token, id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] }); setDeleting(null); setError(''); showToast('Staff member deleted'); },
    onError: (e: unknown) => setError(e instanceof ApiError ? e.message : 'Failed to delete staff member'),
  });

  const resetForm = () => { setForm({ username: '', password: '', name: '', role: 'WAITER' }); setShowPassword(false); };

  const openCreate = () => { resetForm(); setError(''); setModal('create'); };

  const openEdit = (s: AdminStaff) => {
    setEditTarget(s);
    setForm({ username: s.username, password: '', name: s.name, role: s.role });
    setError('');
    setShowPassword(false);
    setModal('edit');
  };

  const handleSubmit = () => {
    if (modal === 'create') {
      if (!form.username.trim() || !form.password.trim() || !form.name.trim()) return;
      createMut.mutate({ username: form.username.trim(), password: form.password, name: form.name.trim(), role: form.role });
    } else if (modal === 'edit' && editTarget) {
      const payload: AdminStaffUpdatePayload = { staff_id: editTarget.id, name: form.name.trim(), role: form.role };
      if (form.password.trim()) payload.password = form.password;
      updateMut.mutate(payload);
    }
  };

  const staff = data?.staff || [];

  // Group by role
  const groupedStaff = ROLE_OPTIONS.reduce((acc, role) => {
    acc[role] = staff.filter(s => s.role === role);
    return acc;
  }, {} as Record<string, AdminStaff[]>);

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-stone-900">Staff Management</h1>
          <p className="text-stone-500 font-medium mt-1 text-sm">Manage kitchen, waiter, and admin staff</p>
        </div>
        <button onClick={openCreate}
          className="px-4 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-bold tracking-tight hover:bg-stone-800 flex items-center gap-2 transition-colors self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Add Staff
        </button>
      </div>

      {isLoading ? (
        <ShimmerSkeleton variant="card" rows={6} />
      ) : staff.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-12 text-center">
          <Users className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-400 font-medium text-sm">No staff members yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {ROLE_OPTIONS.map((role) => {
            const members = groupedStaff[role];
            if (members.length === 0) return null;
            const style = ROLE_STYLE[role] || ROLE_STYLE.WAITER;
            return (
              <section key={role}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm">{style.icon}</span>
                  <h2 className="text-sm font-bold tracking-tight text-stone-600">{role}</h2>
                  <span className="text-xs font-bold text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">{members.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {members.map((s, index) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: index * 0.03 }}
                      className={`bg-white rounded-2xl border border-stone-200/80 shadow-sm p-4 group hover:shadow-md transition-all duration-200 border-l-[3px] ${style.border}`}
                    >
                      <div className="flex items-center gap-3">
                        <StaffInitials name={s.name} />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold tracking-tight text-stone-900 text-sm truncate">{s.name}</h3>
                          <code className="text-[11px] font-mono text-stone-400">{s.username}</code>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(s)}
                            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setDeleting(s)}
                            className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center gap-2">
                        <span className={`text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-md ${style.bg} ${style.text}`}>
                          {s.role}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full border border-stone-200">
              <h3 className="text-lg font-black tracking-tight mb-2 text-stone-900">Delete Staff Member</h3>
              <p className="text-stone-500 font-medium text-sm mb-6">
                Are you sure you want to delete <strong className="text-stone-900">{deleting.name}</strong> ({deleting.username})? This will remove their login credentials.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleting(null)} disabled={deleteMut.isPending}
                  className="flex-1 py-2.5 font-bold tracking-tight text-stone-500 bg-stone-100 rounded-xl hover:bg-stone-200 transition-colors text-sm">Cancel</button>
                <button onClick={() => deleteMut.mutate(deleting.id)} disabled={deleteMut.isPending}
                  className="flex-1 py-2.5 font-bold tracking-tight text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors flex items-center justify-center text-sm">
                  {deleteMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {modal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full border border-stone-200">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-black tracking-tight text-stone-900">
                  {modal === 'create' ? 'Add Staff Member' : 'Edit Staff Member'}
                </h3>
                <button onClick={() => { setModal(null); setEditTarget(null); resetForm(); }}
                  className="p-1 text-stone-400 hover:text-stone-700 transition-colors"><X className="w-5 h-5" /></button>
              </div>

              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm font-bold p-3 rounded-xl mb-4">{error}</div>}

              <div className="space-y-4">
                {modal === 'create' && (
                  <div>
                    <label className="block text-xs font-bold tracking-widest text-stone-400 uppercase mb-1.5">Username</label>
                    <input type="text" value={form.username} onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-stone-300" />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold tracking-widest text-stone-400 uppercase mb-1.5">
                    {modal === 'create' ? 'Password' : 'New Password (leave blank to keep)'}
                  </label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder={modal === 'edit' ? '••••••••' : ''}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-medium outline-none focus:ring-2 focus:ring-stone-300" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold tracking-widest text-stone-400 uppercase mb-1.5">Display Name</label>
                  <input type="text" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-stone-300" />
                </div>
                <div>
                  <label className="block text-xs font-bold tracking-widest text-stone-400 uppercase mb-1.5">Role</label>
                  <div className="grid grid-cols-3 gap-2">
                    {ROLE_OPTIONS.map(r => {
                      const style = ROLE_STYLE[r];
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, role: r }))}
                          className={`py-2.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all border ${
                            form.role === r
                              ? `${style.bg} ${style.text} border-current`
                              : 'bg-stone-50 text-stone-400 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          {r}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => { setModal(null); setEditTarget(null); resetForm(); }}
                  className="flex-1 py-2.5 font-bold tracking-tight text-stone-500 bg-stone-100 rounded-xl hover:bg-stone-200 transition-colors text-sm">Cancel</button>
                <button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}
                  className="flex-1 py-2.5 font-bold tracking-tight text-white bg-stone-900 rounded-xl hover:bg-stone-800 transition-colors flex items-center justify-center text-sm">
                  {(createMut.isPending || updateMut.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : (modal === 'create' ? 'Create' : 'Save')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
