# Contributing

Thanks for taking a look at `versus`.

## Local development

```bash
# from the repo root
npm install
npm test

# make the `versus` command available on your PATH
npm link

# try it
versus nano vim --backend mock
```

## Project structure (high level)

- `bin/versus.js` — CLI entry point
- `src/cli.js` — CLI commands, help text, user-facing UX
- `src/engine.js` — orchestration (docs → prompt → cache → backend)
- `src/introspect.js` — collects `man` / `--help` / `info` text
- `src/backends/*` — backend adapters (OpenAI, Gemini, Ollama, mock)
- `src/cache.js` — local JSON cache
- `src/config.js` — loads `~/.config/versus/config.json`

## Commit / PR checklist

- Keep changes small and focused.
- Add or update tests for behavior changes (`npm test`).
- Update `README.md` for user-visible changes.
- Add an entry to `CHANGELOG.md` for anything that affects users.
