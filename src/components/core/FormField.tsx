/* eslint-disable unicorn/filename-case */
/**
 * FormField Component
 *
 * Reusable form field wrapper around MUI TextField.
 * Provides consistent styling, error handling, and loading states.
 *
 * @component
 * @example
 * ```tsx
 * <FormField
 *   label="Email"
 *   type="email"
 *   error={!!errors.email}
 *   helperText={errors.email?.message}
 *   {...register('email')}
 * />
 * ```
 *
 * @module components/core/FormField
 */

import React from "react";
import { TextField } from "@mui/material";
import type { TextFieldProps } from "@mui/material";

export interface FormFieldProps extends Omit<TextFieldProps, "size"> {
	/** Loading state */
	loading?: boolean;
}

/**
 * FormField Component
 *
 * Wraps MUI TextField with common props and consistent styling.
 * Used for all form inputs across the application.
 *
 * @param props - TextField props plus custom props
 * @returns FormField component
 */
export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(({ loading = false, ...props }, ref) => (
	<TextField ref={ref} fullWidth size="small" disabled={loading || props.disabled} {...props} />
));

FormField.displayName = "FormField";
