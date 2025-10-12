import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Play, Square, Trash2, Loader2 } from "lucide-react";
import { trpc } from "../utils/trpc";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface DatabaseCardProps {
  database: {
    id: string;
    name: string;
    type: string;
    port: number;
    status: string;
    username: string;
  };
  onDelete: () => void;
}

export function DatabaseCard({ database, onDelete }: DatabaseCardProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const trpcUtils = trpc();
  const queryClient = useQueryClient();

  const startMutation = useMutation(
    trpcUtils.instances.start.mutationOptions({
      onSuccess: () => {
        toast.success(`${database.name} started successfully`);
        queryClient.invalidateQueries({ queryKey: ["databases", "list"] });
        setIsStarting(false);
      },
      onError: (error) => {
        toast.error(error.message);
        setIsStarting(false);
      },
    }),
  );

  const stopMutation = useMutation(
    trpcUtils.instances.stop.mutationOptions({
      onSuccess: () => {
        toast.success(`${database.name} stopped successfully`);
        queryClient.invalidateQueries({ queryKey: ["databases", "list"] });
        setIsStopping(false);
      },
      onError: (error) => {
        toast.error(error.message);
        setIsStopping(false);
      },
    }),
  );

  const deleteMutation = useMutation(
    trpcUtils.databases.delete.mutationOptions({
      onSuccess: () => {
        toast.success(`${database.name} deleted successfully`);
        onDelete();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const handleStart = () => {
    setIsStarting(true);
    startMutation.mutate({ id: database.id });
  };

  const handleStop = () => {
    setIsStopping(true);
    stopMutation.mutate({ id: database.id });
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${database.name}?`)) {
      deleteMutation.mutate({ id: database.id });
    }
  };

  const handleButtonClick = (e: React.MouseEvent, callback: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    callback();
  };

  const statusColor =
    {
      running: "bg-green-500",
      stopped: "bg-gray-500",
      created: "bg-blue-500",
      error: "bg-red-500",
    }[database.status] || "bg-gray-500";

  const logoMap: { [key: string]: string } = {
    postgresql: "/postgresql.svg",
    mysql: "/mysql.svg",
    mongodb: "/mongodb.svg",
  };

  return (
    <Link to="/db/$dbId/info" params={{ dbId: database.id }} className="block">
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <img
                src={logoMap[database.type]}
                alt={`${database.type} logo`}
                className="h-8 w-8 object-contain"
              />
              <div>
                <CardTitle className="text-lg">{database.name}</CardTitle>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${statusColor}`} />
              <span className="text-sm capitalize">{database.status}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            <div>:{database.port}</div>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          {database.status !== "running" ? (
            <Button
              onClick={(e) => handleButtonClick(e, handleStart)}
              disabled={isStarting}
              size="sm"
            >
              {isStarting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              <span className="ml-2">
                {isStarting ? "Starting..." : "Start"}
              </span>
            </Button>
          ) : (
            <Button
              onClick={(e) => handleButtonClick(e, handleStop)}
              disabled={isStopping}
              variant="secondary"
              size="sm"
            >
              {isStopping ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              <span className="ml-2">
                {isStopping ? "Stopping..." : "Stop"}
              </span>
            </Button>
          )}
          <Button
            onClick={(e) => handleButtonClick(e, handleDelete)}
            disabled={deleteMutation.isPending}
            variant="destructive"
            size="sm"
          >
            {deleteMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            <span className="ml-2">Delete</span>
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}
