# Concurro backoffice

Web frontend for [Concurro](https://github.com/concurro/concurro): GitHub sign-in, your own
provider credentials, a helicopter view of targets, issues and pull requests, task commands
and run diagnostics. The planned API surface is in Concurro's
[backoffice API proposal](https://github.com/concurro/concurro/blob/main/docs/proposals/backoffice-api.md).

It talks to the backoffice API in [`concurro/backoffice`](https://github.com/concurro/concurro/tree/main/backoffice)
and is served beside it at `https://<host>/concurro/`. With `VITE_CONCURRO_DATA=mock` it runs on the original
in-browser fixtures instead, with no backend (commands and credential changes stay local; a reload
resets them).

Retry can grant 1–999 extra plan revisions when the allowance is exhausted. Leaving the field
empty posts an ordinary retry. A successful command response confirms that the comment was
posted; the task processes it asynchronously.

All data goes through `src/lib/api/` (`live.ts` or `mock.ts`, chosen in `mode.ts`); only the
styleguide reads fixtures directly. Links go through `taskHref`/`targetHref` or `withBase` (`src/lib/paths.ts`),
because the app is served under the `/concurro` base path.

## Issue loading

Issue pages fetch a lightweight summary before loading the selected phase, timeline and
live PR/CI data independently. Unvisited phases do not fetch report bodies. Returning to
an issue reuses cached content; entries older than ten seconds refresh in the background.
Commands and account changes clear the cache. Each failed section has its own retry.

The summary retains current-plan identity and phase-presence metadata, so the stepper and
commands do not depend on historical bodies. Revision changes refresh the summary before
new phase data is displayed. CI and diff counts remain unavailable until their reads finish.
This web version requires the API's `/sections/{section}` endpoint; deploy the API first.

## Run

```bash
npm install
npm run dev:mock   # fixtures, no backend
npm run dev        # proxies /concurro/api and /concurro/auth to the backoffice API
```

`npm run dev` expects the backoffice API at `http://127.0.0.1:8788` (override with `CONCURRO_API`).
The app is served under `/concurro`; `CONCURRO_BASE=` serves it at the root.

`npm test` checks navigation-cache behavior. `npm run check` type-checks the project. `npm run build` produces the static build;
`npm run build:mock` builds the fixture version.

## Release

CI type-checks and builds the [image](Dockerfile) (the static build behind Caddy on port 8080) and
publishes it for every `main` commit as `ghcr.io/concurro/backoffice-web:<commit SHA>`. Deploy a
commit with `bash deploy/deploy.sh web FULL_COMMIT_SHA` from
[concurro](https://github.com/concurro/concurro/blob/main/gateway/README.md#releases).

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

The Runner tab loads the selected turn's real Actions run attempts and jobs from the backoffice
API at `/turns/{turn-id}/runs`. Run details remain unavailable if that endpoint is absent. Historical
dispatches are distinguished from confirmed runner assignments. Missing run history, job
details, token counts and incomplete token totals display as unavailable; a successful turn
does not imply that its shared workflow job has ended. Token metering awaits the provider
sponsorship usage projection.

## Layout

Sidebar targets are grouped by owner with indented repository links. Long names wrap;
collapsed links retain their full `owner/repository` labels and tooltips.

| Path | Contents |
| ---- | ---- |
| `src/lib/styles/tokens.css` | Design tokens for both themes; the only place colors are defined |
| `src/lib/styles/base.css` | Reset, element defaults and tone utilities |
| `src/lib/types.ts` | Domain types |
| `src/lib/meta.ts` | Label, tone and icon for every status |
| `src/lib/api/` | Data access: the API client (`live.ts`), the fixture adapter (`mock.ts`) and session state |
| `src/lib/mock/` | Fixtures and `api.ts`, which serves them with an artificial delay |
| `src/lib/state/` | Mock store, theme, toasts and shell state |
| `src/lib/components/` | Shared components; `task/` holds the task detail panels |
| `src/routes/` | One folder per screen; `load` functions return promises or cached resources so skeletons show |

Built with SvelteKit 3 and Svelte 5 runes. SvelteKit 3 reads its configuration from
`vite.config.ts` and imports `src/lib` as `#lib/…` with file extensions.

The API can persist issue metadata and lightweight checkpoint summaries locally. When it returns
an older snapshot during a background refresh, the page shows its observation time and checks
for completion without hiding the saved content. Refresh failures remain visible with a retry
action. Fixture mode and APIs without cache metadata retain their existing behavior.

Targets and their task details require write, maintain or admin permission on the upstream
repository. Fork write permission is not required. The API enforces this for direct URLs as
well; command controls follow the returned writer permission.
