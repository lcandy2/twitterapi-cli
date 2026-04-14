# TwitterAPI CLI

TypeScript-first CLI for TwitterAPI.io.

## Principles

- JSON-first output
- strict TypeScript
- stable command contracts
- latest Node.js LTS baseline
- clear split between public read endpoints and authenticated write endpoints

## Current commands

### User

- `twitterapi user info <username>`
- `twitterapi user tweets <username>`

### Tweet

- `twitterapi tweet search <query>`

## Auth/config

The CLI loads configuration in this order:

1. command flags
2. environment variables
3. `~/.twitterapi/config.json`
4. built-in defaults

Supported env vars:

- `TWITTERAPI_KEY`
- `TWITTERAPI_BASE_URL`
- `TWITTERAPI_TIMEOUT_MS`

Example `~/.twitterapi/config.json`:

```json
{
  "api_key": "your-api-key",
  "base_url": "https://api.twitterapi.io",
  "timeout": 30
}
```

## Examples

```bash
pnpm dev user info elonmusk --compact
pnpm dev user info elonmusk --fields id,userName,name,followers
pnpm dev user tweets elonmusk --limit 5 --compact
pnpm dev tweet search "openai" --limit 5 --compact
```

## Scripts

- `pnpm dev -- --help`
- `pnpm build`
- `pnpm test`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm check`

## Status

Implemented:

- real HTTP client
- config file loading
- `user info`
- `user tweets`
- `tweet search`
- compact field filtering
- custom `--fields`
- basic cursor passthrough for paginated endpoints

## Installable skill

This repo also ships a distributable skill under:

```text
skills/twitterapi-cli/
```
