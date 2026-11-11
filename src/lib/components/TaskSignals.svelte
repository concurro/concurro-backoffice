<script lang="ts">
	import { MessageSquareWarning, UsersRound } from 'lucide-svelte';
	import { ciMeta, openFindings, type IconType } from '#lib/meta.ts';
	import type { Task } from '#lib/types.ts';
	import Badge from './Badge.svelte';

	/** Concurro review signals for a task row: reviewer approvals, open findings, CI. */
	let { task }: { task: Task } = $props();

	const round = $derived(task.rounds.at(-1));
	const design = $derived(task.designReview.at(-1));
	const votes = $derived(round?.votes ?? (task.atStage === 'plan_qc' || task.stage === 'planned' ? design?.reviews : undefined));
	const approvals = $derived(votes?.filter((v) => v.verdict === 'approve').length ?? 0);
	const open = $derived(openFindings(task.findings));
</script>

<span class="signals">
	{#if votes}
		<Badge plain tone={approvals === votes.length ? 'success' : 'neutral'} icon={UsersRound} title="Reviewer approvals">
			{approvals}/{votes.length}<span class="sr-only"> approvals</span>
		</Badge>
	{/if}
	{#if open}
		<Badge plain tone="warning" icon={MessageSquareWarning} title="Open findings">
			{open}<span class="sr-only"> open findings</span>
		</Badge>
	{/if}
	{#if task.pr}
		<Badge plain meta={ciMeta[task.pr.ci]} title={ciMeta[task.pr.ci].label}>{task.pr.ci === 'passing' ? 'CI' : ciMeta[task.pr.ci].label}</Badge>
	{/if}
	{#if !votes && !open && !task.pr}<span class="muted">—</span>{/if}
</span>

<style>
	.signals {
		display: inline-flex;
		align-items: center;
		gap: var(--s-3);
		white-space: nowrap;
	}
</style>
