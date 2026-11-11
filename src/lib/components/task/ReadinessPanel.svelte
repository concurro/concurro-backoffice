<script lang="ts">
	import { Check, CircleDashed, X } from 'lucide-svelte';
	import { openFindings } from '#lib/meta.ts';
	import type { Task } from '#lib/types.ts';
	import Panel from '../Panel.svelte';

	let { task }: { task: Task } = $props();

	type State = 'ok' | 'no' | 'pending';
	const checks = $derived.by((): { label: string; detail: string; state: State }[] => {
		const pr = task.pr;
		if (!pr) {
			const detail = 'No pull request yet';
			return ['All reviewers approve the current head', 'No open findings', 'CI is green', 'Marked ready for humans'].map((label) => ({ label, detail, state: 'pending' }));
		}
		const votes = task.rounds.at(-1)?.votes ?? [];
		const approvals = votes.filter((v) => v.verdict === 'approve').length;
		const open = openFindings(task.findings);
		return [
			{ label: 'All reviewers approve the current head', detail: `${approvals}/${votes.length} on ${pr.headSha}`, state: votes.length && approvals === votes.length ? 'ok' : 'no' },
			{ label: 'No open findings', detail: open ? `${open} open` : 'None open', state: open ? 'no' : 'ok' },
			{ label: 'CI is green', detail: pr.ci, state: pr.ci === 'passing' ? 'ok' : pr.ci === 'failing' ? 'no' : 'pending' },
			{ label: 'Marked ready for humans', detail: pr.ready ? `PR #${pr.number} is ready for review` : 'Still a draft', state: pr.ready ? 'ok' : 'pending' }
		];
	});
	const passed = $derived(checks.filter((c) => c.state === 'ok').length);
	const icons = { ok: Check, no: X, pending: CircleDashed };
	const words = { ok: 'Passed', no: 'Not met', pending: 'Pending' };
</script>

<Panel title="Readiness" meta="{passed}/{checks.length}" flush id="readiness">
	<ul>
		{#each checks as c}
			{@const Icon = icons[c.state]}
			<li class={c.state}>
				<span class="icon"><Icon size={13} strokeWidth={2.5} aria-hidden="true" /></span>
				<div>
					<p>{c.label}<span class="sr-only">: {words[c.state]}</span></p>
					<p class="detail num">{c.detail}</p>
				</div>
			</li>
		{/each}
	</ul>
	<p class="foot muted">Concurro hands off when all four pass. It never merges.</p>
</Panel>

<style>
	ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	li {
		display: flex;
		gap: var(--s-3);
		padding: var(--s-2) var(--s-4);
		border-bottom: 1px solid var(--border);
		font-size: var(--fs-sm);
	}
	.icon {
		display: flex;
		align-items: center;
		justify-content: center;
		flex: none;
		width: 20px;
		height: 20px;
		margin-top: 1px;
		border: 1px solid var(--border-strong);
		border-radius: 50%;
		color: var(--text-3);
	}
	.ok .icon {
		border-color: var(--success-border);
		background: var(--success-bg);
		color: var(--success-fg);
	}
	.no .icon {
		border-color: var(--danger-border);
		background: var(--danger-bg);
		color: var(--danger-fg);
	}
	.detail {
		color: var(--text-3);
		font-size: var(--fs-xs);
	}
	.foot {
		padding: var(--s-2) var(--s-4);
		font-size: var(--fs-xs);
	}
</style>
