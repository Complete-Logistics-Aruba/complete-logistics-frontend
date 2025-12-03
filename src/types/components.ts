/**
 * Component Prop Types
 *
 * Types for React component props across the application.
 * Ensures type safety and self-documenting components.
 *
 * @module types/components
 */

import type { ReactNode } from 'react';
import type {
  User,
  Product,
  Pallet,
  ReceivingOrder,
  ShippingOrder,
  Location,
} from './domain';

/**
 * Common component props
 */
export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
}

/**
 * Button component props
 */
export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

/**
 * Input component props
 */
export interface InputProps extends BaseComponentProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'file';
  placeholder?: string;
  value?: string | number;
  onChange?: (value: string | number) => void;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
}

/**
 * Card component props
 */
export interface CardProps extends BaseComponentProps {
  title?: string;
  subtitle?: string;
  footer?: ReactNode;
  hoverable?: boolean;
}

/**
 * Modal component props
 */
export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeButton?: boolean;
}

/**
 * Table component props
 */
export interface TableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: T[keyof T], row: T) => ReactNode;
  width?: string;
}

export interface TableProps<T> extends BaseComponentProps {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  onRowClick?: (row: T) => void;
}

/**
 * Form component props
 */
export interface FormProps extends BaseComponentProps {
  onSubmit: (data: Record<string, unknown>) => void;
  loading?: boolean;
  error?: string;
}

/**
 * File upload component props
 */
export interface FileUploadProps extends BaseComponentProps {
  onUpload: (file: File) => void;
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  loading?: boolean;
}

/**
 * Photo capture component props
 */
export interface PhotoCaptureProps extends BaseComponentProps {
  onCapture: (file: File) => void;
  onError?: (error: Error) => void;
  maxSize?: number;
}

/**
 * Location selector component props
 */
export interface LocationSelectorProps extends BaseComponentProps {
  onSelect: (location: Location) => void;
  warehouseId: string;
  disabled?: boolean;
}

/**
 * Badge component props
 */
export interface BadgeProps extends BaseComponentProps {
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Screen component props (base for all screens)
 */
export interface ScreenProps extends BaseComponentProps {
  title?: string;
  subtitle?: string;
  loading?: boolean;
  error?: string;
  onError?: (error: Error) => void;
}

/**
 * Login screen props
 */
export interface LoginScreenProps extends ScreenProps {
  onLoginSuccess: (user: User) => void;
}

/**
 * Product list screen props
 */
export interface ProductListScreenProps extends ScreenProps {
  products: Product[];
  onProductSelect?: (product: Product) => void;
  onProductEdit?: (product: Product) => void;
}

/**
 * Receiving order screen props
 */
export interface ReceivingOrderScreenProps extends ScreenProps {
  order: ReceivingOrder;
  onStatusChange?: (status: string) => void;
  onComplete?: () => void;
}

/**
 * Pallet list screen props
 */
export interface PalletListScreenProps extends ScreenProps {
  pallets: Pallet[];
  onPalletSelect?: (pallet: Pallet) => void;
  onPalletUpdate?: (pallet: Pallet) => void;
}

/**
 * Shipping order screen props
 */
export interface ShippingOrderScreenProps extends ScreenProps {
  order: ShippingOrder;
  onStatusChange?: (status: string) => void;
  onComplete?: () => void;
}

/**
 * Dialog/Modal content props
 */
export interface DialogProps extends BaseComponentProps {
  title: string;
  description?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
}

/**
 * Alert/Toast props
 */
export interface AlertProps extends BaseComponentProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
}

/**
 * Loading spinner props
 */
export interface LoadingProps extends BaseComponentProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

/**
 * Error boundary props
 */
export interface ErrorBoundaryProps extends BaseComponentProps {
  onError?: (error: Error) => void;
  fallback?: ReactNode;
}

/**
 * Layout component props
 */
export interface LayoutProps extends BaseComponentProps {
  header?: ReactNode;
  sidebar?: ReactNode;
  footer?: ReactNode;
  fullWidth?: boolean;
}

/**
 * Navigation props
 */
export interface NavigationProps extends BaseComponentProps {
  items: Array<{
    label: string;
    href: string;
    icon?: ReactNode;
    active?: boolean;
  }>;
  onNavigate?: (href: string) => void;
}
