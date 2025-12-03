# WMS API Wrapper

The `wmsApi` is the single point of contact for all backend operations in the 3PL WMS system. It abstracts Supabase operations and provides a clean, type-safe interface for components.

## Architecture Principle

**Components NEVER import Supabase directly.** All data flows through `wmsApi`.

```typescript
// ✅ CORRECT
import { wmsApi } from '@/lib/api';
const user = await wmsApi.auth.login(email, password);

// ❌ WRONG - FORBIDDEN
import { supabase } from '@supabase/supabase-js';
const { data } = await supabase.from('users').select('*');
```

## API Structure

The `wmsApi` is organized into 8 namespaces:

### 1. Authentication (`wmsApi.auth`)

```typescript
// Login
const user = await wmsApi.auth.login(email, password);

// Logout
await wmsApi.auth.logout();

// Get current user
const user = await wmsApi.auth.getCurrentUser();
```

### 2. Products (`wmsApi.products`)

```typescript
// Get all products
const products = await wmsApi.products.getAll();

// Get single product
const product = await wmsApi.products.getById(id);

// Create product
const newProduct = await wmsApi.products.create({
  item_id: 'ABC123',
  description: 'Widget A',
  units_per_pallet: 10,
  pallet_positions: 1,
  active: true,
});

// Update product
const updated = await wmsApi.products.update(id, { active: false });

// Upload product master CSV
const products = await wmsApi.products.uploadMaster(csvFile);
```

### 3. Receiving Orders (`wmsApi.receivingOrders`)

```typescript
// Create receiving order
const order = await wmsApi.receivingOrders.create({
  container_num: 'CONT123',
  seal_num: 'SEAL123',
  status: 'Pending',
  created_by: userId,
});

// Get receiving order with lines
const order = await wmsApi.receivingOrders.getById(orderId);

// Update receiving order
const updated = await wmsApi.receivingOrders.update(orderId, {
  status: 'Staged',
});

// Create receiving order lines
const lines = await wmsApi.receivingOrders.createLines([
  {
    receiving_order_id: orderId,
    product_id: productId,
    qty_expected: 100,
  },
]);
```

### 4. Pallets (`wmsApi.pallets`)

```typescript
// Create pallet
const pallet = await wmsApi.pallets.create({
  product_id: productId,
  qty: 100,
  status: 'Received',
  is_cross_dock: false,
});

// Get pallets with filters
const pallets = await wmsApi.pallets.getFiltered({
  status: 'Stored',
  location_id: locationId,
});

// Update pallet
const updated = await wmsApi.pallets.update(palletId, {
  location_id: newLocationId,
  status: 'Loaded',
});

// Delete pallet
await wmsApi.pallets.delete(palletId);
```

### 5. Shipping Orders (`wmsApi.shippingOrders`)

```typescript
// Create shipping order
const order = await wmsApi.shippingOrders.create({
  order_ref: 'ORD123',
  shipment_type: 'Hand_Delivery',
  status: 'Pending',
  created_by: userId,
});

// Get shipping order with lines
const order = await wmsApi.shippingOrders.getById(orderId);

// Update shipping order
const updated = await wmsApi.shippingOrders.update(orderId, {
  status: 'Completed',
});

// Create shipping order lines
const lines = await wmsApi.shippingOrders.createLines([
  {
    shipping_order_id: orderId,
    product_id: productId,
    qty_ordered: 100,
  },
]);
```

### 6. Locations (`wmsApi.locations`)

```typescript
// Get all locations
const locations = await wmsApi.locations.getAll();

// Resolve location by rack/level/position
const location = await wmsApi.locations.resolve('W1', 1, 1, 'A');

// Or resolve aisle
const aisle = await wmsApi.locations.resolve('W1', 'AISLE', 0, '');
```

### 7. Storage (`wmsApi.storage`)

```typescript
// Upload file
const url = await wmsApi.storage.upload('bucket', 'path/file.pdf', file);

// Download file
const blob = await wmsApi.storage.download('bucket', 'path/file.pdf');

// Delete file
await wmsApi.storage.delete('bucket', 'path/file.pdf');
```

### 8. Email (`wmsApi.email`)

```typescript
// Send email
const success = await wmsApi.email.send(
  'recipient@example.com',
  'Subject',
  'Email body (plain text)',
  [
    { filename: 'attachment.pdf', content: 'base64-encoded-content' },
  ]
);
```

## Error Handling

All `wmsApi` methods throw errors with user-friendly messages:

```typescript
try {
  const user = await wmsApi.auth.login(email, password);
} catch (error) {
  // Error message is already formatted for display
  console.error(error.message); // "Invalid email or password"
  // NOT: "Invalid login credentials" (technical error)
}
```

## Type Safety

All operations are fully typed with TypeScript:

```typescript
import type { User, Product, Pallet } from '@/types/domain';

const user: User = await wmsApi.auth.getCurrentUser();
const products: Product[] = await wmsApi.products.getAll();
const pallet: Pallet = await wmsApi.pallets.create({...});
```

## Testing

### Unit Tests

Test error handling and individual operations:

```bash
npm test src/lib/api/wmsApi.test.ts
```

### Integration Tests

Test complete workflows:

```bash
npm test src/lib/api/wmsApi.integration.test.ts
```

## Common Patterns

### Handling Loading States

```typescript
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const handleLogin = async (email: string, password: string) => {
  setIsLoading(true);
  setError(null);
  try {
    const user = await wmsApi.auth.login(email, password);
    // Success
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Unknown error');
  } finally {
    setIsLoading(false);
  }
};
```

### Using with React Hook Form

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@/lib/validators';

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(loginSchema),
});

const onSubmit = async (data) => {
  const user = await wmsApi.auth.login(data.email, data.password);
};
```

### Fetching Data on Component Mount

```typescript
useEffect(() => {
  const fetchProducts = async () => {
    try {
      const products = await wmsApi.products.getAll();
      setProducts(products);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load');
    }
  };

  fetchProducts();
}, []);
```

## Environment Variables

The `wmsApi` reads these environment variables:

- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_EMAIL_TO_RECEIVING` - Default receiving email recipient
- `VITE_EMAIL_TO_SHIPPING` - Default shipping email recipient

Set these in `.env.local`, `.env.staging`, or `.env.prod`.

## Future Backend Migration

To migrate from Supabase to another backend (e.g., REST API, GraphQL):

1. Create new implementation in `src/lib/api/wmsApi.ts`
2. Keep the same method signatures and return types
3. Update `src/lib/auth/supabaseClient.ts` to use new backend
4. No component changes needed!

## Files

- `wmsApi.ts` - Main API wrapper (600+ lines)
- `wmsApi.test.ts` - Unit tests (400+ lines)
- `wmsApi.integration.test.ts` - Integration tests (300+ lines)
- `index.ts` - Barrel export
- `README.md` - This file

## Related Files

- `src/lib/auth/supabaseClient.ts` - Supabase client initialization
- `src/lib/auth/useAuth.ts` - React hook for auth state
- `src/lib/validators.ts` - Zod validation schemas
- `src/types/domain.ts` - Domain type definitions
