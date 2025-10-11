import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "../../utils/trpc";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { ArrowLeft, Info, ScrollText, Settings } from "lucide-react";
import { Skeleton } from "../../components/ui/skeleton";

export const Route = createFileRoute("/db/$dbId")({
  component: DatabaseDetailsLayout,
});

function DatabaseDetailsLayout() {
  const { dbId } = Route.useParams();
  const navigate = useNavigate();
  const trpcUtils = trpc();

  const {
    data: database,
    isLoading,
    error,
  } = useQuery(trpcUtils.databases.getById.queryOptions({ id: dbId }));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="container mx-auto p-6">
          <div className="flex items-center gap-4 mb-6">
            <Skeleton className="h-10 w-10" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error || !database) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="container mx-auto p-6">
          <Card className="max-w-2xl mx-auto mt-12">
            <CardHeader>
              <CardTitle>Database Not Found</CardTitle>
              <CardDescription>
                The database you're looking for doesn't exist or has been
                deleted.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate({ to: "/dashboard" })}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const tabs = [
    { label: "Info", path: "/db/$dbId/info", icon: Info },
    { label: "Logs", path: "/db/$dbId/logs", icon: ScrollText },
    { label: "Settings", path: "/db/$dbId/settings", icon: Settings },
  ];

  const getLogoPath = () => {
    const logoMap = {
      postgresql: "/src/public/postgresql.svg",
      mysql: "/src/public/mysql.svg",
      mongodb: "/src/public/mongodb.svg",
    };
    return logoMap[database.type as keyof typeof logoMap] || "";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate({ to: "/dashboard" })}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <img
                  src={getLogoPath()}
                  alt={`${database.type} logo`}
                  className="h-8 w-8 object-contain"
                />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{database.name}</h1>
                <p className="text-muted-foreground">
                  {database.type.charAt(0).toUpperCase() +
                    database.type.slice(1)}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                database.status === "running"
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                  : database.status === "stopped"
                    ? "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                    : database.status === "error"
                      ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                      : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
              }`}
            >
              {database.status.charAt(0).toUpperCase() +
                database.status.slice(1)}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border mb-6">
          <div className="flex gap-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.label}
                  to={tab.path}
                  params={{ dbId }}
                  className="flex items-center gap-2 px-4 py-2 border-b-2 transition-colors [&.active]:border-primary [&.active]:text-primary hover:text-primary"
                  activeProps={{ className: "active" }}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <Outlet />
      </div>
    </div>
  );
}
