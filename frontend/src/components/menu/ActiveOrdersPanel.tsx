"use client";

import { Eye, ChevronDown } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n";
import { getTextDir } from "@/lib/branding";
import { formatPrice } from "@/lib/format";
import type { OrderSummary } from "@/lib/api";
import { useSessionOrders } from "@/hooks/useSessionOrders";
import { useLobbyStore } from "@/store/useLobbyStore";
import {
  ORDER_PROGRESS_STEPS,
  describeOrderOwnership,
  isLobbyMode,
  orderProgressIndex,
  partitionSessionOrders,
} from "@/lib/lobby";
import { GuestAvatar } from "@/components/lobby/GuestAvatar";

interface ActiveOrdersPanelProps {
  onViewOrder: (orderId: string) => void;
}

const STATUS_LABEL: Record<string, TranslationKey> = {
  NEW: "statusNew",
  PREPARING: "statusPreparing",
  READY: "statusReady",
  SERVED: "statusServed",
  CANCELLED: "statusCancelled",
};

// Compact progress strip on the customer menu showing the table's *active*
// orders (NEW → PREPARING → READY). In solo mode each card is simply "your
// order"; in lobby mode orders are attributed by guest ("You" for this device's
// own orders, the guest's name/avatar otherwise, "Table" when un-attributed).
// Renders nothing until an active order exists, so the menu stays clean before
// the first order. Stays live via the shared session-orders query, which the
// order socket invalidates on order_created / order_updated.
export function ActiveOrdersPanel({ onViewOrder }: ActiveOrdersPanelProps) {
  const { t } = useLanguage();
  const lobby = isLobbyMode(useLobbyStore((s) => s.mode));
  const selfGuestToken = useLobbyStore((s) => s.selfGuestToken);
  const myOrderIds = useLobbyStore((s) => s.myOrderIds);

  const { data } = useSessionOrders(true);
  const { active, completed } = partitionSessionOrders(data?.orders);

  // Empty / loading / only-history states all collapse to "no active section".
  if (active.length === 0) return null;

  return (
    <div className="px-4">
      <section
        aria-label={lobby ? t("activeOrdersTitle") : t("activeOrderYours")}
        className="max-w-md mx-auto mb-2"
      >
        <h2 className="text-sm font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 px-1 mb-2">
          {lobby ? t("activeOrdersTitle") : t("activeOrderYours")}
        </h2>

        <ul className="flex flex-col gap-2">
          {active.map((order) => (
            <ActiveOrderCard
              key={order.order_id}
              order={order}
              lobby={lobby}
              selfGuestToken={selfGuestToken}
              myOrderIds={myOrderIds}
              onViewOrder={onViewOrder}
            />
          ))}
        </ul>

        {completed.length > 0 && (
          <details className="group mt-2">
            <summary className="flex items-center gap-1.5 px-1 py-1.5 text-xs font-bold text-zinc-500 dark:text-zinc-400 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
              <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
              {t("activeOrdersEarlier", { count: String(completed.length) })}
            </summary>
            <ul className="flex flex-col gap-1.5 mt-1.5">
              {completed.map((order) => (
                <CompletedOrderRow
                  key={order.order_id}
                  order={order}
                  lobby={lobby}
                  selfGuestToken={selfGuestToken}
                  myOrderIds={myOrderIds}
                  onViewOrder={onViewOrder}
                />
              ))}
            </ul>
          </details>
        )}
      </section>
    </div>
  );
}

interface OrderRowProps {
  order: OrderSummary;
  lobby: boolean;
  selfGuestToken: string | null;
  myOrderIds: readonly string[];
  onViewOrder: (orderId: string) => void;
}

function ActiveOrderCard({ order, lobby, selfGuestToken, myOrderIds, onViewOrder }: OrderRowProps) {
  const { t } = useLanguage();
  const { guest, mine } = describeOrderOwnership(order.guest, order.order_id, selfGuestToken, myOrderIds);
  const statusKey = STATUS_LABEL[order.status];
  const statusLabel = statusKey ? t(statusKey) : order.status;
  const progress = orderProgressIndex(order.status);

  // Solo: always "your order", no attribution UI. Lobby: name + optional "You".
  const name = lobby ? guest?.display_name ?? (mine ? t("lobbyYou") : t("lobbyTableLabel")) : t("activeOrderYours");
  const showYouPill = lobby && mine && guest !== null;

  return (
    <li className="rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/60 p-3">
      <div className="flex items-center gap-3">
        {lobby &&
          (guest ? (
            <GuestAvatar name={guest.display_name} color={guest.avatar_color} size={32} isSelf={mine} />
          ) : (
            <div
              aria-hidden="true"
              className="w-8 h-8 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-700"
              style={{ boxShadow: "0 0 0 2px #ffffff" }}
            />
          ))}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              dir={getTextDir(name)}
              className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate text-start"
            >
              {name}
            </span>
            {showYouPill && (
              <span
                className="shrink-0 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: "var(--brand-primary)", color: "var(--brand-on-primary)" }}
              >
                {t("lobbyYou")}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs">
            <span className="font-semibold" style={{ color: "var(--brand-accent)" }}>
              {statusLabel}
            </span>
            <span className="text-zinc-300 dark:text-zinc-600" aria-hidden="true">·</span>
            <span className="font-bold text-zinc-900 dark:text-zinc-100">{formatPrice(order.total_price)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onViewOrder(order.order_id)}
          aria-label={`${t("lobbyViewOrder")} — ${name}`}
          className="flex items-center gap-1.5 shrink-0 rounded-full bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-200 active:scale-95 transition-transform"
        >
          <Eye className="w-3.5 h-3.5" />
          {t("lobbyViewOrder")}
        </button>
      </div>

      {/* Mini stepper: filled up to the current status (NEW/PREPARING/READY/SERVED). */}
      <div
        className="mt-2.5 flex items-center gap-1"
        role="img"
        aria-label={`${t("activeOrderProgressLabel")}: ${statusLabel}`}
      >
        {ORDER_PROGRESS_STEPS.map((step, i) => (
          <span
            key={step}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= progress ? "" : "bg-zinc-200 dark:bg-zinc-700"
            }`}
            style={i <= progress ? { backgroundColor: "var(--brand-primary)" } : undefined}
          />
        ))}
      </div>
    </li>
  );
}

function CompletedOrderRow({ order, lobby, selfGuestToken, myOrderIds, onViewOrder }: OrderRowProps) {
  const { t } = useLanguage();
  const { guest, mine } = describeOrderOwnership(order.guest, order.order_id, selfGuestToken, myOrderIds);
  const statusKey = STATUS_LABEL[order.status];
  const statusLabel = statusKey ? t(statusKey) : order.status;
  const name = lobby ? guest?.display_name ?? (mine ? t("lobbyYou") : t("lobbyTableLabel")) : t("activeOrderYours");

  return (
    <li className="flex items-center gap-2 rounded-xl bg-zinc-100/70 dark:bg-zinc-900/40 px-3 py-2 text-xs">
      <span
        dir={getTextDir(name)}
        className="font-bold text-zinc-600 dark:text-zinc-300 truncate text-start min-w-0"
      >
        {name}
      </span>
      <span className="text-zinc-300 dark:text-zinc-600" aria-hidden="true">·</span>
      <span className="font-medium text-zinc-500 dark:text-zinc-400 shrink-0">{statusLabel}</span>
      <button
        type="button"
        onClick={() => onViewOrder(order.order_id)}
        aria-label={`${t("lobbyViewOrder")} — ${name}`}
        className="ms-auto shrink-0 text-zinc-400 dark:text-zinc-500 active:scale-95 transition-transform p-1 -m-1"
      >
        <Eye className="w-3.5 h-3.5" />
      </button>
    </li>
  );
}
