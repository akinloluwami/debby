import { publicProcedure, router } from "../index";
import { setupRouter } from "./setup";
import { databaseRouter } from "./database";
import { instanceRouter } from "./instance";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => {
		return "OK";
	}),
	setup: setupRouter,
	databases: databaseRouter,
	instances: instanceRouter,
});
export type AppRouter = typeof appRouter;
