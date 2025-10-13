import { z } from "zod";
import { protectedProcedure, router } from "../index";
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
  listPostgresExtensions,
  enablePostgresExtension,
  disablePostgresExtension,
} from "../utils/docker";

export const instanceRouter = router({
  start: protectedProcedure
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
          const containerId = await createContainer(database);
          updateDatabaseStatus(database.id, "running", containerId);

          return {
            success: true,
            message: "Container created and started",
            containerId,
          };
        }

        await startContainer(database.containerId);
        updateDatabaseStatus(database.id, "running");

        return {
          success: true,
          message: "Container started",
          containerId: database.containerId,
        };
      } catch (error) {
        updateDatabaseStatus(input.id, "error");
        throw new Error(
          error instanceof Error ? error.message : "Failed to start container",
        );
      }
    }),

  stop: protectedProcedure
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

  status: protectedProcedure
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

  list: protectedProcedure.query(async () => {
    try {
      return await listManagedContainers();
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to list containers",
      );
    }
  }),

  syncAll: protectedProcedure.query(async () => {
    try {
      const databases = getAllDatabases();
      const synced = await Promise.all(
        databases.map(async (db) => {
          if (!db.containerId) {
            return { id: db.id, status: db.status, port: db.port };
          }

          const dockerInfo = await syncDatabaseWithDocker(db.containerId);

          if (dockerInfo && dockerInfo.status !== db.status) {
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

  logs: protectedProcedure
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

  extensions: router({
    list: protectedProcedure
      .input(
        z.object({
          id: z.string(),
        }),
      )
      .query(async ({ input }) => {
        try {
          console.log(
            "[Extensions List] Looking up database with ID:",
            input.id,
          );
          const database = getDatabaseById(input.id);

          if (!database) {
            console.error(
              "[Extensions List] Database not found for ID:",
              input.id,
            );
            throw new Error("Database not found");
          }

          console.log(
            "[Extensions List] Found database:",
            database.name,
            "Type:",
            database.type,
          );

          if (database.type !== "postgresql") {
            throw new Error("Extensions are only supported for PostgreSQL");
          }

          if (!database.containerId) {
            throw new Error("No container associated with this database");
          }

          const status = await getContainerStatus(database.containerId);
          if (status !== "running") {
            throw new Error("Database container must be running");
          }

          const extensions = await listPostgresExtensions(
            database.containerId,
            database.username,
            database.password,
            database.name,
          );

          return extensions;
        } catch (error) {
          throw new Error(
            error instanceof Error
              ? error.message
              : "Failed to list extensions",
          );
        }
      }),

    toggle: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          extension: z.string(),
          enable: z.boolean(),
        }),
      )
      .mutation(async ({ input }) => {
        try {
          const database = getDatabaseById(input.id);

          if (!database) {
            throw new Error("Database not found");
          }

          if (database.type !== "postgresql") {
            throw new Error("Extensions are only supported for PostgreSQL");
          }

          if (!database.containerId) {
            throw new Error("No container associated with this database");
          }

          const status = await getContainerStatus(database.containerId);
          if (status !== "running") {
            throw new Error("Database container must be running");
          }

          if (input.enable) {
            await enablePostgresExtension(
              database.containerId,
              database.username,
              database.password,
              database.name,
              input.extension,
            );
          } else {
            await disablePostgresExtension(
              database.containerId,
              database.username,
              database.password,
              database.name,
              input.extension,
            );
          }

          return {
            success: true,
            name: input.extension,
            enabled: input.enable,
          };
        } catch (error) {
          throw new Error(
            error instanceof Error
              ? error.message
              : "Failed to toggle extension",
          );
        }
      }),
  }),
});
