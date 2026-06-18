"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { getTextDir } from "@/lib/branding";
import { ApiError } from "@/lib/api";
import {
  DISPLAY_NAME_MAX_LENGTH,
  defaultGuestName,
  guestAvatarColor,
  validateGuestDisplayName,
} from "@/lib/lobby";
import { useLobbyStore } from "@/store/useLobbyStore";
import { useUpdateGuestName } from "@/hooks/useGuest";
import { GuestAvatar } from "./GuestAvatar";

interface GuestNameDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

// Bottom-sheet for setting the current guest's display name. The name is always
// optional: saving blank restores the generated "Guest N". The seeded form lives
// in a child that mounts only while open, so its initial value is set once at
// mount (no syncing effect, no ref reads during render).
export function GuestNameDialog({ isOpen, onClose }: GuestNameDialogProps) {
  const { t, dir } = useLanguage();

  // Escape closes the sheet while it is open.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            dir={dir}
            role="dialog"
            aria-modal="true"
            aria-labelledby="lobby-name-title"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md bg-zinc-50 dark:bg-zinc-950 rounded-t-3xl flex flex-col shadow-2xl pb-8"
          >
            <div className="w-full flex justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            </div>

            <div className="flex items-start justify-between px-6 pt-2">
              <div className="pe-4">
                <h2
                  id="lobby-name-title"
                  className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight"
                >
                  {t("lobbyNameTitle")}
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  {t("lobbyNameSubtitle")}
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label={t("close")}
                className="w-8 h-8 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 active:scale-95 transition-transform"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <GuestNameForm onClose={onClose} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Mounted only while the sheet is open, so the input seeds once via the useState
// initializer. Handles client validation (mirroring the backend) and surfaces
// API validation errors with the shared red error pattern.
function GuestNameForm({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  const selfDisplayName = useLobbyStore((s) => s.selfDisplayName);
  const selfAvatarColor = useLobbyStore((s) => s.selfAvatarColor);
  const hasCustomName = useLobbyStore((s) => s.hasCustomName);
  const selfGuestNumber = useLobbyStore((s) => s.selfGuestNumber);
  const updateName = useUpdateGuestName();

  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(() =>
    hasCustomName && selfDisplayName ? selfDisplayName : "",
  );
  const [serverError, setServerError] = useState<string | null>(null);

  // Focus the input shortly after the sheet opens (no state writes here).
  useEffect(() => {
    const id = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(id);
  }, []);

  const validation = validateGuestDisplayName(value);
  const clientErrorText = validation.ok
    ? null
    : validation.reason === "too_long"
      ? t("lobbyNameErrorTooLong")
      : t("lobbyNameErrorUnsafe");

  const previewName =
    validation.ok && validation.value ? validation.value : defaultGuestName(selfGuestNumber);
  const previewColor = selfAvatarColor ?? guestAvatarColor(selfGuestNumber);

  const handleSave = async () => {
    if (!validation.ok || updateName.isPending) return;
    setServerError(null);
    try {
      await updateName.mutateAsync(validation.value);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(
          err.code === "invalid_request" ? t("lobbyNameErrorUnsafe") : err.message || t("lobbyNameError"),
        );
      } else {
        setServerError(t("lobbyNameError"));
      }
    }
  };

  return (
    <>
      <div className="px-6 pt-5 flex items-center gap-3">
        <GuestAvatar name={previewName} color={previewColor} size={44} isSelf ringColor="#fafafa" />
        <div className="flex-1">
          <label
            htmlFor="lobby-display-name"
            className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 text-start"
          >
            {t("lobbyNameLabel")}
          </label>
          <input
            ref={inputRef}
            id="lobby-display-name"
            type="text"
            dir="auto"
            inputMode="text"
            autoComplete="off"
            maxLength={DISPLAY_NAME_MAX_LENGTH}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSave();
              }
            }}
            placeholder={t("lobbyNamePlaceholder")}
            aria-invalid={!validation.ok}
            aria-describedby={clientErrorText ? "lobby-name-error" : undefined}
            className="w-full bg-zinc-100 dark:bg-zinc-900 border-none rounded-xl p-3 text-base outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-shadow text-zinc-900 dark:text-zinc-100 text-start"
          />
        </div>
      </div>

      {(clientErrorText || serverError) && (
        <div
          id="lobby-name-error"
          role="alert"
          className="mx-6 mt-3 p-3 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-sm font-medium"
          dir={getTextDir(clientErrorText || serverError || "")}
        >
          {clientErrorText || serverError}
        </div>
      )}

      <div className="px-6 pt-5 flex items-center gap-2">
        <button
          onClick={onClose}
          className="flex-1 py-3.5 rounded-2xl font-bold text-zinc-700 dark:text-zinc-200 bg-zinc-200 dark:bg-zinc-800 active:scale-95 transition-transform"
        >
          {t("lobbyNameSkip")}
        </button>
        <button
          onClick={handleSave}
          disabled={!validation.ok || updateName.isPending}
          style={{ backgroundColor: "var(--brand-primary)", color: "var(--brand-on-primary)" }}
          className="flex-[2] py-3.5 rounded-2xl font-bold tracking-tight shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {updateName.isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t("lobbyNameSaving")}
            </>
          ) : (
            t("lobbyNameSave")
          )}
        </button>
      </div>
    </>
  );
}
