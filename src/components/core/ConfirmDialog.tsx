/* eslint-disable unicorn/filename-case */
/**
 * ConfirmDialog Component
 *
 * Displays a confirmation dialog with OK/Cancel buttons.
 *
 * @component
 * @example
 * ```tsx
 * <ConfirmDialog
 *   open={true}
 *   title="Delete Item?"
 *   message="Are you sure you want to delete this item?"
 *   onConfirm={() => handleDelete()}
 *   onCancel={() => setOpen(false)}
 * />
 * ```
 *
 * @module components/core/ConfirmDialog
 */

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';

export interface ConfirmDialogProps {
  /** Whether dialog is open */
  open: boolean;
  /** Dialog title */
  title: string;
  /** Dialog message */
  message: string;
  /** Callback when confirmed */
  onConfirm: () => void;
  /** Callback when cancelled */
  onCancel: () => void;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Whether confirm button is loading */
  loading?: boolean;
}

/**
 * ConfirmDialog Component
 *
 * Displays a confirmation dialog with customizable title, message, and callbacks.
 *
 * @param props - Dialog props
 * @returns ConfirmDialog component
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  loading = false,
}) => (
  <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>
      <DialogContentText>{message}</DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button onClick={onCancel} disabled={loading}>
        {cancelText}
      </Button>
      <Button onClick={onConfirm} variant="contained" disabled={loading}>
        {confirmText}
      </Button>
    </DialogActions>
  </Dialog>
);

ConfirmDialog.displayName = 'ConfirmDialog';
