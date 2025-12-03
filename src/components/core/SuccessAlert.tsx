/* eslint-disable unicorn/filename-case */
/**
 * SuccessAlert Component
 *
 * Displays success messages with MUI Alert styling.
 *
 * @component
 * @example
 * ```tsx
 * <SuccessAlert message="Operation completed successfully" onClose={() => setSuccess(null)} />
 * ```
 *
 * @module components/core/SuccessAlert
 */

import React from 'react';
import { Alert, AlertProps } from '@mui/material';

export interface SuccessAlertProps extends Omit<AlertProps, 'severity'> {
  /** Success message to display */
  message: string;
  /** Callback when alert is closed */
  onClose?: () => void;
}

/**
 * SuccessAlert Component
 *
 * Displays success messages with dismissible option.
 *
 * @param props - Alert props plus custom props
 * @returns SuccessAlert component
 */
export const SuccessAlert: React.FC<SuccessAlertProps> = ({ message, onClose, ...props }) => (
  <Alert severity="success" onClose={onClose} {...props}>
    {message}
  </Alert>
);

SuccessAlert.displayName = 'SuccessAlert';
