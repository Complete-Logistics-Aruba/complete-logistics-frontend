/* eslint-disable unicorn/filename-case */
/**
 * Screen 0: Product Master Upload
 *
 * Allows CSE users to upload product master data via CSV.
 * Validates, stores in database, and archives to storage.
 *
 * @component
 * @module components/screens/Screen0
 */

import React, { useState } from 'react';
import {
  Box,
  Container,
  Stack,
  Typography,
  Card,
  CardContent,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
} from '@mui/material';
import { Helmet } from 'react-helmet-async';
import { useSnackbar } from 'notistack';
import { Download as DownloadIcon } from '@phosphor-icons/react/dist/ssr/Download';
import { FileUpload, ErrorAlert, SuccessAlert, LoadingSpinner } from '@/components/core';
import { validateProductMasterCSV } from '@/utils/csv-validation';
import { wmsApi } from '@/lib/api';
import { supabase } from '@/lib/auth/supabase-client';

const downloadTemplate = () => {
  const csvContent = `item_id,description,units_per_pallet,pallet_positions
PROD-001,Premium Wireless Headphones,500,1
PROD-002,Mechanical Gaming Keyboard RGB,500,1
PROD-003,27-inch 4K Monitor,500,1
PROD-004,Ergonomic Office Chair,500,1
PROD-005,500GB NVMe SSD,500,1`;

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = globalThis.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'product-master-template.csv';
  document.body.append(link);
  link.click();
  link.remove();
  globalThis.URL.revokeObjectURL(url);
};

/**
 * Screen 0 Component - Product Master Upload
 *
 * @returns Screen0 component
 */
export function Screen0() {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ message: string; count: number } | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Array<{ row: number; field: string; message: string }>
  >([]);

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setValidationErrors([]);

    try {
      // Validate CSV
      let result;
      try {
        result = await validateProductMasterCSV(file);
      } catch (error_) {
        const message = error_ instanceof Error ? error_.message : 'Failed to validate CSV';
        setError(`CSV validation error: ${message}`);
        enqueueSnackbar(`CSV validation error: ${message}`, { variant: 'error' });
        setLoading(false);
        return;
      }

      if (!result.valid) {
        setValidationErrors(result.errors);
        setError(`CSV validation failed: ${result.errors.length} errors found`);
        setLoading(false);
        return;
      }

      // Transform data for database
      const products = result.data.map((row) => ({
        item_id: row.item_id,
        description: row.description || '',
        units_per_pallet: Number.parseInt(row.units_per_pallet, 10),
        pallet_positions: row.pallet_positions ? Number.parseInt(row.pallet_positions, 10) : 1,
        active: true,
      }));

      // Truncate existing products (delete all with cascade)
      // Must delete in order: receiving_order_lines → receiving_orders → pallets → products
      try {
        console.log('Clearing existing data (cascade delete)...');

        // Step 1: Delete receiving order lines
        console.log('Deleting receiving order lines...');
        const { error: deleteLineError } = await supabase
          .from('receiving_order_lines')
          .delete()
          .gte('created_at', '1900-01-01');
        if (deleteLineError) {
          console.error('Error deleting receiving order lines:', deleteLineError);
          throw deleteLineError;
        }

        // Step 2: Delete shipping order lines
        console.log('Deleting shipping order lines...');
        const { error: deleteShippingLineError } = await supabase
          .from('shipping_order_lines')
          .delete()
          .gte('created_at', '1900-01-01');
        if (deleteShippingLineError) {
          console.error('Error deleting shipping order lines:', deleteShippingLineError);
          throw deleteShippingLineError;
        }

        // Step 3: Delete pallets
        console.log('Deleting pallets...');
        const { error: deletePalletError } = await supabase
          .from('pallets')
          .delete()
          .gte('created_at', '1900-01-01');
        if (deletePalletError) {
          console.error('Error deleting pallets:', deletePalletError);
          throw deletePalletError;
        }

        // Step 4: Delete receiving orders
        console.log('Deleting receiving orders...');
        const { error: deleteReceivingError } = await supabase
          .from('receiving_orders')
          .delete()
          .gte('created_at', '1900-01-01');
        if (deleteReceivingError) {
          console.error('Error deleting receiving orders:', deleteReceivingError);
          throw deleteReceivingError;
        }

        // Step 5: Delete shipping orders
        console.log('Deleting shipping orders...');
        const { error: deleteShippingError } = await supabase
          .from('shipping_orders')
          .delete()
          .gte('created_at', '1900-01-01');
        if (deleteShippingError) {
          console.error('Error deleting shipping orders:', deleteShippingError);
          throw deleteShippingError;
        }

        // Step 6: Delete products
        console.log('Deleting products...');
        const { error: deleteProductError } = await supabase
          .from('products')
          .delete()
          .gte('created_at', '1900-01-01');
        if (deleteProductError) {
          console.error('Error deleting products:', deleteProductError);
          throw deleteProductError;
        }

        console.log('Successfully cleared all existing data');
      } catch (error_) {
        let message = 'Unknown error';
        if (error_ instanceof Error) {
          message = error_.message;
        } else if (error_ && typeof error_ === 'object' && 'message' in error_) {
          message = String((error_ as unknown as Record<string, unknown>).message);
        }
        console.error('Failed to clear existing data:', message);
        throw new Error(`Failed to clear existing products: ${message}`);
      }

      // Insert new products
      let insertedCount = 0;
      for (const product of products) {
        try {
          console.log(`Inserting product: ${product.item_id}`, product);
          await wmsApi.products.create(product);
          insertedCount++;
        } catch (error_) {
          const message = error_ instanceof Error ? error_.message : 'Failed to insert product';
          console.error(`Error inserting product ${product.item_id}:`, message, 'Product data:', product);
          throw new Error(`Failed to insert product ${product.item_id}: ${message}`);
        }
      }

      // Save original CSV to storage
      try {
        const timestamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
        const fileName = `products/master_${timestamp}.csv`;
        await wmsApi.storage.upload('receiving', fileName, file);
      } catch (error_) {
        const message = error_ instanceof Error ? error_.message : 'Failed to save CSV';
        console.warn('Warning: Could not save CSV to storage:', message);
        // Don't fail the entire operation if storage fails
      }

      // Success
      setSuccess({
        message: `Product master updated: ${insertedCount} items loaded`,
        count: insertedCount,
      });

      enqueueSnackbar(`✅ Successfully loaded ${insertedCount} products`, { variant: 'success' });
    } catch (error_) {
      const message = error_ instanceof Error ? error_.message : 'Failed to upload products';
      setError(message);
      enqueueSnackbar(message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Product Master Upload - Complete Logistics System</title>
      </Helmet>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack spacing={4}>
          {/* Header */}
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 1 }}>
              Screen 0: Product Master Upload
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Upload a CSV file to initialize or update the product catalog
            </Typography>
          </Box>

          {/* CSV Format Instructions */}
          <Card sx={{ border: '2px solid #e3f2fd' }}>
            <CardContent>
              <Stack spacing={3}>
                {/* Header */}
                <Box>
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
                    📋 CSV Format Requirements
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Your CSV file must contain the following columns in this exact order:
                  </Typography>
                </Box>

                {/* Column Specifications Table */}
                <TableContainer component={Paper} sx={{ bgcolor: '#fafafa' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#e3f2fd' }}>
                        <TableCell sx={{ fontWeight: 'bold' }}>Column Name</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Example</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <code>item_id</code>
                            <Chip label="Required" size="small" color="error" variant="outlined" />
                          </Box>
                        </TableCell>
                        <TableCell>Text</TableCell>
                        <TableCell>Unique product identifier</TableCell>
                        <TableCell><code>PROD-001</code></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <code>description</code>
                            <Chip label="Optional" size="small" color="warning" variant="outlined" />
                          </Box>
                        </TableCell>
                        <TableCell>Text</TableCell>
                        <TableCell>Product name/description</TableCell>
                        <TableCell><code>Wireless Headphones</code></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <code>units_per_pallet</code>
                            <Chip label="Required" size="small" color="error" variant="outlined" />
                          </Box>
                        </TableCell>
                        <TableCell>Number</TableCell>
                        <TableCell>Units that fit on one pallet</TableCell>
                        <TableCell><code>500</code></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <code>pallet_positions</code>
                            <Chip label="Optional" size="small" color="warning" variant="outlined" />
                          </Box>
                        </TableCell>
                        <TableCell>Number</TableCell>
                        <TableCell>Number of pallet positions (defaults to 1)</TableCell>
                        <TableCell><code>1</code></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Example CSV */}
                {/* <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                    ✅ Example CSV Format:
                  </Typography>
                  <Box
                    component="pre"
                    sx={{
                      bgcolor: '#f5f5f5',
                      p: 2,
                      borderRadius: 1,
                      overflow: 'auto',
                      border: '1px solid #ddd',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                    }}
                  >
                    {`item_id,description,units_per_pallet,pallet_positions
PROD-001,Premium Wireless Headphones,500,1
PROD-002,Mechanical Gaming Keyboard RGB,500,1
PROD-003,27-inch 4K Monitor,500,1
PROD-004,Ergonomic Office Chair,500,1
PROD-005,500GB NVMe SSD,500,1`}
                  </Box>
                </Box> */}

                {/* Download Template Button */}
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon size={20} />}
                    onClick={downloadTemplate}
                    sx={{ textTransform: 'none' }}
                  >
                    Download CSV Template
                  </Button>
                  <Alert severity="info" sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                    💡 Download the template to get started quickly
                  </Alert>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* Upload Area */}
          <Card>
            <CardContent>
              <Stack spacing={3}>
                {loading ? (
                  <LoadingSpinner message="Processing CSV and uploading products..." />
                ) : (
                  <>
                    <FileUpload
                      accept=".csv"
                      maxSize={5 * 1024 * 1024}
                      onUpload={handleFileUpload}
                      buttonText="Upload Product Master CSV"
                    />

                    {error && <ErrorAlert message={error} onClose={() => setError(null)} />}

                    {success && (
                      <SuccessAlert
                        message={success.message}
                        onClose={() => setSuccess(null)}
                      />
                    )}
                  </>
                )}
              </Stack>
            </CardContent>
          </Card>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Card sx={{ borderColor: 'error.main', borderWidth: 1 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: 'error.main' }}>
                  Validation Errors ({validationErrors.length})
                </Typography>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                        <TableCell>Row</TableCell>
                        <TableCell>Field</TableCell>
                        <TableCell>Error</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {validationErrors.map((err, index) => (
                        <TableRow key={index}>
                          <TableCell>{err.row}</TableCell>
                          <TableCell>{err.field}</TableCell>
                          <TableCell>{err.message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Alert severity="info" sx={{ mt: 2 }}>
                  Please fix the errors above and re-upload the CSV file
                </Alert>
              </CardContent>
            </Card>
          )}
        </Stack>
      </Container>
    </>
  );
}

export default Screen0;
