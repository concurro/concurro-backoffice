import type { ActionsRun, ActivityItem, CredentialRoute, UsageRow } from '#lib/types.ts';
import { ago, D, H } from './time';

export const credentials: CredentialRoute[] = [
	{
		id: 'anthropic_api',
		label: 'Anthropic API key',
		provider: 'anthropic',
		kind: 'API key',
		status: 'valid',
		fingerprint: 'sk-ant-…9f3a',
		lastValidated: ago(3 * H),
		lastUsed: ago(14), route: 'anthropic-api-key', models: ['claude-opus-5-5'], registrationAvailable: true
	},
	{ id: 'claude_subscription', label: 'Claude subscription', provider: 'anthropic', kind: 'Subscription', status: 'missing', route: 'claude-subscription', registrationAvailable: true, note: 'Sign in locally with the CLI, then paste the token. Validation uses your provider usage.' },
	{
		id: 'openai_api',
		label: 'OpenAI API key',
		provider: 'openai',
		kind: 'API key',
		status: 'exhausted', route: 'openai-api-key', models: ['gpt-6.1-sol'], registrationAvailable: true,
		fingerprint: 'sk-…41d7',
		lastValidated: ago(5 * H),
		lastUsed: ago(5 * H),
		note: 'Synthetic quota status. Each task follows its configured funding policy.'
	},
	{
		id: 'chatgpt_subscription', route: 'chatgpt-subscription', registrationAvailable: true,
		label: 'ChatGPT subscription',
		provider: 'openai',
		kind: 'Subscription',
		status: 'missing'
	}
];

/** Tokens (thousands) by sponsored task and model profile, last 7 days. */
export const usage: UsageRow[] = [
	{ task: 'ledger-core#412', href: '/tasks/example-org/ledger-core/412', byProfile: { 'opus55-high': 2140, 'sol61-high': 610, 'sol61-medium': 38 } },
	{ task: 'tidepool#73', href: '/tasks/example-org/tidepool/73', byProfile: { 'opus55-high': 420, 'sol61-high': 1380, 'sol61-medium': 265 } },
	{ task: 'tidepool#88', href: '/tasks/example-org/tidepool/88', byProfile: { 'opus55-high': 190, 'sol61-high': 760, 'sol61-medium': 31 } },
	{ task: 'tidepool#79', href: '/tasks/example-org/tidepool/79', byProfile: { 'opus55-high': 160, 'sol61-high': 540, 'sol61-medium': 29 } },
	{ task: 'ledger-core#365', href: '/tasks/example-org/ledger-core/365', byProfile: { 'opus55-high': 610, 'sol61-high': 205, 'sol61-medium': 22 } },
	{ task: 'ledger-core#431', href: '/tasks/example-org/ledger-core/431', byProfile: { 'sol61-medium': 54 } }
];

const t = (owner: string, repo: string, issue: number) => ({ owner, repo, issue });

export const activity: ActivityItem[] = [
	{ id: 'a1', at: ago(3), actor: 'triage', text: 'started intake assessment', task: t('example-org', 'ledger-core', 440) },
	{ id: 'a2', at: ago(4), actor: 'concurro', text: 'is publishing the implementation', task: t('sample-labs', 'atlas-cli', 147) },
	{ id: 'a3', at: ago(11), actor: 'implementer', text: 'started implementation turn 9', task: t('example-org', 'tidepool', 88) },
	{ id: 'a4', at: ago(14), actor: 'implementer', text: 'replied on finding F-4', task: t('example-org', 'ledger-core', 412) },
	{ id: 'a5', at: ago(40), actor: 'plan-reviewer-a', text: 'approved plan v1', task: t('example-org', 'tidepool', 91), tone: 'success' },
	{ id: 'a6', at: ago(2 * H), actor: 'CI', text: 'failed on head 2ab77c4', task: t('example-org', 'tidepool', 73), tone: 'danger' },
	{ id: 'a7', at: ago(3 * H), actor: 'pr-reviewer-b', text: 'requested changes and raised F-6', task: t('example-org', 'ledger-core', 412), tone: 'warning' },
	{ id: 'a8', at: ago(4 * H), actor: 'plan-reviewer-b', text: 'approved plan v2; awaiting writer approval', task: t('example-org', 'ledger-core', 398), tone: 'success' },
	{ id: 'a9', at: ago(5 * H), actor: 'concurro', text: 'paused the task: awaiting credentials', task: t('example-org', 'tidepool', 79), tone: 'danger' },
	{ id: 'a10', at: ago(6 * H), actor: 'triage', text: 'asked a clarifying question', task: t('example-org', 'ledger-core', 431), tone: 'warning' },
	{ id: 'a11', at: ago(1 * D), actor: 'concurro', text: 'marked pull request #402 ready for humans', task: t('example-org', 'ledger-core', 377), tone: 'success' },
	{ id: 'a12', at: ago(1 * D), actor: 'concurro', text: 'escalated: fix rounds exhausted', task: t('sample-labs', 'atlas-cli', 152), tone: 'danger' }
];

const statuses: ActionsRun['status'][] = ['in_progress', 'success', 'success', 'failure', 'success', 'cancelled', 'success', 'success', 'queued', 'success'];
const runTitles = [
	'implement · implementer · turn',
	'review · pr-reviewer-b · turn',
	'review · pr-reviewer-a · turn',
	'implement · implementer · turn',
	'plan_qc · plan-reviewer-b · turn',
	'implement · implementer · turn',
	'plan · planner · turn',
	'intake · triage · turn',
	'plan_qc · plan-reviewer-a · turn',
	'review · pr-reviewer-a · turn'
];

export function runsFor(target: { owner: string; repo: string }, issues: number[]): ActionsRun[] {
	if (!issues.length) return [];
	return statuses.map((status, i) => {
		const turn = 23 - i * 2;
		const issue = issues[i % issues.length];
		return {
			id: 9_417_730_521 - i * 1_327,
			attempt: 1,
			title: `${runTitles[i]} ${Math.max(turn, 1)}`,
			status,
			association: 'assigned' as const,
			task: { owner: target.owner, repo: target.repo, issue },
			issue,
			turn: Math.max(turn, 1),
			startedAt: ago(11 + i * 47),
			durationS: status === 'queued' ? 0 : 140 + ((i * 263) % 1500)
		};
	});
}
