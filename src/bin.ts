#!/usr/bin/env node

import { createProgram } from "./cli.js";

async function main(): Promise<void> {
  const program = createProgram();
  await program.parseAsync(process.argv);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
