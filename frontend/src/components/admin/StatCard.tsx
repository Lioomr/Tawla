'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  accentColor: 'emerald' | 'blue' | 'amber' | 'purple';
  delay?: number;
}

const ACCENT_MAP = {
  emerald: {
    bg: 'bg-emerald-500/10',
    icon: 'text-emerald-500',
    glow: 'shadow-emerald-500/5',
    ring: 'ring-emerald-500/20',
    gradient: 'from-emerald-500/5 to-transparent',
  },
  blue: {
    bg: 'bg-blue-500/10',
    icon: 'text-blue-500',
    glow: 'shadow-blue-500/5',
    ring: 'ring-blue-500/20',
    gradient: 'from-blue-500/5 to-transparent',
  },
  amber: {
    bg: 'bg-amber-500/10',
    icon: 'text-amber-500',
    glow: 'shadow-amber-500/5',
    ring: 'ring-amber-500/20',
    gradient: 'from-amber-500/5 to-transparent',
  },
  purple: {
    bg: 'bg-purple-500/10',
    icon: 'text-purple-500',
    glow: 'shadow-purple-500/5',
    ring: 'ring-purple-500/20',
    gradient: 'from-purple-500/5 to-transparent',
  },
};

function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 800;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(value, Math.round(increment * step * 100) / 100);
      setDisplay(current);
      if (step >= steps) {
        setDisplay(value);
        clearInterval(timer);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  const formatted = Number.isInteger(value) ? display.toFixed(0) : display.toFixed(2);

  return (
    <span className="tabular-nums">
      {prefix}{formatted}{suffix}
    </span>
  );
}

export default function StatCard({ icon: Icon, label, value, prefix, suffix, accentColor, delay = 0 }: StatCardProps) {
  const accent = ACCENT_MAP[accentColor];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`relative overflow-hidden bg-white rounded-2xl border border-stone-200/80 shadow-sm ${accent.glow} ring-1 ${accent.ring} p-6 group hover:shadow-md transition-shadow duration-300`}
    >
      {/* subtle gradient accent */}
      <div className={`absolute inset-0 bg-gradient-to-br ${accent.gradient} pointer-events-none`} />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-10 h-10 ${accent.bg} rounded-xl flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${accent.icon}`} />
          </div>
          <span className="text-[10px] font-bold tracking-[0.2em] text-stone-400 uppercase">
            {label}
          </span>
        </div>
        <p className="text-4xl font-black tracking-tight text-stone-900">
          <AnimatedNumber value={value} prefix={prefix} suffix={suffix} />
        </p>
      </div>
    </motion.div>
  );
}
