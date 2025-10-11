import { z } from "zod";
import { publicProcedure, router } from "../index";
import {
	getAllDatabases,
	getDatabaseById,
	createDatabase,
	updateDatabase,
	deleteDatabase,
	updateDatabaseStatus,
} from "../utils/database-storage";
import {
	createContainer,
	removeContainer,
	findAvailablePort,
} from "../utils/docker";

export const databaseRouter = router({
	// Get all databases
	list: publicProcedure.query(() => {
		return getAllDatabases();
	}),

	// Get database by ID
	getById: publicProcedure
		.input(
			z.object({
				id: z.string(),
			})
		)
		.query(({ input }) => {
			const database = getDatabaseById(input.id);
			if (!database) {
				throw new Error("Database not found");
			}
			return database;
		}),

	// Create new database
	create: publicProcedure
		.input(
			z.object({
				name: z.string().min(1, "Name is required"),
				type: z.enum(["postgresql", "mysql", "mongodb"]),
				username: z.string().min(1, "Username is required"),
				password: z.string().min(1, "Password is required"),
			})
		)
		.mutation(async ({ input }) => {
			try {
				// Find an available port automatically
				const port = await findAvailablePort(input.type);

				// Create database record with auto-assigned port
				const database = createDatabase({
					...input,
					port,
				});

				// Create and start Docker container
				try {
					const containerId = await createContainer(database);
					updateDatabaseStatus(database.id, "running", containerId);
					
					return {
						...database,
						containerId,
						status: "running" as const,
					};
				} catch (error) {
					// Update status to error if container creation fails
					updateDatabaseStatus(database.id, "error");
					throw error;
				}
			} catch (error) {
				throw new Error(
					error instanceof Error ? error.message : "Failed to create database"
				);
			}
		}),

	// Update database
	update: publicProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().min(1).optional(),
				port: z.number().min(1024).max(65535).optional(),
				username: z.string().min(1).optional(),
				password: z.string().min(1).optional(),
			})
		)
		.mutation(({ input }) => {
			try {
				return updateDatabase(input);
			} catch (error) {
				throw new Error(
					error instanceof Error ? error.message : "Failed to update database"
				);
			}
		}),

	// Delete database
	delete: publicProcedure
		.input(
			z.object({
				id: z.string(),
			})
		)
		.mutation(async ({ input }) => {
			try {
				const database = getDatabaseById(input.id);
				
				if (!database) {
					throw new Error("Database not found");
				}

				// Remove Docker container if exists
				if (database.containerId) {
					try {
						await removeContainer(database.containerId);
					} catch (error) {
						console.error("Error removing container:", error);
					}
				}

				const deleted = deleteDatabase(input.id);
				
				if (!deleted) {
					throw new Error("Failed to delete database");
				}

				return {
					success: true,
					message: "Database deleted successfully",
				};
			} catch (error) {
				throw new Error(
					error instanceof Error ? error.message : "Failed to delete database"
				);
			}
		}),
});
