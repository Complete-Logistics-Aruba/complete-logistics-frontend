/**
 * API Barrel Export
 *
 * Exports the main wmsApi wrapper for use throughout the application.
 * Components should import from this file, not directly from wms-api.ts
 *
 * @module lib/api
 */

export { default as wmsApi } from './wms-api';
export { auth, products, receivingOrders, pallets, shippingOrders, locations, storage, email } from './wms-api';
