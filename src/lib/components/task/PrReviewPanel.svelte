<script lang="ts">
	import { GitPullRequest } from 'lucide-svelte';
	import { relTime } from '#lib/format.ts';
	import { openFindings, verdictMeta } from '#lib/meta.ts';
	import type { Task } from '#lib/types.ts';
	import Badge from '../Badge.svelte';
	import EmptyState from '../EmptyState.svelte';
	import Panel from '../Panel.svelte';
	import FindingsTable from './FindingsTable.svelte';

	let { task }: { task: Task } = $props();

	let picked = $state<number>();
	const round = $derived(task.rounds.find((r) => r.round === picked) ?? task.rounds.at(-1));
	const latest = $derived(task.rounds.at(-1)?.round);
</script>

<Panel title="PR review" meta={task.pr ? `#${task.pr.number} · ${openFindings(task.findings)} open of ${task.findings.length} findings` : undefined} flush id="pr-review">
	{#if round}
		<div class="rounds" role="group" aria-label="Review round">
			{#each task.rounds as r (r.round)}
				<button class:on={r.round === round.round} aria-pressed={r.round === round.round} onclick={() => (picked = r.round)}>
					<span>Round {r.round}</span>
					<span class="mono sha">{r.headSha}</span>
					{#if r.round === latest}<span class="cur">current head</span>{/if}
				</button>
			{/each}
		</div>
		<div class="votes">
			{#each round.votes as v}
				<div class="vote">
					<span class="mono agent">{v.agent}</span>
					<span class="mono muted">{v.profile}</span>
					<Badge meta={verdictMeta[v.verdict]} />
				</div>
			{/each}
			{#if Number.isFinite(Date.parse(round.at))}<span class="muted when">Reviewed {relTime(round.at)}</span>{/if}
		</div>

		<FindingsTable
			findings={task.findings}
			anchor="pr-review"
			none="Reviewers raised no findings on this pull request."
			rule="Only the reviewer who raised a finding can mark it fixed or obsolete. Every open or withdrawn finding blocks the merge, whatever its severity."
		/>
	{:else}
		<EmptyState icon={GitPullRequest} title="No PR review yet" text="Review rounds start when the implementation is published as a draft pull request." />
	{/if}
</Panel>

<style>
	.rounds {
		display: flex;
		gap: var(--s-1);
		padding: var(--s-2) var(--s-4) 0;
		border-bottom: 1px solid var(--border);
		overflow-x: auto;
	}
	.rounds button {
		display: inline-flex;
		align-items: center;
		gap: var(--s-2);
		padding: var(--s-2);
		margin-bottom: -1px;
		border: 0;
		border-bottom: 2px solid transparent;
		background: none;
		color: var(--text-2);
		font-size: var(--fs-sm);
		font-weight: var(--fw-medium);
		white-space: nowrap;
		cursor: pointer;
	}
	.rounds button.on {
		border-bottom-color: var(--accent);
		color: var(--text);
	}
	.sha {
		color: var(--text-3);
		font-weight: var(--fw-regular);
	}
	.cur {
		padding: 0 6px;
		border-radius: var(--r-full);
		background: var(--surface-3);
		color: var(--text-2);
		font-size: var(--fs-2xs);
	}
	.votes {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--s-2) var(--s-3);
		padding: var(--s-3) var(--s-4);
		border-bottom: 1px solid var(--border);
	}
	.vote {
		display: inline-flex;
		align-items: center;
		gap: var(--s-2);
		padding: var(--s-1) var(--s-2);
		border: 1px solid var(--border);
		border-radius: var(--r-md);
		font-size: var(--fs-sm);
	}
	.agent {
		font-weight: var(--fw-semibold);
	}
	.when {
		margin-left: auto;
		font-size: var(--fs-xs);
	}
</style>
