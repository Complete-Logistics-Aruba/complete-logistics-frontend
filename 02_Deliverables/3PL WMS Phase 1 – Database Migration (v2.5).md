-- 1. Enable standard extensions
create extension if not exists "pgcrypto"; -- Required for gen_random_uuid()

-- 2. Create ENUM Types
create type receiving_status as enum ('Pending', 'Unloading', 'Staged', 'Received');
create type pallet_status as enum ('Received', 'Stored', 'Staged', 'Loaded', 'Shipped', 'WriteOff');
create type shipping_status as enum ('Pending', 'Picking', 'Loading', 'Completed', 'Shipped');
create type manifest_status as enum ('Open', 'Loading', 'Closed');
create type manifest_type as enum ('Container', 'Hand');
create type shipment_type as enum ('Hand_Delivery', 'Container_Loading');
create type location_type as enum ('RACK', 'AISLE', 'FLOOR', 'STAGING');

-- 3. Create Tables

-- Table: products
create table public.products (
item_id text primary key,
description text,
units_per_pallet int not null check (units_per_pallet > 0),
pallet_positions int not null default 1 check (pallet_positions >= 1),
active boolean default true,
created_at timestamptz default now()
);

-- Table: warehouses
create table public.warehouses (
id uuid primary key default gen_random_uuid(),
name text not null,
code text not null unique,
is_active boolean default true,
created_at timestamptz default now()
);

-- Table: locations
create table public.locations (
location_id text primary key,
warehouse_id uuid references public.warehouses(id) not null,
type location_type not null,
rack int,
level int,
position text,
is_active boolean default true,
is_blocked boolean default false,
created_at timestamptz default now(),

-- Constraint: Enforce that RACK locations have coordinates
constraint locations_rack_fields_check check (
(type = 'RACK' and rack is not null and level is not null and position is not null)
or (type <> 'RACK')
)
);

-- Table: receiving_orders
create table public.receiving_orders (
id uuid primary key default gen_random_uuid(),
container_num text not null,
seal_num text not null,
status receiving_status not null default 'Pending',
created_by uuid references auth.users(id),
created_at timestamptz default now(),
finalized_at timestamptz
);

-- Table: receiving_order_lines
create table public.receiving_order_lines (
id uuid primary key default gen_random_uuid(),
receiving_order_id uuid references public.receiving_orders(id) on delete cascade not null,
item_id text references public.products(item_id) not null,
expected_qty int not null check (expected_qty > 0),
created_at timestamptz default now(),

-- Constraint: Prevent duplicate lines for the same item in one order
unique (receiving_order_id, item_id)
);

-- Table: manifests
create table public.manifests (
id uuid primary key default gen_random_uuid(),
type manifest_type not null,
container_num text,
seal_num text not null,
status manifest_status not null default 'Open',
created_at timestamptz default now(),
closed_at timestamptz,

-- Constraint (Stricter): Container requires container_num; Hand forbids it.
constraint manifests_container_num_check check (
(type = 'Container' and container_num is not null)
or (type = 'Hand' and container_num is null)
)
);

-- Table: shipping_orders
create table public.shipping_orders (
id uuid primary key default gen_random_uuid(),
order_ref text not null unique,
shipment_type shipment_type not null,
seal_num text,
status shipping_status not null default 'Pending',
created_at timestamptz default now(),
shipped_at timestamptz
);

-- Table: shipping_order_lines
create table public.shipping_order_lines (
id uuid primary key default gen_random_uuid(),
shipping_order_id uuid references public.shipping_orders(id) on delete cascade not null,
item_id text references public.products(item_id) not null,
requested_qty int not null check (requested_qty > 0),
created_at timestamptz default now(),

-- Constraint: Prevent duplicate lines for the same item in one order
unique (shipping_order_id, item_id)
);

-- Table: pallets
create table public.pallets (
id uuid primary key default gen_random_uuid(),
item_id text references public.products(item_id) not null,

-- Linking
receiving_order_id uuid references public.receiving_orders(id) on delete restrict not null,
shipping_order_id uuid references public.shipping_orders(id) on delete set null,
manifest_id uuid references public.manifests(id) on delete set null,
location_id text references public.locations(location_id) on delete set null,

-- State
qty int not null check (qty > 0),
status pallet_status not null default 'Received',
is_cross_dock boolean default false,

-- Timestamps for Reporting
created_at timestamptz default now(),
received_at timestamptz,
shipped_at timestamptz
);

-- 4. Enable Row Level Security (RLS)
alter table products enable row level security;
alter table warehouses enable row level security;
alter table locations enable row level security;
alter table receiving_orders enable row level security;
alter table receiving_order_lines enable row level security;
alter table manifests enable row level security;
alter table shipping_orders enable row level security;
alter table shipping_order_lines enable row level security;
alter table pallets enable row level security;

-- Simple "Allow All" Policy for Internal Users (Phase 1)
create policy "Enable all access for authenticated users" on products for all to authenticated using (true);
create policy "Enable all access for authenticated users" on warehouses for all to authenticated using (true);
create policy "Enable all access for authenticated users" on locations for all to authenticated using (true);
create policy "Enable all access for authenticated users" on receiving_orders for all to authenticated using (true);
create policy "Enable all access for authenticated users" on receiving_order_lines for all to authenticated using (true);
create policy "Enable all access for authenticated users" on manifests for all to authenticated using (true);
create policy "Enable all access for authenticated users" on shipping_orders for all to authenticated using (true);
create policy "Enable all access for authenticated users" on shipping_order_lines for all to authenticated using (true);
create policy "Enable all access for authenticated users" on pallets for all to authenticated using (true);

-- 5. Create Performance Indexes (Full Set)
-- Foreign Keys & Statuses
create index on public.locations (warehouse_id);
create index on public.receiving_order_lines (receiving_order_id);
create index on public.shipping_order_lines (shipping_order_id);
create index on public.pallets (receiving_order_id);
create index on public.pallets (shipping_order_id);
create index on public.pallets (manifest_id);
create index on public.pallets (location_id);
create index on public.pallets (item_id);
create index on public.pallets (status);
create index on public.receiving_orders (status);
create index on public.shipping_orders (status);
create index on public.manifests (status);

-- Reporting Timestamps (Optimized for Screen 14)
create index on public.receiving_orders (finalized_at);
create index on public.manifests (closed_at);
create index on public.pallets (received_at);
create index on public.pallets (shipped_at);

-- 6. Seed Initial Data

-- Seed Warehouse 1
insert into public.warehouses (id, name, code)
values ('00000000-0000-0000-0000-000000000001', 'Main Warehouse', 'W1')
on conflict do nothing;

-- Seed Generic Aisle Location
insert into public.locations (location_id, warehouse_id, type)
values ('W1-AISLE', '00000000-0000-0000-0000-000000000001', 'AISLE')
on conflict do nothing;
