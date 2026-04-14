#!/usr/bin/env node

import { Command } from "commander";
import { createAuthCommand } from "./commands/auth.js";
import { createTweetCommand } from "./commands/tweet.js";
import {
  type UserCommandDependencies,
  createUserCommand,
} from "./commands/user.js";

export function createProgram(deps: UserCommandDependencies = {}): Command {
  const program = new Command();

  program
    .name("twitterapi")
    .description("TypeScript-first CLI for TwitterAPI.io")
    .option("--json", "Render JSON output")
    .option("--jsonl", "Render JSONL output")
    .option("--api-key <apiKey>", "Override API key")
    .option("--base-url <url>", "Override API base URL")
    .option("--timeout <ms>", "Override request timeout in milliseconds");

  program.addCommand(createUserCommand(deps));
  program.addCommand(createTweetCommand());
  program.addCommand(createAuthCommand());

  return program;
}
