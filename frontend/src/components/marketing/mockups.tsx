'use client';

import {
  Banknote,
  Bell,
  ChefHat,
  LayoutDashboard,
  ListChecks,
  QrCode,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MarketingCopy } from './copy';

type MockProps = { copy: MarketingCopy; className?: string };

/**
 * All mockups are illustrative HTML/CSS renditions of the real Tawlax
 * surfaces (customer menu, kitchen board, waiter tables, admin dashboard).
 * They use fixed, stable dimensions and are decorative: the visible captions
 * around them carry the accessible description.
 */

/** Phone-framed customer menu. Intrinsic size 250x500; scale externally if needed. */
export function CustomerMenuMock({ copy, className }: MockProps) {
  const m = copy.mock;
  return (
    <div
      aria-hidden="true"
      className={cn(
        // Device bezel: the rounded frame intentionally exceeds the 8px card
        // radius rule because it depicts a phone, not a UI card.
        'w-[250px] select-none overflow-hidden rounded-[30px] border-[6px] border-stone-900 bg-white shadow-xl',
        className
      )}
    >
      <div className="flex h-[488px] flex-col">
        {/* App header */}
        <div className="flex items-center justify-between border-b border-stone-100 px-4 pb-3 pt-4">
          <div>
            <p className="text-[13px] font-bold text-stone-900">{m.restaurantName}</p>
            <p className="text-[10px] text-stone-500">{m.tableLabel}</p>
          </div>
          <span className="rounded-[6px] bg-stone-900 px-2 py-1 text-[9px] font-semibold text-stone-50">
            {m.tableLabel}
          </span>
        </div>
        {/* Categories */}
        <div className="flex gap-1.5 px-4 py-3">
          {m.menuCategories.map((cat, i) => (
            <span
              key={cat}
              className={cn(
                'rounded-full px-2.5 py-1 text-[10px] font-medium',
                i === 0 ? 'bg-stone-900 text-stone-50' : 'bg-stone-100 text-stone-600'
              )}
            >
              {cat}
            </span>
          ))}
        </div>
        {/* Items */}
        <div className="flex-1 space-y-2.5 px-4">
          {m.items.map((item) => (
            <div
              key={item.name}
              className="flex items-center gap-2.5 rounded-[8px] border border-stone-100 p-2.5"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] bg-amber-700/10 text-amber-800">
                <UtensilsCrossed className="h-4.5 w-4.5" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-semibold text-stone-900">
                  {item.name}
                </span>
                <span className="block text-[11px] text-stone-500">
                  {item.price} {m.currency}
                </span>
              </span>
              <span className="rounded-[6px] bg-stone-900 px-2.5 py-1.5 text-[10px] font-semibold text-stone-50">
                {m.addLabel}
              </span>
            </div>
          ))}
        </div>
        {/* Cart bar */}
        <div className="p-3">
          <div className="flex items-center justify-between rounded-[8px] bg-stone-900 px-4 py-3 text-stone-50">
            <span className="text-[12px] font-semibold">{m.viewCart}</span>
            <span className="text-[11px] text-stone-300">{m.cartCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const KITCHEN_TICKETS = [
  { table: 12, minutes: 1, status: 'new' as const, lines: [0, 2], note: true },
  { table: 7, minutes: 6, status: 'preparing' as const, lines: [1], note: false },
  { table: 3, minutes: 11, status: 'ready' as const, lines: [1, 2], note: false },
];

/** Dark kitchen display board with live order tickets. */
export function KitchenBoardMock({ copy, className }: MockProps) {
  const m = copy.mock;
  const statusStyles = {
    new: 'bg-amber-400/15 text-amber-300',
    preparing: 'bg-sky-400/15 text-sky-300',
    ready: 'bg-emerald-400/15 text-emerald-300',
  };
  const statusLabels = {
    new: m.statusNew,
    preparing: m.statusPreparing,
    ready: m.statusReady,
  };
  return (
    <div
      aria-hidden="true"
      className={cn(
        'w-full select-none overflow-hidden rounded-[8px] border border-stone-800 bg-stone-950 p-4',
        className
      )}
    >
      <div className="flex items-center justify-between pb-3">
        <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-stone-100">
          <ChefHat className="h-4 w-4 text-stone-400" strokeWidth={1.75} />
          {m.kitchenTitle}
        </span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          {copy.live.liveWord}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {KITCHEN_TICKETS.map((ticket) => (
          <div
            key={ticket.table}
            className="rounded-[6px] border border-stone-800 bg-stone-900 p-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[13px] font-bold tabular-nums text-stone-50">
                {m.tableShort}
                {ticket.table}
              </span>
              <span className="font-mono text-[10px] tabular-nums text-stone-500" dir="ltr">
                {ticket.minutes} {m.minutesShort}
              </span>
            </div>
            <div className="mt-2 space-y-1">
              {ticket.lines.map((itemIdx, i) => (
                <p key={i} className="truncate text-[11px] text-stone-300">
                  <span className="font-semibold text-stone-100">{i + 1}×</span>{' '}
                  {m.items[itemIdx].name}
                </p>
              ))}
            </div>
            <span
              className={cn(
                'mt-2.5 inline-block rounded-[4px] px-2 py-0.5 text-[10px] font-semibold',
                statusStyles[ticket.status]
              )}
            >
              {statusLabels[ticket.status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const WAITER_TABLES = [
  { n: 1, status: 'empty' as const },
  { n: 3, status: 'served' as const },
  { n: 5, status: 'ordering' as const },
  { n: 7, status: 'preparing' as const },
  { n: 9, status: 'empty' as const },
  { n: 12, status: 'ready' as const },
  { n: 14, status: 'ordering' as const },
  { n: 16, status: 'empty' as const },
];

/** Waiter table-status grid with a ready alert. */
export function WaiterBoardMock({ copy, className }: MockProps) {
  const m = copy.mock;
  const statusStyles = {
    empty: 'border-stone-200 text-stone-400',
    ordering: 'border-sky-300 bg-sky-50 text-sky-800',
    preparing: 'border-amber-300 bg-amber-50 text-amber-800',
    ready: 'border-emerald-400 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-200',
    served: 'border-stone-300 bg-stone-100 text-stone-600',
  };
  const statusLabels = {
    empty: m.statusEmpty,
    ordering: m.statusOrdering,
    preparing: m.statusPreparing,
    ready: m.statusReady,
    served: m.statusServed,
  };
  return (
    <div
      aria-hidden="true"
      className={cn(
        'w-full select-none overflow-hidden rounded-[8px] border border-stone-200 bg-white p-4',
        className
      )}
    >
      <div className="flex items-center justify-between pb-3">
        <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-stone-900">
          <Users className="h-4 w-4 text-stone-400" strokeWidth={1.75} />
          {m.waiterTitle}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {WAITER_TABLES.map((table) => (
          <div
            key={table.n}
            className={cn(
              'flex flex-col items-center gap-0.5 rounded-[6px] border px-1 py-2.5',
              statusStyles[table.status]
            )}
          >
            <span className="font-mono text-[13px] font-bold tabular-nums">
              {m.tableShort}
              {table.n}
            </span>
            <span className="text-[9px] font-medium">{statusLabels[table.status]}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-[6px] bg-stone-900 px-3 py-2.5 text-stone-50">
        <Bell className="h-3.5 w-3.5 shrink-0 text-amber-400" strokeWidth={2} />
        <span className="truncate text-[11px] font-medium">{m.readyBanner}</span>
      </div>
    </div>
  );
}

/** Admin dashboard snapshot: sidebar, stat tiles, popular items. */
export function AdminDashboardMock({ copy, className }: MockProps) {
  const m = copy.mock;
  const navIcons = [ListChecks, LayoutDashboard, Users, Banknote, QrCode];
  const popular = [
    { item: m.items[0].name, width: 'w-[92%]' },
    { item: m.items[1].name, width: 'w-[64%]' },
    { item: m.items[2].name, width: 'w-[41%]' },
  ];
  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex w-full select-none overflow-hidden rounded-[8px] border border-stone-200 bg-white',
        className
      )}
    >
      {/* Sidebar */}
      <div className="w-[112px] shrink-0 border-e border-stone-100 bg-stone-50 p-3">
        <p className="px-1 pb-3 text-sm font-bold text-stone-900" dir="ltr">
          t
        </p>
        <div className="space-y-1">
          {m.adminNav.map((label, i) => {
            const Icon = navIcons[i];
            return (
              <span
                key={label}
                className={cn(
                  'flex items-center gap-1.5 rounded-[6px] px-2 py-1.5 text-[10px] font-medium',
                  i === 0 ? 'bg-stone-900 text-stone-50' : 'text-stone-500'
                )}
              >
                <Icon className="h-3 w-3 shrink-0" strokeWidth={1.75} />
                <span className="truncate">{label}</span>
              </span>
            );
          })}
        </div>
      </div>
      {/* Main panel */}
      <div className="min-w-0 flex-1 p-4">
        <p className="text-[13px] font-semibold text-stone-900">{m.adminTitle}</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { label: m.ordersToday, value: '148' },
            { label: m.activeTables, value: '11' },
            { label: `${m.cashCollected} (${m.currency})`, value: '18,540' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-[6px] border border-stone-100 p-2.5">
              <p className="truncate text-[9px] text-stone-500">{stat.label}</p>
              <p className="mt-1 truncate font-mono text-[15px] font-bold tabular-nums text-stone-900" dir="ltr">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[10px] font-semibold text-stone-500">{m.popularItems}</p>
        <div className="mt-2 space-y-2">
          {popular.map((row) => (
            <div key={row.item} className="flex items-center gap-2">
              <span className="w-24 shrink-0 truncate text-[10px] text-stone-600">{row.item}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
                <span className={cn('block h-full rounded-full bg-amber-700/70', row.width)} />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
