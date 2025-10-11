import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/db")({
  component: () => <Outlet />,
});
