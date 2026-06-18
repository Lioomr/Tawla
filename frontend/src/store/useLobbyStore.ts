import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SessionMode } from '@/lib/api';
import {
  type GuestEventPayload,
  type GuestParticipant,
  type NormalizedRoster,
  defaultGuestName,
  deriveSelfGuestNumber,
  guestAvatarColor,
  otherParticipants,
  upsertParticipant,
} from '@/lib/lobby';

// Transient marker for the most recent realtime guest event, used to drive the
// "a guest joined" toast. Not persisted (would re-fire a stale toast on reload).
export interface LobbyEvent {
  id: number;
  kind: 'joined' | 'updated';
  guestToken: string;
  displayName: string;
  avatarColor: string;
  isSelf: boolean;
}

interface LobbyState {
  // The session these lobby facts belong to. Guards against showing one table's
  // guests on another table after a re-scan.
  sessionToken: string | null;
  mode: SessionMode;
  guestCount: number;

  // This device's identity within the session.
  selfGuestToken: string | null;
  selfGuestNumber: number; // fixed at join; drives the default name/colour
  selfDisplayName: string | null;
  selfAvatarColor: string | null;
  hasCustomName: boolean;

  // Other guests at the table (keyed by guest token). Primarily hydrated from the
  // authoritative roster endpoint (GET /table/session/) and supplemented between
  // fetches by realtime guest_joined / guest_updated events.
  participants: Record<string, GuestParticipant>;

  // Orders created by THIS device — the only orders we can honestly label "yours".
  myOrderIds: string[];

  // One-time, skippable name prompt shown after lobby activates.
  namePromptDismissed: boolean;

  lastGuestEvent: LobbyEvent | null;

  initFromSession: (args: {
    sessionToken: string;
    guestToken: string;
    mode: SessionMode;
    guestCount: number;
  }) => void;
  applyGuestEvent: (payload: GuestEventPayload) => void;
  applyRoster: (roster: NormalizedRoster) => void;
  setSelfIdentity: (args: {
    displayName: string;
    avatarColor: string;
    mode: SessionMode;
    guestCount: number;
  }) => void;
  addMyOrderId: (orderId: string) => void;
  dismissNamePrompt: () => void;
  reset: () => void;
}

const INITIAL = {
  sessionToken: null,
  mode: 'solo' as SessionMode,
  guestCount: 1,
  selfGuestToken: null,
  selfGuestNumber: 1,
  selfDisplayName: null,
  selfAvatarColor: null,
  hasCustomName: false,
  participants: {} as Record<string, GuestParticipant>,
  myOrderIds: [] as string[],
  namePromptDismissed: false,
  lastGuestEvent: null as LobbyEvent | null,
};

let eventSeq = 0;

export const useLobbyStore = create<LobbyState>()(
  persist(
    (set, get) => ({
      ...INITIAL,

      initFromSession: ({ sessionToken, guestToken, mode, guestCount }) => {
        const state = get();
        // At join time this device is the latest guest, so its number equals the
        // returned guest_count. Its default name/colour mirror the backend.
        const selfGuestNumber = guestCount;
        const base =
          sessionToken === state.sessionToken
            ? state // same session (e.g. re-scan): keep known participants + orders
            : INITIAL; // new session: start clean, never leak the old table

        set({
          ...base,
          sessionToken,
          mode,
          guestCount,
          selfGuestToken: guestToken,
          selfGuestNumber,
          selfDisplayName: defaultGuestName(selfGuestNumber),
          selfAvatarColor: guestAvatarColor(selfGuestNumber),
          hasCustomName: false,
          lastGuestEvent: null,
          // namePromptDismissed resets with a new session via INITIAL spread;
          // on same-session re-scan it carries over from `base`.
        });
      },

      applyGuestEvent: (payload) => {
        const state = get();
        if (!state.sessionToken) return;

        const isSelf = payload.guest_token === state.selfGuestToken;

        set((prev) => {
          const next: Partial<LobbyState> = {
            mode: payload.mode,
            guestCount: payload.guest_count,
            lastGuestEvent: {
              id: ++eventSeq,
              kind: payload.type === 'guest_updated' ? 'updated' : 'joined',
              guestToken: payload.guest_token,
              displayName: payload.display_name,
              avatarColor: payload.avatar_color,
              isSelf,
            },
          };

          if (isSelf) {
            next.selfDisplayName = payload.display_name;
            next.selfAvatarColor = payload.avatar_color;
            next.hasCustomName = payload.display_name !== defaultGuestName(prev.selfGuestNumber);
          } else {
            next.participants = upsertParticipant(prev.participants, {
              guest_token: payload.guest_token,
              display_name: payload.display_name,
              avatar_color: payload.avatar_color,
            });
          }
          return next;
        });
      },

      applyRoster: (roster) => {
        set((prev) => {
          // Roster is authoritative: it lists every guest at the table, so the
          // participant map and self identity are taken from it directly.
          const self = roster.currentGuest;
          const selfToken = self?.guest_token ?? prev.selfGuestToken;
          const selfGuestNumber = deriveSelfGuestNumber(
            roster.guests,
            selfToken,
            prev.selfGuestNumber,
          );
          return {
            mode: roster.mode,
            guestCount: roster.guestCount,
            participants: otherParticipants(roster.guests, selfToken),
            selfGuestToken: selfToken,
            selfGuestNumber,
            selfDisplayName: self ? self.display_name : prev.selfDisplayName,
            selfAvatarColor: self ? self.avatar_color : prev.selfAvatarColor,
            hasCustomName: self
              ? self.display_name !== defaultGuestName(selfGuestNumber)
              : prev.hasCustomName,
          };
        });
      },

      setSelfIdentity: ({ displayName, avatarColor, mode, guestCount }) => {
        set((prev) => ({
          selfDisplayName: displayName,
          selfAvatarColor: avatarColor,
          hasCustomName: displayName !== defaultGuestName(prev.selfGuestNumber),
          mode,
          guestCount,
        }));
      },

      addMyOrderId: (orderId) => {
        set((prev) =>
          prev.myOrderIds.includes(orderId)
            ? prev
            : { myOrderIds: [...prev.myOrderIds, orderId] },
        );
      },

      dismissNamePrompt: () => set({ namePromptDismissed: true }),

      reset: () => set({ ...INITIAL }),
    }),
    {
      name: 'tawlax-lobby',
      // lastGuestEvent is transient — never restore a stale toast trigger.
      partialize: (state) => {
        const persisted: Partial<LobbyState> = { ...state };
        delete persisted.lastGuestEvent;
        return persisted;
      },
    },
  ),
);
