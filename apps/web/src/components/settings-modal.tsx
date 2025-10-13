import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { trpc } from "../utils/trpc";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Settings } from "lucide-react";

export function SettingsModal() {
  const [open, setOpen] = useState(false);
  const [host, setHost] = useState("");
  const trpcUtils = trpc();

  const { data: settings, refetch } = useQuery(
    trpcUtils.setup.getSettings.queryOptions(),
  );

  const updateHostMutation = useMutation(
    trpcUtils.setup.updateHost.mutationOptions({
      onSuccess: () => {
        toast.success("Host updated successfully");
        refetch();
        setOpen(false);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const handleOpen = () => {
    setHost(settings?.host || "localhost");
    setOpen(true);
  };

  const handleSave = () => {
    if (!host.trim()) {
      toast.error("Host is required");
      return;
    }
    updateHostMutation.mutate({ host });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleOpen}
          title="Settings"
        >
          <Settings className="h-[1.2rem] w-[1.2rem]" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure your Debby instance settings
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="host">Database Host</Label>
            <Input
              id="host"
              type="text"
              placeholder="localhost"
              value={host}
              onChange={(e) => setHost(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The hostname or IP address where your databases are accessible.
              This is used in connection strings and CLI commands.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={updateHostMutation.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateHostMutation.isPending}>
            {updateHostMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
