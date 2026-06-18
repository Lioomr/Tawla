"use client";

import { Loader2, Eye } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n";
import { getTextDir } from "@/lib/branding";
import { formatPrice } from "@/lib/format";
import { ApiError } from "@/lib/api";
import { useSessionOrders } from "@/hooks/useSessionOrders";
import { useLobbyStore } from "@/store/useLobbyStore";
import { isOwnOrder, normalizeOrderGuest } from "@/lib/lobby";
import { GuestAvatar } from "./GuestAvatar";

interface LobbyTableOrdersProps {
  enabled: boolean;
  onViewOrder: (orderId: string) => void;
}

const STATUS_LABEL: Record<string, TranslationKey> = {
  NEW: "statusNew",
  PREPARING: "statusPreparing",
  READY: "statusReady",
  SERVED: "statusServed",
  CANCELLED: "statusCancelled",
};

// Read-only view of every order placed at the table, clearly labelled by guest.
// The current user's orders are marked "you" (preferring the server's guest
// attribution, falling back to this device's own order ids). Orders with no
// guest attribution (`guest: null`) render gracefully as the table's, view-only.
export function LobbyTableOrders({ enabled, onViewOrder }: LobbyTableOrdersProps) {
  const { t } = useLanguage();
  const myOrderIds = useLobbyStore((s) => s.myOrderIds);
  const selfGuestToken = useLobbyStore((s) => s.selfGuestToken);
  const { data, isLoading, error } = useSessionOrders(enabled);

  const orders = data?.orders ?? [];

  return (
    <section aria-label={t("lobbyTableOrders")} className="mt-2">
      <div className="flex items-baseline justify-between px-1 mb-2">
        <h3 className="text-sm font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
          {t("lobbyTableOrders")}
        </h3>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6 text-zinc-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : error ? (
        <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-sm font-medium">
          {error instanceof ApiError ? error.message || t("lobbyTableOrdersError") : t("lobbyTableOrdersError")}
        </div>
      ) : orders.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 px-1 py-3">
          {t("lobbyTableOrdersEmpty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {orders.map((order) => {
            // Treat server data as untrusted: validate the guest payload first.
            const guest = normalizeOrderGuest(order.guest);
            const mine = isOwnOrder(guest, order.order_id, selfGuestToken, myOrderIds);
            const statusKey = STATUS_LABEL[order.status];
            const name = guest?.display_name ?? (mine ? t("lobbyYou") : t("lobbyTableLabel"));
            const showYouPill = mine && guest !== null;

            return (
              <li
                key={order.order_id}
                className="rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/60 p-3 flex items-center gap-3"
              >
                {guest ? (
                  <GuestAvatar
                    name={guest.display_name}
                    color={guest.avatar_color}
                    size={32}
                    isSelf={mine}
                  />
                ) : (
                  // Graceful placeholder for un-attributed orders.
                  <div
                    aria-hidden="true"
                    className="w-8 h-8 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-700"
                    style={{ boxShadow: "0 0 0 2px #ffffff" }}
                  />
                )}

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
                    <span className="font-medium text-zinc-500 dark:text-zinc-400">
                      {statusKey ? t(statusKey) : order.status}
                    </span>
                    <span className="text-zinc-300 dark:text-zinc-600" aria-hidden="true">·</span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">
                      {formatPrice(order.total_price)}
                    </span>
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
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs text-zinc-400 dark:text-zinc-500 px-1 mt-2">
        {t("lobbyTableOrdersHint")}
      </p>
    </section>
  );
}
