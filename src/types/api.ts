/**
 * API Request/Response Types
 *
 * Types for API requests and responses from wmsApi.
 * These ensure type safety across the application.
 *
 * @module types/api
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import type {
  User,
  Product,
  ReceivingOrder,
  ReceivingOrderLine,
  Pallet,
  ShippingOrder,
  ShippingOrderLine,
  Location,
  Warehouse,
  Manifest,
  EmailLog,
  BillingMetrics,
} from './domain';

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  data: T;
  error: null;
}

export interface ApiError {
  data: null;
  error: {
    message: string;
    code?: string;
  };
}

/**
 * Authentication API types
 */
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  session: {
    access_token: string;
    refresh_token: string;
  };
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Product API types
 */
export interface CreateProductRequest {
  item_id: string;
  description: string;
  units_per_pallet: number;
  pallet_positions: number;
  active?: boolean;
}

export interface UpdateProductRequest {
  item_id?: string;
  description?: string;
  units_per_pallet?: number;
  pallet_positions?: number;
  active?: boolean;
}

export interface ProductListResponse {
  products: Product[];
  total: number;
}

/**
 * Receiving Order API types
 */
export interface CreateReceivingOrderRequest {
  container_num: string;
  seal_num: string;
  status?: 'Pending' | 'Staged' | 'Received';
  created_by: string;
}

export interface UpdateReceivingOrderRequest {
  status?: 'Pending' | 'Staged' | 'Received';
}

export interface ReceivingOrderWithLines {
  order: ReceivingOrder;
  lines: ReceivingOrderLine[];
}

/**
 * Pallet API types
 */
export interface CreatePalletRequest {
  product_id: string;
  qty: number;
  status?: 'Received' | 'Stored' | 'Loaded' | 'Shipped' | 'WriteOff';
  receiving_order_id?: string;
  shipping_order_id?: string;
  location_id?: string;
  is_cross_dock?: boolean;
}

export interface UpdatePalletRequest {
  qty?: number;
  status?: 'Received' | 'Stored' | 'Loaded' | 'Shipped' | 'WriteOff';
  location_id?: string;
  shipping_order_id?: string;
}

export interface PalletFilterRequest {
  status?: string;
  receiving_order_id?: string;
  shipping_order_id?: string;
  location_id?: string;
}

export interface PalletListResponse {
  pallets: Pallet[];
  total: number;
}

/**
 * Shipping Order API types
 */
export interface CreateShippingOrderRequest {
  order_ref: string;
  shipment_type: 'Hand_Delivery' | 'Container_Loading';
  seal_num?: string;
  status?: 'Pending' | 'Picking' | 'Loading' | 'Completed' | 'Shipped';
  created_by: string;
}

export interface UpdateShippingOrderRequest {
  status?: 'Pending' | 'Picking' | 'Loading' | 'Completed' | 'Shipped';
}

export interface ShippingOrderWithLines {
  order: ShippingOrder;
  lines: ShippingOrderLine[];
}

/**
 * Location API types
 */
export interface LocationResolveRequest {
  warehouse_id: string;
  rack: number | 'AISLE';
  level?: number;
  position?: string;
}

export interface LocationListResponse {
  locations: Location[];
  total: number;
}

/**
 * Storage API types
 */
export interface FileUploadRequest {
  bucket: string;
  path: string;
  file: File;
}

export interface FileUploadResponse {
  url: string;
  path: string;
}

/**
 * Email API types
 */
export interface SendEmailRequest {
  to: string;
  subject: string;
  body: string;
  attachments?: {
    filename: string;
    content: string;
  }[];
}

export interface SendEmailResponse {
  success: boolean;
  messageId?: string;
}

/**
 * Billing API types
 */
export interface BillingReportRequest {
  fromDate: Date;
  toDate: Date;
}

export interface BillingReportResponse {
  metrics: BillingMetrics;
  handDeliveries: ShippingOrder[];
  generatedAt: string;
}

/**
 * Batch operation types
 */
export interface BatchCreateRequest<T> {
  items: T[];
}

export interface BatchCreateResponse<T> {
  created: T[];
  failed: Array<{
    item: T;
    error: string;
  }>;
}

/**
 * Pagination types
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
