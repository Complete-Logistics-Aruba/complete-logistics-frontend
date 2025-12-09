/* eslint-disable unicorn/filename-case */
/**
 * Screen 0B: Product Master Maintenance
 *
 * Allows CSE users to view, edit, add, and deactivate products.
 * Provides inline editing, modal for adding new products, and search/filter.
 *
 * @component
 * @module components/screens/Screen0B
 */

import React, { useCallback, useEffect, useState } from "react";
import {
	Alert,
	Box,
	Button,
	CircularProgress,
	Container,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Paper,
	Stack,
	Switch,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TablePagination,
	TableRow,
	TextField,
	Typography,
} from "@mui/material";
import { ArrowLeft as ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { Plus as PlusIcon } from "lucide-react";
import { useSnackbar } from "notistack";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";

import { Product } from "@/types/domain";
import { paths } from "@/paths";
import { wmsApi } from "@/lib/api";

/**
 * Screen 0B Component - Product Master Maintenance
 *
 * @returns Screen0B component
 */
export function Screen0B() {
	const navigate = useNavigate();
	const { enqueueSnackbar } = useSnackbar();
	const [products, setProducts] = useState<Product[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchText, setSearchText] = useState("");
	const [openAddModal, setOpenAddModal] = useState(false);
	const [newProduct, setNewProduct] = useState({
		item_id: "",
		description: "",
		units_per_pallet: 1,
		pallet_positions: 1,
		active: true,
	});
	const [addErrors, setAddErrors] = useState<Record<string, string>>({});
	const [submitting, setSubmitting] = useState(false);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(25);
	const [editingCell, setEditingCell] = useState<{ itemId: string; field: string } | null>(null);
	const [editValue, setEditValue] = useState<unknown>("");

	const loadProducts = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const data = await wmsApi.products.getAll();
			setProducts(data);
		} catch (error_) {
			const message = error_ instanceof Error ? error_.message : "Failed to load products";
			setError(message);
			enqueueSnackbar(message, { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [enqueueSnackbar]);

	// Load products
	useEffect(() => {
		loadProducts();
	}, [loadProducts]);

	// Filter products by search text
	const filteredProducts = products.filter((product) => {
		const searchLower = searchText.toLowerCase();
		return (
			product.item_id.toLowerCase().includes(searchLower) ||
			(product.description && product.description.toLowerCase().includes(searchLower))
		);
	});

	// Handle edit product
	const handleEditProduct = async (itemId: string, field: string, value: unknown) => {
		const product = products.find((p) => p.item_id === itemId);

		if (!product) return;

		// Validation
		if (field === "units_per_pallet" && typeof value === "number" && (value <= 0 || Number.isNaN(value))) {
			enqueueSnackbar("Units per pallet must be > 0", { variant: "error" });
			return;
		}

		if (field === "pallet_positions" && typeof value === "number" && (value < 1 || Number.isNaN(value))) {
			enqueueSnackbar("Pallet positions must be ≥ 1", { variant: "error" });
			return;
		}

		try {
			const updatedProduct = await wmsApi.products.update(itemId, {
				[field]: value,
			});

			setProducts((prev) => prev.map((p) => (p.item_id === itemId ? updatedProduct : p)));

			enqueueSnackbar("Product updated successfully", { variant: "success" });
		} catch (error_) {
			const message = error_ instanceof Error ? error_.message : "Failed to update product";
			enqueueSnackbar(message, { variant: "error" });
		}
	};

	// Validate new product
	const validateNewProduct = (): boolean => {
		const errors: Record<string, string> = {};

		if (!newProduct.item_id.trim()) {
			errors.item_id = "Item ID is required";
		}

		if (newProduct.units_per_pallet <= 0) {
			errors.units_per_pallet = "Units per pallet must be > 0";
		}

		if (newProduct.pallet_positions < 1) {
			errors.pallet_positions = "Pallet positions must be ≥ 1";
		}

		// Check for duplicate item_id
		if (products.some((p) => p.item_id === newProduct.item_id)) {
			errors.item_id = "Item ID already exists";
		}

		setAddErrors(errors);
		return Object.keys(errors).length === 0;
	};

	// Handle add product
	const handleAddProduct = async () => {
		if (!validateNewProduct()) return;

		setSubmitting(true);
		try {
			const created = await wmsApi.products.create({
				item_id: newProduct.item_id,
				description: newProduct.description || "",
				units_per_pallet: newProduct.units_per_pallet,
				pallet_positions: newProduct.pallet_positions,
				active: newProduct.active,
			});

			setProducts((prev) => [...prev, created]);
			setOpenAddModal(false);
			setNewProduct({
				item_id: "",
				description: "",
				units_per_pallet: 1,
				pallet_positions: 1,
				active: true,
			});
			setAddErrors({});

			enqueueSnackbar("Product added successfully", { variant: "success" });
		} catch (error_) {
			const message = error_ instanceof Error ? error_.message : "Failed to add product";
			enqueueSnackbar(message, { variant: "error" });
		} finally {
			setSubmitting(false);
		}
	};

	// Handle pagination
	const handleChangePage = (event: unknown, newPage: number) => {
		setPage(newPage);
	};

	const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
		setRowsPerPage(Number.parseInt(event.target.value, 10));
		setPage(0);
	};

	// Get paginated products
	const paginatedProducts = filteredProducts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

	return (
		<>
			<Helmet>
				<title>Screen 0B: Product Master Maintenance - Complete Logistics System</title>
			</Helmet>

			<Container maxWidth="lg" sx={{ py: 4 }}>
				<Stack spacing={4}>
					{/* Header with Back Button */}
					<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
						<Box>
							<Typography variant="h4" component="h1" sx={{ fontWeight: "bold", mb: 1 }}>
								Screen 0B: Product Master Maintenance
							</Typography>
							<Typography variant="body1" color="textSecondary">
								View, edit, add, and manage products in the master catalog
							</Typography>
						</Box>
						<Button
							variant="outlined"
							startIcon={<ArrowLeftIcon size={20} />}
							onClick={() => navigate(paths.warehouseScreens.screen0)}
							sx={{ textTransform: "none" }}
						>
							Back
						</Button>
					</Box>

					{/* Error Alert */}
					{error && <Alert severity="error">{error}</Alert>}

					{/* Search and Add Button */}
					<Stack direction="row" spacing={2} sx={{ alignItems: "flex-end" }}>
						<TextField
							label="Search by Item ID or Description"
							value={searchText}
							onChange={(e) => setSearchText(e.target.value)}
							size="small"
							sx={{ flex: 1 }}
							placeholder="Type to search..."
						/>
						<Button variant="contained" startIcon={<PlusIcon size={20} />} onClick={() => setOpenAddModal(true)}>
							Add Product
						</Button>
					</Stack>

					{/* Table */}
					{loading ? (
						<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
							<CircularProgress />
						</Box>
					) : (
						<TableContainer component={Paper}>
							<Table>
								<TableHead sx={{ bgcolor: "#f5f5f5" }}>
									<TableRow>
										<TableCell sx={{ fontWeight: "bold" }}>Item ID</TableCell>
										<TableCell sx={{ fontWeight: "bold" }}>Description</TableCell>
										<TableCell sx={{ fontWeight: "bold" }} align="right">
											Units per Pallet
										</TableCell>
										<TableCell sx={{ fontWeight: "bold" }} align="right">
											Pallet Positions
										</TableCell>
										<TableCell sx={{ fontWeight: "bold" }} align="center">
											Active
										</TableCell>
										<TableCell sx={{ fontWeight: "bold" }} align="center">
											Actions
										</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{paginatedProducts.map((product) => (
										<TableRow key={product.id} hover>
											<TableCell>{product.item_id}</TableCell>
											<TableCell>
												{editingCell?.itemId === product.item_id && editingCell?.field === "description" ? (
													<TextField
														size="small"
														value={editValue}
														onChange={(e) => setEditValue(e.target.value)}
														onBlur={() => {
															handleEditProduct(product.item_id, "description", editValue);
															setEditingCell(null);
														}}
														autoFocus
													/>
												) : (
													<Box
														onClick={() => {
															setEditingCell({ itemId: product.item_id, field: "description" });
															setEditValue(product.description);
														}}
														sx={{ cursor: "pointer", "&:hover": { bgcolor: "#f0f0f0", p: 0.5 } }}
													>
														{product.description}
													</Box>
												)}
											</TableCell>
											<TableCell align="right">
												{editingCell?.itemId === product.item_id && editingCell?.field === "units_per_pallet" ? (
													<TextField
														size="small"
														type="number"
														value={editValue}
														onChange={(e) => setEditValue(Number.parseInt(e.target.value, 10))}
														onBlur={() => {
															handleEditProduct(product.item_id, "units_per_pallet", editValue);
															setEditingCell(null);
														}}
														autoFocus
														inputProps={{ min: 1 }}
													/>
												) : (
													<Box
														onClick={() => {
															setEditingCell({ itemId: product.item_id, field: "units_per_pallet" });
															setEditValue(product.units_per_pallet);
														}}
														sx={{ cursor: "pointer", "&:hover": { bgcolor: "#f0f0f0", p: 0.5 } }}
													>
														{product.units_per_pallet}
													</Box>
												)}
											</TableCell>
											<TableCell align="right">
												{editingCell?.itemId === product.item_id && editingCell?.field === "pallet_positions" ? (
													<TextField
														size="small"
														type="number"
														value={editValue}
														onChange={(e) => setEditValue(Number.parseInt(e.target.value, 10))}
														onBlur={() => {
															handleEditProduct(product.item_id, "pallet_positions", editValue);
															setEditingCell(null);
														}}
														autoFocus
														inputProps={{ min: 1 }}
													/>
												) : (
													<Box
														onClick={() => {
															setEditingCell({ itemId: product.item_id, field: "pallet_positions" });
															setEditValue(product.pallet_positions);
														}}
														sx={{ cursor: "pointer", "&:hover": { bgcolor: "#f0f0f0", p: 0.5 } }}
													>
														{product.pallet_positions}
													</Box>
												)}
											</TableCell>
											<TableCell align="center">
												<Switch
													checked={product.active}
													onChange={(e) => handleEditProduct(product.item_id, "active", e.target.checked)}
													size="small"
												/>
											</TableCell>
											<TableCell align="center">
												<Button
													variant="outlined"
													size="small"
													onClick={() => {
														setEditingCell({ itemId: product.item_id, field: "description" });
														setEditValue(product.description);
													}}
												>
													Edit
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
							<TablePagination
								rowsPerPageOptions={[25, 50, 100]}
								component="div"
								count={filteredProducts.length}
								rowsPerPage={rowsPerPage}
								page={page}
								onPageChange={handleChangePage}
								onRowsPerPageChange={handleChangeRowsPerPage}
							/>
						</TableContainer>
					)}

					{/* Add Product Modal */}
					<Dialog open={openAddModal} onClose={() => setOpenAddModal(false)} maxWidth="sm" fullWidth>
						<DialogTitle>Add New Product</DialogTitle>
						<DialogContent sx={{ pt: 2 }}>
							<Stack spacing={2}>
								<TextField
									label="Item ID *"
									value={newProduct.item_id}
									onChange={(e) => setNewProduct({ ...newProduct, item_id: e.target.value })}
									error={!!addErrors.item_id}
									helperText={addErrors.item_id}
									fullWidth
									disabled={submitting}
								/>
								<TextField
									label="Description"
									value={newProduct.description}
									onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
									fullWidth
									multiline
									rows={2}
									disabled={submitting}
								/>
								<TextField
									label="Units per Pallet *"
									type="number"
									value={newProduct.units_per_pallet}
									onChange={(e) =>
										setNewProduct({ ...newProduct, units_per_pallet: Number.parseInt(e.target.value, 10) })
									}
									error={!!addErrors.units_per_pallet}
									helperText={addErrors.units_per_pallet}
									fullWidth
									disabled={submitting}
									inputProps={{ min: 1 }}
								/>
								<TextField
									label="Pallet Positions *"
									type="number"
									value={newProduct.pallet_positions}
									onChange={(e) =>
										setNewProduct({ ...newProduct, pallet_positions: Number.parseInt(e.target.value, 10) })
									}
									error={!!addErrors.pallet_positions}
									helperText={addErrors.pallet_positions}
									fullWidth
									disabled={submitting}
									inputProps={{ min: 1 }}
								/>
								<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pt: 1 }}>
									<Typography variant="body2">
										Status: <strong>{newProduct.active ? "Active" : "Inactive"}</strong>
									</Typography>
									<Switch
										checked={newProduct.active}
										onChange={(e) => setNewProduct({ ...newProduct, active: e.target.checked })}
										disabled={submitting}
									/>
								</Box>
							</Stack>
						</DialogContent>
						<DialogActions>
							<Button onClick={() => setOpenAddModal(false)} disabled={submitting}>
								Cancel
							</Button>
							<Button onClick={handleAddProduct} variant="contained" disabled={submitting}>
								{submitting ? "Adding..." : "Add Product"}
							</Button>
						</DialogActions>
					</Dialog>
				</Stack>
			</Container>
		</>
	);
}

export default Screen0B;
