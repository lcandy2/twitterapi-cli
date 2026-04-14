# TwitterAPI CLI

TypeScript-first CLI for TwitterAPI.io with stable JSON output and broad endpoint coverage.

## Install

```bash
npm install -g twitterapi-cli
```

Or run without installing:

```bash
npx twitterapi-cli --help
```

## Principles

- JSON-first output
- strict TypeScript
- stable command contracts
- latest Node.js LTS baseline
- clear split between API-key reads and login-cookie actions

## Current command groups

- `user`
- `tweet`
- `list`
- `community`
- `trend`
- `space`
- `my`
- `auth`
- `dm`
- `media`
- `profile`
- `webhook`
- `stream`

## Endpoint coverage

### User

- `twitterapi user batch-info <userIds>`
- `twitterapi user info <username>`
- `twitterapi user timeline <userId>`
- `twitterapi user tweets <username>`
- `twitterapi user followers <username>`
- `twitterapi user following <username>`
- `twitterapi user mentions <username>`
- `twitterapi user relationship <sourceUserName> <targetUserName>`
- `twitterapi user search <query>`
- `twitterapi user verified-followers <userId>`
- `twitterapi user about <username>`
- `twitterapi user follow <userId>`
- `twitterapi user unfollow <userId>`

### Tweet

- `twitterapi tweet get <tweetIds>`
- `twitterapi tweet search <query>`
- `twitterapi tweet replies <tweetId>`
- `twitterapi tweet replies-v2 <tweetId>`
- `twitterapi tweet quotes <tweetId>`
- `twitterapi tweet retweeters <tweetId>`
- `twitterapi tweet thread <tweetId>`
- `twitterapi tweet article <tweetId>`
- `twitterapi tweet create <text>`
- `twitterapi tweet delete <tweetId>`
- `twitterapi tweet like <tweetId>`
- `twitterapi tweet unlike <tweetId>`
- `twitterapi tweet retweet <tweetId>`
- `twitterapi tweet bookmark <tweetId>`
- `twitterapi tweet unbookmark <tweetId>`
- `twitterapi tweet bookmarks`

### List

- `twitterapi list timeline <listId>`
- `twitterapi list followers <listId>`
- `twitterapi list members <listId>`

### Community

- `twitterapi community info <communityId>`
- `twitterapi community members <communityId>`
- `twitterapi community moderators <communityId>`
- `twitterapi community tweets <communityId>`
- `twitterapi community search <query>`
- `twitterapi community create <name> --description "..."`
- `twitterapi community delete <communityId> <communityName>`
- `twitterapi community join <communityId>`
- `twitterapi community leave <communityId>`

### Trend / Space / My

- `twitterapi trend get <woeid>`
- `twitterapi space detail <spaceId>`
- `twitterapi my info`

### Auth / DM / Media / Profile

- `twitterapi auth whoami`
- `twitterapi auth login --user-name <user> --email <email> --password <password> --proxy <proxy>`
- `twitterapi dm send <userId> <text>`
- `twitterapi media upload <filePath>`
- `twitterapi profile update-avatar <filePath>`
- `twitterapi profile update-banner <filePath>`
- `twitterapi profile update --name ... --description ...`

### Webhook / Stream

- `twitterapi webhook add-rule <tag> <value> --interval-seconds <seconds>`
- `twitterapi webhook get-rules`
- `twitterapi webhook update-rule <ruleId> <tag> <value> --interval-seconds <seconds>`
- `twitterapi webhook delete-rule <ruleId>`
- `twitterapi stream add-user <username>`
- `twitterapi stream remove-user <monitorId>`
- `twitterapi stream users`

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
- `TWITTERAPI_PROXY`
- `TWITTERAPI_LOGIN_COOKIES`

Example `~/.twitterapi/config.json`:

```json
{
  "api_key": "***",
  "base_url": "https://api.twitterapi.io",
  "timeout": 30,
  "proxy": "http://user:pass@host:port",
  "login_cookies": "base64-or-raw-cookie-string"
}
```

### API-key-only reads

Most read endpoints only need `x-api-key`.

### Login-cookie action flows

Write/action endpoints generally need both:

- `TWITTERAPI_KEY`
- `TWITTERAPI_LOGIN_COOKIES`
- `TWITTERAPI_PROXY`

Get login cookies with:

```bash
twitterapi --proxy http://user:pass@host:port auth login \
  --user-name your_user \
  --email you@example.com \
  --password '***'
```

## Examples

```bash
pnpm dev user info elonmusk --compact
pnpm dev user followers elonmusk --page-size 50 --compact
pnpm dev tweet search "openai" --limit 5 --compact
pnpm dev tweet get 1911803830911527103,1911803830911527104 --compact
pnpm dev trend get 1 --count 30
pnpm dev my info
pnpm dev --proxy http://user:pass@host:port auth login --user-name foo --email foo@example.com --password '***'
pnpm dev --login-cookies "$TWITTERAPI_LOGIN_COOKIES" --proxy "$TWITTERAPI_PROXY" tweet create "hello from cli"
pnpm dev --login-cookies "$TWITTERAPI_LOGIN_COOKIES" --proxy "$TWITTERAPI_PROXY" media upload ./image.png
```

## Scripts

- `pnpm dev --help`
- `pnpm build`
- `pnpm test`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm check`

## Notes

- Output is always JSON or JSONL.
- Compact field filtering is available on many user/tweet list commands via `--compact` and `--fields`.
- Some TwitterAPI.io endpoints may report `has_next_page=true` even when the next page is empty.
- Free-tier rate limits are strict; back off a few seconds between live smoke tests.
- TwitterAPI.io docs have a few inconsistencies around `login_cookies` and some v2 naming, so the CLI follows the documented API paths directly.

## Installable skill

This repo also ships a distributable skill under:

```text
skills/twitterapi-cli/
```
