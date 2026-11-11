# Concurro backoffice development

- **Stack:** SvelteKit 3 and Svelte 5 runes. Configuration lives in `vite.config.ts`;
  import `src/lib` as `#lib/…` with explicit file extensions, not `$lib`.
- **Styling:** colors are defined only in `src/lib/styles/tokens.css`, for both themes.
  Components use tokens, never literal colors.
- **Vocabulary:** stages, finding statuses, severities, review decisions and turn outcomes
  must match the Concurro engine (`engine/vocab.py`, `engine/markup.py`,
  `bundle/schemas/*.json` in [concurro](https://github.com/concurro/concurro)). Check
  there before adding or renaming a status.
- **Data:** the app runs on mock data. Route `load` functions use `src/lib/mock/api.ts`;
  new code should go through it rather than importing fixtures directly.
- **Checks:** run `npm run check` and `npm run build` before proposing changes. Verify
  visual changes in light and dark mode.
