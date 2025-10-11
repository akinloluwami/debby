import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { trpc } from "../utils/trpc";
import { useAuthStore } from "../stores/auth";
import Loader from "../components/loader";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  const navigate = useNavigate();
  const { isAuthenticated, isConfigured, setConfigured } = useAuthStore();
  const trpcUtils = trpc();
  
  const { data: setupStatus, isLoading } = useQuery(
    trpcUtils.setup.isConfigured.queryOptions()
  );

  useEffect(() => {
    if (!isLoading && setupStatus) {
      setConfigured(setupStatus.isConfigured);

      if (!setupStatus.isConfigured) {
        navigate({ to: "/setup" });
      } else if (!isAuthenticated) {
        navigate({ to: "/login" });
      } else {
        navigate({ to: "/dashboard" });
      }
    }
  }, [setupStatus, isLoading, isAuthenticated, navigate, setConfigured]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader />
    </div>
  );
}
