import Docker from "dockerode";
import getPort from "get-port";
import type { DatabaseInstance } from "../types";

const docker = new Docker({ socketPath: "/var/run/docker.sock" });

// Network name for all database containers
const NETWORK_NAME = "debby-network";

// Ensure network exists
export async function ensureNetwork(): Promise<void> {
	try {
		const networks = await docker.listNetworks();
		const exists = networks.some((network) => network.Name === NETWORK_NAME);

		if (!exists) {
			await docker.createNetwork({
				Name: NETWORK_NAME,
				Driver: "bridge",
			});
		}
	} catch (error) {
		console.error("Error ensuring network:", error);
		throw error;
	}
}

// Get Docker image name based on database type
function getDockerImage(type: DatabaseInstance["type"]): string {
	switch (type) {
		case "postgresql":
			return "postgres:16-alpine";
		case "mysql":
			return "mysql:8-oracle";
		case "mongodb":
			return "mongo:7";
		default:
			throw new Error(`Unsupported database type: ${type}`);
	}
}

// Get environment variables for database container
function getEnvironmentVars(db: DatabaseInstance): string[] {
	switch (db.type) {
		case "postgresql":
			return [
				`POSTGRES_USER=${db.username}`,
				`POSTGRES_PASSWORD=${db.password}`,
				`POSTGRES_DB=${db.name}`,
			];
		case "mysql":
			return [
				`MYSQL_ROOT_PASSWORD=${db.password}`,
				`MYSQL_USER=${db.username}`,
				`MYSQL_PASSWORD=${db.password}`,
				`MYSQL_DATABASE=${db.name}`,
			];
		case "mongodb":
			return [
				`MONGO_INITDB_ROOT_USERNAME=${db.username}`,
				`MONGO_INITDB_ROOT_PASSWORD=${db.password}`,
				`MONGO_INITDB_DATABASE=${db.name}`,
			];
		default:
			throw new Error(`Unsupported database type: ${db.type}`);
	}
}

// Create and start a database container
export async function createContainer(db: DatabaseInstance): Promise<string> {
	try {
		await ensureNetwork();

		const image = getDockerImage(db.type);
		const containerName = `debby-${db.type}-${db.id}`;

		// Pull image if not exists
		try {
			await docker.pull(image);
		} catch (error) {
			console.warn(`Image ${image} might already exist or pull failed:`, error);
		}

		// Create container
		const container = await docker.createContainer({
			Image: image,
			name: containerName,
			Env: getEnvironmentVars(db),
			HostConfig: {
				PortBindings: {
					[`${getDefaultPort(db.type)}/tcp`]: [{ HostPort: db.port.toString() }],
				},
				NetworkMode: NETWORK_NAME,
				RestartPolicy: {
					Name: "unless-stopped",
				},
			},
			Labels: {
				"debby.managed": "true",
				"debby.database.id": db.id,
				"debby.database.name": db.name,
				"debby.database.type": db.type,
			},
		});

		await container.start();
		
		return container.id;
	} catch (error) {
		console.error("Error creating container:", error);
		throw error;
	}
}

// Get default internal port for database type
function getDefaultPort(type: DatabaseInstance["type"]): number {
	switch (type) {
		case "postgresql":
			return 5432;
		case "mysql":
			return 3306;
		case "mongodb":
			return 27017;
		default:
			throw new Error(`Unsupported database type: ${type}`);
	}
}

// Find an available port for the database
export async function findAvailablePort(type: DatabaseInstance["type"]): Promise<number> {
	const defaultPort = getDefaultPort(type);
	// Try to get the default port first, otherwise find any available port
	const port = await getPort({ port: defaultPort });
	return port;
}

// Start an existing container
export async function startContainer(containerId: string): Promise<void> {
	try {
		const container = docker.getContainer(containerId);
		await container.start();
	} catch (error) {
		console.error("Error starting container:", error);
		throw error;
	}
}

// Stop a running container
export async function stopContainer(containerId: string): Promise<void> {
	try {
		const container = docker.getContainer(containerId);
		await container.stop();
	} catch (error) {
		console.error("Error stopping container:", error);
		throw error;
	}
}

// Remove a container
export async function removeContainer(containerId: string): Promise<void> {
	try {
		const container = docker.getContainer(containerId);
		
		// Stop if running
		try {
			await container.stop();
		} catch (error) {
			// Container might already be stopped
		}

		await container.remove();
	} catch (error) {
		console.error("Error removing container:", error);
		throw error;
	}
}

// Get container status and info
export async function getContainerStatus(
	containerId: string
): Promise<"running" | "stopped" | "created" | "error"> {
	try {
		const container = docker.getContainer(containerId);
		const info = await container.inspect();

		if (info.State.Running) {
			return "running";
		} else if (info.State.Status === "created") {
			return "created";
		} else {
			return "stopped";
		}
	} catch (error) {
		console.error("Error getting container status:", error);
		return "error";
	}
}

// Get detailed container info including ports
export async function getContainerInfo(containerId: string): Promise<{
	status: "running" | "stopped" | "created" | "error";
	port?: number;
} | null> {
	try {
		const container = docker.getContainer(containerId);
		const info = await container.inspect();

		let status: "running" | "stopped" | "created" | "error";
		if (info.State.Running) {
			status = "running";
		} else if (info.State.Status === "created") {
			status = "created";
		} else {
			status = "stopped";
		}

		// Extract host port from port bindings
		let port: number | undefined;
		const ports = info.NetworkSettings?.Ports;
		if (ports) {
			// Get the first exposed port mapping
			const portKeys = Object.keys(ports);
			if (portKeys.length > 0 && portKeys[0]) {
				const bindings = ports[portKeys[0]];
				if (bindings && bindings.length > 0 && bindings[0]) {
					port = parseInt(bindings[0].HostPort);
				}
			}
		}

		return { status, port };
	} catch (error) {
		console.error("Error getting container info:", error);
		return null;
	}
}

// List all Debby-managed containers
export async function listManagedContainers(): Promise<
	Array<{
		id: string;
		databaseId: string;
		name: string;
		status: string;
	}>
> {
	try {
		const containers = await docker.listContainers({ all: true });

		return containers
			.filter((container) => container.Labels?.["debby.managed"] === "true")
			.map((container) => ({
				id: container.Id,
				databaseId: container.Labels?.["debby.database.id"] || "",
				name: container.Labels?.["debby.database.name"] || "",
				status: container.State,
			}));
	} catch (error) {
		console.error("Error listing containers:", error);
		return [];
	}
}

// Sync database status with Docker - checks actual container state
export async function syncDatabaseWithDocker(containerId?: string): Promise<{
	status: "running" | "stopped" | "created" | "error";
	port?: number;
} | null> {
	if (!containerId) {
		return null;
	}

	return await getContainerInfo(containerId);
}
