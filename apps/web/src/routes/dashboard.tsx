import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { trpc } from "../utils/trpc";
import { useAuthStore } from "../stores/auth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { DatabaseCard } from "../components/database-card";
import { Plus, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const trpcUtils = trpc();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
    type: "postgresql" as "postgresql" | "mysql" | "mongodb",
    username: "",
    password: "",
  });

  const { data: databases, refetch } = useQuery(
    trpcUtils.databases.list.queryOptions(),
  );

  useEffect(() => {
    const syncInterval = setInterval(async () => {
      try {
        await queryClient.fetchQuery(
          trpcUtils.instances.syncAll.queryOptions(),
        );

        refetch();
      } catch (error) {
        console.error("Failed to sync with Docker:", error);
      }
    }, 5000);

    return () => clearInterval(syncInterval);
  }, [queryClient, trpcUtils, refetch]);

  const createMutation = useMutation(
    trpcUtils.databases.create.mutationOptions({
      onSuccess: () => {
        toast.success("Database created successfully!");
        setOpen(false);
        resetForm();
        refetch();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const resetForm = () => {
    setFormData({
      name: "",
      type: "postgresql",
      username: "",
      password: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-end mb-8">
          <div className="flex gap-2">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Database
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>Create New Database</DialogTitle>
                    <DialogDescription>
                      Set up a new database instance
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        placeholder="my-database"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="type">Type</Label>
                      <select
                        id="type"
                        value={formData.type}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            type: e.target.value as any,
                          })
                        }
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="postgresql">PostgreSQL</option>
                        <option value="mysql">MySQL</option>
                        <option value="mongodb">MongoDB</option>
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        placeholder="admin"
                        value={formData.username}
                        onChange={(e) =>
                          setFormData({ ...formData, username: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>
                        Port will be automatically assigned from available
                        ports.
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending
                        ? "Creating..."
                        : "Create Database"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {databases && databases.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              No databases yet. Create your first database to get started!
            </p>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Database
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {databases?.map((db) => (
              <DatabaseCard
                key={db.id}
                database={db}
                onDelete={() => refetch()}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
