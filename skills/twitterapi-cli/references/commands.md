# Command reference

## Root flags

```bash
--json
--jsonl
--api-key <key>
--base-url <url>
--timeout <ms>
```

## User

### Info

```bash
twitterapi user info <username>
```

Options:

```bash
-c, --compact
-f, --fields <fields>
```

### Tweets

```bash
twitterapi user tweets <username>
```

Options:

```bash
-l, --limit <number>
--cursor <cursor>
-r, --include-replies
-c, --compact
-f, --fields <fields>
```

## Tweet

### Search

```bash
twitterapi tweet search <query>
```

Options:

```bash
-l, --limit <number>
--cursor <cursor>
--query-type <Latest|Top>
-c, --compact
-f, --fields <fields>
```
