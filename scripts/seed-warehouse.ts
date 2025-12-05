/**
 * Seed Warehouse & Location Data
 *
 * Creates Warehouse 1 with 640 predefined storage locations.
 * Structure: 8 aisles × 4 racks × 20 levels = 640 locations
 * Naming convention: W1-AISLE-RACK-LEVEL
 *
 * This script is idempotent - safe to run multiple times.
 *
 * @module scripts/seed-warehouse
 */

import * as fs from "fs";
import * as path from "path";

import { createClient } from "@supabase/supabase-js";

// Load environment variables from .env.local
function loadEnv() {
	const envPath = path.join(process.cwd(), ".env.local");
	if (!fs.existsSync(envPath)) {
		console.error("❌ .env.local file not found");
		process.exit(1);
	}

	const envContent = fs.readFileSync(envPath, "utf-8");
	const envVars: Record<string, string> = {};

	envContent.split("\n").forEach((line) => {
		const trimmed = line.trim();
		if (trimmed && !trimmed.startsWith("#")) {
			const [key, ...valueParts] = trimmed.split("=");
			envVars[key] = valueParts.join("=");
		}
	});

	return envVars;
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
	console.error("❌ Missing Supabase environment variables in .env.local");
	console.error("   Required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY");
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Warehouse configuration
 */
const WAREHOUSE_CONFIG = {
	code: "W1",
	name: "Warehouse 1",
	capacity: 640,
};

/**
 * Location configuration
 */
const LOCATION_CONFIG = {
	aisles: 8, // A-H
	racksPerAisle: 4, // 1-4
	levelsPerRack: 20, // 1-20
};

/**
 * Generate location code
 *
 * @param aisle - Aisle number (1-8)
 * @param rack - Rack number (1-4)
 * @param level - Level number (1-20)
 * @returns Location code (e.g., W1-1-1-A)
 */
function generateLocationCode(aisle: number, rack: number, level: number): string {
	const aisleLetter = String.fromCharCode(64 + aisle); // A-H
	return `W1-${aisle}-${rack}-${level}${aisleLetter}`;
}

/**
 * Seed warehouse data
 */
async function seedWarehouse() {
	console.log("🌱 Starting warehouse seed...");

	try {
		// Check if warehouse already exists
		const { data: existingWarehouse } = await supabase
			.from("warehouses")
			.select("id")
			.eq("code", WAREHOUSE_CONFIG.code)
			.single();

		if (existingWarehouse) {
			console.log(`✅ Warehouse ${WAREHOUSE_CONFIG.code} already exists. Skipping...`);
			return existingWarehouse.id;
		}

		// Insert warehouse
		const { data: warehouse, error: warehouseError } = await supabase
			.from("warehouses")
			.insert([
				{
					code: WAREHOUSE_CONFIG.code,
					name: WAREHOUSE_CONFIG.name,
					capacity: WAREHOUSE_CONFIG.capacity,
				},
			])
			.select()
			.single();

		if (warehouseError) {
			throw new Error(`Failed to create warehouse: ${warehouseError.message}`);
		}

		console.log(`✅ Created warehouse: ${warehouse.code}`);
		return warehouse.id;
	} catch (error) {
		console.error("❌ Error seeding warehouse:", error);
		throw error;
	}
}

/**
 * Seed location data
 */
async function seedLocations(warehouseId: string) {
	console.log("🌱 Starting location seed...");

	try {
		// Check if locations already exist
		const { count } = await supabase
			.from("locations")
			.select("*", { count: "exact", head: true })
			.eq("warehouse_id", warehouseId);

		if (count && count > 0) {
			console.log(`✅ Locations already exist (${count} found). Skipping...`);
			return;
		}

		// Generate all locations
		const locations = [];
		const totalLocations = LOCATION_CONFIG.aisles * LOCATION_CONFIG.racksPerAisle * LOCATION_CONFIG.levelsPerRack;

		for (let aisle = 1; aisle <= LOCATION_CONFIG.aisles; aisle++) {
			for (let rack = 1; rack <= LOCATION_CONFIG.racksPerAisle; rack++) {
				for (let level = 1; level <= LOCATION_CONFIG.levelsPerRack; level++) {
					locations.push({
						warehouse_id: warehouseId,
						code: generateLocationCode(aisle, rack, level),
						type: "RACK",
						rack: aisle,
						level: rack,
						position: String.fromCharCode(64 + level), // A-T
						is_available: true,
					});
				}
			}
		}

		console.log(`📍 Generated ${locations.length} location records...`);

		// Insert locations in batches (Supabase has a limit on batch size)
		const batchSize = 100;
		for (let i = 0; i < locations.length; i += batchSize) {
			const batch = locations.slice(i, i + batchSize);
			const { error } = await supabase.from("locations").insert(batch);

			if (error) {
				throw new Error(`Failed to insert locations batch ${i / batchSize + 1}: ${error.message}`);
			}

			console.log(`✅ Inserted ${Math.min(batchSize, locations.length - i)} locations...`);
		}

		console.log(`✅ Successfully seeded ${locations.length} locations`);
	} catch (error) {
		console.error("❌ Error seeding locations:", error);
		throw error;
	}
}

/**
 * Main seed function
 */
async function main() {
	console.log("🚀 Starting warehouse seed script...\n");

	try {
		// Seed warehouse
		const warehouseId = await seedWarehouse();

		// Seed locations
		await seedLocations(warehouseId);

		console.log("\n✅ Warehouse seed completed successfully!");
		process.exit(0);
	} catch (error) {
		console.error("\n❌ Seed script failed:", error);
		process.exit(1);
	}
}

// Run the seed script
main();
