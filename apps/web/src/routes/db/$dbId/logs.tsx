import { createFileRoute } from "@tanstack/react-router";
import { Button } from "../../../components/ui/button";
import { RefreshCw, Download } from "lucide-react";
import { trpc } from "../../../utils/trpc";
import Loader from "../../../components/loader";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/db/$dbId/logs")({
  component: LogsPage,
});

function LogsPage() {
  const { dbId } = Route.useParams();
  const trpcUtils = trpc();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    ...trpcUtils.instances.logs.queryOptions({
      id: dbId,
      tail: 100,
      timestamps: true,
    }),
    refetchInterval: false,
  });

  const handleDownload = () => {
    if (!data?.logs) return;

    const blob = new Blob([data.logs], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.containerId || "container"}-logs.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Container Logs</h2>
          <p className="text-sm text-muted-foreground">
            View the latest logs from your database container
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={isLoading || !data?.logs}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      <div className="border rounded-lg bg-zinc-950 p-4 h-[600px] overflow-auto font-mono text-xs text-zinc-100">
        {isLoading ? (
          <Loader />
        ) : data?.logs ? (
          <pre className="whitespace-pre-wrap break-all">{data.logs}</pre>
        ) : (
          <p className="text-zinc-500">No logs available</p>
        )}
      </div>
    </div>
  );
}
