# Concurro backoffice

Web frontend for [Concurro](https://github.com/concurro/concurro): GitHub sign-in, your own
provider credentials, a helicopter view of targets, issues and pull requests, task commands
and run diagnostics. The planned API surface is in Concurro's
[backoffice API proposal](https://github.com/concurro/concurro/blob/main/docs/proposals/backoffice-api.md).

**Status: mockup.** It runs on mock data only: there is no backend and no GitHub calls.
Commands and credential changes update in-browser state and show a toast; a reload resets
everything. Route `load` functions go through `src/lib/mock/api.ts`, but some components,
pages and `src/lib/state/store.svelte.ts` still import fixtures from `src/lib/mock/`
directly (current user, targets, command state); a real API client has to replace both.

## Run

```bash
npm install
npm run dev
```

`npm run check` type-checks the project and `npm run build` produces a static build.

## Screens

| Route | Screen |
| ---- | ---- |
| `/signin` | Sign-in |
| `/` | Overview |
| `/targets/[owner]/[repo]` | Target: issues, pull requests, Actions runs, configuration |
| `/tasks/[owner]/[repo]/[issue]` | Task detail |
| `/tasks/[owner]/[repo]/[issue]/turns/[turn]` | Run diagnostics |
| `/me/credentials` | My credentials |
| `/me/sponsorships` | My sponsorships |
| `/admin` | Operator |
| `/styleguide` | Tokens and components in both themes |

Good starting points: `example-org/ledger-core#412` has the fullest history (three plan
versions, two review rounds, 23 turns with every outcome); `example-org/tidepool#79` is
paused on credentials; `example-org/ledger-core#398` waits for plan approval; `example-org/tidepool#94` was
merged before handoff. An unknown
issue number, e.g. `/tasks/example-org/ledger-core/1`, shows the error state.

`⌘K` opens the command palette. The user menu holds the theme toggle (light, dark, system).

## Layout

| Path | Contents |
| ---- | ---- |
| `src/lib/styles/tokens.css` | Design tokens for both themes; the only place colors are defined |
| `src/lib/styles/base.css` | Reset, element defaults and tone utilities |
| `src/lib/types.ts` | Domain types |
| `src/lib/meta.ts` | Label, tone and icon for every status |
| `src/lib/mock/` | Fixtures and `api.ts`, which serves them with an artificial delay |
| `src/lib/state/` | Mock store, theme, toasts and shell state |
| `src/lib/components/` | Shared components; `task/` holds the task detail panels |
| `src/routes/` | One folder per screen; `load` functions return promises so skeletons show |

Built with SvelteKit 3 and Svelte 5 runes. SvelteKit 3 reads its configuration from
`vite.config.ts` and imports `src/lib` as `#lib/…` with file extensions.
