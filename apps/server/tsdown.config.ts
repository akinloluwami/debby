import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "./src/index.ts",
  format: "esm",
  outDir: "./dist",
  clean: true,
  noExternal: [/@debby\/.*/],
  external: ["ssh2", "cpu-features", "bcrypt", "bcryptjs"],
});
