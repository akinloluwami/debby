import { z } from "zod";
import { publicProcedure, router } from "../index";
import {
  getDatabaseById,
  updateDatabaseStatus,
  getAllDatabases,
} from "../utils/database-storage";
import {
  createContainer,
  startContainer,
  stopContainer,
  getContainerStatus,
  listManagedContainers,
  syncDatabaseWithDocker,
  getContainerLogs,
} from "../utils/docker";

export const instanceRouter = router({
  // Start a database instance
  start: publicProcedure
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

        // If container doesn't exist, create it
        if (!database.containerId) {
          const containerId = await createContainer(database);
          updateDatabaseStatus(database.id, "running", containerId);

          return {
            success: true,
            message: "Container created and started",
            containerId,
          };
        }

        // Start existing container
        await startContainer(database.containerId);
        updateDatabaseStatus(database.id, "running");

        return {
          success: true,
          message: "Container started",
          containerId: database.containerId,
        };
      } catch (error) {
        // Update status to error
        updateDatabaseStatus(input.id, "error");
        throw new Error(
          error instanceof Error ? error.message : "Failed to start container",
        );
      }
    }),

  // Stop a database instance
  stop: publicProcedure
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

        if (!database.containerId) {
          throw new Error("No container associated with this database");
        }

        await stopContainer(database.containerId);
        updateDatabaseStatus(database.id, "stopped");

        return {
          success: true,
          message: "Container stopped",
        };
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "Failed to stop container",
        );
      }
    }),

  // Get status of a database instance
  status: publicProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ input }) => {
      try {
        const database = getDatabaseById(input.id);

        if (!database) {
          throw new Error("Database not found");
        }

        if (!database.containerId) {
          return {
            id: database.id,
            status: database.status,
          };
        }

        const status = await getContainerStatus(database.containerId);

        // Update database status if changed
        if (status !== database.status) {
          updateDatabaseStatus(database.id, status);
        }

        return {
          id: database.id,
          status,
          containerId: database.containerId,
        };
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "Failed to get status",
        );
      }
    }),

  // List all managed containers
  list: publicProcedure.query(async () => {
    try {
      return await listManagedContainers();
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to list containers",
      );
    }
  }),

  // Sync all databases with Docker to get real-time status
  syncAll: publicProcedure.query(async () => {
    try {
      const databases = getAllDatabases();
      const synced = await Promise.all(
        databases.map(async (db) => {
          if (!db.containerId) {
            return { id: db.id, status: db.status, port: db.port };
          }

          const dockerInfo = await syncDatabaseWithDocker(db.containerId);

          if (dockerInfo && dockerInfo.status !== db.status) {
            // Update status if it changed
            updateDatabaseStatus(db.id, dockerInfo.status);
          }

          return {
            id: db.id,
            status: dockerInfo?.status || db.status,
            port: dockerInfo?.port || db.port,
          };
        }),
      );

      return synced;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to sync with Docker",
      );
    }
  }),

  // Get container logs
  logs: publicProcedure
    .input(
      z.object({
        id: z.string(),
        tail: z.number().optional(),
        since: z.number().optional(),
        timestamps: z.boolean().optional(),
      }),
    )
    .query(async ({ input }) => {
      try {
        const database = getDatabaseById(input.id);

        if (!database) {
          throw new Error("Database not found");
        }

        if (!database.containerId) {
          throw new Error("No container associated with this database");
        }

        const logs = await getContainerLogs(database.containerId, {
          tail: input.tail,
          since: input.since,
          timestamps: input.timestamps,
        });

        return {
          logs,
          containerId: database.containerId,
        };
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "Failed to fetch logs",
        );
      }
    }),
});
