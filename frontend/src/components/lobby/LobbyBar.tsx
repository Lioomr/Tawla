"use client";

import { UserPen, Pencil } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { getTextDir } from "@/lib/branding";
import { useLobbyStore } from "@/store/useLobbyStore";
import { buildRoster, isLobbyMode, type GuestParticipant } from "@/lib/lobby";
import { GuestAvatar } from "./GuestAvatar";

const MAX_AVATARS = 5;

interface LobbyBarProps {
  onEditName: () => void;
}

// Compact shared-table context shown on the menu in lobby mode only. Renders the
// known participants (self highlighted) plus a count, and a clear, skippable
// affordance to set/edit the current guest's name. Renders nothing in solo mode,
// keeping single-device tables completely friction-free.
export function LobbyBar({ onEditName }: LobbyBarProps) {
  const { t } = useLanguage();
  const mode = useLobbyStore((s) => s.mode);
  const guestCount = useLobbyStore((s) => s.guestCount);
  const participants = useLobbyStore((s) => s.participants);
  const hasCustomName = useLobbyStore((s) => s.hasCustomName);
  // Select primitives (cached snapshots), then assemble the object in render —
  // returning a fresh object from a zustand selector breaks useSyncExternalStore.
  const selfGuestToken = useLobbyStore((s) => s.selfGuestToken);
  const selfDisplayName = useLobbyStore((s) => s.selfDisplayName);
  const selfAvatarColor = useLobbyStore((s) => s.selfAvatarColor);
  const self: GuestParticipant | null =
    selfGuestToken && selfDisplayName && selfAvatarColor
      ? { guest_token: selfGuestToken, display_name: selfDisplayName, avatar_color: selfAvatarColor }
      : null;

  if (!isLobbyMode(mode)) return null;

  const others = Object.values(participants).filter(
    (p) => p.guest_token !== self?.guest_token,
  );
  const { known, extraCount } = buildRoster(self, others, guestCount);
  const shown = known.slice(0, MAX_AVATARS);
  const overflow = extraCount + (known.length - shown.length);

  return (
    <div className="px-4">
      <section
        aria-label={t("lobbySharedTable")}
        className="max-w-md mx-auto mb-2 flex items-center gap-3 rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white dark:bg-zinc-900/60 px-3.5 py-2.5 shadow-sm"
      >
        {/* Avatar stack of known guests */}
        <div className="flex items-center shrink-0" aria-hidden="true">
          {shown.map((g, i) => (
            <div
              key={g.guest_token}
              style={{ marginInlineStart: i === 0 ? 0 : -10, zIndex: shown.length - i }}
            >
              <GuestAvatar
                name={g.display_name}
                color={g.avatar_color}
                size={34}
                isSelf={g.guest_token === self?.guest_token}
              />
            </div>
          ))}
          {overflow > 0 && (
            <div
              style={{ marginInlineStart: -10, width: 34, height: 34, boxShadow: "0 0 0 2px #fff" }}
              className="flex items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-bold"
            >
              {t("lobbyMoreGuests", { count: String(overflow) })}
            </div>
          )}
        </div>

        {/* Title + count */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 truncate">
            {t("lobbySharedTable")}
          </p>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate">
            {t("lobbyAtThisTable", { count: String(guestCount) })}
          </p>
        </div>

        {/* Name affordance — prominent nudge until a custom name is set */}
        {hasCustomName && self ? (
          <button
            type="button"
            onClick={onEditName}
            aria-label={t("lobbyEditName")}
            className="flex items-center gap-1.5 shrink-0 rounded-full bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-200 active:scale-95 transition-transform max-w-[45%]"
          >
            <span dir={getTextDir(self.display_name)} className="truncate">
              {self.display_name}
            </span>
            <Pencil className="w-3.5 h-3.5 shrink-0" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onEditName}
            style={{ backgroundColor: "var(--brand-primary)", color: "var(--brand-on-primary)" }}
            className="flex items-center gap-1.5 shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold active:scale-95 transition-transform shadow-sm"
          >
            <UserPen className="w-3.5 h-3.5" />
            {t("lobbyAddYourName")}
          </button>
        )}
      </section>
    </div>
  );
}
