import { spawnSync } from "node:child_process";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

const result = spawnSync(
  process.execPath,
  [
    "node_modules/auth/dist/index.mjs",
    "migrate",
    "--config",
    "src/lib/server/auth.ts",
    ...process.argv.slice(2),
  ],
  { stdio: "inherit", windowsHide: true }
);

if (result.error) {
  throw result.error;
}

process.exitCode = result.status ?? 1;
