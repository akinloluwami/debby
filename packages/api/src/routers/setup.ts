import { z } from "zod";
import { publicProcedure, router } from "../index";
import {
	isMasterPasswordConfigured,
	setMasterPassword,
	verifyMasterPassword,
} from "../utils/auth";

export const setupRouter = router({
	// Check if master password is configured
	isConfigured: publicProcedure.query(() => {
		return {
			isConfigured: isMasterPasswordConfigured(),
		};
	}),

	// Set master password (only if not already configured)
	setPassword: publicProcedure
		.input(
			z.object({
				password: z.string().min(8, "Password must be at least 8 characters"),
			})
		)
		.mutation(async ({ input }) => {
			try {
				await setMasterPassword(input.password);
				return {
					success: true,
					message: "Master password set successfully",
				};
			} catch (error) {
				throw new Error(
					error instanceof Error ? error.message : "Failed to set password"
				);
			}
		}),

	// Verify master password
	verifyPassword: publicProcedure
		.input(
			z.object({
				password: z.string(),
			})
		)
		.mutation(async ({ input }) => {
			const isValid = await verifyMasterPassword(input.password);
			
			if (!isValid) {
				throw new Error("Invalid password");
			}

			return {
				success: true,
				message: "Password verified",
			};
		}),
});
