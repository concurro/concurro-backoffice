import { credentials } from '#lib/mock/account.ts';
import { ME } from '#lib/mock/reference.ts';
import { tasks } from '#lib/mock/tasks.ts';
import type { Command, CredentialRouteId, Stage, Task } from '#lib/types.ts';

/** In-browser mock state. Mutations stay local; nothing leaves the page. */
export const store = $state({ tasks, credentials });

let seq = 0;
const now = () => new Date().toISOString();

function log(task: Task, text: string) {
	task.timeline.push({ id: `local-${++seq}`, at: now(), kind: 'command', actor: ME, text });
	task.updatedAt = now();
}

function move(task: Task, stage: Stage, title: string, body: string, tone: Task['alert']['tone'] = 'note') {
	task.stage = stage;
	if (!['blocked', 'stopped', 'escalated', 'rejected', 'closed'].includes(stage)) task.atStage = stage;
	task.alert = { tone, title, body };
}

/** Applies a writer command to local mock state and returns the toast text. */
export function runCommand(task: Task, command: Command, arg = ''): string {
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
		case 'sponsor':
			log(task, '`/concurro sponsor`');
			task.sponsor = ME;
			return `You now sponsor ${ref}`;
	}
}

export function saveCredential(id: CredentialRouteId, secret: string) {
	const route = store.credentials.find((c) => c.id === id)!;
	route.status = 'valid';
	route.fingerprint = `${secret.slice(0, 3)}…${secret.slice(-4)}`;
	route.lastValidated = now();
	route.note = undefined;
}

export function revokeCredential(id: CredentialRouteId) {
	const route = store.credentials.find((c) => c.id === id)!;
	route.status = 'revoked';
	route.note = 'Revoked by you. Tasks that need this route will pause.';
}
