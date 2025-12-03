/**
 * wmsApi Unit Tests
 *
 * Tests for error handling and core functionality of the wmsApi wrapper.
 * These tests ensure that:
 * - Errors are caught and formatted for user display
 * - API methods return expected types
 * - Supabase errors are handled gracefully
 *
 * @module lib/api/wmsApi.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auth, products, receivingOrders, pallets, shippingOrders, locations, storage, email, getShipNowOrder } from './wms-api';
import * as supabaseClient from '../auth/supabase-client';

// Type definition for mocked Supabase client
interface MockedSupabase {
  auth: {
    signInWithPassword: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
    getUser: ReturnType<typeof vi.fn>;
    getSession: ReturnType<typeof vi.fn>;
  };
  from: ReturnType<typeof vi.fn>;
  storage: {
    from: ReturnType<typeof vi.fn>;
  };
}

// Mock Supabase client
vi.mock('../auth/supabase-client', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
      getSession: vi.fn(),
    },
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
  },
}));

describe('wmsApi - Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle login with invalid credentials', async () => {
    const mockSupabase = supabaseClient.supabase as unknown as MockedSupabase;
    mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    });

    await expect(auth.login('test@example.com', 'wrong')).rejects.toThrow(
      'Invalid email or password'
    );
  });

  it('should handle login network error', async () => {
    const mockSupabase = supabaseClient.supabase as unknown as MockedSupabase;
    mockSupabase.auth.signInWithPassword.mockRejectedValueOnce(
      new Error('Network error')
    );

    await expect(auth.login('test@example.com', 'password')).rejects.toThrow(
      'Network error'
    );
  });

  it('should handle logout error', async () => {
    const mockSupabase = supabaseClient.supabase as unknown as MockedSupabase;
    mockSupabase.auth.signOut.mockResolvedValueOnce({
      error: { message: 'Logout failed' },
    });

    await expect(auth.logout()).rejects.toThrow('Logout failed');
  });

  it('should return null for getCurrentUser when not authenticated', async () => {
    const mockSupabase = supabaseClient.supabase as unknown as MockedSupabase;
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    const user = await auth.getCurrentUser();
    expect(user).toBeNull();
  });

  it('should handle getCurrentUser error gracefully', async () => {
    const mockSupabase = supabaseClient.supabase as unknown as MockedSupabase;
    mockSupabase.auth.getUser.mockRejectedValueOnce(
      new Error('Failed to get user')
    );

    const user = await auth.getCurrentUser();
    expect(user).toBeNull();
  });
});

describe('wmsApi - Products', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle product fetch error', async () => {
    const mockSupabase = supabaseClient.supabase as unknown as MockedSupabase;
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      }),
    };
    mockSupabase.from.mockReturnValueOnce(mockQuery);

    await expect(products.getAll()).rejects.toThrow('Failed to load products');
  });

  it('should handle product creation error', async () => {
    const mockSupabase = supabaseClient.supabase as unknown as MockedSupabase;
    const mockQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'Insert failed' },
      }),
    };
    mockSupabase.from.mockReturnValueOnce(mockQuery);

    const newProduct = {
      item_id: 'TEST123',
      description: 'Test Product',
      units_per_pallet: 10,
      pallet_positions: 1,
      active: true,
    };

    await expect(products.create(newProduct)).rejects.toThrow(
      'Failed to create product'
    );
  });

  it('should handle product update error', async () => {
    const mockSupabase = supabaseClient.supabase as unknown as MockedSupabase;
    const mockQuery = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'Product not found' },
      }),
    };
    mockSupabase.from.mockReturnValueOnce(mockQuery);

    await expect(
      products.update('invalid-id', { active: false })
    ).rejects.toThrow('Failed to update product');
  });
});

describe('wmsApi - Receiving Orders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle receiving order creation error', async () => {
    const mockSupabase = supabaseClient.supabase as unknown as MockedSupabase;
    const mockQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'Insert failed' },
      }),
    };
    mockSupabase.from.mockReturnValueOnce(mockQuery);

    const newOrder = {
      container_num: 'CONT123',
      seal_num: 'SEAL123',
      status: 'Pending' as const,
      created_by: 'user-123',
    };

    await expect(receivingOrders.create(newOrder)).rejects.toThrow(
      'Failed to create receiving order'
    );
  });

  it('should handle receiving order fetch error', async () => {
    const mockSupabase = supabaseClient.supabase as unknown as MockedSupabase;
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      }),
    };
    mockSupabase.from.mockReturnValueOnce(mockQuery);

    await expect(receivingOrders.getById('invalid-id')).rejects.toThrow(
      'Failed to load receiving order'
    );
  });
});

describe('wmsApi - Pallets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle pallet creation error', async () => {
    const mockSupabase = supabaseClient.supabase as unknown as MockedSupabase;
    const mockQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'Insert failed' },
      }),
    };
    mockSupabase.from.mockReturnValueOnce(mockQuery);

    const newPallet = {
      item_id: 'ITEM-123',
      qty: 100,
      status: 'Received' as const,
      is_cross_dock: false,
    };

    await expect(pallets.create(newPallet)).rejects.toThrow(
      'Failed to create pallet'
    );
  });

  it('should handle pallet fetch with filters', async () => {
    const mockSupabase = supabaseClient.supabase as unknown as MockedSupabase;
    // Create a mock that properly chains and resolves
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    // Make it resolve when awaited
    const mockPromise = Promise.resolve({ data: [], error: null });
    Object.assign(mockChain, mockPromise);
    mockSupabase.from.mockReturnValueOnce(mockChain as unknown as typeof mockChain);

    const result = await pallets.getFiltered({ status: 'Stored' });
    expect(result).toEqual([]);
  });

  it('should handle pallet deletion error', async () => {
    const mockSupabase = supabaseClient.supabase as unknown as MockedSupabase;
    const mockQuery = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValueOnce({
        error: { message: 'Delete failed' },
      }),
    };
    mockSupabase.from.mockReturnValueOnce(mockQuery);

    await expect(pallets.delete('invalid-id')).rejects.toThrow(
      'Failed to delete pallet'
    );
  });
});

describe('wmsApi - Shipping Orders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle shipping order creation error', async () => {
    const mockSupabase = supabaseClient.supabase as unknown as MockedSupabase;
    const mockQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'Insert failed' },
      }),
    };
    mockSupabase.from.mockReturnValueOnce(mockQuery);

    const newOrder = {
      order_ref: 'ORD123',
      shipment_type: 'Hand_Delivery' as const,
      status: 'Pending' as const,
      created_by: 'user-123',
    };

    await expect(shippingOrders.create(newOrder)).rejects.toThrow(
      'Failed to create shipping order'
    );
  });
});

describe('wmsApi - Locations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle location fetch error', async () => {
    const mockSupabase = supabaseClient.supabase as unknown as MockedSupabase;
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      }),
    };
    mockSupabase.from.mockReturnValueOnce(mockQuery);

    await expect(locations.getAll()).rejects.toThrow('Failed to load locations');
  });

  it('should handle location resolution error', async () => {
    const mockSupabase = supabaseClient.supabase as unknown as MockedSupabase;
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      }),
    };
    mockQuery.eq.mockImplementation(() => mockQuery);
    mockSupabase.from.mockReturnValueOnce(mockQuery);

    await expect(
      locations.resolve('W1', 1, 1, 'A')
    ).rejects.toThrow('Location not found');
  });
});

describe('wmsApi - Storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle file upload error', async () => {
    const mockSupabase = supabaseClient.supabase as unknown as MockedSupabase;
    const mockStorageFrom = {
      upload: vi.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'Upload failed' },
      }),
    };
    mockSupabase.storage.from.mockReturnValueOnce(mockStorageFrom);

    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });

    await expect(storage.upload('bucket', 'path/file.pdf', file)).rejects.toThrow(
      'Failed to upload file'
    );
  });

  it('should handle file download error', async () => {
    const mockSupabase = supabaseClient.supabase as unknown as MockedSupabase;
    const mockStorageFrom = {
      download: vi.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'Download failed' },
      }),
    };
    mockSupabase.storage.from.mockReturnValueOnce(mockStorageFrom);

    await expect(storage.download('bucket', 'path/file.pdf')).rejects.toThrow(
      'Failed to download file'
    );
  });

  it('should handle file deletion error', async () => {
    const mockSupabase = supabaseClient.supabase as unknown as MockedSupabase;
    const mockStorageFrom = {
      remove: vi.fn().mockResolvedValueOnce({
        error: { message: 'Delete failed' },
      }),
    };
    mockSupabase.storage.from.mockReturnValueOnce(mockStorageFrom);

    await expect(storage.delete('bucket', 'path/file.pdf')).rejects.toThrow(
      'Failed to delete file'
    );
  });
});

describe('wmsApi - Email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate email inputs', async () => {
    await expect(email.send('', 'Subject', 'Body')).rejects.toThrow(
      'Email requires to, subject, and body'
    );
  });

  it('should validate email subject', async () => {
    await expect(email.send('test@example.com', '', 'Body')).rejects.toThrow(
      'Email requires to, subject, and body'
    );
  });

  it('should validate email body', async () => {
    await expect(email.send('test@example.com', 'Subject', '')).rejects.toThrow(
      'Email requires to, subject, and body'
    );
  });
});

describe('wmsApi - SHIP-NOW FIFO Logic', () => {
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 7_200_000);

  it('should return single order with remaining qty', async () => {
    const orders = [
      {
        id: 'order-1',
        order_ref: 'ORD-001',
        shipment_type: 'Hand_Delivery' as const,
        status: 'Pending' as const,
        created_at: now.toISOString(),
        created_by: 'user-1',
        lines: [
          {
            id: 'line-1',
            shipping_order_id: 'order-1',
            item_id: 'ITEM-123',
            requested_qty: 100,
            created_at: now.toISOString(),
          },
        ],
      },
    ];

    const result = await getShipNowOrder('ITEM-123', orders);
    expect(result).toBeDefined();
    expect(result?.id).toBe('order-1');
  });

  it('should return earliest order by created_at (FIFO)', async () => {
    const orders = [
      {
        id: 'order-2',
        order_ref: 'ORD-002',
        shipment_type: 'Hand_Delivery' as const,
        status: 'Pending' as const,
        created_at: now.toISOString(),
        created_by: 'user-1',
        lines: [
          {
            id: 'line-2',
            shipping_order_id: 'order-2',
            item_id: 'ITEM-123',
            requested_qty: 50,
            created_at: now.toISOString(),
          },
        ],
      },
      {
        id: 'order-1',
        order_ref: 'ORD-001',
        shipment_type: 'Hand_Delivery' as const,
        status: 'Pending' as const,
        created_at: twoHoursAgo.toISOString(),
        created_by: 'user-1',
        lines: [
          {
            id: 'line-1',
            shipping_order_id: 'order-1',
            item_id: 'ITEM-123',
            requested_qty: 100,
            created_at: twoHoursAgo.toISOString(),
          },
        ],
      },
    ];

    const result = await getShipNowOrder('ITEM-123', orders);
    expect(result?.id).toBe('order-1');
  });

  it('should return null when no orders have remaining qty', async () => {
    const orders = [
      {
        id: 'order-1',
        order_ref: 'ORD-001',
        shipment_type: 'Hand_Delivery' as const,
        status: 'Pending' as const,
        created_at: now.toISOString(),
        created_by: 'user-1',
        lines: [
          {
            id: 'line-1',
            shipping_order_id: 'order-1',
            item_id: 'ITEM-123',
            requested_qty: 0,
            created_at: now.toISOString(),
          },
        ],
      },
    ];

    const result = await getShipNowOrder('ITEM-123', orders);
    expect(result).toBeNull();
  });

  it('should filter out orders with wrong status', async () => {
    const orders = [
      {
        id: 'order-1',
        order_ref: 'ORD-001',
        shipment_type: 'Hand_Delivery' as const,
        status: 'Completed' as const,
        created_at: twoHoursAgo.toISOString(),
        created_by: 'user-1',
        lines: [
          {
            id: 'line-1',
            shipping_order_id: 'order-1',
            item_id: 'ITEM-123',
            requested_qty: 100,
            created_at: twoHoursAgo.toISOString(),
          },
        ],
      },
      {
        id: 'order-2',
        order_ref: 'ORD-002',
        shipment_type: 'Hand_Delivery' as const,
        status: 'Pending' as const,
        created_at: now.toISOString(),
        created_by: 'user-1',
        lines: [
          {
            id: 'line-2',
            shipping_order_id: 'order-2',
            item_id: 'ITEM-123',
            requested_qty: 50,
            created_at: now.toISOString(),
          },
        ],
      },
    ];

    const result = await getShipNowOrder('ITEM-123', orders);
    expect(result?.id).toBe('order-2');
  });

  it('should filter out orders without the itemId', async () => {
    const orders = [
      {
        id: 'order-1',
        order_ref: 'ORD-001',
        shipment_type: 'Hand_Delivery' as const,
        status: 'Pending' as const,
        created_at: twoHoursAgo.toISOString(),
        created_by: 'user-1',
        lines: [
          {
            id: 'line-1',
            shipping_order_id: 'order-1',
            item_id: 'ITEM-999',
            requested_qty: 100,
            created_at: twoHoursAgo.toISOString(),
          },
        ],
      },
      {
        id: 'order-2',
        order_ref: 'ORD-002',
        shipment_type: 'Hand_Delivery' as const,
        status: 'Pending' as const,
        created_at: now.toISOString(),
        created_by: 'user-1',
        lines: [
          {
            id: 'line-2',
            shipping_order_id: 'order-2',
            item_id: 'ITEM-123',
            requested_qty: 50,
            created_at: now.toISOString(),
          },
        ],
      },
    ];

    const result = await getShipNowOrder('ITEM-123', orders);
    expect(result?.id).toBe('order-2');
  });

  it('should handle tie-breaking (same created_at)', async () => {
    const sameTime = now.toISOString();
    const orders = [
      {
        id: 'order-2',
        order_ref: 'ORD-002',
        shipment_type: 'Hand_Delivery' as const,
        status: 'Pending' as const,
        created_at: sameTime,
        created_by: 'user-1',
        lines: [
          {
            id: 'line-2',
            shipping_order_id: 'order-2',
            item_id: 'ITEM-123',
            requested_qty: 50,
            created_at: sameTime,
          },
        ],
      },
      {
        id: 'order-1',
        order_ref: 'ORD-001',
        shipment_type: 'Hand_Delivery' as const,
        status: 'Pending' as const,
        created_at: sameTime,
        created_by: 'user-1',
        lines: [
          {
            id: 'line-1',
            shipping_order_id: 'order-1',
            item_id: 'ITEM-123',
            requested_qty: 100,
            created_at: sameTime,
          },
        ],
      },
    ];

    const result = await getShipNowOrder('ITEM-123', orders);
    // Should return first in array when times are equal
    expect(result?.id).toBe('order-2');
  });

  it('should return null for empty array', async () => {
    const result = await getShipNowOrder('ITEM-123', []);
    expect(result).toBeNull();
  });

  it('should accept Picking status orders', async () => {
    const orders = [
      {
        id: 'order-1',
        order_ref: 'ORD-001',
        shipment_type: 'Hand_Delivery' as const,
        status: 'Picking' as const,
        created_at: now.toISOString(),
        created_by: 'user-1',
        lines: [
          {
            id: 'line-1',
            shipping_order_id: 'order-1',
            item_id: 'ITEM-123',
            requested_qty: 100,
            created_at: now.toISOString(),
          },
        ],
      },
    ];

    const result = await getShipNowOrder('ITEM-123', orders);
    expect(result?.id).toBe('order-1');
  });

  it('should handle orders without lines gracefully', async () => {
    const orders = [
      {
        id: 'order-1',
        order_ref: 'ORD-001',
        shipment_type: 'Hand_Delivery' as const,
        status: 'Pending' as const,
        created_at: now.toISOString(),
        created_by: 'user-1',
      },
    ];

    const result = await getShipNowOrder('ITEM-123', orders);
    expect(result).toBeNull();
  });
});

// Helper to mock Supabase query chain (4 eq() calls for rack queries)
function mockSupabaseQuery(data: unknown, error: unknown = null) {
  const singleMock = vi.fn().mockResolvedValue({ data, error });
  
  // Create a chain-able eq mock that returns itself
  const createEqChain = () => ({
    eq: vi.fn(function() { return createEqChain(); }),
    single: singleMock,
  });

  const chain = createEqChain();
  
  return {
    select: vi.fn().mockReturnValue(chain),
  };
}

// Helper for aisle queries (2 eq calls: warehouse_id + code)
function mockSupabaseAisleQuery(data: unknown, error: unknown = null) {
  const singleMock = vi.fn().mockResolvedValue({ data, error });
  
  // Create a chain-able eq mock that returns itself
  const createEqChain = () => ({
    eq: vi.fn(function() { return createEqChain(); }),
    single: singleMock,
  });

  const chain = createEqChain();
  
  return {
    select: vi.fn().mockReturnValue(chain),
  };
}

describe('wmsApi - Location Resolution (Story 5.3)', () => {
  const mockWarehouseId = 'warehouse-123';
  const mockLocation = {
    id: 'loc-123',
    code: 'W1-A-1-1',
    warehouse_id: mockWarehouseId,
    type: 'RACK',
    rack: 1,
    level: 1,
    position: 'A',
    created_at: '2025-11-26T10:00:00Z',
  };

  const mockAisleLocation = {
    id: 'loc-aisle',
    code: 'W1-AISLE',
    warehouse_id: mockWarehouseId,
    type: 'AISLE',
    rack: null,
    level: null,
    position: null,
    created_at: '2025-11-26T10:00:00Z',
  };

describe('wmsApi - Locations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AC: 1-3 - Valid location resolution', () => {
    it('should resolve valid rack/level/position to location_id (AC: 1-3)', async () => {
      const mockSupabase = supabaseClient.supabase as unknown as { from: ReturnType<typeof vi.fn> };
      mockSupabase.from.mockReturnValue(mockSupabaseQuery(mockLocation));

      const result = await locations.resolve(mockWarehouseId, 1, 1, 'A');
      expect(result.id).toBe('loc-123');
      expect(result.code).toBe('W1-A-1-1');
    });

    it('should resolve boundary value rack 1, level 1, position A (AC: 1-3)', async () => {
      const mockSupabase = supabaseClient.supabase as unknown as { from: ReturnType<typeof vi.fn> };
      mockSupabase.from.mockReturnValue(mockSupabaseQuery(mockLocation));

      const result = await locations.resolve(mockWarehouseId, 1, 1, 'A');
      expect(result).toBeDefined();
      expect(result.rack).toBe(1);
      expect(result.level).toBe(1);
      expect(result.position).toBe('A');
    });

    it('should resolve boundary value rack 8, level 4, position T (AC: 1-3)', async () => {
      const boundaryLocation = { ...mockLocation, rack: 8, level: 4, position: 'T', code: 'W1-A-8-4' };
      const mockSupabase = supabaseClient.supabase as unknown as { from: ReturnType<typeof vi.fn> };
      mockSupabase.from.mockReturnValue(mockSupabaseQuery(boundaryLocation));

      const result = await locations.resolve(mockWarehouseId, 8, 4, 'T');
      expect(result.rack).toBe(8);
      expect(result.level).toBe(4);
      expect(result.position).toBe('T');
    });

    it('should resolve middle value rack 5, level 2, position G (AC: 1-3)', async () => {
      const middleLocation = { ...mockLocation, rack: 5, level: 2, position: 'G', code: 'W1-A-5-2' };
      const mockSupabase = supabaseClient.supabase as unknown as { from: ReturnType<typeof vi.fn> };
      mockSupabase.from.mockReturnValue(mockSupabaseQuery(middleLocation));

      const result = await locations.resolve(mockWarehouseId, 5, 2, 'G');
      expect(result.rack).toBe(5);
      expect(result.level).toBe(2);
      expect(result.position).toBe('G');
    });
  });

  describe('AC: 4 - Aisle location handling', () => {
    it('should resolve AISLE location (AC: 4)', async () => {
      const mockSupabase = supabaseClient.supabase as unknown as { from: ReturnType<typeof vi.fn> };
      mockSupabase.from.mockReturnValue(mockSupabaseAisleQuery(mockAisleLocation));

      const result = await locations.resolve(mockWarehouseId, 'AISLE', 1, 'A');
      expect(result.id).toBe('loc-aisle');
      expect(result.code).toBe('W1-AISLE');
      expect(result.type).toBe('AISLE');
    });

    it('should handle AISLE location ignoring level and position (AC: 4)', async () => {
      const mockSupabase = supabaseClient.supabase as unknown as { from: ReturnType<typeof vi.fn> };
      mockSupabase.from.mockReturnValue(mockSupabaseAisleQuery(mockAisleLocation));

      // Level and position should be ignored for AISLE
      const result = await locations.resolve(mockWarehouseId, 'AISLE', 99, 'Z');
      expect(result.code).toBe('W1-AISLE');
    });
  });

  describe('AC: 3 - Error handling', () => {
    it('should throw error when location not found (AC: 3)', async () => {
      const mockSupabase = supabaseClient.supabase as unknown as { from: ReturnType<typeof vi.fn> };
      mockSupabase.from.mockReturnValue(mockSupabaseQuery(null, { message: 'No rows found' }));

      await expect(locations.resolve(mockWarehouseId, 9, 5, 'Z')).rejects.toThrow(
        'Location not found'
      );
    });

    it('should throw error on database error (AC: 3)', async () => {
      const mockSupabase = supabaseClient.supabase as unknown as { from: ReturnType<typeof vi.fn> };
      mockSupabase.from.mockReturnValue(mockSupabaseQuery(null, { message: 'Database connection failed' }));

      await expect(locations.resolve(mockWarehouseId, 1, 1, 'A')).rejects.toThrow();
    });

    it('should handle network errors gracefully (AC: 3)', async () => {
      const mockSupabase = supabaseClient.supabase as unknown as { from: ReturnType<typeof vi.fn> };
      const eqMock = vi.fn();
      eqMock.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockRejectedValue(new Error('Network error')),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: eqMock,
        }),
      });

      await expect(locations.resolve(mockWarehouseId, 1, 1, 'A')).rejects.toThrow();
    });
  });

  describe('AC: 5 - Edge cases and validation', () => {
    it('should handle invalid rack number (out of range)', async () => {
      const mockSupabase = supabaseClient.supabase as unknown as { from: ReturnType<typeof vi.fn> };
      mockSupabase.from.mockReturnValue(mockSupabaseQuery(null, { message: 'No rows found' }));

      await expect(locations.resolve(mockWarehouseId, 9, 1, 'A')).rejects.toThrow();
    });

    it('should handle invalid level number (out of range)', async () => {
      const mockSupabase = supabaseClient.supabase as unknown as { from: ReturnType<typeof vi.fn> };
      mockSupabase.from.mockReturnValue(mockSupabaseQuery(null, { message: 'No rows found' }));

      await expect(locations.resolve(mockWarehouseId, 1, 5, 'A')).rejects.toThrow();
    });

    it('should handle invalid position letter (out of range)', async () => {
      const mockSupabase = supabaseClient.supabase as unknown as { from: ReturnType<typeof vi.fn> };
      mockSupabase.from.mockReturnValue(mockSupabaseQuery(null, { message: 'No rows found' }));

      await expect(locations.resolve(mockWarehouseId, 1, 1, 'Z')).rejects.toThrow();
    });

    it('should handle numeric rack as string', async () => {
      const mockSupabase = supabaseClient.supabase as unknown as { from: ReturnType<typeof vi.fn> };
      mockSupabase.from.mockReturnValue(mockSupabaseQuery(mockLocation));

      const result = await locations.resolve(mockWarehouseId, '1', 1, 'A');
      expect(result.id).toBe('loc-123');
    });

    it('should handle different warehouse IDs', async () => {
      const differentWarehouseId = 'warehouse-456';
      const differentLocation = { ...mockLocation, warehouse_id: differentWarehouseId };
      const mockSupabase = supabaseClient.supabase as unknown as { from: ReturnType<typeof vi.fn> };
      mockSupabase.from.mockReturnValue(mockSupabaseQuery(differentLocation));

      const result = await locations.resolve(differentWarehouseId, 1, 1, 'A');
      expect(result.warehouse_id).toBe(differentWarehouseId);
    });
  });
});
});
