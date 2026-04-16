import { Command } from "commander";

import {
  type CommandDependencies,
  appendProxy,
  createExecutionContext,
  handleCommandError,
  parseLimit,
  requireLoginCookies,
  requireProxy,
  selectEnvelope,
  selectRecord,
  writeResult,
} from "./shared.js";
import { extractUsername } from "./url-parser.js";

interface ReadOptions {
  compact?: boolean;
  fields?: string;
  limit?: string;
  cursor?: string;
  pageSize?: string;
  includeReplies?: boolean;
  includeParentTweet?: boolean;
  sinceTime?: string;
  untilTime?: string;
}

interface RelationshipOptions {
  sourceUserName?: string;
  targetUserName?: string;
}

interface TimelineResponse {
  tweets?: Record<string, unknown>[];
  has_next_page?: boolean;
  next_cursor?: string;
}

interface UsersResponse {
  users?: Record<string, unknown>[];
  has_next_page?: boolean;
  next_cursor?: string;
}

export function createUserCommand(deps: CommandDependencies = {}): Command {
  const command = new Command("user").description("User-related commands");

  command
    .command("batch-info")
    .description("Batch get user info by user IDs")
    .argument("<userIds>", "Comma-separated user IDs")
    .option("-c, --compact", "Use compact user output")
    .option("-f, --fields <fields>", "Comma-separated fields to keep")
    .action(
      async (
        userIds: string,
        options: ReadOptions,
        commandInstance: Command,
      ) => {
        const context = createExecutionContext(commandInstance, deps);
        if (!context) {
          return;
        }

        try {
          const response = await context.client.getJson<UsersResponse>(
            "/twitter/user/batch_info_by_ids",
            { userIds },
          );
          writeResult(
            context,
            selectEnvelope(
              {
                items: response.users ?? [],
                itemKey: "users",
                hasNextPage: undefined,
                nextCursor: undefined,
              },
              Boolean(options.compact),
              "userInfo",
              options.fields,
            ),
          );
        } catch (error) {
          handleCommandError(error, context.stderr);
        }
      },
    );

  command
    .command("info")
    .description("Get user profile information")
    .argument("<username>", "Twitter username")
    .option("-c, --compact", "Use compact user output")
    .option("-f, --fields <fields>", "Comma-separated fields to keep")
    .action(
      async (
        username: string,
        options: ReadOptions,
        commandInstance: Command,
      ) => {
        const context = createExecutionContext(commandInstance, deps);
        if (!context) {
          return;
        }

        try {
          const data = await context.client.getJson<Record<string, unknown>>(
            "/twitter/user/info",
            { userName: extractUsername(username) },
          );
          writeResult(
            context,
            selectRecord(
              data,
              Boolean(options.compact),
              "userInfo",
              options.fields,
            ),
          );
        } catch (error) {
          handleCommandError(error, context.stderr);
        }
      },
    );

  command
    .command("timeline")
    .description("Get user timeline by user ID")
    .argument("<userId>", "Twitter user ID")
    .option("--cursor <cursor>", "Pagination cursor")
    .option("--include-replies", "Include replies")
    .option("--include-parent-tweet", "Include parent tweets")
    .option("-l, --limit <number>", "Maximum tweets to return", "20")
    .option("-c, --compact", "Use compact tweet output")
    .option("-f, --fields <fields>", "Comma-separated fields to keep")
    .action(
      async (
        userId: string,
        options: ReadOptions,
        commandInstance: Command,
      ) => {
        await handleTweetList(
          commandInstance,
          deps,
          "/twitter/user/tweet_timeline",
          {
            userId,
            ...(options.cursor ? { cursor: options.cursor } : {}),
            ...(options.includeReplies ? { includeReplies: true } : {}),
            ...(options.includeParentTweet ? { includeParentTweet: true } : {}),
          },
          options,
        );
      },
    );

  command
    .command("tweets")
    .description("Get recent tweets from a user")
    .argument("<username>", "Twitter username")
    .option("-l, --limit <number>", "Maximum tweets to return", "20")
    .option("--cursor <cursor>", "Pagination cursor")
    .option("-r, --include-replies", "Include replies in results")
    .option("-c, --compact", "Use compact tweet output")
    .option("-f, --fields <fields>", "Comma-separated fields to keep")
    .action(
      async (
        username: string,
        options: ReadOptions,
        commandInstance: Command,
      ) => {
        await handleTweetList(
          commandInstance,
          deps,
          "/twitter/user/last_tweets",
          {
            userName: extractUsername(username),
            ...(options.cursor ? { cursor: options.cursor } : {}),
            ...(options.includeReplies ? { includeReplies: true } : {}),
          },
          options,
        );
      },
    );

  command
    .command("followers")
    .description("Get user followers")
    .argument("<username>", "Twitter username")
    .option("--cursor <cursor>", "Pagination cursor")
    .option("--page-size <number>", "Page size")
    .option("-c, --compact", "Use compact user output")
    .option("-f, --fields <fields>", "Comma-separated fields to keep")
    .action(
      async (
        username: string,
        options: ReadOptions,
        commandInstance: Command,
      ) => {
        await handleUserList(
          commandInstance,
          deps,
          "/twitter/user/followers",
          {
            userName: extractUsername(username),
            ...(options.cursor ? { cursor: options.cursor } : {}),
            ...(options.pageSize ? { pageSize: Number(options.pageSize) } : {}),
          },
          options,
        );
      },
    );

  command
    .command("following")
    .description("Get user followings")
    .argument("<username>", "Twitter username")
    .option("--cursor <cursor>", "Pagination cursor")
    .option("--page-size <number>", "Page size")
    .option("-c, --compact", "Use compact user output")
    .option("-f, --fields <fields>", "Comma-separated fields to keep")
    .action(
      async (
        username: string,
        options: ReadOptions,
        commandInstance: Command,
      ) => {
        await handleUserList(
          commandInstance,
          deps,
          "/twitter/user/followings",
          {
            userName: extractUsername(username),
            ...(options.cursor ? { cursor: options.cursor } : {}),
            ...(options.pageSize ? { pageSize: Number(options.pageSize) } : {}),
          },
          options,
        );
      },
    );

  command
    .command("mentions")
    .description("Get user mentions")
    .argument("<username>", "Twitter username")
    .option("--cursor <cursor>", "Pagination cursor")
    .option("--since-time <unix>", "Only include mentions after this timestamp")
    .option(
      "--until-time <unix>",
      "Only include mentions before this timestamp",
    )
    .option("-l, --limit <number>", "Maximum tweets to return", "20")
    .option("-c, --compact", "Use compact tweet output")
    .option("-f, --fields <fields>", "Comma-separated fields to keep")
    .action(
      async (
        username: string,
        options: ReadOptions,
        commandInstance: Command,
      ) => {
        await handleTweetList(
          commandInstance,
          deps,
          "/twitter/user/mentions",
          {
            userName: extractUsername(username),
            ...(options.cursor ? { cursor: options.cursor } : {}),
            ...(options.sinceTime
              ? { sinceTime: Number(options.sinceTime) }
              : {}),
            ...(options.untilTime
              ? { untilTime: Number(options.untilTime) }
              : {}),
          },
          options,
        );
      },
    );

  command
    .command("relationship")
    .description("Check follow relationship between two users")
    .argument("<sourceUserName>", "Source username")
    .argument("<targetUserName>", "Target username")
    .action(
      async (
        sourceUserName: string,
        targetUserName: string,
        _options: RelationshipOptions,
        commandInstance: Command,
      ) => {
        const context = createExecutionContext(commandInstance, deps);
        if (!context) {
          return;
        }

        try {
          const data = await context.client.getJson<Record<string, unknown>>(
            "/twitter/user/check_follow_relationship",
            {
              source_user_name: extractUsername(sourceUserName),
              target_user_name: extractUsername(targetUserName),
            },
          );
          writeResult(context, data);
        } catch (error) {
          handleCommandError(error, context.stderr);
        }
      },
    );

  command
    .command("search")
    .description("Search users by keyword")
    .argument("<query>", "Search query")
    .option("--cursor <cursor>", "Pagination cursor")
    .option("-c, --compact", "Use compact user output")
    .option("-f, --fields <fields>", "Comma-separated fields to keep")
    .action(
      async (query: string, options: ReadOptions, commandInstance: Command) => {
        await handleUserList(
          commandInstance,
          deps,
          "/twitter/user/search",
          {
            query,
            ...(options.cursor ? { cursor: options.cursor } : {}),
          },
          options,
        );
      },
    );

  command
    .command("verified-followers")
    .description("Get verified followers for a user ID")
    .argument("<userId>", "Twitter user ID")
    .option("--cursor <cursor>", "Pagination cursor")
    .option("-c, --compact", "Use compact user output")
    .option("-f, --fields <fields>", "Comma-separated fields to keep")
    .action(
      async (
        userId: string,
        options: ReadOptions,
        commandInstance: Command,
      ) => {
        await handleUserList(
          commandInstance,
          deps,
          "/twitter/user/verifiedFollowers",
          {
            user_id: userId,
            ...(options.cursor ? { cursor: options.cursor } : {}),
          },
          options,
        );
      },
    );

  command
    .command("about")
    .description("Get user profile about metadata")
    .argument("<username>", "Twitter username")
    .action(
      async (
        username: string,
        _options: ReadOptions,
        commandInstance: Command,
      ) => {
        const context = createExecutionContext(commandInstance, deps);
        if (!context) {
          return;
        }

        try {
          const data = await context.client.getJson<Record<string, unknown>>(
            "/twitter/user_about",
            { userName: extractUsername(username) },
          );
          writeResult(context, data);
        } catch (error) {
          handleCommandError(error, context.stderr);
        }
      },
    );

  command
    .command("follow")
    .description("Follow a user by user ID")
    .argument("<userId>", "Twitter user ID")
    .action(
      async (
        userId: string,
        _options: ReadOptions,
        commandInstance: Command,
      ) => {
        const context = createExecutionContext(commandInstance, deps);
        if (!context) {
          return;
        }
        const loginCookies = requireLoginCookies(context);
        const proxy = requireProxy(context);
        if (!loginCookies || !proxy) {
          return;
        }
        try {
          const data = await context.client.postJson<Record<string, unknown>>(
            "/twitter/follow_user_v2",
            appendProxy(
              { login_cookies: loginCookies, user_id: userId },
              proxy,
            ),
          );
          writeResult(context, data);
        } catch (error) {
          handleCommandError(error, context.stderr);
        }
      },
    );

  command
    .command("unfollow")
    .description("Unfollow a user by user ID")
    .argument("<userId>", "Twitter user ID")
    .action(
      async (
        userId: string,
        _options: ReadOptions,
        commandInstance: Command,
      ) => {
        const context = createExecutionContext(commandInstance, deps);
        if (!context) {
          return;
        }
        const loginCookies = requireLoginCookies(context);
        const proxy = requireProxy(context);
        if (!loginCookies || !proxy) {
          return;
        }
        try {
          const data = await context.client.postJson<Record<string, unknown>>(
            "/twitter/unfollow_user_v2",
            appendProxy(
              { login_cookies: loginCookies, user_id: userId },
              proxy,
            ),
          );
          writeResult(context, data);
        } catch (error) {
          handleCommandError(error, context.stderr);
        }
      },
    );

  return command;
}

async function handleTweetList(
  commandInstance: Command,
  deps: CommandDependencies,
  path: string,
  query: Record<string, string | number | boolean>,
  options: ReadOptions,
): Promise<void> {
  const context = createExecutionContext(commandInstance, deps);
  if (!context) {
    return;
  }

  try {
    const response = await context.client.getJson<TimelineResponse>(
      path,
      query,
    );
    const limit = parseLimit(options.limit);
    writeResult(
      context,
      selectEnvelope(
        {
          items: (response.tweets ?? []).slice(0, limit),
          itemKey: "tweets",
          hasNextPage: response.has_next_page,
          nextCursor: response.next_cursor,
        },
        Boolean(options.compact),
        "tweet",
        options.fields,
      ),
    );
  } catch (error) {
    handleCommandError(error, context.stderr);
  }
}

async function handleUserList(
  commandInstance: Command,
  deps: CommandDependencies,
  path: string,
  query: Record<string, string | number | boolean>,
  options: ReadOptions,
): Promise<void> {
  const context = createExecutionContext(commandInstance, deps);
  if (!context) {
    return;
  }

  try {
    const response = await context.client.getJson<UsersResponse>(path, query);
    const items =
      response.users ??
      inferUsers(response as UsersResponse & Record<string, unknown>);
    writeResult(
      context,
      selectEnvelope(
        {
          items,
          itemKey: "users",
          hasNextPage: response.has_next_page,
          nextCursor: response.next_cursor,
        },
        Boolean(options.compact),
        "userInfo",
        options.fields,
      ),
    );
  } catch (error) {
    handleCommandError(error, context.stderr);
  }
}

function inferUsers(
  response: UsersResponse & Record<string, unknown>,
): Record<string, unknown>[] {
  for (const key of ["followers", "followings", "data"]) {
    const value = response[key];
    if (Array.isArray(value)) {
      return value.filter(isRecord);
    }
  }
  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
