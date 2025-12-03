/* eslint-disable unicorn/filename-case */
/**
 * Screen 2: Receiving Summary Review & Form Upload
 *
 * CSE reviews expected vs received quantities to identify and document discrepancies.
 * CSE uploads signed receiving form for documentation.
 *
 * Story 4.1 Acceptance Criteria:
 * 1. Display receiving order (status=Staged)
 * 2. Table: Item ID, Description, Expected Qty, Received Qty, Difference
 * 3. Expected Qty = sum of expected_qty from receiving_order_lines
 * 4. Received Qty = SUM(pallet.qty) for this receiving_order
 * 5. Difference = Received - Expected (positive=overage, negative=shortage)
 * 6. Highlight rows with non-zero difference (yellow or red)
 * 7. Allow CSE to review and proceed or request recount
 *
 * Story 4.2 Acceptance Criteria:
 * 1. File upload section for final receiving form (PDF, JPEG, PNG)
 * 2. File saved to: `receiving/<receiving_order_id>/<filename>`
 * 3. Display uploaded file name and preview (if image)
 * 4. Allow replace/delete before sending email
 * 5. Error handling: file too large, invalid format, network error
 */

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { useSnackbar } from 'notistack';
import { receivingOrders, receivingOrderLines, pallets, products, storage } from '../../lib/api/wms-api';
import type { ReceivingOrder } from '../../types/domain';

interface _ReceivingLine {
  id: string;
  product_id: string;
  qty_expected: number;
  product?: {
    id: string;
    name: string;
  };
}

interface SummaryRow {
  lineId: string;
  itemId: string;
  description: string;
  expectedQty: number;
  receivedQty: number;
  difference: number;
  hasDiscrepancy: boolean;
}

export default function Screen2() {
  const location = useLocation();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const { receivingOrderId } = location.state || {};

  // State for order list
  const [stagedOrders, setStagedOrders] = useState<ReceivingOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [showOrderList, setShowOrderList] = useState(!receivingOrderId);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(receivingOrderId || null);

  // State for order details
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [summaryRows, setSummaryRows] = useState<SummaryRow[]>([]);
  const [orderStatus, setOrderStatus] = useState<string>('');
  const [totalExpected, setTotalExpected] = useState(0);
  const [totalReceived, setTotalReceived] = useState(0);
  const [containerNumState, setContainerNumState] = useState<string>('');
  const [sealNumState, setSealNumState] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<{ name: string; url: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [_showDeleteConfirm, _setShowDeleteConfirm] = useState(false);
  const [_isConfirmed, _setIsConfirmed] = useState(false);

  // Load all staged orders
  useEffect(() => {
    if (showOrderList) {
      const loadStagedOrders = async () => {
        try {
          setLoadingOrders(true);
          const orders = await receivingOrders.list();
          // Filter for Staged status only
          const staged = orders.filter((o: ReceivingOrder) => o.status === 'Staged');
          setStagedOrders(staged);
          if (staged.length === 0) {
            enqueueSnackbar('No staged orders available for review', { variant: 'info' });
          }
        } catch {
          enqueueSnackbar('Failed to load orders', { variant: 'error' });
        } finally {
          setLoadingOrders(false);
        }
      };
      loadStagedOrders();
    }
  }, [showOrderList, enqueueSnackbar]);

  // Handle order selection from list
  const handleSelectOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setShowOrderList(false);
  };

  // Load order data
  useEffect(() => {
    const loadData = async () => {
      const orderId = selectedOrderId || receivingOrderId;
      
      if (!orderId) {
        return;
      }

      try {
        setIsLoading(true);

        // Fetch receiving order
        const order = await receivingOrders.getById(orderId);
        setOrderStatus(order.status);
        setContainerNumState(order.container_num || '');
        setSealNumState(order.seal_num || '');

        // Fetch receiving order lines
        const lines = await receivingOrderLines.getByReceivingOrderId(orderId);

        // Fetch all pallets for this receiving order
        const palletsList = await pallets.getFiltered({
          receiving_order_id: orderId,
        });

        // Build summary rows
        const rows: SummaryRow[] = [];
        let sumExpected = 0;
        let sumReceived = 0;

        for (const line of lines) {
          // Get product info
          const product = await products.getByItemId(line.item_id);

          // Calculate received qty for this line
          const receivedQty = palletsList
            .filter((p) => p.item_id === line.item_id)
            .reduce((sum, p) => sum + (p.qty || 0), 0);

          const difference = receivedQty - line.expected_qty;
          const hasDiscrepancy = difference !== 0;

          sumExpected += line.expected_qty;
          sumReceived += (receivedQty || 0);

          rows.push({
            lineId: line.id,
            itemId: line.item_id,
            description: product.description,
            expectedQty: line.expected_qty,
            receivedQty,
            difference,
            hasDiscrepancy,
          });
        }

        setSummaryRows(rows);
        setTotalExpected(sumExpected);
        setTotalReceived(sumReceived);
      } catch (error) {
        console.error('Error loading data:', error);
        const message = error instanceof Error ? error.message : 'Failed to load data';
        enqueueSnackbar(`Error: ${message}`, { variant: 'error' });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [selectedOrderId, receivingOrderId, navigate, enqueueSnackbar]);

  const handleConfirmFinalCounts = async () => {
    if (!uploadedFile) {
      enqueueSnackbar('Please upload the receiving form before confirming.', { variant: 'warning' });
      return;
    }

    const orderId = selectedOrderId || receivingOrderId;

    if (!orderId) {
      enqueueSnackbar('No receiving order selected', { variant: 'error' });
      return;
    }

    try {
      setIsSubmitting(true);

      // Update receiving order status to 'Received'
      await receivingOrders.update(orderId, {
        status: 'Received',
      });

      _setIsConfirmed(true);
      enqueueSnackbar('✅ Receiving order confirmed! Inventory is now locked.', { variant: 'success' });

      // Navigate to Screen 4 (Register Container) after confirmation
      setTimeout(() => {
        navigate('/warehouse/screen-4', {
          state: {
            message: 'Receiving order confirmed successfully',
            receivingOrderId: orderId,
          },
        });
      }, 1500);
    } catch (error) {
      console.error('Error confirming order:', error);
      const message = error instanceof Error ? error.message : 'Failed to confirm order';
      enqueueSnackbar(`Error: ${message}`, { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      enqueueSnackbar('Invalid file format. Please upload PDF, JPEG, or PNG.', { variant: 'error' });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      enqueueSnackbar('File size exceeds 10MB limit.', { variant: 'error' });
      return;
    }

    try {
      setIsUploading(true);
      const orderId = selectedOrderId || receivingOrderId;

      if (!orderId) {
        enqueueSnackbar('No receiving order selected', { variant: 'error' });
        return;
      }

      // Upload file to Supabase Storage
      const fileName = `${Date.now()}-${file.name}`;
      const url = await storage.upload('receiving', `${orderId}/${fileName}`, file);
      setUploadedFile({ name: file.name, url });
      enqueueSnackbar(`✅ ${file.name} uploaded successfully`, { variant: 'success' });
    } catch (error) {
      console.error('Error uploading file:', error);
      enqueueSnackbar('Failed to upload file', { variant: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  // Show order selection list if no order selected
  if (showOrderList) {
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button
            startIcon={<ArrowLeftIcon size={20} />}
            onClick={() => navigate('/warehouse')}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            Select Receiving Order for Review
          </Typography>
        </Box>

        {loadingOrders ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
            <CircularProgress />
          </Box>
        ) : stagedOrders.length === 0 ? (
          <Alert severity="info">No staged orders available for review</Alert>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
              gap: 2,
            }}
          >
            {stagedOrders.map((order: ReceivingOrder) => (
              <Card
                key={order.id}
                onClick={() => handleSelectOrder(order.id)}
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: 4,
                    transform: 'translateY(-4px)',
                  },
                }}
              >
                <CardContent>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Order ID
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {order.id.slice(0, 8)}...
                  </Typography>

                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Container #
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {order.container_num}
                  </Typography>

                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Seal #
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {order.seal_num}
                  </Typography>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="textSecondary">
                      Status: {order.status}
                    </Typography>
                    <Typography variant="caption" color="primary" sx={{ fontWeight: 'bold' }}>
                      Click to Review →
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  const hasDiscrepancies = summaryRows.some((row) => row.hasDiscrepancy);
  const totalDifference = totalReceived - totalExpected;

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowLeftIcon size={20} />}
          onClick={() => setShowOrderList(true)}
          sx={{ mr: 2 }}
        >
          Back to Orders
        </Button>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          Receiving Summary Review
        </Typography>
      </Box>

      {/* Order Info */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
            <Box>
              <Typography variant="caption" color="textSecondary">
                Container #
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                {containerNumState || 'N/A'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="textSecondary">
                Seal #
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                {sealNumState || 'N/A'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="textSecondary">
                Status
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                {orderStatus}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Discrepancy Alert */}
      {hasDiscrepancies && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          ⚠️ {summaryRows.filter((r) => r.hasDiscrepancy).length} item(s) have quantity discrepancies. Please review and confirm before proceeding.
        </Alert>
      )}

      {/* Summary Table */}
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell>Item ID</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Expected Qty</TableCell>
              <TableCell align="right">Received Qty</TableCell>
              <TableCell align="right">Difference</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {summaryRows.map((row) => (
              <TableRow
                key={row.lineId}
                sx={{
                  backgroundColor: row.hasDiscrepancy
                    ? row.difference > 0
                      ? 'rgba(255, 193, 7, 0.1)'
                      : 'rgba(244, 67, 54, 0.1)'
                    : 'white',
                }}
              >
                <TableCell>{row.itemId}</TableCell>
                <TableCell>{row.description}</TableCell>
                <TableCell align="right">{row.expectedQty}</TableCell>
                <TableCell align="right">{row.receivedQty}</TableCell>
                <TableCell
                  align="right"
                  sx={{
                    color: row.hasDiscrepancy ? (row.difference > 0 ? '#ff9800' : '#f44336') : 'inherit',
                    fontWeight: row.hasDiscrepancy ? 'bold' : 'normal',
                  }}
                >
                  {row.difference > 0 ? '+' : ''}{row.difference}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Summary Statistics */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
            <Box>
              <Typography variant="caption" color="textSecondary">
                Total Expected
              </Typography>
              <Typography variant="h6">{totalExpected}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="textSecondary">
                Total Received
              </Typography>
              <Typography variant="h6">{totalReceived}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="textSecondary">
                Total Difference
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  color: totalDifference === 0 ? 'green' : totalDifference > 0 ? '#ff9800' : '#f44336',
                }}
              >
                {totalDifference > 0 ? '+' : ''}{totalDifference}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Upload Receiving Form
          </Typography>
          {uploadedFile ? (
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                ✅ File uploaded: {uploadedFile.name}
              </Typography>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => setUploadedFile(null)}
              >
                Remove
              </Button>
            </Box>
          ) : (
            <Box>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
                style={{ display: 'none' }}
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button
                  variant="contained"
                  component="span"
                  disabled={isUploading}
                >
                  {isUploading ? 'Uploading...' : 'Upload Form'}
                </Button>
              </label>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="outlined"
          onClick={() => setShowOrderList(true)}
        >
          Back to Orders
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleConfirmFinalCounts}
          disabled={isSubmitting || !uploadedFile}
        >
          {isSubmitting ? 'Confirming...' : 'Confirm & Proceed'}
        </Button>
      </Box>
    </Box>
  );
}
