"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLanguage } from "@/lib/i18n";
import { getTextDir } from "@/lib/branding";
import { useLobbyStore } from "@/store/useLobbyStore";
import { GuestAvatar } from "./GuestAvatar";

interface ToastData {
  id: number;
  name: string;
  color: string;
}

// Transient, polite notification when ANOTHER guest joins the shared table.
// Driven by the store's lastGuestEvent (which is never persisted, so a reload
// can't replay a stale toast). Self joins/updates are ignored.
export function GuestJoinedToast() {
  const { t } = useLanguage();
  const [toast, setToast] = useState<ToastData | null>(null);

  // Subscribe imperatively to the store so state is only set from the listener
  // and timer callbacks (never synchronously inside the effect body). Fires only
  // for OTHER guests joining; self joins/updates are ignored.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = useLobbyStore.subscribe((state, prev) => {
      const ev = state.lastGuestEvent;
      if (!ev || ev === prev.lastGuestEvent) return;
      if (ev.isSelf || ev.kind !== "joined") return;
      setToast({ id: ev.id, name: ev.displayName, color: ev.avatarColor });
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setToast(null), 3800);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  return (
    <div className="fixed top-3 inset-x-0 z-[55] px-4 pointer-events-none">
      <div className="max-w-md mx-auto">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              role="status"
              aria-live="polite"
              initial={{ opacity: 0, y: -20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.97 }}
              transition={{ type: "spring", damping: 22, stiffness: 260 }}
              className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-zinc-900 dark:bg-zinc-800 text-white px-4 py-3 shadow-xl"
            >
              <GuestAvatar name={toast.name} color={toast.color} size={32} ringColor="#18181b" />
              <span dir={getTextDir(toast.name)} className="text-sm font-bold truncate">
                {t("lobbyGuestJoined", { name: toast.name })}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
