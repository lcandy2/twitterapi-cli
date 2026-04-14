#!/usr/bin/env node

import { Command } from "commander";

import { createAuthCommand } from "./commands/auth.js";
import { createCommunityCommand } from "./commands/community.js";
import { createDmCommand } from "./commands/dm.js";
import { createListCommand } from "./commands/list.js";
import { createMediaCommand } from "./commands/media.js";
import { createMyCommand } from "./commands/my.js";
import { createProfileCommand } from "./commands/profile.js";
import type { CommandDependencies } from "./commands/shared.js";
import { createSpaceCommand } from "./commands/space.js";
import { createStreamCommand } from "./commands/stream.js";
import { createTrendCommand } from "./commands/trend.js";
import { createTweetCommand } from "./commands/tweet.js";
import { createUserCommand } from "./commands/user.js";
import { createWebhookCommand } from "./commands/webhook.js";

export function createProgram(deps: CommandDependencies = {}): Command {
  const program = new Command();

  program
    .name("twitterapi")
    .description("TypeScript-first CLI for TwitterAPI.io")
    .option("--json", "Render JSON output")
    .option("--jsonl", "Render JSONL output")
    .option("--api-key <apiKey>", "Override API key")
    .option("--base-url <url>", "Override API base URL")
    .option("--timeout <ms>", "Override request timeout in milliseconds")
    .option("--proxy <proxy>", "Override residential proxy URL")
    .option("--login-cookies <value>", "Override login cookies")
    .showHelpAfterError();

  program.addCommand(createUserCommand(deps));
  program.addCommand(createTweetCommand(deps));
  program.addCommand(createListCommand(deps));
  program.addCommand(createCommunityCommand(deps));
  program.addCommand(createTrendCommand(deps));
  program.addCommand(createSpaceCommand(deps));
  program.addCommand(createMyCommand(deps));
  program.addCommand(createAuthCommand(deps));
  program.addCommand(createDmCommand(deps));
  program.addCommand(createMediaCommand(deps));
  program.addCommand(createProfileCommand(deps));
  program.addCommand(createWebhookCommand(deps));
  program.addCommand(createStreamCommand(deps));

  return program;
}
