import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { RefreshCw, Download } from "lucide-react";

export const Route = createFileRoute("/db/$dbId/logs")({
  component: LogsPage,
});

function LogsPage() {
  const { dbId } = Route.useParams();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Container Logs</CardTitle>
              <CardDescription>View real-time logs from your database container</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-slate-950 text-green-400 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto">
            <div className="space-y-1">
              <div className="text-slate-500">// Container logs will be displayed here</div>
              <div className="text-slate-500">// This feature requires backend implementation to fetch Docker logs</div>
              <div className="text-slate-500">// Database ID: {dbId}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
