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
  accessToken?: string;
}

export async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { sessionToken, accessToken, ...customConfig } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customConfig.headers as Record<string, string>),
  };

  if (sessionToken) {
    headers['X-Session-Token'] = sessionToken;
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
export interface SessionStartResponse {
  session_token: string;
  expires_at: string;
}

export async function startTableSession(tableToken: string): Promise<SessionStartResponse> {
  return fetchApi<SessionStartResponse>('/table/session/start/', {
    method: 'POST',
    body: JSON.stringify({ table_token: tableToken }),
  });
}

// Menu API methods
export interface MenuItem {
  id: number;
  name: string;
  description?: string;
  price: string;
  is_available: boolean;
}

export interface MenuCategory {
  id: number;
  name: string;
  items: MenuItem[];
}

export interface MenuResponse {
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

export interface OrderDetailsResponse extends OrderResponse {
  created_at: string;
  items: OrderDetailItem[];
}

export async function createOrder(sessionToken: string, payload: CreateOrderPayload): Promise<OrderResponse> {
  return fetchApi<OrderResponse>('/orders/', {
    method: 'POST',
    sessionToken,
    body: JSON.stringify(payload),
  });
}

export async function getOrder(sessionToken: string, orderId: string): Promise<OrderDetailsResponse> {
  return fetchApi<OrderDetailsResponse>(`/orders/${orderId}/`, {
    method: 'GET',
    sessionToken,
  });
}

// Staff Authentication API
export interface StaffProfile {
  username: string;
  name: string;
  role: 'KITCHEN' | 'WAITER' | 'ADMIN';
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
