import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/bin.ts"],
  format: ["esm"],
  target: "node24",
  platform: "node",
  clean: true,
  sourcemap: true,
  dts: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
});
