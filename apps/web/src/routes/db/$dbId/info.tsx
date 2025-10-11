import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "../../../utils/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Play, Square, Trash2, Copy, Check, Server, Key, User, Hash, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/db/$dbId/info")({
  component: InfoPage,
});

function InfoPage() {
  const { dbId } = Route.useParams();
  const trpcUtils = trpc();
  const queryClient = useQueryClient();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { data: database, refetch } = useQuery(
    trpcUtils.databases.getById.queryOptions({ id: dbId })
  );

  const startMutation = useMutation(
    trpcUtils.instances.start.mutationOptions({
      onSuccess: () => {
        toast.success("Database started successfully");
        refetch();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const stopMutation = useMutation(
    trpcUtils.instances.stop.mutationOptions({
      onSuccess: () => {
        toast.success("Database stopped successfully");
        refetch();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const deleteMutation = useMutation(
    trpcUtils.databases.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Database deleted successfully");
        window.location.href = "/dashboard";
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  if (!database) return null;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleStart = () => {
    startMutation.mutate({ id: database.id });
  };

  const handleStop = () => {
    stopMutation.mutate({ id: database.id });
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${database.name}"? This action cannot be undone.`)) {
      deleteMutation.mutate({ id: database.id });
    }
  };

  const getConnectionString = () => {
    switch (database.type) {
      case "postgresql":
        return `postgresql://${database.username}:${database.password}@localhost:${database.port}/${database.name}`;
      case "mysql":
        return `mysql://${database.username}:${database.password}@localhost:${database.port}/${database.name}`;
      case "mongodb":
        return `mongodb://${database.username}:${database.password}@localhost:${database.port}/${database.name}`;
      default:
        return "";
    }
  };

  const getCliCommand = () => {
    switch (database.type) {
      case "postgresql":
        return `psql -h localhost -p ${database.port} -U ${database.username} -d ${database.name}`;
      case "mysql":
        return `mysql -h localhost -P ${database.port} -u ${database.username} -p`;
      case "mongodb":
        return `mongosh mongodb://${database.username}:${database.password}@localhost:${database.port}`;
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>Manage your database instance</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          {database.status === "running" ? (
            <Button
              variant="outline"
              onClick={handleStop}
              disabled={stopMutation.isPending}
            >
              <Square className="h-4 w-4 mr-2" />
              {stopMutation.isPending ? "Stopping..." : "Stop"}
            </Button>
          ) : (
            <Button
              onClick={handleStart}
              disabled={startMutation.isPending}
            >
              <Play className="h-4 w-4 mr-2" />
              {startMutation.isPending ? "Starting..." : "Start"}
            </Button>
          )}
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </CardContent>
      </Card>

      {/* Connection Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Details</CardTitle>
          <CardDescription>Use these credentials to connect to your database</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Server className="h-4 w-4" />
                Host
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <code className="text-sm">localhost</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy("localhost", "host")}
                >
                  {copiedField === "host" ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Hash className="h-4 w-4" />
                Port
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <code className="text-sm">{database.port}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(database.port.toString(), "port")}
                >
                  {copiedField === "port" ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <User className="h-4 w-4" />
                Username
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <code className="text-sm">{database.username}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(database.username, "username")}
                >
                  {copiedField === "username" ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Key className="h-4 w-4" />
                Password
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <code className="text-sm">••••••••</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(database.password, "password")}
                >
                  {copiedField === "password" ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Connection String</div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <code className="text-sm flex-1 truncate">{getConnectionString()}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(getConnectionString(), "connection")}
                >
                  {copiedField === "connection" ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <div className="text-sm font-medium text-muted-foreground">CLI Command</div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <code className="text-sm flex-1 truncate">{getCliCommand()}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(getCliCommand(), "cli")}
                >
                  {copiedField === "cli" ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Database Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Database Information</CardTitle>
          <CardDescription>General information about this database instance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Database ID</div>
              <div className="text-sm font-mono bg-muted p-2 rounded">{database.id}</div>
            </div>

            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Type</div>
              <div>
                <Badge variant="outline">
                  {database.type.charAt(0).toUpperCase() + database.type.slice(1)}
                </Badge>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Created At
              </div>
              <div className="text-sm">
                {new Date(database.createdAt).toLocaleString()}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Clock className="h-4 w-4" />
                Last Updated
              </div>
              <div className="text-sm">
                {new Date(database.updatedAt).toLocaleString()}
              </div>
            </div>

            {database.containerId && (
              <div className="space-y-1 md:col-span-2">
                <div className="text-sm font-medium text-muted-foreground">Container ID</div>
                <div className="text-sm font-mono bg-muted p-2 rounded truncate">
                  {database.containerId}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
