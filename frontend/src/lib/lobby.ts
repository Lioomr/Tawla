import type { KitchenOrderSummary, OrderDetailItem, OrderGuest, OrderSummary, SessionMode } from './api';

// ──────────────────────────────────────────────────────────────────────────
// Pure, dependency-free shared-table-lobby logic.
//
// This module intentionally imports nothing at runtime (only a type) so it can
// be unit-tested in isolation and reused by both the lobby store and the UI.
//
// Several constants mirror the backend (apps/sessions/services.py). The backend
// is the source of truth; these mirrors exist only because the session-start
// response does NOT include the current device's own display name / avatar
// colour, and the task requires client-side "Guest N" fallbacks. Keep them in
// sync if the backend palette or naming rule ever changes.
// ──────────────────────────────────────────────────────────────────────────

export const DISPLAY_NAME_MAX_LENGTH = 40;

// Rejects control characters (0x00–0x1f, 0x7f) and HTML angle brackets, matching
// the backend UNSAFE_DISPLAY_NAME_RE. Implemented as a code-point scan rather than
// a control-character regex literal (clearer, and avoids ESLint no-control-regex).
// Treat all user input as hostile until validated.
function hasUnsafeDisplayNameChar(value: string): boolean {
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    if (code <= 0x1f || code === 0x7f) return true;
    if (ch === '<' || ch === '>') return true;
  }
  return false;
}

// Mirror of backend AVATAR_COLORS. Deterministic per guest number so a guest's
// colour matches across every device at the table.
export const GUEST_AVATAR_COLORS = [
  '#2563EB',
  '#DC2626',
  '#16A34A',
  '#9333EA',
  '#EA580C',
  '#0891B2',
] as const;

export class GuestDisplayNameError extends Error {
  reason: 'unsafe' | 'too_long';
  constructor(reason: 'unsafe' | 'too_long') {
    super(reason === 'too_long' ? 'display name is too long' : 'display name is invalid');
    this.name = 'GuestDisplayNameError';
    this.reason = reason;
  }
}

// Normalises a display name exactly like the backend: trim, reject unsafe
// characters, collapse internal whitespace. An empty result is valid and means
// "reset to the generated Guest N name".
export function cleanGuestDisplayName(input: string | null | undefined): string {
  if (input == null) return '';
  const stripped = input.trim();
  if (hasUnsafeDisplayNameChar(stripped)) {
    throw new GuestDisplayNameError('unsafe');
  }
  const cleaned = stripped.split(/\s+/).filter(Boolean).join(' ');
  if (!cleaned) return '';
  if (cleaned.length > DISPLAY_NAME_MAX_LENGTH) {
    throw new GuestDisplayNameError('too_long');
  }
  return cleaned;
}

export type DisplayNameValidation =
  | { ok: true; value: string }
  | { ok: false; reason: 'unsafe' | 'too_long' };

// Non-throwing wrapper for UI: gate the submit button and show inline errors
// before ever hitting the network.
export function validateGuestDisplayName(input: string | null | undefined): DisplayNameValidation {
  try {
    return { ok: true, value: cleanGuestDisplayName(input) };
  } catch (err) {
    if (err instanceof GuestDisplayNameError) {
      return { ok: false, reason: err.reason };
    }
    throw err;
  }
}

// Canonical default name. English form on purpose: the backend stores this exact
// value, so every device shows the same label for an un-named guest.
export function defaultGuestName(guestNumber: number): string {
  return `Guest ${Math.max(1, Math.floor(guestNumber))}`;
}

export function guestAvatarColor(guestNumber: number): string {
  const n = Math.max(1, Math.floor(guestNumber));
  return GUEST_AVATAR_COLORS[(n - 1) % GUEST_AVATAR_COLORS.length];
}

// Short label for an avatar chip. Handles "Guest 2" -> "G2", single words, and
// multi-word names; never returns an empty string.
export function guestInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return [...parts[0]].slice(0, 2).join('').toUpperCase();
  return (firstChar(parts[0]) + firstChar(parts[parts.length - 1])).toUpperCase();
}

function firstChar(s: string): string {
  return [...s][0] ?? '';
}

export function isLobbyMode(mode: SessionMode | null | undefined): boolean {
  return mode === 'lobby';
}

// A guest we can identify by token (self or anyone seen via realtime events).
export interface GuestParticipant {
  guest_token: string;
  display_name: string;
  avatar_color: string;
}

// Shape of the realtime guest_joined / guest_updated payloads.
export interface GuestEventPayload {
  type?: string;
  guest_token: string;
  display_name: string;
  avatar_color: string;
  guest_count: number;
  mode: SessionMode;
}

// Upserts a participant by token, preserving insertion order of first contact.
export function upsertParticipant(
  participants: Record<string, GuestParticipant>,
  next: GuestParticipant,
): Record<string, GuestParticipant> {
  return {
    ...participants,
    [next.guest_token]: {
      guest_token: next.guest_token,
      display_name: next.display_name,
      avatar_color: next.avatar_color,
    },
  };
}

export interface Roster {
  /** Guests we can name: self first, then everyone learned via realtime. */
  known: GuestParticipant[];
  /** Guests counted by the backend that this device has not yet "met". */
  extraCount: number;
}

// Builds the displayable roster. Because the backend exposes no participant-list
// endpoint, earlier guests we never received an event for are represented purely
// as a count ("+N more") rather than invented names.
export function buildRoster(
  self: GuestParticipant | null,
  others: GuestParticipant[],
  guestCount: number,
): Roster {
  const known: GuestParticipant[] = [];
  const seen = new Set<string>();

  if (self) {
    known.push(self);
    seen.add(self.guest_token);
  }
  for (const other of others) {
    if (!seen.has(other.guest_token)) {
      known.push(other);
      seen.add(other.guest_token);
    }
  }

  const extraCount = Math.max(0, guestCount - known.length);
  return { known, extraCount };
}

// This device records the order ids it created; combined with the server's guest
// attribution it tells us which orders are "yours".
export function isMyOrder(orderId: string, myOrderIds: readonly string[]): boolean {
  return myOrderIds.includes(orderId);
}

// Defensively validate an order's `guest` payload before rendering. Returns a
// clean OrderGuest (only the three public fields) or null for missing/malformed
// input — treat all server data as untrusted. avatar_color is hex-checked at
// render time by GuestAvatar, so any string is accepted here.
export function normalizeOrderGuest(value: unknown): OrderGuest | null {
  if (!value || typeof value !== 'object') return null;
  const guest = value as Record<string, unknown>;
  if (typeof guest.guest_token !== 'string' || guest.guest_token.length === 0) return null;
  if (typeof guest.display_name !== 'string') return null;
  if (typeof guest.avatar_color !== 'string') return null;
  return {
    guest_token: guest.guest_token,
    display_name: guest.display_name,
    avatar_color: guest.avatar_color,
  };
}

// ── Kitchen board grouping (staff KDS) ───────────────────────────────────────
//
// Staff screens are table-first and operational: orders are grouped by table,
// never by guest. Guest attribution is a customer-experience feature and is
// intentionally not surfaced here (see the customer lobby for that).

export type KitchenTableStatus = 'NEW' | 'PREPARING' | 'READY';

// The only statuses the kitchen acts on. Anything else (SERVED/CANCELLED/junk)
// is dropped before grouping.
export const KITCHEN_ACTIVE_STATUSES: readonly KitchenTableStatus[] = ['NEW', 'PREPARING', 'READY'];

// Most-urgent-wins status for a table card: any NEW makes the table NEW; else any
// PREPARING makes it PREPARING; else (only READY left) it is READY. Returns null
// when there are no active statuses.
export function tableStatusPriority(statuses: readonly string[]): KitchenTableStatus | null {
  let hasPreparing = false;
  let hasReady = false;
  for (const s of statuses) {
    if (s === 'NEW') return 'NEW';
    if (s === 'PREPARING') hasPreparing = true;
    else if (s === 'READY') hasReady = true;
  }
  if (hasPreparing) return 'PREPARING';
  if (hasReady) return 'READY';
  return null;
}

export interface KitchenGroupedOrder {
  order_id: string;
  status: string;
  created_at: string;
  items: OrderDetailItem[];
}

export interface KitchenTableGroup {
  table: string;
  status: KitchenTableStatus;
  orderCount: number;
  /** Total quantity of items across the table's active orders. */
  itemCount: number;
  /** ISO timestamp of the oldest active order — drives "time ago" + sorting. */
  earliestCreatedAt: string;
  /** Orders that can be started (NEW → PREPARING). */
  newOrderIds: string[];
  /** Orders that can be marked ready (PREPARING → READY). */
  preparingOrderIds: string[];
  /** Active orders at this table, in arrival order. No guest attribution. */
  orders: KitchenGroupedOrder[];
}

const KITCHEN_STATUS_RANK: Record<KitchenTableStatus, number> = { NEW: 0, PREPARING: 1, READY: 2 };

// Groups active kitchen orders into one entry per table — table-first and
// operational, with no guest attribution. Treats server data as untrusted: skips
// orders missing a usable id/table and ignores non-active statuses. Tables are
// ordered most-urgent first (NEW → PREPARING → READY), then oldest order first
// within a tier, so the busiest tables stay at the top of the board.
export function groupKitchenOrdersByTable(
  orders: readonly KitchenOrderSummary[],
): KitchenTableGroup[] {
  const byTable = new Map<string, KitchenOrderSummary[]>();

  for (const order of orders ?? []) {
    if (!order || typeof order.order_id !== 'string' || order.order_id.length === 0) continue;
    if (typeof order.table !== 'string' || order.table.length === 0) continue;
    if (!KITCHEN_ACTIVE_STATUSES.includes(order.status as KitchenTableStatus)) continue;
    const list = byTable.get(order.table) ?? [];
    list.push(order);
    byTable.set(order.table, list);
  }

  const groups: KitchenTableGroup[] = [];

  for (const [table, tableOrders] of byTable) {
    const status = tableStatusPriority(tableOrders.map((o) => o.status));
    if (!status) continue;

    const orderList: KitchenGroupedOrder[] = tableOrders.map((o) => ({
      order_id: o.order_id,
      status: o.status,
      created_at: typeof o.created_at === 'string' ? o.created_at : '',
      items: Array.isArray(o.items) ? o.items : [],
    }));

    const earliestCreatedAt = tableOrders.reduce<string>((min, o) => {
      const ts = typeof o.created_at === 'string' ? o.created_at : '';
      if (!ts) return min;
      return min === '' || ts < min ? ts : min;
    }, '');

    const itemCount = tableOrders.reduce((n, o) => {
      if (!Array.isArray(o.items)) return n;
      return n + o.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
    }, 0);

    groups.push({
      table,
      status,
      orderCount: tableOrders.length,
      itemCount,
      earliestCreatedAt,
      newOrderIds: tableOrders.filter((o) => o.status === 'NEW').map((o) => o.order_id),
      preparingOrderIds: tableOrders.filter((o) => o.status === 'PREPARING').map((o) => o.order_id),
      orders: orderList,
    });
  }

  groups.sort((a, b) => {
    if (KITCHEN_STATUS_RANK[a.status] !== KITCHEN_STATUS_RANK[b.status]) {
      return KITCHEN_STATUS_RANK[a.status] - KITCHEN_STATUS_RANK[b.status];
    }
    if (a.earliestCreatedAt && b.earliestCreatedAt && a.earliestCreatedAt !== b.earliestCreatedAt) {
      return a.earliestCreatedAt < b.earliestCreatedAt ? -1 : 1;
    }
    return a.table.localeCompare(b.table);
  });

  return groups;
}

// An order is "yours" when the server attributes it to your guest token, or (as a
// fallback for un-attributed orders this device created) when its id is in the
// device's own order list.
export function isOwnOrder(
  guest: OrderGuest | null,
  orderId: string,
  selfGuestToken: string | null,
  myOrderIds: readonly string[],
): boolean {
  if (guest && selfGuestToken && guest.guest_token === selfGuestToken) {
    return true;
  }
  return isMyOrder(orderId, myOrderIds);
}

// ── Customer active-order progress (menu page) ───────────────────────────────
//
// The customer menu surfaces the table's *active* orders as a compact progress
// strip. "Active" means an order the kitchen/waiter is still working on; served
// and cancelled orders are demoted to a secondary "earlier" list. The ordered
// progression below also drives the mini stepper (index of the current status).

// Normal happy-path progression a customer's order moves through.
export const ORDER_PROGRESS_STEPS = ['NEW', 'PREPARING', 'READY', 'SERVED'] as const;
export type OrderProgressStatus = (typeof ORDER_PROGRESS_STEPS)[number];

// Statuses still in flight — the only ones shown prominently on the menu.
export const ACTIVE_ORDER_STATUSES: readonly string[] = ['NEW', 'PREPARING', 'READY'];

export function isActiveOrderStatus(status: string | null | undefined): boolean {
  return typeof status === 'string' && ACTIVE_ORDER_STATUSES.includes(status);
}

// 0-based position of a status in the progression, or -1 for anything off-path
// (e.g. CANCELLED or junk). Drives how many stepper segments are filled.
export function orderProgressIndex(status: string | null | undefined): number {
  return ORDER_PROGRESS_STEPS.indexOf(status as OrderProgressStatus);
}

export interface PartitionedSessionOrders {
  /** In-flight orders (NEW / PREPARING / READY), shown as primary progress cards. */
  active: OrderSummary[];
  /** SERVED / CANCELLED / anything off-path — demoted to a secondary list. */
  completed: OrderSummary[];
}

// Splits the table's orders into active vs completed for the menu progress
// section. Treats server data as untrusted: rows missing a usable order id are
// dropped entirely (never rendered, never counted).
export function partitionSessionOrders(
  orders: readonly OrderSummary[] | null | undefined,
): PartitionedSessionOrders {
  const active: OrderSummary[] = [];
  const completed: OrderSummary[] = [];

  for (const order of orders ?? []) {
    if (!order || typeof order.order_id !== 'string' || order.order_id.length === 0) continue;
    if (isActiveOrderStatus(order.status)) active.push(order);
    else completed.push(order);
  }

  return { active, completed };
}

// Validated ownership/attribution for a single order, ready for the UI to label.
// `guest` is the normalized (untrusted-input-safe) attribution or null; `mine`
// combines the server's guest token with this device's own order ids.
export interface OrderOwnership {
  mine: boolean;
  guest: OrderGuest | null;
}

export function describeOrderOwnership(
  rawGuest: unknown,
  orderId: string,
  selfGuestToken: string | null,
  myOrderIds: readonly string[],
): OrderOwnership {
  const guest = normalizeOrderGuest(rawGuest);
  return { guest, mine: isOwnOrder(guest, orderId, selfGuestToken, myOrderIds) };
}

// ── Session roster (GET /table/session/) ────────────────────────────────────

// Validated, frontend-shaped roster. `currentGuest` is null only if the server
// payload was malformed.
export interface NormalizedRoster {
  mode: SessionMode;
  guestCount: number;
  currentGuest: GuestParticipant | null;
  guests: GuestParticipant[];
}

// Defensively validate the roster payload before it touches the store. Returns
// null for anything malformed (treat all server data as untrusted); individual
// malformed guests are dropped rather than failing the whole roster.
export function normalizeRoster(value: unknown): NormalizedRoster | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;

  if (raw.mode !== 'solo' && raw.mode !== 'lobby') return null;
  if (typeof raw.guest_count !== 'number' || !Number.isFinite(raw.guest_count) || raw.guest_count < 0) {
    return null;
  }

  const guestsRaw = Array.isArray(raw.guests) ? raw.guests : [];
  const guests = guestsRaw
    .map(normalizeOrderGuest)
    .filter((g): g is GuestParticipant => g !== null);

  return {
    mode: raw.mode,
    guestCount: raw.guest_count,
    currentGuest: normalizeOrderGuest(raw.current_guest),
    guests,
  };
}

// Roster guests are ordered by join time, so the current guest's 1-based index is
// their guest number — which drives the default-name / colour and the
// "has the user chosen a custom name" check. Falls back when self isn't found.
export function deriveSelfGuestNumber(
  guests: readonly GuestParticipant[],
  selfGuestToken: string | null,
  fallback: number,
): number {
  if (!selfGuestToken) return fallback;
  const index = guests.findIndex((g) => g.guest_token === selfGuestToken);
  return index >= 0 ? index + 1 : fallback;
}

// The other guests at the table (everyone except self), keyed by guest token.
export function otherParticipants(
  guests: readonly GuestParticipant[],
  selfGuestToken: string | null,
): Record<string, GuestParticipant> {
  const others: Record<string, GuestParticipant> = {};
  for (const guest of guests) {
    if (guest.guest_token !== selfGuestToken) {
      others[guest.guest_token] = guest;
    }
  }
  return others;
}

export type RosterErrorKind = 'session_invalid' | 'guest_invalid' | 'other';

// Maps a roster error code to how the UI should react. Branches on the stable
// error code, never on message text.
export function classifyRosterError(code: string | null | undefined): RosterErrorKind {
  if (code === 'invalid_session' || code === 'expired_session') return 'session_invalid';
  if (code === 'invalid_guest') return 'guest_invalid';
  return 'other';
}
