import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { trpc } from "../../../utils/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Switch } from "../../../components/ui/switch";
import { Input } from "../../../components/ui/input";
import { Badge } from "../../../components/ui/badge";
import Loader from "../../../components/loader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, CheckCircle2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/db/$dbId/extensions")({
  component: ExtensionsPage,
});

const POPULAR_EXTENSIONS = [
  {
    name: "vector",
    description:
      "Vector similarity search for AI/ML applications with embeddings",
  },
  {
    name: "pg_stat_statements",
    description:
      "Track planning and execution statistics of all SQL statements",
  },
  { name: "pgcrypto", description: "Cryptographic functions for PostgreSQL" },
  {
    name: "uuid-ossp",
    description: "Generate universally unique identifiers (UUIDs)",
  },
  { name: "hstore", description: "Data type for storing key-value pairs" },
  {
    name: "pg_trgm",
    description: "Text similarity measurement and index searching",
  },
  { name: "postgis", description: "Spatial and geographic objects support" },
  {
    name: "btree_gin",
    description: "Support for indexing common data types in GIN",
  },
  {
    name: "btree_gist",
    description: "Support for indexing common data types in GiST",
  },
  { name: "citext", description: "Case-insensitive character string type" },
  { name: "cube", description: "Data type for multidimensional cubes" },
  { name: "dblink", description: "Connect to other PostgreSQL databases" },
  {
    name: "dict_int",
    description: "Text search dictionary template for integers",
  },
  {
    name: "earthdistance",
    description: "Calculate great-circle distances on the surface of the Earth",
  },
  {
    name: "fuzzystrmatch",
    description: "Determine similarities and distance between strings",
  },
  {
    name: "intarray",
    description: "Functions and operators for manipulating arrays of integers",
  },
  {
    name: "isn",
    description: "Data types for international product numbering standards",
  },
  { name: "lo", description: "Large Object maintenance" },
  {
    name: "ltree",
    description: "Data type for hierarchical tree-like structures",
  },
  { name: "pg_buffercache", description: "Examine the shared buffer cache" },
  { name: "pgrowlocks", description: "Show row-level locking information" },
  { name: "pg_freespacemap", description: "Examine the free space map (FSM)" },
  {
    name: "pg_visibility",
    description:
      "Examine the visibility map (VM) and page-level visibility info",
  },
  {
    name: "seg",
    description:
      "Data type for representing line segments or floating-point intervals",
  },
  {
    name: "tablefunc",
    description: "Functions that manipulate whole tables, including crosstab",
  },
  { name: "tcn", description: "Triggered change notifications" },
  {
    name: "tsm_system_rows",
    description: "TABLESAMPLE method which accepts number of rows as a limit",
  },
  {
    name: "tsm_system_time",
    description:
      "TABLESAMPLE method which accepts time in milliseconds as a limit",
  },
  {
    name: "unaccent",
    description: "Text search dictionary that removes accents",
  },
  { name: "xml2", description: "XPath querying and XSLT" },
];

function ExtensionsPage() {
  const { dbId } = Route.useParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [togglingExtension, setTogglingExtension] = useState<string | null>(
    null,
  );
  const trpcUtils = trpc();
  const queryClient = useQueryClient();

  const { data: database } = useQuery(
    trpcUtils.databases.getById.queryOptions({ id: dbId }),
  );

  const { data: extensions, isLoading } = useQuery({
    ...trpcUtils.instances.extensions.list.queryOptions({ id: dbId }),
    enabled: !!database && database.status === "running",
  });

  const toggleMutation = useMutation(
    trpcUtils.instances.extensions.toggle.mutationOptions({
      onSuccess: (data) => {
        if (extensions) {
          queryClient.setQueryData(
            [
              ["instances", "extensions", "list"],
              { input: { id: dbId }, type: "query" },
            ],
            extensions.map((ext) =>
              ext.name === data.name ? { ...ext, enabled: data.enabled } : ext,
            ),
          );
        }
        setTogglingExtension(null);
        toast.success(
          data.enabled
            ? `Extension "${data.name}" enabled successfully`
            : `Extension "${data.name}" disabled successfully`,
        );
      },
      onError: (error) => {
        setTogglingExtension(null);
        toast.error(error.message || "Failed to toggle extension");
      },
    }),
  );

  const handleToggle = (extensionName: string, currentlyEnabled: boolean) => {
    setTogglingExtension(extensionName);
    toggleMutation.mutate({
      id: dbId,
      extension: extensionName,
      enable: !currentlyEnabled,
    });
  };

  const filteredExtensions = POPULAR_EXTENSIONS.filter(
    (ext) =>
      ext.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ext.description.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const isExtensionEnabled = (name: string) => {
    return extensions?.some((ext) => ext.name === name && ext.enabled) || false;
  };

  const isExtensionInstalled = (name: string) => {
    return extensions?.some((ext) => ext.name === name) || false;
  };

  if (database?.status !== "running") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Extensions</CardTitle>
          <CardDescription>
            Database must be running to manage extensions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Please start your database to view and manage extensions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">PostgreSQL Extensions</h2>
        <p className="text-sm text-muted-foreground">
          Enable or disable PostgreSQL extensions to add functionality to your
          database
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search extensions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {filteredExtensions.map((extension) => {
            const enabled = isExtensionEnabled(extension.name);
            const installed = isExtensionInstalled(extension.name);
            const isToggling = togglingExtension === extension.name;

            return (
              <Card key={extension.name}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-lg font-mono">
                          {extension.name}
                        </CardTitle>
                        {enabled ? (
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Enabled
                          </Badge>
                        ) : installed ? (
                          <Badge variant="secondary">Installed</Badge>
                        ) : null}
                      </div>
                      <CardDescription>{extension.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {isToggling && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      <Switch
                        checked={enabled}
                        onCheckedChange={() =>
                          handleToggle(extension.name, enabled)
                        }
                        disabled={isToggling}
                      />
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}

          {filteredExtensions.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  No extensions found matching "{searchTerm}"
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
