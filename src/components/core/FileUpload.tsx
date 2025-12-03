/* eslint-disable unicorn/filename-case */
/**
 * FileUpload Component
 *
 * File upload input with preview and validation.
 *
 * @component
 * @example
 * ```tsx
 * <FileUpload
 *   accept=".csv"
 *   maxSize={5 * 1024 * 1024}
 *   onUpload={(file) => handleUpload(file)}
 * />
 * ```
 *
 * @module components/core/FileUpload
 */

import React, { useRef } from 'react';
import { Box, Button, Typography, Alert } from '@mui/material';
import { Upload as UploadIcon } from 'lucide-react';

export interface FileUploadProps {
  /** Accepted file types */
  accept?: string;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Callback when file is selected */
  onUpload: (file: File) => void;
  /** Error message */
  error?: string;
  /** Loading state */
  loading?: boolean;
  /** Button text */
  buttonText?: string;
}

/**
 * FileUpload Component
 *
 * Handles file selection and upload with validation and preview.
 *
 * @param props - FileUpload props
 * @returns FileUpload component
 */
export const FileUpload: React.FC<FileUploadProps> = ({
  accept,
  maxSize,
  onUpload,
  error,
  loading = false,
  buttonText = 'Upload File',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [localError, setLocalError] = React.useState<string>('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (maxSize && file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
      setLocalError(`File size exceeds ${maxSizeMB}MB limit`);
      setSelectedFile(null);
      return;
    }

    setLocalError('');
    setSelectedFile(file);
    onUpload(file);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      <Button
        variant="outlined"
        startIcon={<UploadIcon size={20} />}
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        fullWidth
      >
        {buttonText}
      </Button>

      {selectedFile && (
        <Typography variant="body2" color="textSecondary">
          Selected: {selectedFile.name}
        </Typography>
      )}

      {(localError || error) && <Alert severity="error">{localError || error}</Alert>}
    </Box>
  );
};

FileUpload.displayName = 'FileUpload';
