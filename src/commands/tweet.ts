import { Command } from "commander";

import {
  type CommandDependencies,
  createExecutionContext,
  handleCommandError,
  parseLimit,
  requireLoginCookies,
  requireProxy,
  selectEnvelope,
  writeResult,
} from "./shared.js";
import { extractTweetId, normalizeTweetIds } from "./url-parser.js";

interface TweetReadOptions {
  limit?: string;
  cursor?: string;
  queryType?: "Latest" | "Top" | "Relevance" | "Likes";
  sinceTime?: string;
  untilTime?: string;
  includeReplies?: boolean;
  compact?: boolean;
  fields?: string;
}

interface CreateTweetOptions {
  replyToTweetId?: string;
  attachmentUrl?: string;
  communityId?: string;
  noteTweet?: boolean;
  mediaIds?: string;
}

interface TweetListResponse {
  tweets?: Record<string, unknown>[];
  has_next_page?: boolean;
  next_cursor?: string;
}

export function createTweetCommand(deps: CommandDependencies = {}): Command {
  const command = new Command("tweet").description("Tweet-related commands");

  command
    .command("get")
    .description("Get tweets by IDs")
    .argument("<tweetIds>", "Comma-separated tweet IDs")
    .option("-c, --compact", "Use compact tweet output")
    .option("-f, --fields <fields>", "Comma-separated fields to keep")
    .action(
      async (
        tweetIds: string,
        options: TweetReadOptions,
        commandInstance: Command,
      ) => {
        const context = createExecutionContext(commandInstance, deps);
        if (!context) {
          return;
        }

        try {
          const response = await context.client.getJson<
            Record<string, unknown>[] | { tweets?: Record<string, unknown>[] }
          >("/twitter/tweets", { tweet_ids: normalizeTweetIds(tweetIds) });
          const tweets = Array.isArray(response)
            ? response
            : (response.tweets ?? []);
          writeResult(
            context,
            selectEnvelope(
              {
                items: tweets,
                itemKey: "tweets",
                hasNextPage: undefined,
                nextCursor: undefined,
              },
              Boolean(options.compact),
              "tweet",
              options.fields,
            ),
          );
        } catch (error) {
          handleCommandError(error, context.stderr);
        }
      },
    );

  command
    .command("search")
    .description("Search tweets")
    .argument("<query>", "Search query")
    .option("-l, --limit <number>", "Maximum results", "20")
    .option("--cursor <cursor>", "Pagination cursor")
    .option(
      "--query-type <queryType>",
      "Search ranking: Latest or Top",
      "Latest",
    )
    .option("-c, --compact", "Use compact tweet output")
    .option("-f, --fields <fields>", "Comma-separated fields to keep")
    .action(
      async (
        query: string,
        options: TweetReadOptions,
        commandInstance: Command,
      ) => {
        await handleTweetList(
          commandInstance,
          deps,
          "/twitter/tweet/advanced_search",
          {
            query,
            queryType: options.queryType ?? "Latest",
            ...(options.cursor ? { cursor: options.cursor } : {}),
          },
          options,
        );
      },
    );

  command
    .command("replies")
    .description("Get tweet replies")
    .argument("<tweetId>", "Tweet ID")
    .option("-l, --limit <number>", "Maximum results", "20")
    .option("--cursor <cursor>", "Pagination cursor")
    .option("--since-time <unix>", "Only include replies after this timestamp")
    .option("--until-time <unix>", "Only include replies before this timestamp")
    .option("-c, --compact", "Use compact tweet output")
    .option("-f, --fields <fields>", "Comma-separated fields to keep")
    .action(
      async (
        tweetId: string,
        options: TweetReadOptions,
        commandInstance: Command,
      ) => {
        await handleTweetList(
          commandInstance,
          deps,
          "/twitter/tweet/replies",
          {
            tweetId: extractTweetId(tweetId),
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
    .command("replies-v2")
    .description("Get tweet replies V2")
    .argument("<tweetId>", "Tweet ID")
    .option("-l, --limit <number>", "Maximum results", "20")
    .option("--cursor <cursor>", "Pagination cursor")
    .option(
      "--query-type <queryType>",
      "Reply sort order: Relevance, Latest, or Likes",
      "Relevance",
    )
    .option("-c, --compact", "Use compact tweet output")
    .option("-f, --fields <fields>", "Comma-separated fields to keep")
    .action(
      async (
        tweetId: string,
        options: TweetReadOptions,
        commandInstance: Command,
      ) => {
        await handleTweetList(
          commandInstance,
          deps,
          "/twitter/tweet/replies/v2",
          {
            tweetId: extractTweetId(tweetId),
            queryType: options.queryType ?? "Relevance",
            ...(options.cursor ? { cursor: options.cursor } : {}),
          },
          options,
        );
      },
    );

  command
    .command("quotes")
    .description("Get tweet quotations")
    .argument("<tweetId>", "Tweet ID")
    .option("-l, --limit <number>", "Maximum results", "20")
    .option("--cursor <cursor>", "Pagination cursor")
    .option("--since-time <unix>", "Only include quotes after this timestamp")
    .option("--until-time <unix>", "Only include quotes before this timestamp")
    .option("--include-replies", "Include reply quotes")
    .option("-c, --compact", "Use compact tweet output")
    .option("-f, --fields <fields>", "Comma-separated fields to keep")
    .action(
      async (
        tweetId: string,
        options: TweetReadOptions,
        commandInstance: Command,
      ) => {
        await handleTweetList(
          commandInstance,
          deps,
          "/twitter/tweet/quotes",
          {
            tweetId: extractTweetId(tweetId),
            ...(options.cursor ? { cursor: options.cursor } : {}),
            ...(options.includeReplies ? { includeReplies: true } : {}),
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
    .command("retweeters")
    .description("Get tweet retweeters")
    .argument("<tweetId>", "Tweet ID")
    .option("--cursor <cursor>", "Pagination cursor")
    .option("-c, --compact", "Use compact user output")
    .option("-f, --fields <fields>", "Comma-separated fields to keep")
    .action(
      async (
        tweetId: string,
        options: TweetReadOptions,
        commandInstance: Command,
      ) => {
        const context = createExecutionContext(commandInstance, deps);
        if (!context) {
          return;
        }

        try {
          const response = await context.client.getJson<{
            users?: Record<string, unknown>[];
            has_next_page?: boolean;
            next_cursor?: string;
          }>("/twitter/tweet/retweeters", {
            tweetId: extractTweetId(tweetId),
            ...(options.cursor ? { cursor: options.cursor } : {}),
          });
          writeResult(context, {
            users: response.users ?? [],
            count: response.users?.length ?? 0,
            has_next_page: response.has_next_page ?? false,
            next_cursor: response.next_cursor ?? "",
          });
        } catch (error) {
          handleCommandError(error, context.stderr);
        }
      },
    );

  command
    .command("thread")
    .description("Get tweet thread context")
    .argument("<tweetId>", "Tweet ID")
    .option("-l, --limit <number>", "Maximum results", "20")
    .option("--cursor <cursor>", "Pagination cursor")
    .option("-c, --compact", "Use compact tweet output")
    .option("-f, --fields <fields>", "Comma-separated fields to keep")
    .action(
      async (
        tweetId: string,
        options: TweetReadOptions,
        commandInstance: Command,
      ) => {
        await handleTweetList(
          commandInstance,
          deps,
          "/twitter/tweet/thread_context",
          {
            tweetId: extractTweetId(tweetId),
            ...(options.cursor ? { cursor: options.cursor } : {}),
          },
          options,
        );
      },
    );

  command
    .command("article")
    .description("Get article for a tweet ID")
    .argument("<tweetId>", "Tweet ID")
    .action(
      async (
        tweetId: string,
        _options: TweetReadOptions,
        commandInstance: Command,
      ) => {
        const context = createExecutionContext(commandInstance, deps);
        if (!context) {
          return;
        }

        try {
          const data = await context.client.getJson<Record<string, unknown>>(
            "/twitter/article",
            { tweet_id: extractTweetId(tweetId) },
          );
          writeResult(context, data);
        } catch (error) {
          handleCommandError(error, context.stderr);
        }
      },
    );

  command
    .command("create")
    .description("Create or reply to a tweet")
    .argument("<text>", "Tweet text")
    .option("--reply-to-tweet-id <tweetId>", "Reply target tweet ID")
    .option("--attachment-url <url>", "Quoted tweet URL")
    .option("--community-id <communityId>", "Community ID")
    .option("--note-tweet", "Create as a note tweet")
    .option("--media-ids <ids>", "Comma-separated media IDs")
    .action(
      async (
        text: string,
        options: CreateTweetOptions,
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
          const payload: Record<string, unknown> = {
            login_cookies: loginCookies,
            tweet_text: text,
            proxy,
            ...(options.replyToTweetId
              ? { reply_to_tweet_id: extractTweetId(options.replyToTweetId) }
              : {}),
            ...(options.attachmentUrl
              ? { attachment_url: options.attachmentUrl }
              : {}),
            ...(options.communityId
              ? { community_id: options.communityId }
              : {}),
            ...(options.noteTweet ? { is_note_tweet: true } : {}),
            ...(options.mediaIds
              ? { media_ids: splitCsv(options.mediaIds) }
              : {}),
          };
          const data = await context.client.postJson<Record<string, unknown>>(
            "/twitter/create_tweet_v2",
            payload,
          );
          writeResult(context, data);
        } catch (error) {
          handleCommandError(error, context.stderr);
        }
      },
    );

  for (const [name, path] of [
    ["delete", "/twitter/delete_tweet_v2"],
    ["like", "/twitter/like_tweet_v2"],
    ["unlike", "/twitter/unlike_tweet_v2"],
    ["retweet", "/twitter/retweet_tweet_v2"],
    ["bookmark", "/twitter/bookmark_tweet_v2"],
    ["unbookmark", "/twitter/unbookmark_tweet_v2"],
  ] as const) {
    command
      .command(name)
      .description(`${name[0]?.toUpperCase() ?? ""}${name.slice(1)} a tweet`)
      .argument("<tweetId>", "Tweet ID")
      .action(
        async (
          tweetId: string,
          _options: TweetReadOptions,
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
              path,
              {
                login_cookies: loginCookies,
                tweet_id: extractTweetId(tweetId),
                proxy,
              },
            );
            writeResult(context, data);
          } catch (error) {
            handleCommandError(error, context.stderr);
          }
        },
      );
  }

  command
    .command("bookmarks")
    .description("Get bookmarked tweets")
    .option("--cursor <cursor>", "Pagination cursor")
    .option("--count <number>", "Items per page")
    .option("-l, --limit <number>", "Maximum tweets to return", "20")
    .option("-c, --compact", "Use compact tweet output")
    .option("-f, --fields <fields>", "Comma-separated fields to keep")
    .action(async (options: TweetReadOptions, commandInstance: Command) => {
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
        const response = await context.client.postJson<TweetListResponse>(
          "/twitter/bookmarks_v2",
          {
            login_cookies: loginCookies,
            proxy,
            ...(options.cursor ? { cursor: options.cursor } : {}),
            ...(options.limit ? { count: parseLimit(options.limit) } : {}),
          },
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
    });

  return command;
}

async function handleTweetList(
  commandInstance: Command,
  deps: CommandDependencies,
  path: string,
  query: Record<string, string | number | boolean>,
  options: TweetReadOptions,
): Promise<void> {
  const context = createExecutionContext(commandInstance, deps);
  if (!context) {
    return;
  }

  try {
    const response = await context.client.getJson<TweetListResponse>(
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

function splitCsv(raw: string): string[] {
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}
