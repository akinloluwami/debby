import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { DatabaseInstance, DatabaseCreateInput, DatabaseUpdateInput } from "../types";
import { randomUUID } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "../../../data");
const DATABASES_FILE = path.join(DATA_DIR, "databases.json");

// Ensure data directory exists
function ensureDataDir() {
	if (!fs.existsSync(DATA_DIR)) {
		fs.mkdirSync(DATA_DIR, { recursive: true });
	}
}

// Read databases from file
function readDatabases(): DatabaseInstance[] {
	ensureDataDir();
	
	if (!fs.existsSync(DATABASES_FILE)) {
		return [];
	}

	const data = fs.readFileSync(DATABASES_FILE, "utf-8");
	return JSON.parse(data);
}

// Write databases to file
function writeDatabases(databases: DatabaseInstance[]): void {
	ensureDataDir();
	fs.writeFileSync(DATABASES_FILE, JSON.stringify(databases, null, 2));
}

// Get all databases
export function getAllDatabases(): DatabaseInstance[] {
	return readDatabases();
}

// Get database by ID
export function getDatabaseById(id: string): DatabaseInstance | null {
	const databases = readDatabases();
	return databases.find(db => db.id === id) || null;
}

// Create new database
export function createDatabase(input: DatabaseCreateInput & { port: number }): DatabaseInstance {
	const databases = readDatabases();
	
	// Check if port is already in use
	const portInUse = databases.some(db => db.port === input.port);
	if (portInUse) {
		throw new Error(`Port ${input.port} is already in use`);
	}

	const newDatabase: DatabaseInstance = {
		id: randomUUID(),
		name: input.name,
		type: input.type,
		port: input.port,
		username: input.username,
		password: input.password,
		status: "created",
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	databases.push(newDatabase);
	writeDatabases(databases);
	
	return newDatabase;
}

// Update database
export function updateDatabase(input: DatabaseUpdateInput): DatabaseInstance {
	const databases = readDatabases();
	const index = databases.findIndex(db => db.id === input.id);

	if (index === -1) {
		throw new Error("Database not found");
	}

	const current = databases[index]!;
	const updated: DatabaseInstance = {
		...current,
		...(input.name && { name: input.name }),
		...(input.port && { port: input.port }),
		...(input.username && { username: input.username }),
		...(input.password && { password: input.password }),
		updatedAt: new Date(),
	};

	databases[index] = updated;
	writeDatabases(databases);
	
	return updated;
}

// Delete database
export function deleteDatabase(id: string): boolean {
	const databases = readDatabases();
	const filtered = databases.filter(db => db.id !== id);
	
	if (filtered.length === databases.length) {
		return false;
	}

	writeDatabases(filtered);
	return true;
}

// Update database status
export function updateDatabaseStatus(id: string, status: DatabaseInstance["status"], containerId?: string): DatabaseInstance {
	const databases = readDatabases();
	const index = databases.findIndex(db => db.id === id);

	if (index === -1) {
		throw new Error("Database not found");
	}

	const db = databases[index]!;
	db.status = status;
	if (containerId !== undefined) {
		db.containerId = containerId;
	}
	db.updatedAt = new Date();

	writeDatabases(databases);
	
	return db;
}
