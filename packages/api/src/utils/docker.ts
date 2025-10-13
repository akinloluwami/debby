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
      return "pgvector/pgvector:pg16";
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

function getDataVolumePath(type: DatabaseInstance["type"]): string {
  switch (type) {
    case "postgresql":
      return "/var/lib/postgresql/data";
    case "mysql":
      return "/var/lib/mysql";
    case "mongodb":
      return "/data/db";
    default:
      throw new Error(`Unsupported database type: ${type}`);
  }
}

export async function createContainer(db: DatabaseInstance): Promise<string> {
  try {
    await ensureNetwork();

    const image = getDockerImage(db.type);
    const containerName = `debby-${db.type}-${db.id}`;
    const volumeName = `debby-data-${db.id}`;

    try {
      await docker.pull(image);
    } catch (error) {
      console.warn(`Image ${image} might already exist or pull failed:`, error);
    }

    const container = await docker.createContainer({
      Image: image,
      name: containerName,
      Env: getEnvironmentVars(db),
      HostConfig: {
        PortBindings: {
          [`${getDefaultPort(db.type)}/tcp`]: [
            { HostPort: db.port.toString() },
          ],
        },
        NetworkMode: NETWORK_NAME,
        RestartPolicy: {
          Name: "unless-stopped",
        },
        Binds: [`${volumeName}:${getDataVolumePath(db.type)}`],
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

export async function findAvailablePort(
  type: DatabaseInstance["type"],
): Promise<number> {
  const defaultPort = getDefaultPort(type);

  const port = await getPort({ port: defaultPort });
  return port;
}

export async function startContainer(containerId: string): Promise<void> {
  try {
    const container = docker.getContainer(containerId);
    await container.start();
  } catch (error) {
    console.error("Error starting container:", error);
    throw error;
  }
}

export async function stopContainer(containerId: string): Promise<void> {
  try {
    const container = docker.getContainer(containerId);
    await container.stop();
  } catch (error) {
    console.error("Error stopping container:", error);
    throw error;
  }
}

export async function removeContainer(containerId: string): Promise<void> {
  try {
    const container = docker.getContainer(containerId);

    try {
      await container.stop();
    } catch (error) {}

    await container.remove();
  } catch (error) {
    console.error("Error removing container:", error);
    throw error;
  }
}

export async function removeVolume(databaseId: string): Promise<void> {
  try {
    const volumeName = `debby-data-${databaseId}`;
    const volume = docker.getVolume(volumeName);

    try {
      await volume.remove();
      console.log(`Volume ${volumeName} removed successfully`);
    } catch (error: any) {
      if (error?.statusCode !== 404) {
        console.error(`Error removing volume ${volumeName}:`, error);
      }
    }
  } catch (error) {
    console.error("Error in removeVolume:", error);
  }
}

export async function getContainerStatus(
  containerId: string,
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

    let port: number | undefined;
    const ports = info.NetworkSettings?.Ports;
    if (ports) {
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

export async function syncDatabaseWithDocker(containerId?: string): Promise<{
  status: "running" | "stopped" | "created" | "error";
  port?: number;
} | null> {
  if (!containerId) {
    return null;
  }

  return await getContainerInfo(containerId);
}

export async function getContainerLogs(
  containerId: string,
  options: {
    tail?: number;
    since?: number;
    timestamps?: boolean;
  } = {},
): Promise<string> {
  try {
    const container = docker.getContainer(containerId);
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail: options.tail || 100,
      since: options.since || 0,
      timestamps: options.timestamps !== false,
    });

    return logs.toString("utf-8");
  } catch (error) {
    console.error("Error getting container logs:", error);
    throw error;
  }
}

export async function listPostgresExtensions(
  containerId: string,
  username: string,
  password: string,
  dbName: string,
): Promise<Array<{ name: string; enabled: boolean; version: string | null }>> {
  try {
    const query = `
      SELECT 
        ae.name as name,
        e.extversion as version,
        CASE WHEN e.extname IS NOT NULL THEN 't' ELSE 'f' END as enabled
      FROM pg_available_extensions ae
      LEFT JOIN pg_extension e ON ae.name = e.extname
      ORDER BY ae.name;
    `;

    const cmd = [
      "psql",
      `-U${username}`,
      `-d${dbName}`,
      "-t", // Tuples only
      "-A", // Unaligned output
      "-F|", // Field separator
      "-c",
      query,
    ];

    const container = docker.getContainer(containerId);
    const exec = await container.exec({
      Cmd: cmd,
      AttachStdout: true,
      AttachStderr: true,
      Env: [`PGPASSWORD=${password}`],
    });

    const stream = await exec.start({ Detach: false });

    return new Promise((resolve, reject) => {
      let output = "";

      stream.on("data", (chunk: Buffer) => {
        const data = chunk.slice(8).toString("utf-8");
        output += data;
      });

      stream.on("end", () => {
        const lines = output
          .trim()
          .split("\n")
          .filter((line) => line.length > 0);
        const extensions = lines
          .map((line) => {
            const [name, version, enabled] = line.split("|");
            return {
              name: (name || "").trim(),
              enabled: enabled?.trim() === "t",
              version: version?.trim() || null,
            };
          })
          .filter((ext) => ext.name.length > 0);

        resolve(extensions);
      });

      stream.on("error", reject);
    });
  } catch (error) {
    console.error("Error listing PostgreSQL extensions:", error);
    throw error;
  }
}

export async function enablePostgresExtension(
  containerId: string,
  username: string,
  password: string,
  dbName: string,
  extensionName: string,
): Promise<void> {
  try {
    const cmd = [
      "psql",
      `-U${username}`,
      `-d${dbName}`,
      "-c",
      `CREATE EXTENSION IF NOT EXISTS "${extensionName}";`,
    ];

    const container = docker.getContainer(containerId);
    const exec = await container.exec({
      Cmd: cmd,
      AttachStdout: true,
      AttachStderr: true,
      Env: [`PGPASSWORD=${password}`],
    });

    await exec.start({ Detach: false });
  } catch (error) {
    console.error(`Error enabling extension ${extensionName}:`, error);
    throw error;
  }
}

export async function disablePostgresExtension(
  containerId: string,
  username: string,
  password: string,
  dbName: string,
  extensionName: string,
): Promise<void> {
  try {
    const cmd = [
      "psql",
      `-U${username}`,
      `-d${dbName}`,
      "-c",
      `DROP EXTENSION IF EXISTS "${extensionName}" CASCADE;`,
    ];

    const container = docker.getContainer(containerId);
    const exec = await container.exec({
      Cmd: cmd,
      AttachStdout: true,
      AttachStderr: true,
      Env: [`PGPASSWORD=${password}`],
    });

    await exec.start({ Detach: false });
  } catch (error) {
    console.error(`Error disabling extension ${extensionName}:`, error);
    throw error;
  }
}
