import {
  normalizeCustomerTableRequest,
  normalizeSessionTableRequestsResponse,
  normalizeWaiterTableRequest,
  normalizeWaiterTableRequestsResponse,
  type CustomerTableRequest,
  type SessionTableRequestsResponse,
  type TableRequestType,
  type WaiterTableRequest,
  type WaiterTableRequestsResponse,
} from './tableRequests';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    retry_after?: number;
  };
}

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(status: number, errorData: ApiErrorResponse['error']) {
    super(errorData.message);
    this.name = 'ApiError';
    this.code = errorData.code;
    this.status = status;
  }
}

interface FetchOptions extends RequestInit {
  sessionToken?: string;
  guestToken?: string;
  accessToken?: string;
}

export async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { sessionToken, guestToken, accessToken, ...customConfig } = options;
  // For FormData bodies, let the browser set the multipart Content-Type (incl. boundary).
  const isFormData =
    typeof FormData !== 'undefined' && customConfig.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(customConfig.headers as Record<string, string>),
  };

  if (sessionToken) {
    headers['X-Session-Token'] = sessionToken;
  }
  if (guestToken) {
    headers['X-Guest-Token'] = guestToken;
  }
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const config: RequestInit = {
    ...customConfig,
    headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  let data;
  try {
    data = await response.json();
  } catch {
    // If response is not JSON
    if (!response.ok) {
      throw new ApiError(response.status, {
        code: 'unknown_error',
        message: 'An unknown server error occurred.',
      });
    }
    return {} as T;
  }

  if (!response.ok) {
    if (data && data.error) {
      throw new ApiError(response.status, data.error);
    }
    throw new ApiError(response.status, {
      code: 'unknown_error',
      message: 'An unknown server error occurred.',
    });
  }

  return data as T;
}

// Session API methods

// A table is `solo` while one device is connected and `lobby` once two or more
// guests/devices share the session. Mode is derived by the backend from the
// active guest count — the frontend never computes it independently.
export type SessionMode = 'solo' | 'lobby';

export interface SessionStartResponse {
  session_token: string;
  guest_token: string;
  mode: SessionMode;
  guest_count: number;
  expires_at: string;
  restaurant: RestaurantBranding;
}

export async function startTableSession(tableToken: string): Promise<SessionStartResponse> {
  return fetchApi<SessionStartResponse>('/table/session/start/', {
    method: 'POST',
    body: JSON.stringify({ table_token: tableToken }),
  });
}

// Update (or reset) the current guest's display name. Requires both the session
// token and the guest token. Sending a blank name restores the backend default
// ("Guest N"). Validation errors surface as ApiError(code="invalid_request").
export interface GuestUpdateResponse {
  guest_token: string;
  display_name: string;
  avatar_color: string;
  mode: SessionMode;
  guest_count: number;
}

export async function updateGuestDisplayName(
  sessionToken: string,
  guestToken: string,
  displayName: string,
): Promise<GuestUpdateResponse> {
  return fetchApi<GuestUpdateResponse>('/table/session/guest/', {
    method: 'PATCH',
    sessionToken,
    guestToken,
    body: JSON.stringify({ display_name: displayName }),
  });
}

// Public guest shape returned by the session roster. Public fields only — never
// internal ids.
export interface SessionRosterGuest {
  guest_token: string;
  display_name: string;
  avatar_color: string;
}

// Authoritative roster of everyone currently at the table. Unlike realtime
// events (which only describe deltas), this returns the full guest list and the
// caller's own `current_guest`.
export interface SessionRosterResponse {
  mode: SessionMode;
  guest_count: number;
  current_guest: SessionRosterGuest;
  guests: SessionRosterGuest[];
}

// Requires BOTH the session token and the guest token. Errors:
//   invalid_session (401) / expired_session (403) / invalid_guest (401).
export async function getSessionRoster(
  sessionToken: string,
  guestToken: string,
): Promise<SessionRosterResponse> {
  return fetchApi<SessionRosterResponse>('/table/session/', {
    method: 'GET',
    sessionToken,
    guestToken,
  });
}

// Restaurant branding (returned by GET /menu/ and admin branding endpoint)
export interface RestaurantBranding {
  name: string;
  slug: string;
  tagline: string;
  welcome_message: string;
  logo: string | null;
  banner_image: string | null;
  primary_color: string | null;
  secondary_color: string | null;
}

// Menu API methods
export interface MenuItem {
  id: number;
  name: string;
  description?: string;
  price: string;
  is_available: boolean;
  image: string | null;
}

export interface MenuCategory {
  id: number;
  name: string;
  image: string | null;
  items: MenuItem[];
}

export interface MenuResponse {
  restaurant: RestaurantBranding;
  categories: MenuCategory[];
}

export async function fetchMenu(sessionToken: string): Promise<MenuResponse> {
  return fetchApi<MenuResponse>('/menu/', {
    method: 'GET',
    sessionToken,
  });
}

// Order API methods
export interface OrderItemPayload {
  menu_item_id: number;
  quantity: number;
  notes?: string;
}

export interface CreateOrderPayload {
  items: OrderItemPayload[];
}

export interface OrderResponse {
  order_id: string;
  status: string;
  total_price: string;
}

export interface OrderDetailItem {
  name: string;
  quantity: number;
  notes: string;
}

// Public guest attribution attached to an order. Always nullable: orders created
// without a guest token (e.g. solo flow) return `guest: null`. Contains only
// public, customer-safe fields — never internal ids.
export interface OrderGuest {
  guest_token: string;
  display_name: string;
  avatar_color: string;
}

export interface OrderDetailsResponse extends OrderResponse {
  created_at: string;
  items: OrderDetailItem[];
  guest: OrderGuest | null;
}

// Read-only summary returned by GET /orders/ (all orders for the session).
// Note: the backend does NOT attribute orders to a guest in this payload, so
// the frontend can only mark which orders THIS device created (see lobby store).
export interface OrderSummary {
  order_id: string;
  status: string;
  total_price: string;
  created_at: string;
  guest: OrderGuest | null;
}

export interface SessionOrdersResponse {
  orders: OrderSummary[];
}

// `guestToken` is optional: when present and valid the backend associates the
// order with that guest. When absent the order is created without a guest.
export async function createOrder(
  sessionToken: string,
  payload: CreateOrderPayload,
  guestToken?: string,
): Promise<OrderResponse> {
  return fetchApi<OrderResponse>('/orders/', {
    method: 'POST',
    sessionToken,
    guestToken,
    body: JSON.stringify(payload),
  });
}

export async function getSessionOrders(sessionToken: string): Promise<SessionOrdersResponse> {
  return fetchApi<SessionOrdersResponse>('/orders/', {
    method: 'GET',
    sessionToken,
  });
}

export async function getOrder(sessionToken: string, orderId: string): Promise<OrderDetailsResponse> {
  return fetchApi<OrderDetailsResponse>(`/orders/${orderId}/`, {
    method: 'GET',
    sessionToken,
  });
}

export async function getTableRequests(sessionToken: string): Promise<SessionTableRequestsResponse> {
  const raw = await fetchApi<unknown>('/table/requests/', {
    method: 'GET',
    sessionToken,
  });
  return normalizeSessionTableRequestsResponse(raw);
}

export async function createTableRequest(
  sessionToken: string,
  type: TableRequestType,
  guestToken?: string | null,
): Promise<CustomerTableRequest> {
  const raw = await fetchApi<unknown>('/table/requests/', {
    method: 'POST',
    sessionToken,
    guestToken: guestToken ?? undefined,
    body: JSON.stringify({ type }),
  });
  const normalized = normalizeCustomerTableRequest(raw);
  if (!normalized) {
    throw new ApiError(502, {
      code: 'invalid_response',
      message: 'invalid server response',
    });
  }
  return normalized;
}

// Staff Authentication API
export interface StaffProfile {
  username: string;
  name: string;
  role: 'KITCHEN' | 'WAITER' | 'ADMIN' | 'CASHIER';
  restaurant_id: number;
}

export interface StaffLoginResponse {
  access: string;
  refresh: string;
  staff: StaffProfile;
}

export async function staffLogin(credentials: Record<string, string>): Promise<StaffLoginResponse> {
  return fetchApi<StaffLoginResponse>('/staff/auth/login/', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

// Kitchen API methods
export interface KitchenOrderSummary {
  order_id: string;
  table: string;
  status: string;
  created_at: string;
  items: OrderDetailItem[];
  // Nullable guest attribution. `null` for table-level / un-attributed orders.
  guest: OrderGuest | null;
}

export interface KitchenOrdersResponse {
  orders: KitchenOrderSummary[];
}

export async function getKitchenOrders(accessToken: string): Promise<KitchenOrdersResponse> {
  return fetchApi<KitchenOrdersResponse>('/kitchen/orders/', {
    method: 'GET',
    accessToken,
  });
}

export interface UpdateOrderStatusPayload {
  status: string;
}

export async function updateOrderStatus(accessToken: string, orderId: string, status: string): Promise<OrderDetailsResponse> {
  return fetchApi<OrderDetailsResponse>(`/kitchen/orders/${orderId}/status/`, {
    method: 'PATCH',
    accessToken,
    body: JSON.stringify({ status }),
  });
}

// Waiter API methods
export interface WaiterTableOrder {
  order_id: string;
  status: string;
  total_price: string;
  created_at: string;
  payment_status: string | null;
  // Nullable guest attribution. `null` for table-level / un-attributed orders.
  guest: OrderGuest | null;
}

export interface WaiterTableSummary {
  table: string;
  active_order_count: number;
  latest_status: string | null;
  payment_status: string | null;
  orders: WaiterTableOrder[];
}

export interface WaiterTablesResponse {
  tables: WaiterTableSummary[];
}

export async function getWaiterTables(accessToken: string): Promise<WaiterTablesResponse> {
  return fetchApi<WaiterTablesResponse>('/waiter/tables/', {
    method: 'GET',
    accessToken,
  });
}

export async function serveWaiterOrder(accessToken: string, orderId: string): Promise<OrderDetailsResponse> {
  return fetchApi<OrderDetailsResponse>(`/waiter/orders/${orderId}/serve/`, {
    method: 'PATCH',
    accessToken,
  });
}

export async function getWaiterRequests(accessToken: string): Promise<WaiterTableRequestsResponse> {
  const raw = await fetchApi<unknown>('/waiter/requests/', {
    method: 'GET',
    accessToken,
  });
  return normalizeWaiterTableRequestsResponse(raw);
}

export async function resolveWaiterRequest(
  accessToken: string,
  requestToken: string,
): Promise<WaiterTableRequest> {
  const raw = await fetchApi<unknown>(`/waiter/requests/${requestToken}/resolve/`, {
    method: 'PATCH',
    accessToken,
  });
  const normalized = normalizeWaiterTableRequest(raw);
  if (!normalized) {
    throw new ApiError(502, {
      code: 'invalid_response',
      message: 'invalid server response',
    });
  }
  return normalized;
}

// Payment API Method
export interface PaymentResponse {
  order_id: string;
  method: string;
  status: string;
  amount: string;
  created_at: string;
}

export async function recordPayment(accessToken: string, orderId: string, method: string): Promise<PaymentResponse> {
  return fetchApi<PaymentResponse>('/payments/', {
    method: 'POST',
    accessToken,
    body: JSON.stringify({ order_id: orderId, method }),
  });
}

// Cashier API methods
export type CashierTableStatus = 'EMPTY' | 'ORDERING' | 'PREPARING' | 'SERVED';

export interface CashierTableSummary {
  table_name: string;
  table_token: string;
  status: CashierTableStatus;
  order_id: string | null;
  total_price: string | null;
  payment_status: string | null;
  // Nullable guest attribution for the table's active order.
  guest: OrderGuest | null;
}

export interface CashierTableOrderDetail extends CashierTableSummary {
  order_status: string | null;
  items: OrderDetailItem[];
}

export async function getCashierTables(accessToken: string): Promise<CashierTableSummary[]> {
  return fetchApi<CashierTableSummary[]>('/cashier/tables/', {
    method: 'GET',
    accessToken,
  });
}

export async function getCashierTableOrder(
  accessToken: string,
  tableToken: string,
): Promise<CashierTableOrderDetail> {
  return fetchApi<CashierTableOrderDetail>(`/cashier/tables/${tableToken}/order/`, {
    method: 'GET',
    accessToken,
  });
}

// Staff Token Refresh
export interface RefreshResponse {
  access: string;
}

export async function refreshStaffToken(refreshToken: string): Promise<RefreshResponse> {
  return fetchApi<RefreshResponse>('/staff/auth/refresh/', {
    method: 'POST',
    body: JSON.stringify({ refresh: refreshToken }),
  });
}

// ──────────────────────────────
// Admin API Methods
// ──────────────────────────────

// Admin Category types & methods
export interface AdminCategory {
  id: number;
  name: string;
  image: string | null;
  item_count: number;
  created_at: string;
}

export interface AdminCategoriesResponse {
  categories: AdminCategory[];
}

export async function getAdminCategories(accessToken: string): Promise<AdminCategoriesResponse> {
  return fetchApi<AdminCategoriesResponse>('/admin/categories/', { method: 'GET', accessToken });
}

export async function createAdminCategory(accessToken: string, name: string): Promise<AdminCategory> {
  return fetchApi<AdminCategory>('/admin/categories/', {
    method: 'POST',
    accessToken,
    body: JSON.stringify({ name }),
  });
}

export async function updateAdminCategory(accessToken: string, categoryId: number, name: string): Promise<AdminCategory> {
  return fetchApi<AdminCategory>('/admin/categories/', {
    method: 'PATCH',
    accessToken,
    body: JSON.stringify({ category_id: categoryId, name }),
  });
}

export async function deleteAdminCategory(accessToken: string, categoryId: number): Promise<void> {
  return fetchApi<void>('/admin/categories/', {
    method: 'DELETE',
    accessToken,
    body: JSON.stringify({ category_id: categoryId }),
  });
}

// Admin Menu Item types & methods
export interface AdminMenuItem {
  id: number;
  category_id: number;
  category_name: string;
  name: string;
  description: string;
  price: string;
  is_available: boolean;
  image: string | null;
  created_at: string;
}

export interface AdminMenuItemsResponse {
  items: AdminMenuItem[];
}

export async function getAdminMenuItems(accessToken: string): Promise<AdminMenuItemsResponse> {
  return fetchApi<AdminMenuItemsResponse>('/admin/menu-items/', { method: 'GET', accessToken });
}

export interface AdminMenuItemPayload {
  menu_item_id?: number;
  category_id: number;
  name: string;
  description?: string;
  price: number;
  is_available?: boolean;
}

export async function createAdminMenuItem(accessToken: string, payload: AdminMenuItemPayload): Promise<AdminMenuItem> {
  return fetchApi<AdminMenuItem>('/admin/menu-items/', {
    method: 'POST',
    accessToken,
    body: JSON.stringify(payload),
  });
}

export async function updateAdminMenuItem(accessToken: string, payload: AdminMenuItemPayload): Promise<AdminMenuItem> {
  return fetchApi<AdminMenuItem>('/admin/menu-items/', {
    method: 'PATCH',
    accessToken,
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminMenuItem(accessToken: string, menuItemId: number): Promise<void> {
  return fetchApi<void>('/admin/menu-items/', {
    method: 'DELETE',
    accessToken,
    body: JSON.stringify({ menu_item_id: menuItemId }),
  });
}

// Admin image uploads (multipart). Backend returns the updated record with the
// new `image` URL. Errors surface as ApiError with code "image_upload_error".
export async function uploadAdminCategoryImage(
  accessToken: string,
  categoryId: number,
  file: File,
): Promise<AdminCategory> {
  const formData = new FormData();
  formData.append('image', file);
  return fetchApi<AdminCategory>(`/admin/categories/${categoryId}/image/`, {
    method: 'POST',
    accessToken,
    body: formData,
  });
}

export async function uploadAdminMenuItemImage(
  accessToken: string,
  menuItemId: number,
  file: File,
): Promise<AdminMenuItem> {
  const formData = new FormData();
  formData.append('image', file);
  return fetchApi<AdminMenuItem>(`/admin/menu-items/${menuItemId}/image/`, {
    method: 'POST',
    accessToken,
    body: formData,
  });
}

// Admin image removals. Backend clears the file and returns the updated record
// with the image field now null.
export async function removeAdminCategoryImage(
  accessToken: string,
  categoryId: number,
): Promise<AdminCategory> {
  return fetchApi<AdminCategory>(`/admin/categories/${categoryId}/image/`, {
    method: 'DELETE',
    accessToken,
  });
}

export async function removeAdminMenuItemImage(
  accessToken: string,
  menuItemId: number,
): Promise<AdminMenuItem> {
  return fetchApi<AdminMenuItem>(`/admin/menu-items/${menuItemId}/image/`, {
    method: 'DELETE',
    accessToken,
  });
}

// Admin Table types & methods
export interface AdminTable {
  name: string;
  table_token: string;
  created_at: string;
}

export interface AdminTablesResponse {
  tables: AdminTable[];
}

export async function getAdminTables(accessToken: string): Promise<AdminTablesResponse> {
  return fetchApi<AdminTablesResponse>('/admin/tables/', { method: 'GET', accessToken });
}

export async function createAdminTable(accessToken: string, name: string): Promise<AdminTable> {
  return fetchApi<AdminTable>('/admin/tables/', {
    method: 'POST',
    accessToken,
    body: JSON.stringify({ name }),
  });
}

export async function updateAdminTable(accessToken: string, tableToken: string, name: string): Promise<AdminTable> {
  return fetchApi<AdminTable>('/admin/tables/', {
    method: 'PATCH',
    accessToken,
    body: JSON.stringify({ table_token: tableToken, name }),
  });
}

export async function deleteAdminTable(accessToken: string, tableToken: string): Promise<void> {
  return fetchApi<void>('/admin/tables/', {
    method: 'DELETE',
    accessToken,
    body: JSON.stringify({ table_token: tableToken }),
  });
}

// Admin Staff types & methods
export interface AdminStaff {
  id: number;
  username: string;
  name: string;
  role: string;
  created_at: string;
}

export interface AdminStaffResponse {
  staff: AdminStaff[];
}

export async function getAdminStaff(accessToken: string): Promise<AdminStaffResponse> {
  return fetchApi<AdminStaffResponse>('/admin/staff/', { method: 'GET', accessToken });
}

export interface AdminStaffCreatePayload {
  username: string;
  password: string;
  name: string;
  role: string;
}

export async function createAdminStaff(accessToken: string, payload: AdminStaffCreatePayload): Promise<AdminStaff> {
  return fetchApi<AdminStaff>('/admin/staff/', {
    method: 'POST',
    accessToken,
    body: JSON.stringify(payload),
  });
}

export interface AdminStaffUpdatePayload {
  staff_id: number;
  name?: string;
  role?: string;
  password?: string;
}

export async function updateAdminStaff(accessToken: string, payload: AdminStaffUpdatePayload): Promise<AdminStaff> {
  return fetchApi<AdminStaff>('/admin/staff/', {
    method: 'PATCH',
    accessToken,
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminStaff(accessToken: string, staffId: number): Promise<void> {
  return fetchApi<void>('/admin/staff/', {
    method: 'DELETE',
    accessToken,
    body: JSON.stringify({ staff_id: staffId }),
  });
}

// Admin Orders
export interface AdminOrder {
  order_id: string;
  table: string;
  status: string;
  total_price: string;
  payment_status: string | null;
  created_at: string;
  // Nullable guest attribution. `null` for table-level / un-attributed orders.
  guest: OrderGuest | null;
}

export interface AdminOrdersResponse {
  orders: AdminOrder[];
}

export async function getAdminOrders(accessToken: string): Promise<AdminOrdersResponse> {
  return fetchApi<AdminOrdersResponse>('/admin/orders/', { method: 'GET', accessToken });
}

// Admin Analytics
export interface AdminPopularItem {
  name: string;
  total_quantity: number;
}

export interface AdminAnalyticsResponse {
  orders_today: number;
  totalRevenue: number;
  popular_items: AdminPopularItem[];
}

export async function getAdminAnalytics(accessToken: string): Promise<AdminAnalyticsResponse> {
  return fetchApi<AdminAnalyticsResponse>('/admin/analytics/summary/', { method: 'GET', accessToken });
}

// Admin Audit Logs
export interface AuditLogEntry {
  action: string;
  target_type: string;
  target_identifier: string;
  actor_name: string | null;
  actor_role: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AdminAuditLogsResponse {
  audit_logs: AuditLogEntry[];
}

export async function getAdminAuditLogs(accessToken: string): Promise<AdminAuditLogsResponse> {
  return fetchApi<AdminAuditLogsResponse>('/admin/audit-logs/', { method: 'GET', accessToken });
}

// Admin Restaurant Branding
export interface RestaurantBrandingUpdatePayload {
  tagline?: string;
  welcome_message?: string;
  primary_color?: string | null;
  secondary_color?: string | null;
}

export async function getRestaurantBranding(accessToken: string): Promise<RestaurantBranding> {
  return fetchApi<RestaurantBranding>('/admin/restaurant/branding/', { method: 'GET', accessToken });
}

export async function updateRestaurantBranding(
  accessToken: string,
  payload: RestaurantBrandingUpdatePayload,
): Promise<RestaurantBranding> {
  return fetchApi<RestaurantBranding>('/admin/restaurant/branding/', {
    method: 'PATCH',
    accessToken,
    body: JSON.stringify(payload),
  });
}

// Multipart variant for logo/banner uploads (compatible with backend MultiPartParser).
// Editable text/color fields can be appended to the same FormData.
export async function updateRestaurantBrandingMedia(
  accessToken: string,
  formData: FormData,
): Promise<RestaurantBranding> {
  return fetchApi<RestaurantBranding>('/admin/restaurant/branding/', {
    method: 'PATCH',
    accessToken,
    body: formData,
  });
}

// Remove the restaurant logo / banner. Backend clears the file and returns the
// updated branding with the field now null.
export async function removeRestaurantLogo(accessToken: string): Promise<RestaurantBranding> {
  return fetchApi<RestaurantBranding>('/admin/restaurant/branding/logo/', {
    method: 'DELETE',
    accessToken,
  });
}

export async function removeRestaurantBanner(accessToken: string): Promise<RestaurantBranding> {
  return fetchApi<RestaurantBranding>('/admin/restaurant/branding/banner/', {
    method: 'DELETE',
    accessToken,
  });
}
