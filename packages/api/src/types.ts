export interface MasterPasswordConfig {
	hash: string;
	isConfigured: boolean;
}

export interface DatabaseInstance {
	id: string;
	name: string;
	type: "postgresql" | "mysql" | "mongodb";
	port: number;
	username: string;
	password: string;
	containerId?: string;
	status: "running" | "stopped" | "created" | "error";
	createdAt: Date;
	updatedAt: Date;
}

export interface DatabaseCreateInput {
	name: string;
	type: "postgresql" | "mysql" | "mongodb";
	username: string;
	password: string;
}

export interface DatabaseUpdateInput {
	id: string;
	name?: string;
	port?: number;
	username?: string;
	password?: string;
}

export interface ContainerStatus {
	id: string;
	status: "running" | "stopped" | "created" | "error";
	containerId?: string;
}
