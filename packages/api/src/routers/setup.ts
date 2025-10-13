import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../index";
import {
  isMasterPasswordConfigured,
  setMasterPassword,
  verifyMasterPassword,
  createSession,
  deleteSession,
} from "../utils/auth";

export const setupRouter = router({
  isConfigured: publicProcedure.query(() => {
    return {
      isConfigured: isMasterPasswordConfigured(),
    };
  }),

  getSession: publicProcedure.query(({ ctx }) => {
    return {
      isAuthenticated: ctx.isAuthenticated,
    };
  }),

  setPassword: publicProcedure
    .input(
      z.object({
        password: z.string().min(8, "Password must be at least 8 characters"),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        await setMasterPassword(input.password);

        const session = createSession();
        return {
          success: true,
          message: "Master password set successfully",
          sessionToken: session.token,
          expiresAt: session.expiresAt.toISOString(),
        };
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "Failed to set password",
        );
      }
    }),

  verifyPassword: publicProcedure
    .input(
      z.object({
        password: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const isValid = await verifyMasterPassword(input.password);

      if (!isValid) {
        throw new Error("Invalid password");
      }

      const session = createSession();

      return {
        success: true,
        message: "Password verified",
        sessionToken: session.token,
        expiresAt: session.expiresAt.toISOString(),
      };
    }),

  logout: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.sessionToken) {
      deleteSession(ctx.sessionToken);
    }
    return {
      success: true,
      message: "Logged out successfully",
    };
  }),
});
