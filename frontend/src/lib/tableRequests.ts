import type { OrderGuest } from './api';

export const TABLE_REQUEST_TYPES = ['CALL_WAITER', 'REQUEST_BILL', 'NEED_HELP'] as const;
export type TableRequestType = (typeof TABLE_REQUEST_TYPES)[number];

export const TABLE_REQUEST_STATUSES = ['OPEN', 'RESOLVED'] as const;
export type TableRequestStatus = (typeof TABLE_REQUEST_STATUSES)[number];

export interface CustomerTableRequest {
  request_token: string;
  type: TableRequestType;
  status: TableRequestStatus;
  created_at: string;
}

// Shape returned by GET /table/requests/ (the customer's own session list).
// Mirrors CustomerTableRequest but additionally carries resolved_at so the menu
// can tell a freshly-resolved request from an old one (see isRecentResolution).
export interface SessionTableRequest extends CustomerTableRequest {
  resolved_at: string | null;
}

export interface SessionTableRequestsResponse {
  requests: SessionTableRequest[];
}

// How long a RESOLVED request keeps a visible "resolved" affordance on the menu
// before it fades back to a plain, re-tappable button. Keeps old/stale resolved
// requests from cluttering the compact UI after a refresh.
export const RESOLVED_DISPLAY_WINDOW_MS = 5 * 60 * 1000;

export interface WaiterTableRequest extends CustomerTableRequest {
  table: string;
  resolved_at: string | null;
  guest: OrderGuest | null;
}

export interface WaiterTableRequestsResponse {
  requests: WaiterTableRequest[];
}

export interface TableRequestResolvedEvent {
  type: 'table_request_resolved';
  request_token: string;
  request_type: TableRequestType;
  status: 'RESOLVED';
}

export interface TableRequestCreatedEvent {
  type: 'table_request_created';
  request_token: string;
  request_type: TableRequestType;
  table: string;
  status: 'OPEN';
}

export const TABLE_REQUEST_LABEL: Record<TableRequestType, string> = {
  CALL_WAITER: 'Call waiter',
  REQUEST_BILL: 'Request bill',
  NEED_HELP: 'Need help',
};

export const TABLE_REQUEST_SHORT_LABEL: Record<TableRequestType, string> = {
  CALL_WAITER: 'Waiter',
  REQUEST_BILL: 'Bill',
  NEED_HELP: 'Help',
};

export function isTableRequestType(value: unknown): value is TableRequestType {
  return typeof value === 'string' && TABLE_REQUEST_TYPES.includes(value as TableRequestType);
}

function isTableRequestStatus(value: unknown): value is TableRequestStatus {
  return typeof value === 'string' && TABLE_REQUEST_STATUSES.includes(value as TableRequestStatus);
}

function cleanToken(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const token = value.trim();
  return token.length > 0 && token.length <= 128 ? token : null;
}

function cleanDisplayString(value: unknown, maxLength = 120): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text || text.length > maxLength) return null;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code <= 0x1f || code === 0x7f) return null;
    if (ch === '<' || ch === '>') return null;
  }
  return text;
}

function cleanIsoString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text || Number.isNaN(new Date(text).getTime())) return null;
  return text;
}

function normalizePublicGuest(value: unknown): OrderGuest | null {
  if (!value || typeof value !== 'object') return null;
  const guest = value as Record<string, unknown>;
  const guestToken = cleanToken(guest.guest_token);
  const displayName = cleanDisplayString(guest.display_name, 80);
  if (!guestToken || !displayName || typeof guest.avatar_color !== 'string') return null;
  return {
    guest_token: guestToken,
    display_name: displayName,
    avatar_color: guest.avatar_color,
  };
}

export function normalizeCustomerTableRequest(value: unknown): CustomerTableRequest | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const requestToken = cleanToken(raw.request_token);
  const createdAt = cleanIsoString(raw.created_at);

  if (!requestToken || !isTableRequestType(raw.type) || !isTableRequestStatus(raw.status) || !createdAt) {
    return null;
  }

  return {
    request_token: requestToken,
    type: raw.type,
    status: raw.status,
    created_at: createdAt,
  };
}

export function normalizeSessionTableRequest(value: unknown): SessionTableRequest | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const requestToken = cleanToken(raw.request_token);
  const createdAt = cleanIsoString(raw.created_at);
  // GET /table/requests/ serializes the model field name `request_type`, unlike
  // the POST response which aliases it to `type`. Accept the GET spelling here.
  const type = raw.request_type;
  const resolvedAt = raw.resolved_at == null ? null : cleanIsoString(raw.resolved_at);

  if (
    !requestToken ||
    !isTableRequestType(type) ||
    !isTableRequestStatus(raw.status) ||
    !createdAt ||
    // A present-but-unparseable resolved_at is treated as malformed.
    (resolvedAt === null && raw.resolved_at != null)
  ) {
    return null;
  }

  return {
    request_token: requestToken,
    type,
    status: raw.status,
    created_at: createdAt,
    resolved_at: resolvedAt,
  };
}

export function normalizeSessionTableRequestsResponse(value: unknown): SessionTableRequestsResponse {
  if (!value || typeof value !== 'object') return { requests: [] };
  const raw = value as Record<string, unknown>;
  const requests = Array.isArray(raw.requests)
    ? raw.requests
        .map(normalizeSessionTableRequest)
        .filter((request): request is SessionTableRequest => request !== null)
    : [];
  return { requests };
}

// True only for requests resolved recently enough to still surface a "resolved"
// hint. Falls back to created_at when resolved_at is missing so a RESOLVED row
// with no timestamp never lingers as permanently "recent".
export function isRecentResolution(request: SessionTableRequest, now = Date.now()): boolean {
  if (request.status !== 'RESOLVED') return false;
  const timestamp = new Date(request.resolved_at ?? request.created_at).getTime();
  if (!Number.isFinite(timestamp)) return false;
  return now - timestamp <= RESOLVED_DISPLAY_WINDOW_MS;
}

// Optimistically inserts a just-created request at the head of a cached list
// (newest-first), de-duplicating by token so a later refetch never doubles it.
export function prependSessionTableRequest(
  response: SessionTableRequestsResponse | undefined,
  request: SessionTableRequest,
): SessionTableRequestsResponse {
  const existing = response?.requests ?? [];
  return {
    requests: [request, ...existing.filter((r) => r.request_token !== request.request_token)],
  };
}

// Optimistically flips a still-OPEN request to RESOLVED in a cached list, used
// when the resolved socket event arrives before the authoritative refetch lands.
export function markTableRequestResolved(
  response: SessionTableRequestsResponse | undefined,
  requestToken: string,
  resolvedAt: string = new Date().toISOString(),
): SessionTableRequestsResponse {
  if (!response) return { requests: [] };
  return {
    requests: response.requests.map((request) =>
      request.request_token === requestToken && request.status === 'OPEN'
        ? { ...request, status: 'RESOLVED', resolved_at: resolvedAt }
        : request,
    ),
  };
}

export function normalizeWaiterTableRequest(value: unknown): WaiterTableRequest | null {
  const base = normalizeCustomerTableRequest(value);
  if (!base || !value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const table = cleanDisplayString(raw.table);
  const resolvedAt = raw.resolved_at == null ? null : cleanIsoString(raw.resolved_at);

  if (!table || (resolvedAt === null && raw.resolved_at != null)) return null;

  return {
    ...base,
    table,
    resolved_at: resolvedAt,
    guest: normalizePublicGuest(raw.guest),
  };
}

export function normalizeWaiterTableRequestsResponse(value: unknown): WaiterTableRequestsResponse {
  if (!value || typeof value !== 'object') return { requests: [] };
  const raw = value as Record<string, unknown>;
  const requests = Array.isArray(raw.requests)
    ? raw.requests
        .map(normalizeWaiterTableRequest)
        .filter((request): request is WaiterTableRequest => request !== null)
    : [];
  return { requests };
}

export function normalizeTableRequestResolvedEvent(value: unknown): TableRequestResolvedEvent | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const requestToken = cleanToken(raw.request_token);
  const requestType = raw.request_type;

  if (
    raw.type !== 'table_request_resolved' ||
    !requestToken ||
    !isTableRequestType(requestType) ||
    raw.status !== 'RESOLVED'
  ) {
    return null;
  }

  return {
    type: 'table_request_resolved',
    request_token: requestToken,
    request_type: requestType,
    status: 'RESOLVED',
  };
}

export function normalizeTableRequestCreatedEvent(value: unknown): TableRequestCreatedEvent | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const requestToken = cleanToken(raw.request_token);
  const table = cleanDisplayString(raw.table);
  const requestType = raw.request_type;

  if (
    raw.type !== 'table_request_created' ||
    !requestToken ||
    !isTableRequestType(requestType) ||
    !table ||
    raw.status !== 'OPEN'
  ) {
    return null;
  }

  return {
    type: 'table_request_created',
    request_token: requestToken,
    request_type: requestType,
    table,
    status: 'OPEN',
  };
}

export function tableRequestAgeLabel(createdAt: string, now = Date.now()): string {
  const timestamp = new Date(createdAt).getTime();
  if (!Number.isFinite(timestamp)) return 'just now';
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
