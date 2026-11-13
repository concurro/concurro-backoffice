<script lang="ts">
	import { ExternalLink, GitPullRequest, SquareTerminal } from 'lucide-svelte';
	import Alert from '#lib/components/Alert.svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import Button from '#lib/components/Button.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import Inline from '#lib/components/Inline.svelte';
	import Meter from '#lib/components/Meter.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Panel from '#lib/components/Panel.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';
	import StageStepper from '#lib/components/StageStepper.svelte';
	import Timeline from '#lib/components/Timeline.svelte';
	import CommandBar from '#lib/components/task/CommandBar.svelte';
	import CompletionPanel from '#lib/components/task/CompletionPanel.svelte';
	import DesignReviewPanel from '#lib/components/task/DesignReviewPanel.svelte';
	import ImplementPanel from '#lib/components/task/ImplementPanel.svelte';
	import IntakePanel from '#lib/components/task/IntakePanel.svelte';
	import PlanPanel from '#lib/components/task/PlanPanel.svelte';
	import PrReviewPanel from '#lib/components/task/PrReviewPanel.svelte';
	import ReadinessPanel from '#lib/components/task/ReadinessPanel.svelte';
	import { issueUrl, relTime, targetHref, taskHref } from '#lib/format.ts';
	import { ciMeta, stepIndex, steps, taskStageMeta } from '#lib/meta.ts';
	import type { TaskSection } from '#lib/types.ts';
	import { api, session } from '#lib/api/index.ts';
	import { withBase } from '#lib/paths.ts';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import type { PageProps } from './$types';

	let { data, params }: PageProps = $props();
	const name = (login: string) => (login === session.me.login ? session.me.name : login);

	/** The step whose details are shown, from `?phase=`; defaults to where the task is. */
	const picked = $derived(steps.findIndex((s) => s.key === page.url.searchParams.get('phase')));
	const summary = $derived(data.resource.value?.task);
	const phase = $derived(picked >= 0 ? picked : Math.max(stepIndex(summary?.atStage ?? 'intake'), 0));
	const phaseData = $derived(summary && phase !== 3 ? api.taskSection(summary, steps[phase].key as TaskSection) : undefined);
	const timelineData = $derived(summary ? api.taskSection(summary, 'timeline') : undefined);
	const pullData = $derived(summary?.pr ? api.taskSection(summary, 'pull') : undefined);
	const livePull = $derived(pullData?.value?.task);
	const task = $derived(summary ? { ...summary, pr: livePull?.revision === summary.revision ? livePull?.pr ?? summary.pr : summary.pr } : undefined);
	const phaseTask = $derived(phase === 3 ? task : task && phaseData?.value?.task.revision === summary?.revision && phaseData?.value
		? { ...phaseData.value.task, pr: task.pr } : undefined);
	const timelineTask = $derived(timelineData?.value?.task.revision === summary?.revision ? timelineData?.value?.task : undefined);
	const ciLoading = $derived(!!pullData?.loading && !pullData.value);
	const snapshot = $derived(data.resource.value?.cache);
	$effect(() => {
		if ((snapshot?.refreshing || snapshot?.pendingCommand) && !snapshot?.error && !data.resource.loading && !data.resource.error) {
			const timer = setTimeout(data.resource.refresh, snapshot?.pendingCommand ? 5000 : 1000);
			return () => clearTimeout(timer);
		}
	});
	let refreshingRevision = '';
	$effect(() => {
		const changed = [phaseData?.value?.task, timelineData?.value?.task, livePull]
			.find((value) => value?.revision && value.revision !== summary?.revision);
		if (changed && !data.resource.loading && refreshingRevision !== `${summary?.revision}:${changed.revision}` && untrack(data.resource.refresh)) {
			refreshingRevision = `${summary?.revision}:${changed.revision}`;
		}
	});

	/** Select a phase without reloading the issue summary. */
	function select(step: number) {
		const url = new URL(page.url.href);
		url.searchParams.set('phase', steps[step].key);
		goto(url, { replace: true, reset: false });
	}
</script>

<svelte:head><title>{params.repo}#{params.issue} · Concurro</title></svelte:head>

{#if !task && data.resource.error}
	<ErrorState error={data.resource.error} retry={data.resource.refresh} />
{:else if !task}
	<Skeleton rows={2} />
	<Skeleton height={62} />
	<Skeleton height={64} />
	<div class="grid">
		<div class="col"><Panel title="Plan"><Skeleton rows={8} /></Panel><Panel title="Design review"><Skeleton rows={4} /></Panel></div>
		<div class="col"><Panel title="Readiness"><Skeleton rows={4} /></Panel><Panel title="Budgets"><Skeleton rows={3} /></Panel></div>
	</div>
{:else}
	{@const turns = `${taskHref(task)}/turns`}
	{#if data.resource.error}<ErrorState error={data.resource.error} retry={data.resource.refresh} />{/if}
	<PageHeader title={task.title}>
		{#snippet eyebrow()}
			<a class="mono" href={targetHref(task)}>{task.owner}/{task.repo}</a>
			<span class="mono">#{task.issue}</span>
			<span>opened by</span><Avatar login={task.author} size={18} label />
		{/snippet}
		{#snippet actions()}
			<Button icon={SquareTerminal} href={turns}>Run diagnostics</Button>
			<Button variant="ghost" icon={ExternalLink} href={issueUrl(task)} external>GitHub</Button>
		{/snippet}
		<Badge meta={taskStageMeta(task)} />
		{#if task.paused}<Badge tone="danger">awaiting_credentials</Badge>{/if}
		<Badge tone={task.mode === 'autonomous' ? 'accent' : 'neutral'}>{task.mode}</Badge>
		{#if task.pr}
			<span class="pr">
				<GitPullRequest size={14} aria-hidden="true" />
				<a href="?phase=review">#{task.pr.number}</a>
				<span class="mono muted">{task.pr.headSha}</span>
				{#if task.pr.additions !== null && task.pr.deletions !== null}
					<span class="num diffstat"><span class="add">+{task.pr.additions}</span> <span class="del">−{task.pr.deletions}</span></span>
				{/if}
			</span>
			{#if ciLoading}<span class="muted">Loading CI…</span>{:else}<Badge plain meta={ciMeta[task.pr.ci]} />{/if}
		{/if}
		{#each task.labels as label}<span class="label">{label}</span>{/each}
		<span class="muted updated">Updated {relTime(task.updatedAt)}</span>
	</PageHeader>

	{#if pullData?.error}<ErrorState error={pullData.error} retry={pullData.refresh} />{/if}
	{#if snapshot?.error}
		<Alert tone="caution" title="Showing saved issue data">
			{snapshot.error} Last updated {relTime(snapshot.observedAt)}.
			{#snippet actions()}<Button size="sm" onclick={data.resource.refresh}>Check for updates</Button>{/snippet}
		</Alert>
	{:else if snapshot?.pendingCommand}
		<p class="muted" role="status">Command sent. Waiting for the issue to update…</p>
	{:else if snapshot?.refreshing}
		<p class="muted" role="status">Refreshing issue… Showing the snapshot from {relTime(snapshot.observedAt)}.</p>
	{/if}
	<StageStepper {task} selected={phase} onselect={select} />

	<Alert tone={task.alert.tone} title={task.alert.title}>
		<Inline text={task.alert.body} />
		{#if task.question}<blockquote>{task.question}</blockquote>{/if}
		{#snippet actions()}
			{#if task.paused}<Button size="sm" href={withBase('/me/credentials')}>Fix credentials</Button>{/if}
		{/snippet}
	</Alert>

	<div class="grid">
		<div class="col" role="region" aria-label="{steps[phase].label} details">
			{#if phaseData?.error}<ErrorState error={phaseData.error} retry={phaseData.refresh} />{/if}
			{#if phaseTask}
				{#if phase === 0}
					<IntakePanel task={phaseTask} />
				{:else if phase === 1}
					<PlanPanel task={phaseTask} />
				{:else if phase === 2}
					<DesignReviewPanel task={phaseTask} />
				{:else if phase === 3}
					<ImplementPanel task={phaseTask} {turns} {ciLoading} />
				{:else if phase === 4}
					<PrReviewPanel task={phaseTask} />
				{:else}
					{#if phaseTask.completion}<CompletionPanel completion={phaseTask.completion} />{/if}
					<ReadinessPanel task={phaseTask} {ciLoading} />
				{/if}
			{:else if !phaseData?.error}<Skeleton rows={6} />{/if}
		</div>
		<div class="col">
			<Panel title="Budgets" id="budgets">
				<div class="meters">
					<Meter label="Model calls" {...task.budgets.modelCalls} />
					<Meter label="Fix rounds" {...task.budgets.fixRounds} />
					<Meter label="Plan revisions" {...task.budgets.planRevisions} />
				</div>
			</Panel>
			<Panel title="Sponsor" id="sponsor">
				{#if task.sponsor}
					<div class="sponsor">
						<Avatar login={task.sponsor} size={32} />
						<div>
							<p class="sponsor-name">{name(task.sponsor)}{#if task.sponsor === session.me.login}<span class="you">you</span>{/if}</p>
							<p class="muted">@{task.sponsor} pays for this task’s model calls</p>
						</div>
					</div>
					{#if task.paused}
						<p class="paused tone-danger"><strong>awaiting_credentials</strong> {task.pauseReason}</p>
					{/if}
				{:else}
					<p class="muted">No sponsor. Model calls use the target’s shared credentials. A writer can run <code>/concurro sponsor</code> to pay with their own.</p>
				{/if}
			</Panel>
			<Panel title="Timeline" meta={timelineTask ? String(timelineTask.timeline.length) : undefined} id="timeline">
				{#if timelineData?.error}<ErrorState error={timelineData.error} retry={timelineData.refresh} />{/if}
				{#if timelineTask}
					<Timeline events={timelineTask.timeline} turnHref={(n) => `${turns}/${n}`} />
				{:else if !timelineData?.error}<Skeleton rows={4} />{/if}
			</Panel>
		</div>
	</div>

	<CommandBar task={{ ...task, plans: phaseTask?.plans ?? task.plans }} />
{/if}

<style>
	.grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 340px;
		gap: var(--s-4);
		align-items: start;
	}
	.col {
		display: grid;
		gap: var(--s-4);
		min-width: 0;
	}
	.pr {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: var(--fs-sm);
		color: var(--text-2);
	}
	.diffstat {
		font-family: var(--font-mono);
		font-size: var(--fs-xs);
	}
	.add {
		color: var(--success-fg);
	}
	.del {
		color: var(--danger-fg);
	}
	.label {
		padding: 0 7px;
		border: 1px solid var(--border);
		border-radius: var(--r-full);
		color: var(--text-2);
		font-size: var(--fs-xs);
		line-height: 18px;
	}
	.updated {
		font-size: var(--fs-xs);
	}
	blockquote {
		margin: var(--s-2) 0 0;
		padding-left: var(--s-3);
		border-left: 2px solid var(--warning-solid);
		color: var(--text);
	}
	.meters {
		display: grid;
		gap: var(--s-4);
	}
	.sponsor {
		display: flex;
		align-items: center;
		gap: var(--s-3);
		font-size: var(--fs-sm);
	}
	.sponsor-name {
		font-weight: var(--fw-medium);
	}
	.you {
		margin-left: var(--s-2);
		padding: 0 6px;
		border-radius: var(--r-full);
		background: var(--accent-soft);
		color: var(--accent-text);
		font-size: var(--fs-2xs);
	}
	.paused {
		margin-top: var(--s-3);
		padding: var(--s-2) var(--s-3);
		border: 1px solid var(--tone-border);
		border-radius: var(--r-md);
		background: var(--tone-bg);
		color: var(--text-2);
		font-size: var(--fs-sm);
	}
	.paused strong {
		display: block;
		color: var(--tone-fg);
		font-family: var(--font-mono);
		font-size: var(--fs-xs);
	}
	code {
		padding: 1px 4px;
		border-radius: var(--r-sm);
		background: var(--surface-3);
	}
	@media (max-width: 1100px) {
		.grid {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
