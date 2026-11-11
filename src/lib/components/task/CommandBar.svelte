<script lang="ts">
	import { CircleCheck, HandCoins, Play, RotateCcw, Square, StepForward, Trash2 } from 'lucide-svelte';
	import { bytes } from '#lib/format.ts';
	import { isMerged, MERGED_STAGES, type IconType } from '#lib/meta.ts';
	import { ME } from '#lib/mock/reference.ts';
	import { runCommand } from '#lib/state/store.svelte.ts';
	import { toast } from '#lib/state/toast.svelte.ts';
	import type { Command, Stage, Task } from '#lib/types.ts';
	import Alert from '../Alert.svelte';
	import Button from '../Button.svelte';
	import Modal from '../Modal.svelte';

	let { task }: { task: Task } = $props();

	const FEEDBACK_MAX = 4000;
	const TERMINAL: Stage[] = [...MERGED_STAGES, 'closed', 'rejected', 'stopped'];
	const plan = $derived(task.plans.at(-1));

	interface Spec {
		command: Command;
		label: string;
		icon: IconType;
		enabled: boolean;
		why: string;
		title: string;
		body: string;
		confirm: string;
	}
	const specs = $derived<Spec[]>([
		{ command: 'start', label: 'Start', icon: Play, enabled: task.stage === 'rejected' || task.stage === 'closed', why: 'The task has already started', title: 'Start this task?', body: 'Triage assesses the issue first. Starting spends model-call budget.', confirm: 'Start task' },
		{ command: 'approve', label: 'Approve plan', icon: CircleCheck, enabled: task.stage === 'planned' && !!plan, why: 'No plan is waiting for approval', title: `Approve plan v${plan?.version ?? ''}?`, body: 'Implementation starts on the next free runner and follows this plan exactly. Later plan versions need a new approval.', confirm: 'Approve plan' },
		{ command: 'retry', label: 'Retry', icon: RotateCcw, enabled: ['blocked', 'escalated'].includes(task.stage) || task.pr?.ci === 'failing', why: 'Nothing has failed', title: 'Retry the last stage?', body: 'The last stage runs again. Design approvals are preserved. You can give the agent feedback.', confirm: 'Retry' },
		{ command: 'resume', label: 'Resume', icon: StepForward, enabled: !!task.paused || ['stopped', 'blocked'].includes(task.stage), why: 'The task is not paused or stopped', title: 'Resume this task?', body: 'The task adopts current settings and instructions and continues from where it stopped. Completed work, approvals and spent budgets are preserved.', confirm: 'Resume' },
		{ command: 'stop', label: 'Stop', icon: Square, enabled: !TERMINAL.includes(task.stage), why: 'The task is not running', title: 'Stop this task?', body: 'Running turns are cancelled and no new turns start. You can resume later.', confirm: 'Stop task' },
		{ command: 'sponsor', label: 'Sponsor', icon: HandCoins, enabled: task.sponsor !== ME && !TERMINAL.includes(task.stage), why: task.sponsor === ME ? 'You already sponsor this task' : 'The task is finished', title: 'Sponsor this task?', body: `Model calls for this task will be paid with your provider credentials${task.sponsor ? `, replacing @${task.sponsor}` : ''}. The task pauses if a required credential is missing.`, confirm: 'Sponsor task' },
		{ command: 'invalidate', label: 'Invalidate', icon: Trash2, enabled: !isMerged(task.stage) && task.stage !== 'closed', why: 'The task is finished', title: 'Invalidate this task?', body: '', confirm: 'Invalidate task' }
	]);

	let pending = $state<Command | null>(null);
	let open = $state(false);
	let feedback = $state('');
	const spec = $derived(specs.find((s) => s.command === pending));
	const size = $derived(bytes(feedback));
	const over = $derived(size > FEEDBACK_MAX);
	const arg = $derived(pending === 'approve' ? (plan?.id ?? '') : pending === 'retry' ? feedback.trim() : '');
	const comment = $derived(`/concurro ${pending}${pending === 'approve' ? ` ${arg}` : ''}`);

	function ask(command: Command) {
		pending = command;
		feedback = '';
		open = true;
	}

	function confirm() {
		if (!pending) return;
		toast(runCommand(task, pending, arg), pending === 'invalidate' || pending === 'stop' ? 'warning' : 'success');
		open = false;
	}
</script>

<div class="bar" role="toolbar" aria-label="Task commands">
	<span class="hint"><span class="mono">/concurro</span> commands · writers only</span>
	<div class="buttons">
		{#each specs.filter((s) => s.command !== 'invalidate') as s (s.command)}
			<Button size="sm" variant={s.command === 'approve' && s.enabled ? 'primary' : 'default'} icon={s.icon} disabled={!s.enabled} title={s.enabled ? undefined : s.why} onclick={() => ask(s.command)}>{s.label}</Button>
		{/each}
		<span class="sep" aria-hidden="true"></span>
		{#each specs.filter((s) => s.command === 'invalidate') as s}
			<Button size="sm" variant="danger" icon={s.icon} disabled={!s.enabled} title={s.enabled ? undefined : s.why} onclick={() => ask(s.command)}>{s.label}</Button>
		{/each}
	</div>
</div>

<Modal bind:open title={spec?.title ?? ''} description={spec?.body || undefined}>
	{#if pending === 'invalidate'}
		<Alert tone="caution" title="This discards work and cannot be undone">
			Assessment restarts from intake. All plan versions, design approvals, review rounds and findings for
			<span class="mono">{task.repo}#{task.issue}</span> are discarded. Spent budgets are not refunded and an open pull request is left as is.
		</Alert>
	{:else if pending === 'approve' && plan}
		<dl class="facts">
			<dt>Plan</dt><dd><span class="mono">{plan.id}</span> · v{plan.version}</dd>
			<dt>Summary</dt><dd>{plan.summary}</dd>
			<dt>Budget left</dt><dd class="num">{task.budgets.modelCalls.max - task.budgets.modelCalls.used} model calls</dd>
		</dl>
	{:else if pending === 'retry'}
		<label class="field">
			<span>Feedback for the agent <span class="muted">(optional)</span></span>
			<textarea rows="5" bind:value={feedback} aria-invalid={over} aria-describedby="fb-count" placeholder="What should the agent do differently?"></textarea>
		</label>
		<p id="fb-count" class="count num" class:over>{size.toLocaleString()} / {FEEDBACK_MAX.toLocaleString()} bytes{over ? ' — shorten the feedback to continue' : ''}</p>
	{/if}
	<p class="posts">Posts <code>{comment}</code> as your comment on the issue.</p>
	{#snippet footer()}
		<Button onclick={() => (open = false)}>Cancel</Button>
		<Button variant={pending === 'invalidate' ? 'danger-solid' : 'primary'} disabled={over} onclick={confirm}>{spec?.confirm}</Button>
	{/snippet}
</Modal>

<style>
	.bar {
		position: sticky;
		bottom: 0;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--s-3);
		padding: var(--s-2) var(--s-4);
		margin: 0 calc(-1 * var(--s-2));
		border: 1px solid var(--border-strong);
		border-bottom: 0;
		border-radius: var(--r-lg) var(--r-lg) 0 0;
		background: var(--surface);
		box-shadow: var(--shadow-pop);
	}
	.hint {
		color: var(--text-3);
		font-size: var(--fs-xs);
		white-space: nowrap;
	}
	.buttons {
		display: flex;
		align-items: center;
		gap: var(--s-2);
		overflow-x: auto;
		padding: 2px;
	}
	.sep {
		flex: none;
		width: 1px;
		height: 20px;
		margin: 0 var(--s-1);
		background: var(--border-strong);
	}
	.facts {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: var(--s-1) var(--s-4);
		margin: 0;
		font-size: var(--fs-sm);
	}
	.facts dt {
		color: var(--text-3);
	}
	.facts dd {
		margin: 0;
	}
	.field {
		display: grid;
		gap: var(--s-1);
		font-size: var(--fs-sm);
		font-weight: var(--fw-medium);
	}
	.field .muted {
		font-weight: var(--fw-regular);
	}
	textarea {
		width: 100%;
		padding: var(--s-2);
		border: 1px solid var(--border-strong);
		border-radius: var(--r-md);
		background: var(--surface);
		font-size: var(--fs-sm);
		font-weight: var(--fw-regular);
		resize: vertical;
	}
	textarea[aria-invalid='true'] {
		border-color: var(--danger-solid);
	}
	.count {
		margin-top: var(--s-1);
		color: var(--text-3);
		font-size: var(--fs-xs);
	}
	.count.over {
		color: var(--danger-fg);
	}
	.posts {
		margin-top: var(--s-3);
		color: var(--text-3);
		font-size: var(--fs-xs);
	}
	.posts code {
		padding: 1px 5px;
		border-radius: var(--r-sm);
		background: var(--surface-3);
		color: var(--text);
	}
	@media (max-width: 860px) {
		.hint {
			display: none;
		}
		.bar {
			padding: var(--s-2);
		}
	}
</style>
