/* eslint-disable unicorn/filename-case */
/**
 * ErrorAlert Component
 *
 * Displays error messages with MUI Alert styling.
 *
 * @component
 * @example
 * ```tsx
 * <ErrorAlert message="Something went wrong" onClose={() => setError(null)} />
 * ```
 *
 * @module components/core/ErrorAlert
 */

import React from 'react';
import { Alert, AlertProps } from '@mui/material';

export interface ErrorAlertProps extends Omit<AlertProps, 'severity'> {
  /** Error message to display */
  message: string;
  /** Callback when alert is closed */
  onClose?: () => void;
}

/**
 * ErrorAlert Component
 *
 * Displays error messages with dismissible option.
 *
 * @param props - Alert props plus custom props
 * @returns ErrorAlert component
 */
export const ErrorAlert: React.FC<ErrorAlertProps> = ({ message, onClose, ...props }) => (
  <Alert severity="error" onClose={onClose} {...props}>
    {message}
  </Alert>
);

ErrorAlert.displayName = 'ErrorAlert';
