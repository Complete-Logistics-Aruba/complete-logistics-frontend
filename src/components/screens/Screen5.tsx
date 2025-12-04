/* eslint-disable unicorn/filename-case */
/**
 * Screen 5: Pending Receipts
 *
 * WH user views receiving orders ready for container photos.
 * Shows orders with status=Pending (created by CSE, awaiting warehouse processing).
 *
 * Story: Pending Receipts List
 * Acceptance Criteria:
 * 1. Display list of receiving orders with status=Pending
 * 2. Show: Order ID, Container #, Seal #, Created Date, Item Count
 * 3. Click order to navigate to Screen 6 (Container Photos)
 * 4. Loading state while fetching
 * 5. Empty state if no pending receipts
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Typography,
  Chip,
  Container,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { receivingOrders, receivingOrderLines } from '../../lib/api/wms-api';

interface PendingReceipt {
  id: string;
  container_num: string;
  seal_num: string;
  created_at: string;
  item_count: number;
  status: string;
}

export default function Screen5() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [isLoading, setIsLoading] = useState(true);
  const [receipts, setReceipts] = useState<PendingReceipt[]>([]);

  // Load pending receipts
  useEffect(() => {
    const loadReceipts = async () => {
      try {
        setIsLoading(true);

        // Fetch all receiving orders
        const allOrders = await receivingOrders.list();

        // Filter for pending orders (awaiting container photos)
        const pendingOrders = allOrders.filter((order) => order.status === 'Pending');

        // For each order, count the items
        const receiptsWithCounts: PendingReceipt[] = [];
        for (const order of pendingOrders) {
          const lines = await receivingOrderLines.getByReceivingOrderId(order.id);
          receiptsWithCounts.push({
            id: order.id,
            container_num: order.container_num,
            seal_num: order.seal_num,
            created_at: order.created_at,
            item_count: lines.length,
            status: order.status,
          });
        }

        setReceipts(receiptsWithCounts);
      } catch (error) {
        console.error('Error loading pending receipts:', error);
        const message = error instanceof Error ? error.message : 'Failed to load pending receipts';
        enqueueSnackbar(`Error: ${message}`, { variant: 'error' });
      } finally {
        setIsLoading(false);
      }
    };

    loadReceipts();
  }, [enqueueSnackbar]);

  const handleSelectReceipt = async (receipt: PendingReceipt) => {
    try {
      // Update status to "Unloading"
      await receivingOrders.update(receipt.id, {
        status: 'Unloading',
      });

      // Update local state
      setReceipts((prev) =>
        prev.map((r) =>
          r.id === receipt.id ? { ...r, status: 'Unloading' } : r
        )
      );

      // Navigate to Screen 6
      navigate('/warehouse/screen-6', {
        state: {
          receivingOrderId: receipt.id,
          containerNum: receipt.container_num,
          sealNum: receipt.seal_num,
        },
      });

      enqueueSnackbar('Status updated to Unloading', { variant: 'success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update status';
      enqueueSnackbar(`Error: ${message}`, { variant: 'error' });
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3, md: 4 } }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography 
          variant="h4" 
          sx={{ 
            fontWeight: 'bold', 
            mb: 1,
            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' }
          }}
        >
          📦 Pending Receipts
        </Typography>
        <Typography 
          variant="body2" 
          color="textSecondary"
          sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
        >
          Receiving orders awaiting container photos. Click an order to capture photos.
        </Typography>
      </Box>

      {/* Empty State */}
      {receipts.length === 0 ? (
        <Card sx={{ textAlign: 'center', p: 4 }}>
          <Typography variant="h6" color="textSecondary" sx={{ mb: 1 }}>
            No pending receipts
          </Typography>
          <Typography variant="body2" color="textSecondary">
            All receiving orders have been processed or are still in progress.
          </Typography>
        </Card>
      ) : (
        /* Receipts Cards Grid */
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
            gap: { xs: 2, sm: 3, md: 3 },
          }}
        >
          {receipts.map((receipt) => (
            <Box key={receipt.id}>
              <Card
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  '&:hover': {
                    boxShadow: 6,
                    transform: 'translateY(-8px)',
                  },
                }}
              >
                <CardActionArea 
                  onClick={() => handleSelectReceipt(receipt)}
                  sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}
                >
                  <CardContent sx={{ width: '100%', flexGrow: 1 }}>
                    {/* Container Number */}
                    <Box sx={{ mb: 2 }}>
                      <Typography 
                        variant="caption" 
                        color="textSecondary"
                        sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                      >
                        Container #
                      </Typography>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          fontWeight: 'bold',
                          fontSize: { xs: '1rem', sm: '1.25rem' }
                        }}
                      >
                        {receipt.container_num}
                      </Typography>
                    </Box>

                    {/* Seal Number */}
                    <Box sx={{ mb: 2 }}>
                      <Typography 
                        variant="caption" 
                        color="textSecondary"
                        sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                      >
                        Seal #
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ fontWeight: 'bold' }}
                      >
                        {receipt.seal_num}
                      </Typography>
                    </Box>

                    {/* Created Date */}
                    <Box sx={{ mb: 2 }}>
                      <Typography 
                        variant="caption" 
                        color="textSecondary"
                        sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                      >
                        Created Date
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ fontWeight: 'bold' }}
                      >
                        {new Date(receipt.created_at).toLocaleDateString()}
                      </Typography>
                    </Box>

                    {/* Status and Items */}
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between', alignItems: 'center' }}>
                      <Chip
                        label={receipt.status}
                        size="small"
                        color="warning"
                        variant="outlined"
                      />
                      <Chip
                        label={`${receipt.item_count} items`}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Box>
          ))}
        </Box>
      )}

      {/* Summary */}
      {receipts.length > 0 && (
        <Box sx={{ mt: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="body2" color="textSecondary">
            Total pending receipts: <strong>{receipts.length}</strong>
          </Typography>
        </Box>
      )}
    </Container>
  );
}
