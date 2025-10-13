import type { AppRouter } from "@debby/api/routers/index";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import { toast } from "sonner";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      toast.error(error.message, {
        action: {
          label: "retry",
          onClick: () => {
            queryClient.invalidateQueries();
          },
        },
      });
    },
  }),
});

const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

export { TRPCProvider };
export const trpc = useTRPC;

export function createTRPCClientInstance() {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${import.meta.env.VITE_SERVER_URL}/trpc`,

        fetch(url, options) {
          return fetch(url, {
            ...options,
            credentials: "include",
          });
        },
      }),
    ],
  });
}
