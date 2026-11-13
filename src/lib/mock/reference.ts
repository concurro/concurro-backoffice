import type { ModelProfile, RosterEntry, Target, User } from '#lib/types.ts';

export const ME = 'mkeller';

export const users: User[] = [
	{ login: 'mkeller', name: 'Mara Keller', writer: true },
	{ login: 'jvoss', name: 'Jonas Voss', writer: true },
	{ login: 'tnakata', name: 'Tomo Nakata', writer: true },
	{ login: 'odalby', name: 'Odile Dalby', writer: false },
	{ login: 'rpike', name: 'Ren Pike', writer: false }
];

export const profiles: ModelProfile[] = [
	{ name: 'opus55-high', provider: 'anthropic', model: 'claude-opus-5-5', effort: 'high' },
	{ name: 'sol61-high', provider: 'openai', model: 'gpt-6.1-sol', effort: 'high' },
	{ name: 'sol61-medium', provider: 'openai', model: 'gpt-6.1-sol', effort: 'medium' }
];

export function profile(name: string): ModelProfile {
	return profiles.find((p) => p.name === name) ?? profiles[0];
}

const roster = (
	triage: string,
	planner: string,
	planReviewers: [string, string],
	implementer: string,
	prReviewers: [string, string]
): RosterEntry[] => [
	{ role: 'triage', agent: 'triage', profile: triage },
	{ role: 'planner', agent: 'planner', profile: planner },
	{ role: 'plan_reviewer', agent: 'plan-reviewer-a', profile: planReviewers[0] },
	{ role: 'plan_reviewer', agent: 'plan-reviewer-b', profile: planReviewers[1] },
	{ role: 'implementer', agent: 'implementer', profile: implementer },
	{ role: 'pr_reviewer', agent: 'pr-reviewer-a', profile: prReviewers[0] },
	{ role: 'pr_reviewer', agent: 'pr-reviewer-b', profile: prReviewers[1] }
];

const config = (t: { owner: string; repo: string; fork: string; mode: string; calls: number }) => `target:
  upstream: ${t.owner}/${t.repo}
  fork: ${t.fork}
  default_branch: main
  mode: ${t.mode}

roles:
  triage:         { profile: sol61-medium }
  planner:        { profile: opus55-high }
  plan_reviewers:
    - { agent: plan-reviewer-a, profile: sol61-high }
    - { agent: plan-reviewer-b, profile: opus55-high }
  implementer:    { profile: opus55-high }
  pr_reviewers:
    - { agent: pr-reviewer-a, profile: sol61-high }
    - { agent: pr-reviewer-b, profile: opus55-high }

budgets:
  model_calls: ${t.calls}
  fix_rounds: 4
  plan_revisions: 3

readiness:
  require_ci: true
  required_checks: [build, test, lint]
  approvals: all_reviewers

enrollment:
  label: concurro
  writers_only_commands: true
`;

const base = [
	{
		owner: 'example-org',
		repo: 'ledger-core',
		fork: 'concurro-bot/ledger-core',
		description: 'Double-entry ledger engine with multi-currency postings.',
		mode: 'manual' as const,
		calls: 48,
		roster: roster('sol61-medium', 'opus55-high', ['sol61-high', 'opus55-high'], 'opus55-high', [
			'sol61-high',
			'opus55-high'
		])
	},
	{
		owner: 'example-org',
		repo: 'tidepool',
		fork: 'concurro-bot/tidepool',
		description: 'Durable job queue with at-least-once delivery.',
		mode: 'autonomous' as const,
		calls: 40,
		roster: roster('sol61-medium', 'sol61-high', ['sol61-high', 'opus55-high'], 'sol61-high', [
			'opus55-high',
			'sol61-medium'
		])
	},
	{
		owner: 'sample-labs',
		repo: 'atlas-cli',
		fork: 'concurro-bot/atlas-cli',
		description: 'Command-line client for the Atlas deployment API.',
		mode: 'manual' as const,
		calls: 32,
		roster: roster('sol61-medium', 'opus55-high', ['opus55-high', 'sol61-high'], 'opus55-high', [
			'opus55-high',
			'sol61-high'
		])
	}
];

export const targets: Target[] = base.map(({ calls, ...t }) => ({
	writer: users.find((u) => u.login === ME)!.writer,
	...t,
	defaultBranch: 'main',
	config: config({ ...t, calls })
}));
