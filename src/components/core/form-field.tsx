import React from "react";
import { TextField, TextFieldProps } from "@mui/material";

// FormFieldProps is just TextFieldProps with possible future extensions
export type FormFieldProps = TextFieldProps;

/**
 * FormField component that wraps Material UI's TextField to provide consistent styling
 * and behavior for form fields throughout the application.
 */
export const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>((props, ref) => {
	const { error, helperText, ...rest } = props;

	return <TextField ref={ref} error={error} helperText={helperText} fullWidth {...rest} />;
});

FormField.displayName = "FormField";

export default FormField;
