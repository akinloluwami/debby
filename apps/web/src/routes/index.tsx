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
  const { setConfigured, setAuthenticated } = useAuthStore();
  const trpcUtils = trpc();

  const { data: setupStatus, isLoading: isLoadingSetup } = useQuery(
    trpcUtils.setup.isConfigured.queryOptions(),
  );

  const { data: sessionStatus, isLoading: isLoadingSession } = useQuery(
    trpcUtils.setup.getSession.queryOptions(),
  );

  useEffect(() => {
    if (!isLoadingSetup && !isLoadingSession && setupStatus && sessionStatus) {
      setConfigured(setupStatus.isConfigured);

      if (!setupStatus.isConfigured) {
        navigate({ to: "/setup" });
      } else if (sessionStatus.isAuthenticated) {
        setAuthenticated(true);
        navigate({ to: "/dashboard" });
      } else {
        setAuthenticated(false);
        navigate({ to: "/login" });
      }
    }
  }, [
    setupStatus,
    sessionStatus,
    isLoadingSetup,
    isLoadingSession,
    navigate,
    setConfigured,
    setAuthenticated,
  ]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader />
    </div>
  );
}
