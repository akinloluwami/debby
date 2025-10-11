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
  stopContainer,
  getContainerStatus,
  removeVolume,
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
      }),
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
      }),
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
          error instanceof Error ? error.message : "Failed to create database",
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
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const database = getDatabaseById(input.id);

        if (!database) {
          throw new Error("Database not found");
        }

        // Prevent database name changes if container exists (would require data migration)
        if (
          input.name &&
          input.name !== database.name &&
          database.containerId
        ) {
          throw new Error(
            "Cannot change database name after container is created. Please create a new database instead.",
          );
        }

        // Check if credentials are being changed
        const credentialsChanged =
          (input.username && input.username !== database.username) ||
          (input.password && input.password !== database.password);

        // Update the database record first
        const updated = updateDatabase(input);

        // If credentials changed and container exists, recreate it
        if (credentialsChanged && database.containerId) {
          try {
            // Stop and remove the old container
            const status = await getContainerStatus(database.containerId);
            if (status === "running") {
              await stopContainer(database.containerId);
            }
            await removeContainer(database.containerId);

            // Create new container with updated credentials
            const newContainerId = await createContainer(updated);
            updateDatabaseStatus(updated.id, "running", newContainerId);

            return {
              ...updated,
              containerId: newContainerId,
              status: "running" as const,
              message:
                "Database updated and container recreated with new credentials",
            };
          } catch (error) {
            console.error("Error recreating container:", error);
            updateDatabaseStatus(updated.id, "error");
            throw new Error(
              "Failed to recreate container with new credentials",
            );
          }
        }

        return {
          ...updated,
          message: "Database updated successfully",
        };
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "Failed to update database",
        );
      }
    }),

  // Delete database
  delete: publicProcedure
    .input(
      z.object({
        id: z.string(),
      }),
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

        // Remove the volume to clean up data
        try {
          await removeVolume(input.id);
        } catch (error) {
          console.error("Error removing volume:", error);
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
          error instanceof Error ? error.message : "Failed to delete database",
        );
      }
    }),
});
