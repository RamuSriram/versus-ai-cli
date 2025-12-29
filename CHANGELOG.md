# Changelog

## 0.1.2

- Added demo GIF to README (cropped for cleaner display).
- **UX improvement:** Added real-time progress status messages ("Reading local docs for curl...", "Querying gemini...") during comparisons.
- Centralized default model names in `src/backends/defaults.js` for easier maintenance.

## 0.1.1

- Published to npm as `@ramusriram/versus`.
- Added npm version, license, and Node.js version badges to README.
- Added package metadata: `author`, `repository`, `homepage`, `bugs` fields.
- Added CLI integration test with mock backend.

## 0.1.0

Initial public release.

- Main compare command: `versus <left> <right>` (with backends: `auto|openai|gemini|ollama|mock`).
- Markdown output is **rendered in the terminal by default** (TTY only) for readability.
  - Use `--raw` or `--format markdown` to print raw Markdown.
  - Use `--format json` for machine-readable output.
- Added `versus prompt <left> <right>` to view the full generated LLM prompt (opens a pager by default; optional `--editor` / `--stdout`).
- Improved mock backend prompt preview: truncates at word boundaries (no mid-word cuts) and points users to `versus prompt`.
- CLI flag parsing supports both `--flag value` and `--flag=value` (e.g. `--backend=gemini`).
- Added an animated loading indicator (spinner) for long operations.
- Added a cached-response notice when output comes from the local cache.
- Added `--color auto|always|never` (alias: `--no-color`) and improved terminal Markdown rendering for more consistent visuals across terminal themes.
- Improved Gemini/OpenAI network error hints (includes a WSL DNS workaround for `fetch failed`).
- Added GitHub Actions CI workflow running tests on Node 20/22.
