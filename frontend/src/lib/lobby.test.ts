import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ACTIVE_ORDER_STATUSES,
  GUEST_AVATAR_COLORS,
  ORDER_PROGRESS_STEPS,
  buildRoster,
  classifyRosterError,
  cleanGuestDisplayName,
  defaultGuestName,
  deriveSelfGuestNumber,
  describeOrderOwnership,
  guestAvatarColor,
  guestInitials,
  isActiveOrderStatus,
  isLobbyMode,
  isMyOrder,
  isOwnOrder,
  groupKitchenOrdersByTable,
  normalizeOrderGuest,
  normalizeRoster,
  orderProgressIndex,
  otherParticipants,
  partitionSessionOrders,
  tableStatusPriority,
  upsertParticipant,
  validateGuestDisplayName,
  type GuestEventPayload,
  type GuestParticipant,
} from './lobby.ts';

import type { KitchenOrderSummary, OrderGuest, OrderSummary } from './api.ts';

// ── Display name validation ────────────────────────────────────────────────

test('clean: trims and collapses internal whitespace', () => {
  assert.equal(cleanGuestDisplayName('  Alice   B  '), 'Alice B');
});

test('clean: blank / whitespace / null resets to default (empty string)', () => {
  assert.equal(cleanGuestDisplayName('   '), '');
  assert.equal(cleanGuestDisplayName(''), '');
  assert.equal(cleanGuestDisplayName(null), '');
  assert.equal(cleanGuestDisplayName(undefined), '');
});

test('validate: accepts a normal name', () => {
  assert.deepEqual(validateGuestDisplayName('Omar'), { ok: true, value: 'Omar' });
});

test('validate: rejects HTML angle brackets (XSS-shaped input)', () => {
  assert.deepEqual(validateGuestDisplayName('<script>'), { ok: false, reason: 'unsafe' });
  assert.deepEqual(validateGuestDisplayName('a>b'), { ok: false, reason: 'unsafe' });
});

test('validate: rejects control characters', () => {
  // Constructed via char codes so no invisible bytes live in the source.
  const withNull = 'bad' + String.fromCharCode(0) + 'name';
  const withEsc = 'bad' + String.fromCharCode(0x1b) + 'name';
  const withDel = 'bad' + String.fromCharCode(0x7f) + 'name';
  assert.deepEqual(validateGuestDisplayName(withNull), { ok: false, reason: 'unsafe' });
  assert.deepEqual(validateGuestDisplayName(withEsc), { ok: false, reason: 'unsafe' });
  assert.deepEqual(validateGuestDisplayName(withDel), { ok: false, reason: 'unsafe' });
});

test('validate: rejects names longer than the limit (after collapsing)', () => {
  assert.deepEqual(validateGuestDisplayName('x'.repeat(41)), { ok: false, reason: 'too_long' });
  assert.deepEqual(validateGuestDisplayName('x'.repeat(40)), { ok: true, value: 'x'.repeat(40) });
});

// ── Default identity (mirrors backend) ─────────────────────────────────────

test('default name and colour are deterministic per guest number', () => {
  assert.equal(defaultGuestName(1), 'Guest 1');
  assert.equal(defaultGuestName(3), 'Guest 3');
  assert.equal(guestAvatarColor(1), GUEST_AVATAR_COLORS[0]);
  assert.equal(guestAvatarColor(2), GUEST_AVATAR_COLORS[1]);
  // wraps around the palette
  assert.equal(guestAvatarColor(GUEST_AVATAR_COLORS.length + 1), GUEST_AVATAR_COLORS[0]);
});

test('initials never empty and read well for default names', () => {
  assert.equal(guestInitials('Guest 2'), 'G2');
  assert.equal(guestInitials('Omar'), 'OM');
  assert.equal(guestInitials('Alice Brown'), 'AB');
  assert.equal(guestInitials('   '), '?');
});

// ── Mode + roster (lobby switch / participant rendering) ────────────────────

test('isLobbyMode only true for lobby', () => {
  assert.equal(isLobbyMode('solo'), false);
  assert.equal(isLobbyMode('lobby'), true);
  assert.equal(isLobbyMode(null), false);
});

test('roster: self + others, deduped, with unmet guests as a count', () => {
  const self: GuestParticipant = { guest_token: 'g1', display_name: 'Guest 1', avatar_color: '#2563EB' };
  const others: GuestParticipant[] = [
    { guest_token: 'g2', display_name: 'Sara', avatar_color: '#DC2626' },
  ];
  // Backend says 4 at the table; we only know 2 -> 2 unmet.
  const roster = buildRoster(self, others, 4);
  assert.deepEqual(roster.known.map((g) => g.guest_token), ['g1', 'g2']);
  assert.equal(roster.extraCount, 2);
});

test('roster: self is never double-counted if echoed via realtime', () => {
  const self: GuestParticipant = { guest_token: 'g1', display_name: 'Guest 1', avatar_color: '#2563EB' };
  const others: GuestParticipant[] = [
    { guest_token: 'g1', display_name: 'Guest 1', avatar_color: '#2563EB' },
    { guest_token: 'g2', display_name: 'Guest 2', avatar_color: '#DC2626' },
  ];
  const roster = buildRoster(self, others, 2);
  assert.equal(roster.known.length, 2);
  assert.equal(roster.extraCount, 0);
});

test('guest_joined event flips a solo device into lobby and grows the roster', () => {
  // Solo device: itself only, mode solo.
  let mode: 'solo' | 'lobby' = 'solo';
  let participants: Record<string, GuestParticipant> = {};
  const self: GuestParticipant = { guest_token: 'g1', display_name: 'Guest 1', avatar_color: '#2563EB' };

  assert.equal(isLobbyMode(mode), false);
  assert.equal(buildRoster(self, Object.values(participants), 1).extraCount, 0);

  // A second guest joins via the customer socket.
  const event: GuestEventPayload = {
    type: 'guest_joined',
    guest_token: 'g2',
    display_name: 'Guest 2',
    avatar_color: '#DC2626',
    guest_count: 2,
    mode: 'lobby',
  };
  mode = event.mode;
  participants = upsertParticipant(participants, event);

  assert.equal(isLobbyMode(mode), true);
  const roster = buildRoster(self, Object.values(participants), event.guest_count);
  assert.deepEqual(roster.known.map((g) => g.display_name), ['Guest 1', 'Guest 2']);
  assert.equal(roster.extraCount, 0);
});

// ── Cart item ownership ─────────────────────────────────────────────────────

test('ownership: only this device own order ids count as yours', () => {
  const mine = ['ord_a', 'ord_b'];
  assert.equal(isMyOrder('ord_a', mine), true);
  assert.equal(isMyOrder('ord_c', mine), false);
  assert.equal(isMyOrder('ord_a', []), false);
});

// ── Order guest attribution (server-provided) ───────────────────────────────

test('normalizeOrderGuest: accepts a well-formed guest (order renders a label)', () => {
  const g = { guest_token: 'g2', display_name: 'Sara', avatar_color: '#DC2626' };
  assert.deepEqual(normalizeOrderGuest(g), g);
});

test('normalizeOrderGuest: keeps only the three public fields', () => {
  const raw = { guest_token: 'g2', display_name: 'Sara', avatar_color: '#DC2626', id: 5, secret: 'x' };
  assert.deepEqual(normalizeOrderGuest(raw), {
    guest_token: 'g2',
    display_name: 'Sara',
    avatar_color: '#DC2626',
  });
});

test('normalizeOrderGuest: null / garbage returns null (guest:null does not break UI)', () => {
  assert.equal(normalizeOrderGuest(null), null);
  assert.equal(normalizeOrderGuest(undefined), null);
  assert.equal(normalizeOrderGuest('nope'), null);
  assert.equal(normalizeOrderGuest({}), null);
  assert.equal(normalizeOrderGuest({ guest_token: '', display_name: 'x', avatar_color: '#fff' }), null);
  assert.equal(normalizeOrderGuest({ guest_token: 'g', display_name: 5, avatar_color: '#fff' }), null);
});

test('isOwnOrder: current guest renders as "you" via server attribution', () => {
  const guest = { guest_token: 'me', display_name: 'You', avatar_color: '#2563EB' };
  assert.equal(isOwnOrder(guest, 'ord_a', 'me', []), true);
});

test('isOwnOrder: another guest is not "you"', () => {
  const guest = { guest_token: 'other', display_name: 'Sara', avatar_color: '#DC2626' };
  assert.equal(isOwnOrder(guest, 'ord_a', 'me', []), false);
});

test('isOwnOrder: falls back to local order ids when guest is null', () => {
  assert.equal(isOwnOrder(null, 'ord_a', 'me', ['ord_a']), true);
  assert.equal(isOwnOrder(null, 'ord_b', 'me', ['ord_a']), false);
});

// ── Session roster (GET /table/session/) ────────────────────────────────────

const lobbyRoster = {
  mode: 'lobby',
  guest_count: 2,
  current_guest: { guest_token: 'g1', display_name: 'Guest 1', avatar_color: '#2563EB' },
  guests: [
    { guest_token: 'g1', display_name: 'Guest 1', avatar_color: '#2563EB' },
    { guest_token: 'g2', display_name: 'Sara', avatar_color: '#DC2626' },
  ],
};

test('normalizeRoster: validates a well-formed lobby roster', () => {
  const r = normalizeRoster(lobbyRoster);
  assert.ok(r);
  assert.equal(r.mode, 'lobby');
  assert.equal(r.guestCount, 2);
  assert.equal(r.guests.length, 2);
  assert.equal(r.currentGuest?.guest_token, 'g1');
});

test('normalizeRoster: solo roster does not enable lobby UI', () => {
  const r = normalizeRoster({
    mode: 'solo',
    guest_count: 1,
    current_guest: { guest_token: 'g1', display_name: 'Guest 1', avatar_color: '#2563EB' },
    guests: [{ guest_token: 'g1', display_name: 'Guest 1', avatar_color: '#2563EB' }],
  });
  assert.ok(r);
  assert.equal(isLobbyMode(r.mode), false);
});

test('normalizeRoster: lobby roster enables lobby UI', () => {
  const r = normalizeRoster(lobbyRoster);
  assert.ok(r);
  assert.equal(isLobbyMode(r.mode), true);
});

test('normalizeRoster: rejects malformed payloads', () => {
  assert.equal(normalizeRoster(null), null);
  assert.equal(normalizeRoster('nope'), null);
  assert.equal(normalizeRoster({}), null);
  assert.equal(normalizeRoster({ mode: 'bogus', guest_count: 1, guests: [] }), null);
  assert.equal(normalizeRoster({ mode: 'lobby', guest_count: 'two', guests: [] }), null);
  assert.equal(normalizeRoster({ mode: 'lobby', guest_count: -1, guests: [] }), null);
});

test('normalizeRoster: drops malformed guests, keeps valid ones', () => {
  const r = normalizeRoster({
    mode: 'lobby',
    guest_count: 2,
    current_guest: { guest_token: 'g1', display_name: 'Guest 1', avatar_color: '#2563EB' },
    guests: [
      { guest_token: 'g1', display_name: 'Guest 1', avatar_color: '#2563EB' },
      { guest_token: '', display_name: 'bad', avatar_color: '#000000' },
      'garbage',
    ],
  });
  assert.ok(r);
  assert.equal(r.guests.length, 1);
});

test('normalizeRoster: current_guest may be null without failing the roster', () => {
  const r = normalizeRoster({ mode: 'lobby', guest_count: 2, current_guest: null, guests: [] });
  assert.ok(r);
  assert.equal(r.currentGuest, null);
});

test('otherParticipants: excludes self, keyed by token (roster hydrates participants)', () => {
  const r = normalizeRoster(lobbyRoster);
  assert.ok(r);
  const others = otherParticipants(r.guests, 'g1');
  assert.deepEqual(Object.keys(others), ['g2']);
  assert.equal(others.g2.display_name, 'Sara');
});

test('deriveSelfGuestNumber: 1-based join-order index, with fallback', () => {
  const r = normalizeRoster(lobbyRoster);
  assert.ok(r);
  assert.equal(deriveSelfGuestNumber(r.guests, 'g1', 99), 1);
  assert.equal(deriveSelfGuestNumber(r.guests, 'g2', 99), 2);
  assert.equal(deriveSelfGuestNumber(r.guests, 'missing', 99), 99);
  assert.equal(deriveSelfGuestNumber(r.guests, null, 7), 7);
});

test('classifyRosterError: maps codes to recovery kinds (invalid_guest handling)', () => {
  assert.equal(classifyRosterError('invalid_session'), 'session_invalid');
  assert.equal(classifyRosterError('expired_session'), 'session_invalid');
  assert.equal(classifyRosterError('invalid_guest'), 'guest_invalid');
  assert.equal(classifyRosterError('rate_limit_exceeded'), 'other');
  assert.equal(classifyRosterError(null), 'other');
});

// ── Kitchen board grouping (group by table → by guest, status priority) ───────

test('tableStatusPriority: NEW wins over everything', () => {
  assert.equal(tableStatusPriority(['READY', 'PREPARING', 'NEW']), 'NEW');
});

test('tableStatusPriority: PREPARING wins when no NEW present', () => {
  assert.equal(tableStatusPriority(['READY', 'PREPARING', 'READY']), 'PREPARING');
});

test('tableStatusPriority: READY only when all active orders are READY', () => {
  assert.equal(tableStatusPriority(['READY', 'READY']), 'READY');
});

test('tableStatusPriority: null for empty / no active statuses', () => {
  assert.equal(tableStatusPriority([]), null);
  assert.equal(tableStatusPriority(['SERVED', 'CANCELLED']), null);
});

function kOrder(partial: Partial<KitchenOrderSummary>): KitchenOrderSummary {
  return {
    order_id: 'ord_default',
    table: 'Table 1',
    status: 'NEW',
    created_at: '2026-06-15T10:00:00Z',
    items: [],
    guest: null,
    ...partial,
  };
}

test('groupKitchenOrdersByTable: one card per table, not per order', () => {
  const groups = groupKitchenOrdersByTable([
    kOrder({ order_id: 'ord_a1', table: 'Table 1' }),
    kOrder({ order_id: 'ord_a2', table: 'Table 1' }),
    kOrder({ order_id: 'ord_b1', table: 'Table 2' }),
  ]);
  assert.equal(groups.length, 2);
  const t1 = groups.find((g) => g.table === 'Table 1');
  assert.ok(t1);
  assert.equal(t1.orderCount, 2);
});

test('groupKitchenOrdersByTable: table-first — orders aggregated, no guest attribution', () => {
  // Guest data on the wire is ignored by the staff board: orders group by table
  // only, never by guest.
  const sara = { guest_token: 'g2', display_name: 'Sara', avatar_color: '#DC2626' };
  const groups = groupKitchenOrdersByTable([
    kOrder({ order_id: 'ord_1', table: 'Table 1', guest: sara, items: [{ name: 'Tea', quantity: 1, notes: 'hot' }] }),
    kOrder({ order_id: 'ord_2', table: 'Table 1', guest: sara, items: [{ name: 'Cake', quantity: 2, notes: '' }] }),
    kOrder({ order_id: 'ord_3', table: 'Table 1', guest: null, items: [{ name: 'Water', quantity: 1, notes: '' }] }),
  ]);
  assert.equal(groups.length, 1);
  const [t1] = groups;

  // The grouped shape exposes orders + items only — no guest fields.
  assert.equal('guestGroups' in t1, false);
  assert.equal(t1.orders.length, 3);
  assert.deepEqual(t1.orders.map((o) => o.order_id), ['ord_1', 'ord_2', 'ord_3']);
  assert.equal(t1.orders[0].items[0].notes, 'hot'); // notes preserved for the kitchen

  assert.equal(t1.orderCount, 3);
  assert.equal(t1.itemCount, 4); // 1 + 2 + 1
});

test('groupKitchenOrdersByTable: table status + actionable id buckets', () => {
  const groups = groupKitchenOrdersByTable([
    kOrder({ order_id: 'ord_new', table: 'Table 1', status: 'NEW' }),
    kOrder({ order_id: 'ord_prep', table: 'Table 1', status: 'PREPARING' }),
    kOrder({ order_id: 'ord_ready', table: 'Table 1', status: 'READY' }),
  ]);
  const [t1] = groups;
  assert.equal(t1.status, 'NEW'); // most urgent wins
  assert.deepEqual(t1.newOrderIds, ['ord_new']);
  assert.deepEqual(t1.preparingOrderIds, ['ord_prep']);
});

test('groupKitchenOrdersByTable: drops non-active orders and malformed rows', () => {
  const groups = groupKitchenOrdersByTable([
    kOrder({ order_id: 'ord_served', table: 'Table 9', status: 'SERVED' }),
    kOrder({ order_id: '', table: 'Table 9', status: 'NEW' }),
    kOrder({ order_id: 'ord_ok', table: 'Table 9', status: 'READY' }),
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].orderCount, 1);
  assert.equal(groups[0].status, 'READY');
});

test('groupKitchenOrdersByTable: ordered most-urgent first, then oldest', () => {
  const groups = groupKitchenOrdersByTable([
    kOrder({ order_id: 'r1', table: 'Ready Table', status: 'READY', created_at: '2026-06-15T09:00:00Z' }),
    kOrder({ order_id: 'n1', table: 'New Late', status: 'NEW', created_at: '2026-06-15T11:00:00Z' }),
    kOrder({ order_id: 'n2', table: 'New Early', status: 'NEW', created_at: '2026-06-15T08:00:00Z' }),
  ]);
  assert.deepEqual(groups.map((g) => g.table), ['New Early', 'New Late', 'Ready Table']);
});

// ── Customer active-order progress (menu page) ───────────────────────────────

function sOrder(partial: Partial<OrderSummary>): OrderSummary {
  return {
    order_id: 'ord_default',
    status: 'NEW',
    total_price: '10.00',
    created_at: '2026-06-15T10:00:00Z',
    guest: null,
    ...partial,
  };
}

test('isActiveOrderStatus: only NEW/PREPARING/READY are active', () => {
  assert.deepEqual([...ACTIVE_ORDER_STATUSES], ['NEW', 'PREPARING', 'READY']);
  assert.equal(isActiveOrderStatus('NEW'), true);
  assert.equal(isActiveOrderStatus('PREPARING'), true);
  assert.equal(isActiveOrderStatus('READY'), true);
  assert.equal(isActiveOrderStatus('SERVED'), false);
  assert.equal(isActiveOrderStatus('CANCELLED'), false);
  assert.equal(isActiveOrderStatus(undefined), false);
});

test('orderProgressIndex: status maps to its step (stepper fills correctly)', () => {
  assert.deepEqual([...ORDER_PROGRESS_STEPS], ['NEW', 'PREPARING', 'READY', 'SERVED']);
  assert.equal(orderProgressIndex('NEW'), 0);
  assert.equal(orderProgressIndex('PREPARING'), 1);
  assert.equal(orderProgressIndex('READY'), 2);
  assert.equal(orderProgressIndex('SERVED'), 3);
  assert.equal(orderProgressIndex('CANCELLED'), -1); // off-path: no segments filled
  assert.equal(orderProgressIndex('junk'), -1);
});

test('partitionSessionOrders: active card appears once an order exists', () => {
  const { active, completed } = partitionSessionOrders([
    sOrder({ order_id: 'ord_new', status: 'NEW' }),
    sOrder({ order_id: 'ord_prep', status: 'PREPARING' }),
    sOrder({ order_id: 'ord_ready', status: 'READY' }),
  ]);
  assert.deepEqual(active.map((o) => o.order_id), ['ord_new', 'ord_prep', 'ord_ready']);
  assert.equal(completed.length, 0);
});

test('partitionSessionOrders: served/cancelled are demoted to completed (not active)', () => {
  const { active, completed } = partitionSessionOrders([
    sOrder({ order_id: 'ord_active', status: 'PREPARING' }),
    sOrder({ order_id: 'ord_served', status: 'SERVED' }),
    sOrder({ order_id: 'ord_cancelled', status: 'CANCELLED' }),
  ]);
  assert.deepEqual(active.map((o) => o.order_id), ['ord_active']);
  assert.deepEqual(completed.map((o) => o.order_id), ['ord_served', 'ord_cancelled']);
});

test('partitionSessionOrders: no active orders → empty (section hides)', () => {
  const { active } = partitionSessionOrders([
    sOrder({ order_id: 'ord_served', status: 'SERVED' }),
    sOrder({ order_id: 'ord_cancelled', status: 'CANCELLED' }),
  ]);
  assert.equal(active.length, 0);
});

test('partitionSessionOrders: empty / nullish input is safe (no order before any exists)', () => {
  assert.deepEqual(partitionSessionOrders([]), { active: [], completed: [] });
  assert.deepEqual(partitionSessionOrders(null), { active: [], completed: [] });
  assert.deepEqual(partitionSessionOrders(undefined), { active: [], completed: [] });
});

test('partitionSessionOrders: drops rows missing a usable order id (untrusted server data)', () => {
  const { active, completed } = partitionSessionOrders([
    sOrder({ order_id: '', status: 'NEW' }),
    // @ts-expect-error — deliberately malformed row from the wire
    { status: 'NEW' },
    sOrder({ order_id: 'ord_ok', status: 'NEW' }),
  ]);
  assert.deepEqual(active.map((o) => o.order_id), ['ord_ok']);
  assert.equal(completed.length, 0);
});

const selfGuest: OrderGuest = { guest_token: 'g_self', display_name: 'Omar', avatar_color: '#2563EB' };
const otherGuest: OrderGuest = { guest_token: 'g_other', display_name: 'Sara', avatar_color: '#DC2626' };

test('describeOrderOwnership: lobby labels the current guest as mine ("You")', () => {
  const { mine, guest } = describeOrderOwnership(selfGuest, 'ord_1', 'g_self', []);
  assert.equal(mine, true);
  assert.equal(guest?.display_name, 'Omar');
});

test('describeOrderOwnership: another guest is not mine (shows their name)', () => {
  const { mine, guest } = describeOrderOwnership(otherGuest, 'ord_2', 'g_self', []);
  assert.equal(mine, false);
  assert.equal(guest?.display_name, 'Sara');
});

test('describeOrderOwnership: falls back to this device\'s own order ids', () => {
  // Un-attributed order created by this device is still "mine".
  const { mine, guest } = describeOrderOwnership(null, 'ord_mine', 'g_self', ['ord_mine']);
  assert.equal(mine, true);
  assert.equal(guest, null);
});

test('describeOrderOwnership: guest:null renders safely (no attribution, not mine)', () => {
  const { mine, guest } = describeOrderOwnership(null, 'ord_x', 'g_self', []);
  assert.equal(guest, null);
  assert.equal(mine, false);
});

test('describeOrderOwnership: malformed guest payload is rejected, not rendered', () => {
  const { guest, mine } = describeOrderOwnership({ display_name: 'X' }, 'ord_y', 'g_self', []);
  assert.equal(guest, null); // missing guest_token → dropped
  assert.equal(mine, false);
});
