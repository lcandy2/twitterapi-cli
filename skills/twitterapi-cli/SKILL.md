---
name: twitterapi-cli
description: Use when the user wants Twitter/X data from TwitterAPI.io via this repo's TypeScript CLI. Covers setup, config loading, user info, user tweets, tweet search, compact output, field filtering, and pagination flags. Use this whenever the task involves querying TwitterAPI.io from the command line or from automation.
version: 0.1.0
license: MIT
homepage: https://github.com/lcandy2/twitterapi-cli
---

# TwitterAPI CLI

This skill is for the TypeScript CLI in this repository.

## What it covers

- install and local setup
- config loading from `~/.twitterapi/config.json`
- `user info`
- `user tweets`
- `tweet search`
- compact output
- custom field filtering
- cursor-based pagination passthrough

## Prerequisites

- Node.js 24+
- pnpm 10+
- TwitterAPI.io API key

## Install

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
  "timeout": 30
}
```

`timeout` is in seconds.

## Commands

### User info

```bash
pnpm dev user info elonmusk
pnpm dev user info elonmusk --compact
pnpm dev user info elonmusk --fields id,userName,name,followers
```

### User tweets

```bash
pnpm dev user tweets elonmusk --limit 5
pnpm dev user tweets elonmusk --limit 5 --compact
pnpm dev user tweets elonmusk --limit 5 --fields id,text,createdAt
pnpm dev user tweets elonmusk --cursor '<cursor>'
pnpm dev user tweets elonmusk --include-replies
```

### Tweet search

```bash
pnpm dev tweet search "openai" --limit 5
pnpm dev tweet search "openai" --limit 5 --compact
pnpm dev tweet search "openai" --limit 5 --fields id,text,createdAt
pnpm dev tweet search "openai" --query-type Top
pnpm dev tweet search "openai" --cursor '<cursor>'
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

Current paginated commands expose cursor passthrough:

- `user tweets --cursor <cursor>`
- `tweet search --cursor <cursor>`

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
pnpm dev user info elonmusk --compact
```

## Repo notes

- Entry point: `src/bin.ts`
- Root command builder: `src/cli.ts`
- User commands: `src/commands/user.ts`
- Tweet commands: `src/commands/tweet.ts`
- HTTP client: `src/http/client.ts`
- Filtering: `src/output/filtering.ts`
- Rendering: `src/output/render.ts`

## Current limitations

- no `followers` / `following` commands yet
- no `tweet replies` / `quotes` / `retweeters` / `thread` yet
- no `--all` multi-page fetch loop yet
- JSONL support is not fully specialized for multi-item streaming yet
