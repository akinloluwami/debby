import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "../../../data");
const PASSWORD_FILE = path.join(DATA_DIR, "master-password.json");
const SALT_ROUNDS = 10;

interface MasterPasswordData {
	hash: string;
	createdAt: string;
}

// Ensure data directory exists
export function ensureDataDir() {
	if (!fs.existsSync(DATA_DIR)) {
		fs.mkdirSync(DATA_DIR, { recursive: true });
	}
}

// Check if master password is configured
export function isMasterPasswordConfigured(): boolean {
	ensureDataDir();
	return fs.existsSync(PASSWORD_FILE);
}

// Hash and store master password
export async function setMasterPassword(password: string): Promise<void> {
	ensureDataDir();
	
	if (isMasterPasswordConfigured()) {
		throw new Error("Master password is already configured");
	}

	const hash = await bcrypt.hash(password, SALT_ROUNDS);
	const data: MasterPasswordData = {
		hash,
		createdAt: new Date().toISOString(),
	};

	fs.writeFileSync(PASSWORD_FILE, JSON.stringify(data, null, 2));
}

// Verify master password
export async function verifyMasterPassword(password: string): Promise<boolean> {
	if (!isMasterPasswordConfigured()) {
		return false;
	}

	const data = JSON.parse(fs.readFileSync(PASSWORD_FILE, "utf-8")) as MasterPasswordData;
	return await bcrypt.compare(password, data.hash);
}

// Get master password hash (for checking if configured)
export function getMasterPasswordHash(): string | null {
	if (!isMasterPasswordConfigured()) {
		return null;
	}

	const data = JSON.parse(fs.readFileSync(PASSWORD_FILE, "utf-8")) as MasterPasswordData;
	return data.hash;
}
