'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { staffLogin } from '@/lib/api';
import { useStaffStore } from '@/store/useStaffStore';
import { Loader2, ShieldCheck } from 'lucide-react';

export default function StaffLoginPage() {
  const router = useRouter();
  const { setAuth, clearAuth, isAuthenticated, profile } = useStaffStore();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorVisible, setErrorVisible] = useState('');

  // If already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated() && profile) {
      if (profile.role === 'KITCHEN') router.replace('/staff/kitchen');
      else if (profile.role === 'WAITER') router.replace('/staff/waiter');
      else if (profile.role === 'ADMIN') router.replace('/staff/admin');
    }
  }, [isAuthenticated, profile, router]);

  const loginMutation = useMutation({
    mutationFn: staffLogin,
    onSuccess: (data) => {
      setAuth(data.access, data.refresh, data.staff);
      
      if (data.staff.role === 'KITCHEN') {
        router.push('/staff/kitchen');
      } else if (data.staff.role === 'WAITER') {
        router.push('/staff/waiter');
      } else if (data.staff.role === 'ADMIN') {
        router.push('/staff/admin');
      }
    },
    onError: (err: unknown) => {
      if (err instanceof Error) {
        setErrorVisible(err.message || 'Invalid credentials');
        return;
      }
      setErrorVisible('Invalid credentials');
    }
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setErrorVisible('');
    loginMutation.mutate({ username, password });
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mb-6">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Tawlax OS</h1>
          <p className="text-zinc-400 font-medium tracking-tight">Staff Authentication</p>
        </div>

        <form onSubmit={onSubmit} className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl space-y-4">
          {errorVisible && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold tracking-tight p-3 rounded-lg text-center">
              {errorVisible}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold tracking-widest text-zinc-400 uppercase mb-2">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white font-medium focus:ring-2 focus:ring-zinc-700 focus:border-transparent outline-none transition-all"
              placeholder="e.g. kitchen_demo"
            />
          </div>

          <div>
            <label className="block text-xs font-bold tracking-widest text-zinc-400 uppercase mb-2">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white font-medium focus:ring-2 focus:ring-zinc-700 focus:border-transparent outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full bg-white text-zinc-950 font-bold tracking-tight py-3.5 rounded-xl mt-4 active:scale-[0.98] transition-transform disabled:opacity-70 flex items-center justify-center"
          >
            {loginMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Sign In'
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
