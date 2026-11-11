# Concurro backoffice development

- **Stack:** SvelteKit 3 and Svelte 5 runes. Configuration lives in `vite.config.ts`;
  import `src/lib` as `#lib/…` with explicit file extensions, not `$lib`.
- **Styling:** colors are defined only in `src/lib/styles/tokens.css`, for both themes.
  Components use tokens, never literal colors.
- **Vocabulary:** stages, finding statuses, severities, review decisions and turn outcomes
  must match the Concurro engine (`engine/vocab.py`, `engine/markup.py`,
  `bundle/schemas/*.json` in [concurro](https://github.com/concurro/concurro)). Check
  there before adding or renaming a status.
- **Data:** everything goes through `src/lib/api/` (`api` for loads, `actions` for writes), which
  uses the backoffice API or, with `VITE_CONCURRO_DATA=mock`, the fixtures. Response shapes match
  `src/lib/types.ts`; keep both modes working.
- **Links:** the app is served under a base path; build links with `taskHref`, `targetHref` or
  `withBase`, never a bare `/path`.
- **Checks:** run `npm run check` and `npm run build` before proposing changes. Verify
  visual changes in light and dark mode.
