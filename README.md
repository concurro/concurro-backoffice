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

## Run

```bash
npm install
npm run dev:mock   # fixtures, no backend
npm run dev        # proxies /concurro/api and /concurro/auth to the backoffice API
```

`npm run dev` expects the backoffice API at `http://127.0.0.1:8788` (override with `CONCURRO_API`).
The app is served under `/concurro`; `CONCURRO_BASE=` serves it at the root.

`npm run check` type-checks the project. `npm run build` produces the static build;
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
| `/issues/[owner]/[repo]/[issue]` | Provider consent before task enrollment |
| `/tasks/[owner]/[repo]/[issue]/turns/[turn]` | Run diagnostics |
| `/me/credentials` | My credentials |
| `/me/sponsorships` | My sponsorships |
| `/admin` | Operator |
| `/styleguide` | Tokens and components in both themes |

Good starting points: `example-org/ledger-core#412` has the fullest history (three plan
versions, two review rounds, 23 turns with every outcome); issue `/issues/example-org/ledger-core/501`
shows pre-enrollment provider consent; `example-org/ledger-core#398` waits for plan approval; `example-org/tidepool#94` was
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
| `src/lib/api/` | Data access: the API client (`live.ts`), the fixture adapter (`mock.ts`) and session state |
| `src/lib/mock/` | Fixtures and `api.ts`, which serves them with an artificial delay |
| `src/lib/state/` | Mock store, theme, toasts and shell state |
| `src/lib/components/` | Shared components; `task/` holds the task detail panels |
| `src/routes/` | One folder per screen; `load` functions return promises so skeletons show |

Built with SvelteKit 3 and Svelte 5 runes. SvelteKit 3 reads its configuration from
`vite.config.ts` and imports `src/lib` as `#lib/…` with file extensions.

The portal now renders prospective OpenAI/Anthropic sponsorship, including pre-enrollment
issue intent views and caller-only provider commands. Current model calls remain org-funded.
Personal API-key forms support validation, replacement and local revoke; subscription
registration remains unavailable until backend configured-route validators land. Credential
coverage uses configured routes and validated model lists, not a CLI/provider-name guess.
GitHub sign-out reports local completion separately from remote access-token cleanup.
