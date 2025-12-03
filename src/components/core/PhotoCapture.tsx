/* eslint-disable unicorn/filename-case */
/**
 * PhotoCapture Component
 *
 * Captures photos using device camera or file upload.
 *
 * @component
 * @example
 * ```tsx
 * <PhotoCapture
 *   onCapture={(file) => handlePhotoCapture(file)}
 * />
 * ```
 *
 * @module components/core/PhotoCapture
 */

import React, { useRef } from 'react';
import { Box, Button, Typography, Alert, Stack } from '@mui/material';
import { Camera as CameraIcon, X as XIcon } from 'lucide-react';

export interface PhotoCaptureProps {
  /** Callback when photo is captured */
  onCapture: (file: File) => void;
  /** Error message */
  error?: string;
  /** Loading state */
  loading?: boolean;
}

/**
 * PhotoCapture Component
 *
 * Provides camera input or file upload for photos.
 *
 * @param props - PhotoCapture props
 * @returns PhotoCapture component
 */
export const PhotoCapture: React.FC<PhotoCaptureProps> = ({
  onCapture,
  error,
  loading = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    onCapture(file);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRetake = () => {
    setPreview(null);
    setFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {preview ? (
        <Box>
          <Box
            component="img"
            src={preview}
            alt="Preview"
            sx={{
              width: '100%',
              maxHeight: 300,
              objectFit: 'cover',
              borderRadius: 1,
              mb: 2,
            }}
          />
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<XIcon size={20} />}
              onClick={handleRetake}
              disabled={loading}
              fullWidth
            >
              Retake
            </Button>
          </Stack>
          {fileName && (
            <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
              {fileName}
            </Typography>
          )}
        </Box>
      ) : (
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<CameraIcon size={20} />}
            onClick={() => cameraInputRef.current?.click()}
            disabled={loading}
            fullWidth
          >
            Take Photo
          </Button>
          <Button
            variant="outlined"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            fullWidth
          >
            Upload Photo
          </Button>
        </Stack>
      )}

      {error && <Alert severity="error">{error}</Alert>}
    </Box>
  );
};

PhotoCapture.displayName = 'PhotoCapture';
