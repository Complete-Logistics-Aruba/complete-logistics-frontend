/* eslint-disable unicorn/filename-case */
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import {
  Box,
  Typography,
  Button,
  Paper,
  IconButton,
  CircularProgress,
  Chip,
  Card,
  CardContent,
  CardActionArea,
  Skeleton,
} from '@mui/material';
import { ArrowLeft as BackIcon, Camera as CameraIcon, X as DeleteIcon, Check as CheckIcon, Package as PackageIcon, ArrowRight as ArrowRightIcon } from 'lucide-react';
import { PhotoCapture } from '@/components/core';
import { wmsApi } from '@/lib/api';
import type { ReceivingOrder } from '@/types/domain';

interface LocationState {
  receivingOrderId: string;
  containerNum: string;
  sealNum: string;
}

interface PhotoState {
  file: File;
  preview: string;
}

/**
 * Screen 6: Container Photos Capture
 *
 * Two-step flow:
 * 1. Show list of pending receiving orders
 * 2. Click order to capture 3 photos of the receiving container
 *
 * Acceptance Criteria:
 * 1. Display list of all pending receiving orders with container #, seal #, item count, status
 * 2. Click order card to open photo capture interface
 * 3. Display container # and seal # (read-only)
 * 4. 3 photo slots with camera/file input buttons
 * 5. Each slot shows preview after upload
 * 6. Continue button enabled only after all 3 photos uploaded
 * 7. Photos saved to: receiving/<receiving_order_id>/photo_<timestamp>.jpg
 * 8. Error handling: file too large, network error, camera permission denied
 * 9. Allow delete/replace individual photos before confirming
 */
export const Screen6: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const location = useLocation();
  const locationState = location.state as LocationState | undefined;

  // State management - Orders List
  const [orders, setOrders] = useState<ReceivingOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(true);
  const [selectedOrder, setSelectedOrder] = useState<ReceivingOrder | null>(null);

  // State management - Photo Upload
  const [receivingOrderId, setReceivingOrderId] = useState<string>(locationState?.receivingOrderId || '');
  const [containerNum, setContainerNum] = useState<string>(locationState?.containerNum || '');
  const [sealNum, setSealNum] = useState<string>(locationState?.sealNum || '');

  const [photos, setPhotos] = useState<Record<number, PhotoState>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load all pending receiving orders on mount
  useEffect(() => {
    const loadOrders = async () => {
      setLoadingOrders(true);
      try {
        const fetchedOrders = await wmsApi.receivingOrders.list();
        // Filter for pending orders (without container_photos)
        const pendingOrders = fetchedOrders.filter(
          (order) => !order.container_photos || order.container_photos.length === 0
        );
        setOrders(pendingOrders);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load orders';
        enqueueSnackbar(`Error: ${message}`, { variant: 'error' });
      } finally {
        setLoadingOrders(false);
      }
    };

    // Only load orders if not coming from Screen 1 with state
    if (locationState) {
      // If coming from Screen 1, directly select that order
      setReceivingOrderId(locationState.receivingOrderId);
      setContainerNum(locationState.containerNum);
      setSealNum(locationState.sealNum);
    } else {
      loadOrders();
    }
  }, [locationState, enqueueSnackbar]);

  // Handle order selection from list
  const handleSelectOrder = (order: ReceivingOrder) => {
    setSelectedOrder(order);
    setReceivingOrderId(order.id);
    setContainerNum(order.container_num);
    setSealNum(order.seal_num);
    setPhotos({}); // Reset photos for new order
  };

  // Handle back from photo upload to orders list
  const handleBackToOrdersList = () => {
    setSelectedOrder(null);
    setReceivingOrderId('');
    setContainerNum('');
    setSealNum('');
    setPhotos({});
  };

  const handlePhotoCapture = useCallback((index: number) => (file: File) => {
    const preview = URL.createObjectURL(file);
    setPhotos((prev) => ({
      ...prev,
      [index]: { file, preview },
    }));
    enqueueSnackbar(`Photo ${index + 1} uploaded`, { variant: 'success' });
  }, [enqueueSnackbar]);

  const handleDeletePhoto = useCallback((index: number) => {
    setPhotos((prev) => {
      const newPhotos = { ...prev };
      if (newPhotos[index]) {
        URL.revokeObjectURL(newPhotos[index].preview);
        delete newPhotos[index];
      }
      return newPhotos;
    });
    enqueueSnackbar(`Photo ${index + 1} deleted`, { variant: 'info' });
  }, [enqueueSnackbar]);

  const handleSubmit = async () => {
    if (Object.keys(photos).length < 3) {
      enqueueSnackbar('Please upload all 3 required photos', { variant: 'error' });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload each photo to storage
      const uploadPromises = Object.entries(photos).map(async ([index, { file }]) => {
        const timestamp = new Date().toISOString().replaceAll(/[:.]/g, '-').replaceAll('Z', '');
        const filename = `photo_${timestamp}_${index}.jpg`;
        const path = `${receivingOrderId}/${filename}`;

        await wmsApi.storage.upload('receiving', path, file);
        return filename;
      });

      const _photoPaths = await Promise.all(uploadPromises);

      // Photos are stored in Supabase Storage at: receiving/{orderId}/photo_*.jpg
      // No need to update receiving_orders table as photos are referenced by path

      enqueueSnackbar('✅ Photos uploaded and saved successfully!', { variant: 'success', autoHideDuration: 3000 });
      
      // Navigate to Screen 7 (Pallet Tallying)
      setTimeout(() => {
        navigate('/warehouse/screen-7', {
          state: {
            receivingOrderId,
            containerNum,
            sealNum,
          },
        });
      }, 1500);
    } catch (error) {
      console.error('Error uploading photos:', error);
      const message = error instanceof Error ? error.message : 'Failed to upload photos';
      enqueueSnackbar(`Error: ${message}`, { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const photoCount = Object.keys(photos).length;
  const allPhotosUploaded = photoCount === 3;

  // If no order selected, show orders list
  if (!selectedOrder && !locationState) {
    return (
      <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mb: 3 }}
        >
          Back
        </Button>

        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
          📦 Container Photos
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph sx={{ mb: 3 }}>
          Select a receiving order to capture container photos
        </Typography>

        {loadingOrders ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3 }}>
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent>
                  <Skeleton variant="text" width="60%" height={40} sx={{ mb: 2 }} />
                  <Skeleton variant="text" width="80%" height={20} sx={{ mb: 1 }} />
                  <Skeleton variant="text" width="70%" height={20} />
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : orders.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.02)' }}>
            <PackageIcon size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
            <Typography variant="h6" color="textSecondary">
              No pending orders
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              All receiving orders have been processed
            </Typography>
          </Paper>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3 }}>
            {orders.map((order) => (
                <Card
                  key={order.id}
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: 4,
                      transform: 'translateY(-4px)',
                    },
                  }}
                >
                  <CardActionArea onClick={() => handleSelectOrder(order)}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <PackageIcon size={24} style={{ marginRight: 8, color: '#2196F3' }} />
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {order.id.slice(0, 8).toUpperCase()}
                        </Typography>
                      </Box>

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="textSecondary">
                          Seal Number
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {order.seal_num}
                        </Typography>
                      </Box>

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="textSecondary">
                          Expected Items
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          📦 {order.expected_items_count || 0} items
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Chip
                          label={order.status || 'Pending'}
                          color={order.status === 'pending' ? 'warning' : 'default'}
                          size="small"
                          variant="outlined"
                        />
                        <ArrowRightIcon size={20} style={{ opacity: 0.5 }} />
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
            ))}
          </Box>
        )}
      </Box>
    );
  }

  // If order selected or coming from Screen 1, show photo upload interface
  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 1 }}>
        Container Photos
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Container: <strong>{containerNum}</strong>
      </Typography>

      <Paper elevation={1} sx={{ p: 4, mb: 4, backgroundColor: '#f9f9f9' }}>
        {/* Header with title and progress badge */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
            <CameraIcon size={24} />
            Capture Photos
          </Typography>
          <Chip
            label={`${photoCount}/3 photos captured`}
            sx={{
              backgroundColor: photoCount === 3 ? '#c8e6c9' : '#fff9c4',
              color: photoCount === 3 ? '#2e7d32' : '#f57f17',
              fontWeight: 'bold',
            }}
          />
        </Box>

        {/* Photo slots grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 2,
            mb: 3,
          }}
        >
          {[0, 1, 2].map((index) => (
            <Paper key={index}
              variant="outlined"
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 240,
                position: 'relative',
                border: '2px dashed #ccc',
                borderRadius: 2,
                backgroundColor: photos[index] ? '#f5f5f5' : 'transparent',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                '&:hover': {
                  borderColor: '#999',
                  backgroundColor: '#fafafa',
                },
              }}
            >
              {photos[index] ? (
                <Box sx={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Box
                    component="img"
                    src={photos[index].preview}
                    alt={`Container photo ${index + 1}`}
                    sx={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                      borderRadius: 1,
                    }}
                  />
                  <IconButton
                    onClick={() => handleDeletePhoto(index)}
                    size="small"
                    disabled={isSubmitting}
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      backgroundColor: 'rgba(0, 0, 0, 0.6)',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      },
                    }}
                  >
                    <DeleteIcon size={16} />
                  </IconButton>
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 4,
                      left: 4,
                      backgroundColor: '#4caf50',
                      color: 'white',
                      borderRadius: '50%',
                      p: 0.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CheckIcon size={16} />
                  </Box>
                </Box>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                  }}
                >
                  <CameraIcon size={48} style={{ marginBottom: 12, opacity: 0.4 }} />
                  <Typography variant="body2" color="textSecondary" align="center" sx={{ mb: 2 }}>
                    Photo {index + 1}
                  </Typography>
                  <PhotoCapture
                    onCapture={handlePhotoCapture(index)}
                    loading={isSubmitting}
                  />
                </Box>
              )}
            </Paper>
          ))}
        </Box>

        {/* Instructions */}
        <Typography variant="body2" color="textSecondary" align="center">
          Capture photos of the container seal, front, and contents
        </Typography>
      </Paper>

      {/* Action buttons */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 2 }}>
        <Button
          variant="outlined"
          size="large"
          onClick={selectedOrder ? handleBackToOrdersList : () => navigate(-1)}
          sx={{ py: 1.5 }}
        >
          Back
        </Button>
        <Button
          variant="contained"
          size="large"
          onClick={handleSubmit}
          disabled={isSubmitting || !allPhotosUploaded}
          startIcon={isSubmitting ? <CircularProgress size={20} /> : undefined}
          sx={{
            py: 1.5,
            backgroundColor: '#5b7cfa',
            '&:hover': {
              backgroundColor: '#4c6ef5',
            },
            '&:disabled': {
              backgroundColor: '#ccc',
            },
          }}
        >
          {isSubmitting ? 'Uploading...' : 'Continue'}
        </Button>
      </Box>
    </Box>
  );
};

export default Screen6;
