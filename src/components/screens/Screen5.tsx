/* eslint-disable unicorn/filename-case */
/**
 * Screen 5: Pending Receipts
 *
 * WH user views receiving orders ready for put-away.
 * Shows orders with status=Staged (photos captured, pallets tallied).
 *
 * Story: Pending Receipts List
 * Acceptance Criteria:
 * 1. Display list of receiving orders with status=Staged
 * 2. Show: Order ID, Container #, Seal #, Created Date, Item Count
 * 3. Click order to navigate to Screen 8 (Put-Away)
 * 4. Loading state while fetching
 * 5. Empty state if no pending receipts
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
  Chip,
} from '@mui/material';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
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

        // Filter for staged orders
        const stagedOrders = allOrders.filter((order) => order.status === 'Staged');

        // For each order, count the items
        const receiptsWithCounts: PendingReceipt[] = [];
        for (const order of stagedOrders) {
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

  const handleSelectReceipt = (receipt: PendingReceipt) => {
    navigate('/warehouse/screen-8', {
      state: {
        receivingOrderId: receipt.id,
        containerNum: receipt.container_num,
        sealNum: receipt.seal_num,
      },
    });
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          📦 Pending Receipts
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Receiving orders ready for put-away. Click an order to begin put-away process.
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
        /* Receipts Table */
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell>Order ID</TableCell>
                <TableCell>Container #</TableCell>
                <TableCell>Seal #</TableCell>
                <TableCell align="center">Items</TableCell>
                <TableCell>Created Date</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {receipts.map((receipt) => (
                <TableRow
                  key={receipt.id}
                  hover
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: '#f9f9f9',
                    },
                  }}
                >
                  <TableCell sx={{ fontWeight: 'bold' }}>
                    {receipt.id.slice(0, 8)}...
                  </TableCell>
                  <TableCell>{receipt.container_num}</TableCell>
                  <TableCell>{receipt.seal_num}</TableCell>
                  <TableCell align="center">
                    <Chip label={receipt.item_count} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    {new Date(receipt.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={receipt.status}
                      size="small"
                      color="warning"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      endIcon={<ArrowRightIcon size={16} />}
                      onClick={() => handleSelectReceipt(receipt)}
                      sx={{ textTransform: 'none' }}
                    >
                      Start Put-Away
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Summary */}
      {receipts.length > 0 && (
        <Box sx={{ mt: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="body2" color="textSecondary">
            Total pending receipts: <strong>{receipts.length}</strong>
          </Typography>
        </Box>
      )}
    </Box>
  );
}
