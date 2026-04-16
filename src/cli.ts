#!/usr/bin/env node

import { Command, Help } from "commander";

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

const AI_EXAMPLES: Record<string, string[]> = {
  twitterapi: [
    "twitterapi user info elonmusk --compact",
    "twitterapi tweet get 2044505743144194514 --compact",
    'twitterapi tweet search "openai" --limit 5 --compact',
  ],
  "twitterapi user info": [
    "twitterapi user info elonmusk --compact",
    "twitterapi user info https://x.com/elonmusk --compact",
  ],
  "twitterapi user tweets": [
    "twitterapi user tweets elonmusk --limit 10 --compact",
    "twitterapi user tweets https://x.com/elonmusk --limit 10 --compact",
  ],
  "twitterapi user followers": [
    "twitterapi user followers elonmusk --compact",
    "twitterapi user followers https://x.com/elonmusk --compact",
  ],
  "twitterapi user following": [
    "twitterapi user following elonmusk --compact",
    "twitterapi user following https://x.com/elonmusk --compact",
  ],
  "twitterapi user mentions": [
    "twitterapi user mentions elonmusk --compact",
    "twitterapi user mentions https://x.com/elonmusk --compact",
  ],
  "twitterapi user about": [
    "twitterapi user about elonmusk",
    "twitterapi user about https://x.com/elonmusk",
  ],
  "twitterapi user relationship": [
    "twitterapi user relationship elonmusk jack",
  ],
  "twitterapi tweet get": [
    "twitterapi tweet get 2044505743144194514 --compact",
    "twitterapi tweet get https://x.com/pbakaus/status/2044505743144194514 --compact",
  ],
  "twitterapi tweet search": [
    'twitterapi tweet search "openai" --limit 5 --compact',
  ],
  "twitterapi tweet thread": [
    "twitterapi tweet thread 2044505743144194514 --compact",
    "twitterapi tweet thread https://x.com/pbakaus/status/2044505743144194514 --compact",
  ],
  "twitterapi tweet replies": [
    "twitterapi tweet replies 2044505743144194514 --compact",
    "twitterapi tweet replies https://x.com/pbakaus/status/2044505743144194514 --compact",
  ],
  "twitterapi tweet replies-v2": [
    "twitterapi tweet replies-v2 2044505743144194514 --compact",
    "twitterapi tweet replies-v2 https://x.com/pbakaus/status/2044505743144194514 --compact",
  ],
  "twitterapi tweet quotes": [
    "twitterapi tweet quotes 2044505743144194514 --compact",
    "twitterapi tweet quotes https://x.com/pbakaus/status/2044505743144194514 --compact",
  ],
  "twitterapi tweet retweeters": [
    "twitterapi tweet retweeters 2044505743144194514 --compact",
    "twitterapi tweet retweeters https://x.com/pbakaus/status/2044505743144194514 --compact",
  ],
  "twitterapi tweet article": [
    "twitterapi tweet article 2044505743144194514",
    "twitterapi tweet article https://x.com/pbakaus/status/2044505743144194514",
  ],
  "twitterapi tweet create": [
    'twitterapi tweet create "hello world"',
    "twitterapi tweet create \"reply\" --reply-to-tweet-id 2044505743144194514",
  ],
  "twitterapi tweet delete": [
    "twitterapi tweet delete 2044505743144194514",
  ],
  "twitterapi tweet like": [
    "twitterapi tweet like 2044505743144194514",
  ],
  "twitterapi tweet bookmarks": [
    "twitterapi tweet bookmarks --limit 10 --compact",
  ],
};

function commandPath(cmd: Command): string {
  const parts: string[] = [];
  let current: Command | null = cmd;
  while (current) {
    parts.unshift(current.name());
    current = current.parent ?? null;
  }
  return parts.join(" ");
}

class CustomHelp extends Help {
  formatHelp(cmd: Command, helper: Help): string {
    const base = super.formatHelp(cmd, helper);
    const path = commandPath(cmd);
    const examples = AI_EXAMPLES[path];
    if (!examples || examples.length === 0) {
      return base;
    }
    const lines = ["", "Examples:", ...examples.map((ex) => `  $ ${ex}`), ""];
    return `${base}${lines.join("\n")}`;
  }
}

function applyCustomHelp(cmd: Command): void {
  cmd.createHelp = () => new CustomHelp();
  cmd.showHelpAfterError();
  for (const sub of cmd.commands) {
    applyCustomHelp(sub);
  }
}

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
    .configureOutput({
      outputError: (str, write) => {
        write(`Error: ${str}\n`);
      },
    })
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

  applyCustomHelp(program);

  return program;
}
