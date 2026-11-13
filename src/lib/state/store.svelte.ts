import { credentials } from '#lib/mock/account.ts';
import { ME, MOCK_ACTOR_ID } from '#lib/mock/reference.ts';
import { tasks } from '#lib/mock/tasks.ts';
import type { Command, CredentialRouteId, IssueIntent, IssueRef, Provider, Stage, Task } from '#lib/types.ts';

/** In-browser mock state. Mutations stay local; nothing leaves the page. */
for (const task of tasks) {
    task.sponsorships = { funding: 'org', status: 'confirmed', slots: {
        openai: { sponsor_id: task.sponsor === ME ? String(MOCK_ACTOR_ID) : '84', login: task.sponsor || 'jvoss', status: 'active', epoch: 1 },
        anthropic: { sponsor_id: '84', login: 'jvoss', status: 'active', epoch: 1 }
    }};
    if (task.paused) {
        task.sponsorships.funding = 'contributed';
        task.sponsorships.observations = [
            { request: 'synthetic-native', source: 'native', completed: false, category: null, usage: null, binding: { sponsorship_provider: 'openai', sponsor: String(MOCK_ACTOR_ID), credential_version: 1 } },
            { request: 'synthetic-provider', source: 'provider', completed: true, category: null, usage: { input_tokens: 2, output_tokens: 3 }, binding: { sponsorship_provider: 'anthropic', sponsor: '84', credential_version: 1 } }
        ];
        task.stage = task.paused;
        task.alert = { tone: 'caution', title: 'Awaiting credentials', body: 'Correct the provider credentials, then a writer may retry. There is no organization fallback.' };
    }
}
export const store = $state({ tasks, credentials, issues: [{ owner: 'example-org', repo: 'ledger-core', issue: 501, title: 'Pre-enrollment sponsorship', author: 'jvoss', labels: [], updatedAt: new Date().toISOString(), sponsorships: { funding: 'org', status: 'confirmed', slots: { anthropic: { sponsor_id: '84', login: 'jvoss', status: 'active' } } } } as IssueIntent] });

let seq = 0;
const now = () => new Date().toISOString();

function log(task: Task, text: string) {
	task.timeline.push({ id: `local-${++seq}`, at: now(), kind: 'command', actor: ME, text });
	task.updatedAt = now();
}

function move(task: Task, stage: Stage, title: string, body: string, tone: Task['alert']['tone'] = 'note') {
	task.stage = stage;
	if (!['blocked', 'stopped', 'awaiting_credentials', 'budget_exhausted', 'escalated', 'rejected', 'closed'].includes(stage)) task.atStage = stage;
	task.alert = { tone, title, body };
}

/** Applies a writer command to local mock state and returns the toast text. */
export function runCommand(issue: IssueRef, command: Command, arg = ''): string {
    const item = [...store.tasks, ...store.issues].find((t) => t.owner === issue.owner && t.repo === issue.repo && t.issue === issue.issue);
    if (!item) throw new Error('Issue is not visible.');
    if (command === 'sponsor' || command === 'withdraw') {
        if (!['openai', 'anthropic'].includes(arg)) return 'Usage: /concurro sponsor openai | anthropic';
        const provider = arg as Provider;
        item.sponsorships ??= { funding: 'org', status: 'confirmed', slots: {} };
        const old = item.sponsorships.slots[provider];
        if (command === 'sponsor') item.sponsorships.slots[provider] = { sponsor_id: String(MOCK_ACTOR_ID), login: ME, status: 'active', epoch: (old?.epoch ?? 0) + 1 };
        else if (old?.sponsor_id === String(MOCK_ACTOR_ID)) item.sponsorships.slots[provider] = { sponsor_id: null, status: 'withdrawn', epoch: (old.epoch ?? 0) + 1 };
        return `Posted /concurro ${command} ${provider} for @${ME}. Funding follows the issue’s configured policy.`;
    }
    const task = store.tasks.find((t) => t === item);
    if (!task) throw new Error('This demo issue is not enrolled.');
	const ref = `${task.repo}#${task.issue}`;
	switch (command) {
		case 'start':
			log(task, '`/concurro start`');
			move(task, 'intake', 'Intake assessment is queued', 'Triage will pick this task up shortly.');
			return `Started ${ref}`;
		case 'approve':
			log(task, `\`/concurro approve ${arg}\``);
			task.approvedPlanId = arg;
			move(task, 'implement', 'Implementation is queued', `Plan ${arg} was approved by ${ME}. The implementer starts on the next free runner.`);
			return `Approved plan ${arg}`;
		case 'retry':
			log(task, arg ? `\`/concurro retry\` with feedback: “${arg}”` : '`/concurro retry`');
			move(task, task.atStage, 'Retry is queued', 'The last stage will run again. Design approvals are preserved.');
			task.paused = undefined;
			return `Retry queued for ${ref}`;
		case 'resume':
			log(task, '`/concurro resume`');
			task.paused = undefined;
			task.pauseReason = undefined;
			move(task, task.atStage, 'Resumed', 'The task adopted current settings and continues from where it stopped. Completed work and spent budgets are preserved.', 'tip');
			return `Resumed ${ref}`;
		case 'stop':
			log(task, '`/concurro stop`');
			move(task, 'stopped', `Stopped by ${ME}`, 'Run `/concurro resume` to continue from where it stopped.', 'warning');
			return `Stopped ${ref}`;
		case 'invalidate':
			log(task, '`/concurro invalidate`');
			Object.assign(task, { plans: [], designReview: [], rounds: [], findings: [], approvedPlanId: undefined, paused: undefined });
			move(task, 'intake', 'Invalidated: assessment restarts', 'Plans, design approvals and review state were discarded. Spent budgets are kept.', 'warning');
			return `Invalidated ${ref}`;

	}
}

export function saveCredential(id: CredentialRouteId, secret: string) {
	const route = store.credentials.find((c) => c.id === id)!;
	if (!route.registrationAvailable) throw new Error('Subscription registration is not available.');
	route.status = 'valid';
	route.fingerprint = 'sha256:mock-' + secret.length;
	route.lastValidated = now();
	route.note = undefined;
}

export function revokeCredential(id: CredentialRouteId) {
	const route = store.credentials.find((c) => c.id === id)!;
	route.status = 'revoked';
	route.note = 'Stored personal credential revoked. Current org-paid calls are unaffected.';
}
