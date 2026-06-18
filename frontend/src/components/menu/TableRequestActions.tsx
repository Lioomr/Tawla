"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Bell, CheckCircle2, CircleHelp, Loader2, ReceiptText } from "lucide-react";
import { ApiError, createTableRequest } from "@/lib/api";
import { useLanguage, type TranslationKey } from "@/lib/i18n";
import {
  isRecentResolution,
  prependSessionTableRequest,
  type SessionTableRequest,
  type SessionTableRequestsResponse,
  type TableRequestType,
} from "@/lib/tableRequests";
import { tableRequestsQueryKey, useTableRequests } from "@/hooks/useTableRequests";
import { useCustomerStore } from "@/store/useCustomerStore";

const ACTIONS: Array<{
  type: TableRequestType;
  labelKey: TranslationKey;
  Icon: typeof Bell;
}> = [
  { type: "CALL_WAITER", labelKey: "tableRequestCallWaiter", Icon: Bell },
  { type: "REQUEST_BILL", labelKey: "tableRequestBill", Icon: ReceiptText },
  { type: "NEED_HELP", labelKey: "tableRequestHelp", Icon: CircleHelp },
];

export function TableRequestActions() {
  const { t } = useLanguage();
  const sessionToken = useCustomerStore((s) => s.sessionToken);
  const guestToken = useCustomerStore((s) => s.guestToken);
  const isValid = useCustomerStore((s) => s.isValid);
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  // Hydrated source of truth: the session's own requests (newest-first), restored
  // on load and refreshed on socket reconnect / resolved events / new request.
  const { data } = useTableRequests();
  const requests = data?.requests ?? [];

  const requestMutation = useMutation({
    mutationFn: (type: TableRequestType) => {
      if (!sessionToken || !isValid()) {
        throw new ApiError(401, { code: "invalid_session", message: "invalid session" });
      }
      return createTableRequest(sessionToken, type, guestToken);
    },
    onMutate: () => {
      setError(null);
    },
    onSuccess: (request) => {
      // Reflect the new request immediately, then resync with the authoritative list.
      queryClient.setQueryData<SessionTableRequestsResponse>(
        tableRequestsQueryKey(sessionToken),
        (old) => prependSessionTableRequest(old, { ...request, resolved_at: null }),
      );
      queryClient.invalidateQueries({ queryKey: tableRequestsQueryKey(sessionToken) });
    },
    onError: () => {
      setError(t("tableRequestError"));
    },
  });

  const isSending = requestMutation.isPending;
  const sendingType = isSending ? requestMutation.variables : undefined;

  // Newest request per type drives each button's restored state.
  const latestByType = new Map<TableRequestType, SessionTableRequest>();
  for (const request of requests) {
    if (!latestByType.has(request.type)) latestByType.set(request.type, request);
  }

  // Single compact status line: open wins over a recently-resolved hint; old
  // resolved requests intentionally surface nothing.
  const newestOpen = requests.find((request) => request.status === "OPEN");
  const newestResolved = requests.find((request) => isRecentResolution(request));

  const actionLabel = (type: TableRequestType) => {
    const action = ACTIONS.find((candidate) => candidate.type === type);
    return t(action?.labelKey ?? "tableRequestHelp");
  };

  const showResolved = !newestOpen && !!newestResolved;
  // An error only surfaces when nothing more useful (sending/open/resolved) does.
  const showError = !sendingType && !newestOpen && !showResolved && !!error;
  const statusText = sendingType
    ? t("tableRequestSending")
    : newestOpen
      ? t("tableRequestOpen", { type: actionLabel(newestOpen.type) })
      : showResolved
        ? t("tableRequestResolved", { type: actionLabel(newestResolved.type) })
        : showError
          ? error
          : null;

  return (
    <div className="px-4">
      <section
        aria-label={t("tableRequestsTitle")}
        className="max-w-md mx-auto mb-2 rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white dark:bg-zinc-900/60 p-2.5 shadow-sm"
      >
        <div className="flex items-center justify-between gap-3 px-1 pb-2">
          <p className="text-xs font-extrabold tracking-widest uppercase text-zinc-500 dark:text-zinc-400">
            {t("tableRequestsTitle")}
          </p>
          {statusText && (
            <p
              className={`flex items-center gap-1 text-[11px] font-bold text-end ${
                showError ? "text-red-600 dark:text-red-400" : "text-zinc-600 dark:text-zinc-300"
              }`}
              aria-live="polite"
            >
              {sendingType && <Loader2 className="w-3 h-3 animate-spin shrink-0" />}
              {showResolved && <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-600" />}
              {showError && <AlertCircle className="w-3 h-3 shrink-0" />}
              <span>{statusText}</span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {ACTIONS.map(({ type, labelKey, Icon }) => {
            const latest = latestByType.get(type);
            const isOpen = latest?.status === "OPEN";
            const isResolvedRecent = latest ? isRecentResolution(latest) : false;
            const isSendingThis = sendingType === type;

            return (
              <button
                key={type}
                type="button"
                onClick={() => requestMutation.mutate(type)}
                disabled={isOpen || isSendingThis}
                className={`relative min-h-12 rounded-xl border px-2 py-2 text-xs font-black tracking-tight transition-all active:scale-[0.98] disabled:cursor-not-allowed ${
                  isOpen
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950"
                    : isResolvedRecent
                      ? "border-emerald-300 bg-emerald-50 text-zinc-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-zinc-100"
                      : "border-zinc-200 bg-zinc-50 text-zinc-800 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-100 dark:hover:bg-zinc-900"
                }`}
              >
                {isResolvedRecent && !isOpen && (
                  <CheckCircle2 className="absolute top-1 end-1 w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                )}
                <span className="flex items-center justify-center gap-1.5">
                  {isSendingThis ? (
                    <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4 shrink-0" />
                  )}
                  <span className="truncate">{t(labelKey)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
