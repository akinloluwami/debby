import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { trpc } from "../../../utils/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Save, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/db/$dbId/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { dbId } = Route.useParams();
  const trpcUtils = trpc();

  const { data: database } = useQuery(
    trpcUtils.databases.getById.queryOptions({ id: dbId }),
  );

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    password: "",
  });

  // Update form when database data loads
  useEffect(() => {
    if (database) {
      setFormData({
        name: database.name,
        username: database.username,
        password: "",
      });
    }
  }, [database]);

  const updateMutation = useMutation(
    trpcUtils.databases.update.mutationOptions({
      onSuccess: (data) => {
        toast.success(data.message || "Database settings updated successfully");
        // Clear password field after successful update
        setFormData((prev) => ({ ...prev, password: "" }));
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updates: any = {
      id: dbId,
    };

    const credentialsChanged =
      formData.username !== database?.username || formData.password !== "";

    // Only allow name changes if container doesn't exist
    if (formData.name !== database?.name && !database?.containerId) {
      updates.name = formData.name;
    }

    if (formData.username !== database?.username) {
      updates.username = formData.username;
    }

    if (formData.password) {
      updates.password = formData.password;
    }

    // Show warning if credentials are being changed
    if (credentialsChanged && database?.containerId) {
      if (
        !confirm(
          "Changing credentials will restart the container. Your data will be preserved, but there will be a brief downtime. Continue?",
        )
      ) {
        return;
      }
    }

    updateMutation.mutate(updates);
  };

  if (!database) return null;

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Update your database configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {database?.containerId && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Note:</strong> Changing username or password will
                  recreate the container with new credentials. Your data will be
                  preserved using Docker volumes, but there will be a brief
                  restart.
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Database Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="my-database"
                disabled={!!database?.containerId}
              />
              <p className="text-sm text-muted-foreground">
                {database?.containerId
                  ? "Database name cannot be changed after container is created"
                  : "A friendly name to identify your database"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                placeholder="admin"
              />
              <p className="text-sm text-muted-foreground">
                Database admin username
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="Leave empty to keep current password"
              />
              <p className="text-sm text-muted-foreground">
                Only enter if you want to change the password
              </p>
            </div>

            <Button type="submit" disabled={updateMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions that can permanently affect your database
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-destructive/50 rounded-lg">
            <div>
              <div className="font-medium">Restart Container</div>
              <div className="text-sm text-muted-foreground">
                Stop and start the container to apply changes
              </div>
            </div>
            <Button
              variant="outline"
              className="border-destructive text-destructive"
            >
              Restart
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border border-destructive/50 rounded-lg">
            <div>
              <div className="font-medium">Reset Database</div>
              <div className="text-sm text-muted-foreground">
                Remove all data and reinitialize the database
              </div>
            </div>
            <Button
              variant="outline"
              className="border-destructive text-destructive"
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
