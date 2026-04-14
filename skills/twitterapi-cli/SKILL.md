---
name: twitterapi-cli
description: Use when the user wants Twitter/X data from TwitterAPI.io via the published TypeScript CLI package. Covers install via npx/npm, config loading, full endpoint coverage, compact output, field filtering, and pagination flags. Use this whenever the task involves querying TwitterAPI.io from the command line or from automation.
version: 0.1.0
license: MIT
homepage: https://github.com/lcandy2/twitterapi-cli
tags: [twitter, x, twitterapi, twitterapiio, cli, typescript, nodejs, api, social-media, automation]
keywords: [twitter search, x search, twitter user info, twitter user tweets, tweet search, twitterapi.io, command line, field filtering, pagination]
---

# TwitterAPI CLI

This skill is for the published TypeScript CLI package and the source repo behind it.

## What it covers

- install and local setup
- config loading from `~/.twitterapi/config.json`
- full documented TwitterAPI.io endpoint coverage
- compact output
- custom field filtering
- cursor-based pagination passthrough

## Prerequisites

- Node.js 24+
- pnpm 10+
- TwitterAPI.io API key

## Install

Public package:

```bash
npx twitterapi-cli --help
```

Or install globally:

```bash
npm install -g twitterapi-cli
```

From the repo root:

```bash
pnpm install
pnpm build
```

Development mode:

```bash
pnpm dev -- --help
```

Built CLI:

```bash
./dist/bin.js --help
```

## Config resolution order

The CLI loads config in this order:

1. command flags
2. environment variables
3. `~/.twitterapi/config.json`
4. built-in defaults

### Supported environment variables

- `TWITTERAPI_KEY`
- `TWITTERAPI_BASE_URL`
- `TWITTERAPI_TIMEOUT_MS`
- `TWITTERAPI_PROXY`
- `TWITTERAPI_LOGIN_COOKIES`

### Config file

Path:

```text
~/.twitterapi/config.json
```

Example:

```json
{
  "api_key": "your-api-key",
  "base_url": "https://api.twitterapi.io",
  "timeout": 30,
  "proxy": "http://user:pass@host:port",
  "login_cookies": "base64-or-raw-cookie-string"
}
```

`timeout` is in seconds.

## Commands

### Common commands

```bash
npx twitterapi-cli user info elonmusk --compact
npx twitterapi-cli user followers elonmusk --page-size 50 --compact
npx twitterapi-cli tweet search "openai" --limit 5 --compact
npx twitterapi-cli trend get 1 --count 30
npx twitterapi-cli my info
```

## Output behavior

Default output is pretty JSON.

Global flags:

```bash
--json
--jsonl
--api-key <key>
--base-url <url>
--timeout <ms>
```

Notes:

- `--jsonl` is mainly useful for downstream automation, though current list commands still emit one object containing metadata and items.
- `--compact` uses repo-defined compact presets.
- `--fields` wins over `--compact`.

## Pagination behavior

Current paginated commands expose cursor passthrough across multiple read commands, including:

- `user timeline --cursor <cursor>`
- `user tweets --cursor <cursor>`
- `user followers --cursor <cursor>`
- `user following --cursor <cursor>`
- `user mentions --cursor <cursor>`
- `tweet search --cursor <cursor>`
- `tweet replies --cursor <cursor>`
- `tweet replies-v2 --cursor <cursor>`
- `tweet quotes --cursor <cursor>`
- `tweet retweeters --cursor <cursor>`
- `tweet thread --cursor <cursor>`
- `list timeline --cursor <cursor>`
- `list followers --cursor <cursor>`
- `list members --cursor <cursor>`
- `community members --cursor <cursor>`
- `community moderators --cursor <cursor>`
- `community tweets --cursor <cursor>`
- `community search --cursor <cursor>`

Responses include:

- `has_next_page`
- `next_cursor`

## Verification

Run:

```bash
pnpm check
pnpm build
```

Try a real call:

```bash
npx twitterapi-cli user info elonmusk --compact
```

## Repo notes

- Entry point: `src/bin.ts`
- Root command builder: `src/cli.ts`
- Shared command helpers: `src/commands/shared.ts`
- User commands: `src/commands/user.ts`
- Tweet commands: `src/commands/tweet.ts`
- List/community/trend/space/my/auth/dm/media/profile/webhook/stream commands under `src/commands/`
- HTTP client: `src/http/client.ts`
- Filtering: `src/output/filtering.ts`
- Rendering: `src/output/render.ts`

## Current limitations

- not every mutating endpoint has been live-fired against a real account
- no `--all` multi-page fetch loop yet
- JSONL support is not fully specialized for multi-item streaming yet
