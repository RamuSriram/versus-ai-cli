# Versus CLI (`versus`)

Compare two Linux commands or concepts (A vs B) from inside your terminal, grounded in your machine’s local documentation (man pages, `--help`, `info`) and summarized by an LLM backend.

![CI](https://github.com/RamuSriram/versus-ai-cli/actions/workflows/ci.yml/badge.svg)

## Demo

```bash
versus nano vim
versus curl wget --backend gemini
versus "git pull" "git fetch" --level beginner
```

## Why this exists

When you’re learning Linux, you constantly ask:
“What’s the difference between X and Y?”

Versus answers that in a structured way, using **local docs as grounding** so the model is less likely to hallucinate.

## Features

* **Grounded comparisons** using `man`, `--help`, and `info` (best-effort)
* **Multiple backends:** `gemini`, `openai`, `ollama`, `mock`
* **Markdown rendering in terminal** by default (TTY). Use `--raw` for source markdown
* **TTL cache** to reduce repeated API calls and speed up repeat runs
* **Prompt inspection:** view the exact prompt without calling any backend
* **CI (GitHub Actions)** runs tests on every push/PR

## Requirements

* Node.js 20+ (matches CI + `engines` in `package.json`)
* Linux/WSL (macOS likely works too if `man` exists)

## Install

### From npm (recommended)

```bash
npm install -g @ramusriram/versus
```

Then run:

```bash
versus nano vim
```

### From source (for development)

```bash
git clone https://github.com/RamuSriram/versus-ai-cli.git
cd versus-ai-cli
npm install
npm link
```

## Quickstart

Backend selection (when `--backend auto`):

* Uses **OpenAI** if `OPENAI_API_KEY` is set
* Else uses **Gemini** if `GEMINI_API_KEY` is set
* Else uses **Ollama** if it’s running locally
* Else falls back to the **Mock** backend

Run without API keys (force mock backend):

```bash
versus nano vim --backend mock
```

Gemini:

```bash
export GEMINI_API_KEY="your_key_here"
versus nano vim --backend gemini
```

OpenAI:

```bash
export OPENAI_API_KEY="your_key_here"
versus nano vim --backend openai
```

Ollama (local):

```bash
# install + run ollama first
versus nano vim --backend ollama --model llama3
```

## Usage

```bash
versus <left> <right> [options]
```

Common options:

* `-b, --backend <backend>`: `auto|openai|gemini|ollama|mock`
* `-m, --model <model>`: provider-specific model name
* `--level <level>`: `beginner|intermediate|advanced`
* `--mode <mode>`: `summary|cheatsheet|table`
* `--format <format>`: `rendered|markdown|json`
* `--raw`: output raw Markdown (disable terminal rendering)
* `--color <mode>`: `auto|always|never` (alias: `--no-color`, also respects `NO_COLOR=1`)
* `--no-cache`: bypass cache
* `--ttl-hours <n>`: cache TTL in hours (default: `720` = 30 days)
* `--max-doc-chars <n>`: max local docs characters per side
* `--no-docs`: don’t read local docs (LLM general knowledge only)
* `-d, --debug`: debug metadata

Tip: flags can be passed as `--backend gemini` or `--backend=gemini`.

## Helpful subcommands

### `versus status` (alias: `versus doctor`)

Checks your environment (Node, `man`, cache path) and backend configuration.

```bash
versus status
versus doctor
```

### `versus cache`

Inspect or clear your local cache:

```bash
versus cache
versus cache --clear
```

### `versus prompt`

View the full prompt that would be sent to the backend (no API call).
Opens in a pager by default to avoid dumping huge text.

```bash
versus prompt nano vim
```

Other modes:

```bash
versus prompt nano vim --stdout
versus prompt nano vim --editor
versus prompt nano vim --output prompt.txt
```

## Configuration

Optional config file locations (first found wins):

* `${XDG_CONFIG_HOME:-~/.config}/versus/config.json`
* `~/.versusrc.json`

Example:

```json
{
  "backend": "gemini",
  "model": "gemini-2.5-flash",
  "level": "intermediate",
  "mode": "summary",
  "ttlHours": 720,
  "maxDocChars": 6000
}
```

## Caching

Cache file:

* `~/.cache/versus/cache.json`

Use `--no-cache` to force a fresh response.

## Privacy / Data

Versus sends your inputs (and, by default, any collected local docs like `man`/`--help`/`info`) to the selected backend.

* Want **zero network calls**: use `--backend mock`
* Want **no local docs included**: use `--no-docs`

## Troubleshooting

### WSL: `Error: fetch failed`

Some WSL setups prefer IPv6 DNS and can cause fetch failures.

```bash
export NODE_OPTIONS="--dns-result-order=ipv4first"
```

## Development

```bash
npm test
```

## License

MIT
