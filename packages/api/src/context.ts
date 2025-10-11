import type { Context as ElysiaContext } from "elysia";

export type CreateContextOptions = {
	context: ElysiaContext;
};

export async function createContext({ context }: CreateContextOptions) {
	// No auth configured
	return {
		session: null,
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
