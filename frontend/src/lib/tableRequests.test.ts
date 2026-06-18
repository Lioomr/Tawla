import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isRecentResolution,
  markTableRequestResolved,
  normalizeCustomerTableRequest,
  normalizeSessionTableRequest,
  normalizeSessionTableRequestsResponse,
  normalizeTableRequestCreatedEvent,
  normalizeTableRequestResolvedEvent,
  normalizeWaiterTableRequest,
  normalizeWaiterTableRequestsResponse,
  prependSessionTableRequest,
  RESOLVED_DISPLAY_WINDOW_MS,
  tableRequestAgeLabel,
  type SessionTableRequest,
} from './tableRequests.ts';

const customerRequest = {
  request_token: 'treq_123',
  type: 'CALL_WAITER',
  status: 'OPEN',
  created_at: '2026-06-15T10:00:00Z',
};

test('normalizeCustomerTableRequest: accepts a valid public response', () => {
  assert.deepEqual(normalizeCustomerTableRequest(customerRequest), customerRequest);
});

test('normalizeCustomerTableRequest: rejects malformed or unsupported values', () => {
  assert.equal(normalizeCustomerTableRequest(null), null);
  assert.equal(normalizeCustomerTableRequest({ ...customerRequest, request_token: '' }), null);
  assert.equal(normalizeCustomerTableRequest({ ...customerRequest, type: 'CHAT' }), null);
  assert.equal(normalizeCustomerTableRequest({ ...customerRequest, status: 'DONE' }), null);
  assert.equal(normalizeCustomerTableRequest({ ...customerRequest, created_at: 'not-a-date' }), null);
});

// GET /table/requests/ uses `request_type` (the model field) and carries resolved_at.
const sessionPayload = {
  request_token: 'treq_456',
  request_type: 'REQUEST_BILL',
  status: 'OPEN',
  created_at: '2026-06-15T10:00:00Z',
  resolved_at: null,
  guest: null,
};

test('normalizeSessionTableRequest: maps request_type and keeps resolved_at', () => {
  assert.deepEqual(normalizeSessionTableRequest(sessionPayload), {
    request_token: 'treq_456',
    type: 'REQUEST_BILL',
    status: 'OPEN',
    created_at: '2026-06-15T10:00:00Z',
    resolved_at: null,
  });

  assert.deepEqual(
    normalizeSessionTableRequest({
      ...sessionPayload,
      status: 'RESOLVED',
      resolved_at: '2026-06-15T10:05:00Z',
    }),
    {
      request_token: 'treq_456',
      type: 'REQUEST_BILL',
      status: 'RESOLVED',
      created_at: '2026-06-15T10:00:00Z',
      resolved_at: '2026-06-15T10:05:00Z',
    },
  );
});

test('normalizeSessionTableRequest: rejects malformed payloads', () => {
  assert.equal(normalizeSessionTableRequest(null), null);
  assert.equal(normalizeSessionTableRequest('junk'), null);
  // POST spelling (`type`) is not accepted by the GET normalizer.
  assert.equal(normalizeSessionTableRequest({ ...sessionPayload, request_type: undefined, type: 'REQUEST_BILL' }), null);
  assert.equal(normalizeSessionTableRequest({ ...sessionPayload, request_type: 'CHAT' }), null);
  assert.equal(normalizeSessionTableRequest({ ...sessionPayload, status: 'DONE' }), null);
  assert.equal(normalizeSessionTableRequest({ ...sessionPayload, request_token: '' }), null);
  assert.equal(normalizeSessionTableRequest({ ...sessionPayload, created_at: 'not-a-date' }), null);
  // A present-but-unparseable resolved_at is malformed (vs. null which is valid).
  assert.equal(normalizeSessionTableRequest({ ...sessionPayload, resolved_at: 'nope' }), null);
});

test('normalizeSessionTableRequestsResponse: drops malformed rows defensively', () => {
  const response = normalizeSessionTableRequestsResponse({
    requests: [
      sessionPayload,
      { ...sessionPayload, request_token: '' },
      { ...sessionPayload, request_type: 'CHAT' },
      'junk',
    ],
  });
  assert.equal(response.requests.length, 1);
  assert.equal(response.requests[0].type, 'REQUEST_BILL');

  assert.deepEqual(normalizeSessionTableRequestsResponse(null), { requests: [] });
  assert.deepEqual(normalizeSessionTableRequestsResponse({ requests: 'nope' }), { requests: [] });
});

test('isRecentResolution: only recent RESOLVED requests stay prominent', () => {
  const now = new Date('2026-06-15T10:30:00Z').getTime();
  const base: SessionTableRequest = {
    request_token: 'treq_1',
    type: 'CALL_WAITER',
    status: 'RESOLVED',
    created_at: '2026-06-15T09:00:00Z',
    resolved_at: '2026-06-15T10:29:00Z',
  };
  assert.equal(isRecentResolution(base, now), true);
  // Resolved long ago: no longer prominent.
  assert.equal(
    isRecentResolution({ ...base, resolved_at: new Date(now - RESOLVED_DISPLAY_WINDOW_MS - 1000).toISOString() }, now),
    false,
  );
  // OPEN is never a "resolution".
  assert.equal(isRecentResolution({ ...base, status: 'OPEN', resolved_at: null }, now), false);
  // Missing resolved_at falls back to created_at (old) → not recent.
  assert.equal(isRecentResolution({ ...base, resolved_at: null }, now), false);
});

test('prependSessionTableRequest: inserts newest-first and de-duplicates by token', () => {
  const existing = normalizeSessionTableRequestsResponse({ requests: [sessionPayload] });
  const fresh: SessionTableRequest = {
    request_token: 'treq_456',
    type: 'REQUEST_BILL',
    status: 'OPEN',
    created_at: '2026-06-15T11:00:00Z',
    resolved_at: null,
  };
  const updated = prependSessionTableRequest(existing, fresh);
  assert.equal(updated.requests.length, 1);
  assert.equal(updated.requests[0].created_at, '2026-06-15T11:00:00Z');

  const withNew = prependSessionTableRequest(existing, { ...fresh, request_token: 'treq_999' });
  assert.equal(withNew.requests.length, 2);
  assert.equal(withNew.requests[0].request_token, 'treq_999');

  assert.deepEqual(prependSessionTableRequest(undefined, fresh), { requests: [fresh] });
});

test('markTableRequestResolved: flips a matching OPEN request only', () => {
  const response = normalizeSessionTableRequestsResponse({
    requests: [
      sessionPayload,
      { ...sessionPayload, request_token: 'treq_other', request_type: 'CALL_WAITER' },
    ],
  });
  const updated = markTableRequestResolved(response, 'treq_456', '2026-06-15T12:00:00Z');
  const target = updated.requests.find((r) => r.request_token === 'treq_456');
  const other = updated.requests.find((r) => r.request_token === 'treq_other');
  assert.equal(target?.status, 'RESOLVED');
  assert.equal(target?.resolved_at, '2026-06-15T12:00:00Z');
  assert.equal(other?.status, 'OPEN');

  // No matching token / empty cache are handled without throwing.
  assert.deepEqual(markTableRequestResolved(undefined, 'treq_456'), { requests: [] });
  assert.equal(markTableRequestResolved(response, 'nope').requests[0].status, 'OPEN');
});

test('normalizeWaiterTableRequest: keeps only public waiter request fields', () => {
  const normalized = normalizeWaiterTableRequest({
    ...customerRequest,
    table: 'Table 5',
    resolved_at: null,
    guest: {
      guest_token: 'guest_1',
      display_name: 'Omar',
      avatar_color: '#2563EB',
      id: 99,
    },
    id: 12,
    table_id: 4,
  });

  assert.deepEqual(normalized, {
    ...customerRequest,
    table: 'Table 5',
    resolved_at: null,
    guest: {
      guest_token: 'guest_1',
      display_name: 'Omar',
      avatar_color: '#2563EB',
    },
  });
});

test('normalizeWaiterTableRequest: rejects unsafe table labels', () => {
  assert.equal(normalizeWaiterTableRequest({ ...customerRequest, table: '<script>', resolved_at: null }), null);
});

test('normalizeWaiterTableRequestsResponse: drops malformed rows', () => {
  const response = normalizeWaiterTableRequestsResponse({
    requests: [
      { ...customerRequest, table: 'Table 1', resolved_at: null, guest: null },
      { ...customerRequest, request_token: '', table: 'Table 2', resolved_at: null },
      'junk',
    ],
  });

  assert.equal(response.requests.length, 1);
  assert.equal(response.requests[0].table, 'Table 1');
});

test('normalizeTableRequestResolvedEvent: validates customer socket payload', () => {
  assert.deepEqual(
    normalizeTableRequestResolvedEvent({
      type: 'table_request_resolved',
      request_token: 'treq_1',
      request_type: 'REQUEST_BILL',
      status: 'RESOLVED',
    }),
    {
      type: 'table_request_resolved',
      request_token: 'treq_1',
      request_type: 'REQUEST_BILL',
      status: 'RESOLVED',
    },
  );
  assert.equal(normalizeTableRequestResolvedEvent({ type: 'table_request_resolved', status: 'OPEN' }), null);
});

test('normalizeTableRequestCreatedEvent: validates waiter socket payload', () => {
  assert.deepEqual(
    normalizeTableRequestCreatedEvent({
      type: 'table_request_created',
      request_token: 'treq_2',
      request_type: 'NEED_HELP',
      table: 'Table 8',
      status: 'OPEN',
    }),
    {
      type: 'table_request_created',
      request_token: 'treq_2',
      request_type: 'NEED_HELP',
      table: 'Table 8',
      status: 'OPEN',
    },
  );
  assert.equal(normalizeTableRequestCreatedEvent({ type: 'table_request_created', table: '<x>' }), null);
});

test('tableRequestAgeLabel: formats compact operational age labels', () => {
  const now = new Date('2026-06-15T10:30:00Z').getTime();
  assert.equal(tableRequestAgeLabel('2026-06-15T10:29:40Z', now), 'just now');
  assert.equal(tableRequestAgeLabel('2026-06-15T10:20:00Z', now), '10m ago');
  assert.equal(tableRequestAgeLabel('2026-06-15T08:30:00Z', now), '2h ago');
});
