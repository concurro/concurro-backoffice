<script lang="ts">
	import { RotateCcw, Square, StepForward } from 'lucide-svelte';
	import type { IconType } from '#lib/meta.ts';
	import { actions, MOCK } from '#lib/api/index.ts';
	import { invalidateAll } from '$app/navigation';
	import { toast } from '#lib/state/toast.svelte.ts';
	import type { ReviewCommand, ReviewTask } from '#lib/types.ts';
	import Button from '../Button.svelte';
	import Modal from '../Modal.svelte';

	/** The commands a standalone pull request review accepts from a writer. */
	let { task }: { task: ReviewTask } = $props();

	// The engine's pause stages: retry continues any of them.
	const PAUSED = ['blocked', 'stopped', 'awaiting_credentials', 'budget_exhausted'];

	interface Spec {
		command: ReviewCommand;
		label: string;
		icon: IconType;
		enabled: boolean;
		why: string;
		title: string;
		body: string;
		confirm: string;
	}
	const specs = $derived<Spec[]>([
		{ command: 'retry', label: 'Retry', icon: RotateCcw, enabled: PAUSED.includes(task.stage), why: 'The review is not paused', title: 'Retry this review?', body: 'The paused round continues on the same reviewed snapshot. A new push is not picked up; request the reviewer again for that.', confirm: 'Retry' },
		{ command: 'resume', label: 'Resume', icon: StepForward, enabled: task.active || PAUSED.includes(task.stage), why: 'No review round is unfinished', title: 'Resume with current settings?', body: 'The round adopts the current configuration and reviewer instructions, on the same reviewed snapshot. A blocked or stopped round then continues; one paused for credentials or budget stays paused until that is corrected. Findings and spent budget are preserved.', confirm: 'Resume' },
		{ command: 'stop', label: 'Stop', icon: Square, enabled: task.active || (PAUSED.includes(task.stage) && task.stage !== 'stopped'), why: 'No review round is running or paused', title: 'Stop this review?', body: 'No further reviewer is asked until a writer retries. Finished reviews are kept.', confirm: 'Stop review' }
	]);

	let pending = $state<ReviewCommand | null>(null);
	let open = $state(false);
	let busy = $state(false);
	const spec = $derived(specs.find((s) => s.command === pending));

	function ask(command: ReviewCommand) {
		pending = command;
		open = true;
	}

	async function confirm() {
		if (!pending || busy) return;
		busy = true;
		try {
			const text = await actions.reviewCommand({ owner: task.owner, repo: task.repo, issue: task.pr }, pending);
			toast(text, pending === 'stop' ? 'warning' : 'success');
			open = false;
			await invalidateAll();
		} catch (error) {
			toast(error instanceof Error ? error.message : 'The command could not be posted.', 'danger');
		} finally {
			busy = false;
		}
	}
</script>

<div class="bar" role="toolbar" aria-label="Review commands">
	<span class="hint"><span class="mono">/concurro</span> commands · writers only</span>
	<div class="buttons">
		{#each specs as s (s.command)}
			<Button size="sm" icon={s.icon} disabled={!s.enabled} title={s.enabled ? undefined : s.why} onclick={() => ask(s.command)}>{s.label}</Button>
		{/each}
	</div>
</div>

<Modal bind:open title={spec?.title ?? ''} description={spec?.body || undefined}>
	<p class="posts">{#if MOCK}Applies <code>/concurro {pending}</code> to this demo.{:else}Concurro records <code>/concurro {pending}</code> as your command. The review processes it asynchronously.{/if}</p>
	{#snippet footer()}
		<Button onclick={() => (open = false)}>Cancel</Button>
		<Button variant="primary" disabled={busy} onclick={confirm}>{spec?.confirm}</Button>
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
	.posts {
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
