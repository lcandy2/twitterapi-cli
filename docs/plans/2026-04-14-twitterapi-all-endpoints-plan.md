# TwitterAPI CLI Full Endpoint Coverage Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Expand the CLI from a partial proof-of-concept into a full TwitterAPI.io command-line client covering every endpoint currently listed in the docs navigation.

**Architecture:** Replace the hand-written per-command approach with a data-driven endpoint registry layered on top of a more capable HTTP client. Keep command names stable and explicit, centralize auth/config/body/query handling, and share pagination, field filtering, file upload, and error rendering so new endpoints stay cheap to add.

**Tech Stack:** Node.js 24, TypeScript, pnpm, Commander, tsup, tsx, Vitest, Biome.

---

## Scope

Implement all currently documented endpoints:

- Get Started
  - Introduction
  - Authentication
- User Endpoint
  - Batch Get User Info By UserIds
  - Get User Info
  - Get User TimeLine
  - Get User Last Tweets
  - Get User Followers
  - Get User Followings
  - Get User Mentions
  - Check Follow Relationship
  - Search user by keyword
  - Get User Verified Followers
  - Get User Profile About
- Tweet Endpoint
  - Get Tweets by IDs
  - Get Tweet Replies
  - Get Tweet Replies V2
  - Get Tweet Quotations
  - Get Tweet Retweeters
  - Get Tweet Thread Context
  - Get Article
  - Advanced Search
- List Endpoint
  - Get List Tweet TimeLine
  - Get List Followers
  - Get List Members
- Communities Endpoint
  - Get Community Info By Id
  - Get Community Members
  - Get Community Moderators
  - Get Community Tweets
  - Search Tweets From All Community
- Trend Endpoint
  - Get Trends
- Spaces Endpoint
  - Get Space Detail
- My Endpoint
  - Get My Account Info
- Post & Action Endpoint V2
  - Log in
  - Create/Reply tweet v2
  - Delete Tweet
  - Like Tweet
  - Unlike Tweet
  - Retweet Tweet
  - Bookmark Tweet
  - Unbookmark Tweet
  - Get Bookmarks
  - Follow User
  - Unfollow User
  - Send DM V2
  - Upload media
  - Update Avatar
  - Update Banner
  - Update Profile
- Community Action V2
  - Create Community V2
  - Delete Community V2
  - Join Community V2
  - Leave Community V2
- Webhook/Websocket Filter Rule
  - Add Webhook/Websocket Tweet Filter Rule
  - Get ALL test Webhook/Websocket Tweet Filter Rules
  - Update Webhook/Websocket Tweet Filter Rule
  - Delete Webhook/Websocket Tweet Filter Rule
- Stream Endpoint
  - Add a twitter user to monitor his tweets
  - Remove a user from monitor list
  - Get Users to Monitor Tweet

## Constraints & Preferences

- Keep the CLI JSON-first and script-friendly.
- Preserve stable shell usage; avoid magical output formatting.
- Support both API-key-only flows and login-cookie action flows.
- Use strict TypeScript and keep command implementations small.
- Use TDD for new behavior.
- Prefer shared primitives over one-off command files.
- Keep pagination flags consistent where the API allows it.
- Handle multipart uploads for media/avatar/banner.
- Keep docs honest about endpoint quirks and inconsistencies.

## Progress

### Done

- Existing scaffold created with Commander + TypeScript + pnpm + Vitest + tsup.
- Current CLI already supports:
  - `user info`
  - `user tweets`
  - `tweet search`
  - `auth whoami`
- API docs navigation and endpoint coverage were audited.
- Exact API paths / required params were mapped for the full documented surface.

### In Progress

- Converting the CLI from bespoke handlers to a shared endpoint registry.
- Expanding config/auth support for `login_cookies`, proxy, and multipart flows.

### Blocked

- No hard blocker right now.
- Docs contain some inconsistencies that the CLI must document rather than blindly trust.

## Key Decisions

- Use a **data-driven command registry** instead of writing 40 unrelated handlers by hand.
- Keep command groups close to the docs taxonomy:
  - `user`, `tweet`, `list`, `community`, `trend`, `space`, `my`, `auth`, `action`, `webhook`, `stream`
- Preserve existing commands where possible:
  - `user info`
  - `user tweets`
  - `tweet search`
- Add aliases only when they improve ergonomics without hiding the docs names.
- Put shared request logic in the HTTP client:
  - GET with query
  - JSON body requests
  - DELETE with JSON body
  - multipart form uploads
- Keep field filtering optional and available on read-heavy endpoints only.
- Return API responses mostly as-is unless the CLI is adding value through:
  - compact projection
  - pagination envelope normalization
  - error normalization

## Resolved Questions

- **Should all documented endpoints be implemented?** Yes.
- **Should this stay TypeScript-first?** Yes.
- **Should this be a fresh user-specific version rather than the older wrapper?** Yes.
- **Do we have enough doc coverage to implement the full surface?** Yes, with a few documented inconsistencies called out in code comments and README notes.

## Pending User Asks

- Implement all documented endpoints in the CLI.
- Keep planning explicit and then execute the plan.

## Relevant Files

- `package.json`
- `README.md`
- `src/bin.ts`
- `src/cli.ts`
- `src/core/config.ts`
- `src/http/client.ts`
- `src/output/filtering.ts`
- `src/output/render.ts`
- `src/commands/user.ts`
- `src/commands/tweet.ts`
- `src/commands/auth.ts`
- `tests/cli/app.test.ts`

## Remaining Work

1. Add a richer HTTP client for GET / JSON body / DELETE body / multipart.
2. Add config support for login cookies and proxy defaults.
3. Define endpoint metadata for every documented command.
4. Implement generic command builders for read/action/upload endpoints.
5. Expand tests to cover:
   - command registration
   - root command groups
   - representative GET/POST/PATCH/DELETE/multipart calls
   - config resolution
   - error handling
6. Update README with the full command map and auth model.
7. Run `pnpm check`, `pnpm build`, and live smoke tests.

## Critical Context

Confirmed doc-derived mappings include:

- `GET /twitter/user/batch_info_by_ids`
- `GET /twitter/user/info`
- `GET /twitter/user/tweet_timeline`
- `GET /twitter/user/last_tweets`
- `GET /twitter/user/followers`
- `GET /twitter/user/followings`
- `GET /twitter/user/mentions`
- `GET /twitter/user/check_follow_relationship`
- `GET /twitter/user/search`
- `GET /twitter/user/verifiedFollowers`
- `GET /twitter/user_about`
- `GET /twitter/tweets`
- `GET /twitter/tweet/replies`
- `GET /twitter/tweet/replies/v2`
- `GET /twitter/tweet/quotes`
- `GET /twitter/tweet/retweeters`
- `GET /twitter/tweet/thread_context`
- `GET /twitter/article`
- `GET /twitter/tweet/advanced_search`
- `GET /twitter/list/tweets_timeline`
- `GET /twitter/list/followers`
- `GET /twitter/list/members`
- `GET /twitter/community/info`
- `GET /twitter/community/members`
- `GET /twitter/community/moderators`
- `GET /twitter/community/tweets`
- `GET /twitter/community/get_tweets_from_all_community`
- `GET /twitter/trends`
- `GET /twitter/spaces/detail`
- `GET /oapi/my/info`
- `POST /twitter/user_login_v2`
- `POST /twitter/create_tweet_v2`
- `POST /twitter/delete_tweet_v2`
- `POST /twitter/like_tweet_v2`
- `POST /twitter/unlike_tweet_v2`
- `POST /twitter/retweet_tweet_v2`
- `POST /twitter/bookmark_tweet_v2`
- `POST /twitter/unbookmark_tweet_v2`
- `POST /twitter/bookmarks_v2`
- `POST /twitter/follow_user_v2`
- `POST /twitter/unfollow_user_v2`
- `POST /twitter/send_dm_to_user`
- `POST /twitter/upload_media_v2`
- `PATCH /twitter/update_avatar_v2`
- `PATCH /twitter/update_banner_v2`
- `PATCH /twitter/update_profile_v2`
- `POST /twitter/create_community_v2`
- `POST /twitter/delete_community_v2`
- `POST /twitter/join_community_v2`
- `POST /twitter/leave_community_v2`
- `POST /oapi/tweet_filter/add_rule`
- `GET /oapi/tweet_filter/get_rules`
- `POST /oapi/tweet_filter/update_rule`
- `DELETE /oapi/tweet_filter/delete_rule`
- `POST /oapi/x_user_stream/add_user_to_monitor_tweet`
- `POST /oapi/x_user_stream/remove_user_to_monitor_tweet`
- `GET /oapi/x_user_stream/get_user_to_monitor_tweet`

Important doc quirks:
- `login_cookie` from login is described as v2-only, but some action pages with non-`_v2` paths still require it.
- `upload_media_v2` docs are inconsistent about whether `login_cookies` is optional.
- `update_profile_v2` docs explicitly say `login_cookies` should be base64 encoded.
- Several paginated endpoints may report `has_next_page=true` even when the next page is empty.

## Tools & Patterns

- Commander command groups
- Shared endpoint-definition metadata
- Shared request executors by method/body type
- Shared compact field filtering for user/tweet-like payloads
- Vitest request-shape tests with injected fetch mocks
- Full-suite validation via `pnpm check` and `pnpm build`
